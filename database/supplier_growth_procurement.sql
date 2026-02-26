-- ============================================
-- SUPPLIER GROWTH ENGINE + PROCUREMENT ENGINE
-- Run after: supplier_marketplace_schema.sql, supplier_network_upgrade.sql
-- Adds: supplier_updates, sponsored_placements, purchase_orders, ranking view,
--       performance metrics view, analytics event types, feature flags
-- ============================================

-- ============================================
-- 1) Supplier updates feed (announcements, new product, promotion, restock)
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'new_product', 'promotion', 'restock')),
  related_product_id UUID REFERENCES public.supplier_marketplace_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_updates_supplier ON public.supplier_updates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_updates_created ON public.supplier_updates(created_at DESC);

ALTER TABLE public.supplier_analytics_events DROP CONSTRAINT IF EXISTS supplier_analytics_events_event_type_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_analytics_events_event_type_check') THEN
    ALTER TABLE public.supplier_analytics_events
      ADD CONSTRAINT supplier_analytics_events_event_type_check
      CHECK (event_type IN (
        'profile_view', 'product_view', 'contact_click', 'contact_call', 'contact_email', 'contact_whatsapp', 'contact_website',
        'rfq_created', 'rfq_response', 'po_created', 'follow'
      ));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_supplier_analytics_events_event_type ON public.supplier_analytics_events(event_type);

-- ============================================
-- 2) Sponsored placements
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_sponsored_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.supplier_marketplace_products(id) ON DELETE SET NULL,
  placement TEXT NOT NULL CHECK (placement IN ('home', 'category', 'search', 'profile')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_sponsored_placements_supplier ON public.supplier_sponsored_placements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_sponsored_placements_status ON public.supplier_sponsored_placements(status);
CREATE INDEX IF NOT EXISTS idx_supplier_sponsored_placements_dates ON public.supplier_sponsored_placements(starts_at, ends_at);

-- ============================================
-- 3) Purchase orders
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rfq_id UUID REFERENCES public.supplier_rfqs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'completed', 'cancelled')),
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_orders_supplier ON public.supplier_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_orders_buyer ON public.supplier_purchase_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_orders_status ON public.supplier_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_orders_created ON public.supplier_purchase_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS public.supplier_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.supplier_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.supplier_marketplace_products(id) ON DELETE RESTRICT,
  quantity NUMERIC(15, 3) NOT NULL,
  unit_price NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_po_items_po ON public.supplier_purchase_order_items(purchase_order_id);

-- ============================================
-- 4) Follower count (use buyer_followed_suppliers; add view for compatibility)
-- ============================================
CREATE OR REPLACE VIEW public.supplier_follower_counts AS
SELECT supplier_profile_id AS supplier_id, COUNT(*)::INT AS follower_count
FROM public.buyer_followed_suppliers
GROUP BY supplier_profile_id;

-- ============================================
-- 5) Performance metrics view
-- ============================================
CREATE OR REPLACE VIEW public.supplier_performance_metrics AS
SELECT
  p.id AS supplier_id,
  p.trust_score,
  COALESCE(rev.avg_rating, 0) AS avg_rating,
  COALESCE(rev.review_count, 0) AS review_count,
  COALESCE(rfq.rfq_total, 0) AS rfq_total,
  COALESCE(rfq.rfq_responded, 0) AS rfq_responded,
  CASE WHEN COALESCE(rfq.rfq_total, 0) > 0
    THEN (rfq.rfq_responded::NUMERIC / rfq.rfq_total * 100) ELSE NULL END AS rfq_response_rate_pct,
  COALESCE(comp.complaint_count, 0) AS complaint_count,
  COALESCE(fol.follower_count, 0) AS follower_count,
  p.avg_response_hours,
  p.featured
FROM public.supplier_marketplace_profiles p
LEFT JOIN (
  SELECT supplier_profile_id, AVG(rating)::NUMERIC(4,2) AS avg_rating, COUNT(*)::INT AS review_count
  FROM public.supplier_marketplace_reviews WHERE is_hidden = false GROUP BY supplier_profile_id
) rev ON rev.supplier_profile_id = p.id
LEFT JOIN (
  SELECT supplier_profile_id, COUNT(*)::INT AS rfq_total,
    COUNT(*) FILTER (WHERE status = 'quoted')::INT AS rfq_responded
  FROM public.supplier_rfqs GROUP BY supplier_profile_id
) rfq ON rfq.supplier_profile_id = p.id
LEFT JOIN (
  SELECT supplier_profile_id, COUNT(*)::INT AS complaint_count
  FROM public.supplier_marketplace_complaints WHERE status NOT IN ('dismissed') GROUP BY supplier_profile_id
) comp ON comp.supplier_profile_id = p.id
LEFT JOIN public.supplier_follower_counts fol ON fol.supplier_id = p.id
WHERE p.status = 'approved';

-- ============================================
-- 6) Ranked marketplace view (for sorting)
-- ============================================
CREATE OR REPLACE VIEW public.supplier_marketplace_ranked AS
SELECT
  p.*,
  COALESCE(m.follower_count, 0) AS follower_count,
  COALESCE(m.avg_rating, 0) AS avg_rating,
  COALESCE(m.rfq_response_rate_pct, 0) AS rfq_response_rate_pct,
  (
    COALESCE(p.trust_score, 0) * 0.2
    + LEAST(COALESCE(m.avg_rating, 0) * 20, 100) * 0.2
    + LEAST(COALESCE(m.rfq_response_rate_pct, 0), 100) * 0.15
    + LEAST(COALESCE(m.follower_count, 0) * 2, 100) * 0.15
    + CASE WHEN p.featured THEN 25 ELSE 0 END
    + CASE WHEN p.avg_response_hours IS NOT NULL AND p.avg_response_hours <= 24 THEN 10 ELSE 0 END
  )::NUMERIC(10,2) AS ranking_score
FROM public.supplier_marketplace_profiles p
LEFT JOIN public.supplier_performance_metrics m ON m.supplier_id = p.id
WHERE p.status = 'approved';

-- ============================================
-- 7) RLS: supplier_updates
-- ============================================
ALTER TABLE public.supplier_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read supplier updates" ON public.supplier_updates;
CREATE POLICY "Public read supplier updates" ON public.supplier_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Supplier manage own updates" ON public.supplier_updates;
CREATE POLICY "Supplier manage own updates" ON public.supplier_updates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = supplier_id AND sp.user_id = auth.uid())
  );

-- ============================================
-- 8) RLS: supplier_sponsored_placements
-- ============================================
ALTER TABLE public.supplier_sponsored_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active placements" ON public.supplier_sponsored_placements;
CREATE POLICY "Public read active placements" ON public.supplier_sponsored_placements
  FOR SELECT USING (status = 'active' AND starts_at <= NOW() AND ends_at >= NOW());
DROP POLICY IF EXISTS "Supplier manage own placements" ON public.supplier_sponsored_placements;
CREATE POLICY "Supplier manage own placements" ON public.supplier_sponsored_placements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = supplier_id AND sp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins full access sponsored" ON public.supplier_sponsored_placements;
CREATE POLICY "Admins full access sponsored" ON public.supplier_sponsored_placements
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- 9) RLS: supplier_purchase_orders
-- ============================================
ALTER TABLE public.supplier_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyer read own POs" ON public.supplier_purchase_orders;
CREATE POLICY "Buyer read own POs" ON public.supplier_purchase_orders FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Buyer create/update own POs" ON public.supplier_purchase_orders;
CREATE POLICY "Buyer create/update own POs" ON public.supplier_purchase_orders
  FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Supplier read POs for own profile" ON public.supplier_purchase_orders;
CREATE POLICY "Supplier read POs for own profile" ON public.supplier_purchase_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = supplier_id AND sp.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Supplier update PO status" ON public.supplier_purchase_orders;
CREATE POLICY "Supplier update PO status" ON public.supplier_purchase_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = supplier_id AND sp.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins read all POs" ON public.supplier_purchase_orders;
CREATE POLICY "Admins read all POs" ON public.supplier_purchase_orders FOR SELECT USING (public.user_is_admin(auth.uid()));

-- ============================================
-- 10) RLS: supplier_purchase_order_items (via PO access)
-- ============================================
ALTER TABLE public.supplier_purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read PO items if can read PO" ON public.supplier_purchase_order_items;
CREATE POLICY "Read PO items if can read PO" ON public.supplier_purchase_order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.supplier_purchase_orders po
    WHERE po.id = purchase_order_id
    AND (po.buyer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = po.supplier_id AND sp.user_id = auth.uid())
      OR public.user_is_admin(auth.uid()))
  )
);
DROP POLICY IF EXISTS "Buyer insert/update PO items for own PO" ON public.supplier_purchase_order_items;
CREATE POLICY "Buyer insert/update PO items for own PO" ON public.supplier_purchase_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_purchase_orders po WHERE po.id = purchase_order_id AND po.buyer_id = auth.uid())
  );

-- ============================================
-- 11) Feature flags: growth + procurement
-- ============================================
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('supplier-updates', 'Supplier updates', 'Post updates and announcements'),
    ('supplier-sponsored', 'Sponsored placements', 'Promote store or products'),
    ('supplier-ranking', 'Supplier ranking', 'Ranked discovery in marketplace'),
    ('supplier-purchase-orders', 'Purchase orders', 'Create and manage POs')
  ) AS t(feature_id, name, description)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.feature_config WHERE feature_id = f.feature_id) THEN
      INSERT INTO public.feature_config (feature_id, name, description, category, enabled, enabled_by_default, can_be_disabled, is_premium, premium_plan_ids, access, visibility)
      VALUES (f.feature_id, f.name, f.description, 'suppliers', true, true, true, false, '{}', '{}', '{}');
    END IF;
  END LOOP;
END $$;
