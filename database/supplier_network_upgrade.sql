-- ============================================
-- SUPPLIER NETWORK UPGRADE (B2B features)
-- Run after: supplier_marketplace_schema.sql, supplier_applications.sql
-- Adds: RFQ + quotes, trust/verification, product fields, complaint lifecycle,
--       subcategory approval, buyer retention, response SLA
-- ============================================

-- ============================================
-- 1) RFQ (Request for Quotation)
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.supplier_marketplace_products(id) ON DELETE SET NULL,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 1,
  unit TEXT,
  delivery_location TEXT,
  needed_by_date DATE,
  notes TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'quoted', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_supplier ON public.supplier_rfqs(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_buyer ON public.supplier_rfqs(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_status ON public.supplier_rfqs(status);
CREATE INDEX IF NOT EXISTS idx_supplier_rfqs_created ON public.supplier_rfqs(created_at DESC);

-- ============================================
-- 2) Supplier quotes (response to RFQ)
-- ============================================
CREATE TABLE IF NOT EXISTS public.supplier_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES public.supplier_rfqs(id) ON DELETE CASCADE,
  unit_price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  lead_time_days INT,
  moq INT,
  delivery_terms TEXT,
  payment_terms TEXT,
  validity_days INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_rfq ON public.supplier_quotes(rfq_id);

-- ============================================
-- 3) Profile: verification_tier + response time
-- ============================================
ALTER TABLE public.supplier_marketplace_profiles
  ADD COLUMN IF NOT EXISTS verification_tier TEXT CHECK (verification_tier IS NULL OR verification_tier IN ('basic', 'verified', 'premium', 'manufacturer', 'distributor'));
ALTER TABLE public.supplier_marketplace_profiles
  ADD COLUMN IF NOT EXISTS avg_response_hours NUMERIC(10, 2);

-- ============================================
-- 4) Conversations: first supplier reply (for SLA)
-- ============================================
ALTER TABLE public.supplier_conversations
  ADD COLUMN IF NOT EXISTS first_supplier_reply_at TIMESTAMPTZ;

-- ============================================
-- 5) Product: sku, unit_type, lead_time_days, price_type, tier_prices
-- ============================================
ALTER TABLE public.supplier_marketplace_products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.supplier_marketplace_products ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'unit';
ALTER TABLE public.supplier_marketplace_products ADD COLUMN IF NOT EXISTS lead_time_days INT;
ALTER TABLE public.supplier_marketplace_products ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed' CHECK (price_type IS NULL OR price_type IN ('fixed', 'negotiable'));
ALTER TABLE public.supplier_marketplace_products ADD COLUMN IF NOT EXISTS tier_prices JSONB DEFAULT '[]';

-- ============================================
-- 6) Complaints: supplier response + status supplier_response
-- ============================================
ALTER TABLE public.supplier_marketplace_complaints
  ADD COLUMN IF NOT EXISTS supplier_response TEXT;
ALTER TABLE public.supplier_marketplace_complaints
  ADD COLUMN IF NOT EXISTS supplier_evidence_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.supplier_marketplace_complaints
  ADD COLUMN IF NOT EXISTS supplier_responded_at TIMESTAMPTZ;

-- Allow new status 'supplier_response' (migrate check constraint)
ALTER TABLE public.supplier_marketplace_complaints DROP CONSTRAINT IF EXISTS supplier_marketplace_complaints_status_check;
ALTER TABLE public.supplier_marketplace_complaints
  ADD CONSTRAINT supplier_marketplace_complaints_status_check
  CHECK (status IN ('open', 'in_review', 'supplier_response', 'resolved', 'dismissed'));

-- ============================================
-- 7) Subcategories: status pending/approved
-- ============================================
ALTER TABLE public.supplier_marketplace_subcategories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved'));

-- ============================================
-- 8) Buyer retention: saved suppliers, followed, saved products, recently viewed
-- ============================================
CREATE TABLE IF NOT EXISTS public.buyer_saved_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, supplier_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_buyer_saved_suppliers_user ON public.buyer_saved_suppliers(user_id);

CREATE TABLE IF NOT EXISTS public.buyer_followed_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, supplier_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_buyer_followed_suppliers_user ON public.buyer_followed_suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_followed_suppliers_supplier ON public.buyer_followed_suppliers(supplier_profile_id);

CREATE TABLE IF NOT EXISTS public.buyer_saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.supplier_marketplace_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_buyer_saved_products_user ON public.buyer_saved_products(user_id);

CREATE TABLE IF NOT EXISTS public.buyer_recently_viewed_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.supplier_marketplace_products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buyer_recently_viewed_user ON public.buyer_recently_viewed_products(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_recently_viewed_at ON public.buyer_recently_viewed_products(viewed_at DESC);

-- ============================================
-- 9) RPC: get_supplier_trust_score (extended)
-- Factors: verification_tier, verification_level, reviews, complaints,
--          avg_response_hours (responsiveness), account age, admin flags
-- ============================================
CREATE OR REPLACE FUNCTION public.get_supplier_trust_score(profile_id UUID)
RETURNS INT AS $$
DECLARE
  score INT := 50;
  rev_avg NUMERIC;
  rev_count INT;
  comp_count INT;
  lvl INT;
  tier TEXT;
  resp_hours NUMERIC;
  age_days INT;
  prof RECORD;
BEGIN
  IF profile_id IS NULL THEN RETURN 0; END IF;
  SELECT verification_level, verification_tier, avg_response_hours, created_at
  INTO prof FROM public.supplier_marketplace_profiles WHERE id = profile_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  lvl := COALESCE(prof.verification_level, 0);
  tier := prof.verification_tier;
  score := score + lvl * 5;
  IF tier = 'verified' THEN score := score + 5; ELSIF tier = 'premium' THEN score := score + 10;
  ELSIF tier = 'manufacturer' THEN score := score + 8; ELSIF tier = 'distributor' THEN score := score + 7;
  END IF;

  SELECT AVG(rating)::NUMERIC, COUNT(*) INTO rev_avg, rev_count
  FROM public.supplier_marketplace_reviews WHERE supplier_profile_id = profile_id AND is_hidden = false;
  IF rev_count > 0 AND rev_avg IS NOT NULL THEN
    score := score + (rev_avg - 3) * 10;
    score := score + LEAST(rev_count, 20);
  END IF;

  SELECT COUNT(*) INTO comp_count FROM public.supplier_marketplace_complaints
  WHERE supplier_profile_id = profile_id AND status NOT IN ('dismissed', 'resolved');
  score := score - comp_count * 5;

  resp_hours := prof.avg_response_hours;
  IF resp_hours IS NOT NULL THEN
    IF resp_hours <= 2 THEN score := score + 10;
    ELSIF resp_hours <= 24 THEN score := score + 5;
    ELSIF resp_hours > 72 THEN score := score - 5;
    END IF;
  END IF;

  age_days := EXTRACT(DAY FROM (NOW() - prof.created_at))::INT;
  IF age_days >= 365 THEN score := score + 5;
  ELSIF age_days >= 90 THEN score := score + 3;
  END IF;

  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 10) RPC: log_supplier_admin_action (for audit)
-- ============================================
CREATE OR REPLACE FUNCTION public.log_supplier_admin_action(
  p_admin_user_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.supplier_admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (p_admin_user_id, p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11) RLS: supplier_rfqs
-- ============================================
ALTER TABLE public.supplier_rfqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyer read own RFQs" ON public.supplier_rfqs;
CREATE POLICY "Buyer read own RFQs" ON public.supplier_rfqs FOR SELECT USING (auth.uid() = buyer_user_id);

DROP POLICY IF EXISTS "Buyer create RFQ" ON public.supplier_rfqs;
CREATE POLICY "Buyer create RFQ" ON public.supplier_rfqs FOR INSERT WITH CHECK (auth.uid() = buyer_user_id);

DROP POLICY IF EXISTS "Supplier read RFQs for own profile" ON public.supplier_rfqs;
CREATE POLICY "Supplier read RFQs for own profile" ON public.supplier_rfqs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Supplier update RFQ status" ON public.supplier_rfqs;
CREATE POLICY "Supplier update RFQ status" ON public.supplier_rfqs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins read all RFQs" ON public.supplier_rfqs;
CREATE POLICY "Admins read all RFQs" ON public.supplier_rfqs FOR SELECT USING (public.user_is_admin(auth.uid()));

-- ============================================
-- 12) RLS: supplier_quotes
-- ============================================
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read quote if can read RFQ" ON public.supplier_quotes;
CREATE POLICY "Read quote if can read RFQ" ON public.supplier_quotes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.supplier_rfqs r
    WHERE r.id = rfq_id
    AND (r.buyer_user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = r.supplier_profile_id AND p.user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Supplier insert quote" ON public.supplier_quotes;
CREATE POLICY "Supplier insert quote" ON public.supplier_quotes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supplier_rfqs r
    JOIN public.supplier_marketplace_profiles p ON p.id = r.supplier_profile_id AND p.user_id = auth.uid()
    WHERE r.id = rfq_id
  )
);

DROP POLICY IF EXISTS "Admins read all quotes" ON public.supplier_quotes;
CREATE POLICY "Admins read all quotes" ON public.supplier_quotes FOR SELECT USING (public.user_is_admin(auth.uid()));

-- ============================================
-- 13) RLS: complaints – supplier can read own profile complaints and update supplier_response
-- ============================================
DROP POLICY IF EXISTS "Supplier read complaints for own profile" ON public.supplier_marketplace_complaints;
CREATE POLICY "Supplier read complaints for own profile" ON public.supplier_marketplace_complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Supplier update complaint response" ON public.supplier_marketplace_complaints;
CREATE POLICY "Supplier update complaint response" ON public.supplier_marketplace_complaints
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

-- ============================================
-- 14) RLS: subcategories – read approved or own pending
-- ============================================
DROP POLICY IF EXISTS "Read subcategories for approved suppliers" ON public.supplier_marketplace_subcategories;
CREATE POLICY "Read subcategories for approved suppliers" ON public.supplier_marketplace_subcategories
  FOR SELECT USING (
    (status = 'approved' AND EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.status = 'approved'))
    OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access subcategories" ON public.supplier_marketplace_subcategories;
CREATE POLICY "Admins full access subcategories" ON public.supplier_marketplace_subcategories
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- 15) RLS: buyer retention tables
-- ============================================
ALTER TABLE public.buyer_saved_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own saved suppliers" ON public.buyer_saved_suppliers;
CREATE POLICY "Users own saved suppliers" ON public.buyer_saved_suppliers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.buyer_followed_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own followed suppliers" ON public.buyer_followed_suppliers;
CREATE POLICY "Users own followed suppliers" ON public.buyer_followed_suppliers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.buyer_saved_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own saved products" ON public.buyer_saved_products;
CREATE POLICY "Users own saved products" ON public.buyer_saved_products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.buyer_recently_viewed_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own recent views" ON public.buyer_recently_viewed_products;
CREATE POLICY "Users own recent views" ON public.buyer_recently_viewed_products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 16) Trigger: update first_supplier_reply_at on first message from supplier
-- ============================================
CREATE OR REPLACE FUNCTION public.set_first_supplier_reply_at()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
  is_supplier BOOL;
BEGIN
  SELECT c.supplier_profile_id INTO conv FROM public.supplier_conversations c WHERE c.id = NEW.conversation_id;
  is_supplier := EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = conv.supplier_profile_id AND p.user_id = NEW.sender_user_id);
  IF is_supplier THEN
    UPDATE public.supplier_conversations
    SET first_supplier_reply_at = COALESCE(first_supplier_reply_at, NOW()), updated_at = NOW()
    WHERE id = NEW.conversation_id AND first_supplier_reply_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_first_supplier_reply_on_message ON public.supplier_messages;
CREATE TRIGGER set_first_supplier_reply_on_message
  AFTER INSERT ON public.supplier_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_first_supplier_reply_at();

-- ============================================
-- 17) Trigger: set RFQ status to quoted when quote inserted
-- ============================================
CREATE OR REPLACE FUNCTION public.set_rfq_quoted_on_quote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.supplier_rfqs SET status = 'quoted', updated_at = NOW() WHERE id = NEW.rfq_id AND status = 'open';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_rfq_quoted_on_quote ON public.supplier_quotes;
CREATE TRIGGER set_rfq_quoted_on_quote
  AFTER INSERT ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_rfq_quoted_on_quote();

-- ============================================
-- 18) RPC: refresh_supplier_profile_trust_score (for admin after tier change)
-- ============================================
CREATE OR REPLACE FUNCTION public.refresh_supplier_profile_trust_score(p_profile_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.supplier_marketplace_profiles
  SET trust_score = public.get_supplier_trust_score(p_profile_id),
      updated_at = NOW()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 19) Feature flags: new supplier network features
-- ============================================
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('supplier-rfq', 'Request for Quote', 'Submit RFQ to suppliers'),
    ('supplier-messaging', 'Supplier messaging', 'Message suppliers'),
    ('supplier-compare', 'Compare suppliers', 'Compare products across suppliers'),
    ('supplier-follow', 'Follow suppliers', 'Follow suppliers for updates'),
    ('supplier-inbox', 'Supplier inbox', 'View conversations and RFQs'),
    ('supplier-rfq-respond', 'Respond to RFQs', 'Quote on buyer RFQs'),
    ('supplier-analytics', 'Supplier analytics', 'View store analytics')
  ) AS t(feature_id, name, description)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.feature_config WHERE feature_id = f.feature_id) THEN
      INSERT INTO public.feature_config (feature_id, name, description, category, enabled, enabled_by_default, can_be_disabled, is_premium, premium_plan_ids, access, visibility)
      VALUES (f.feature_id, f.name, f.description, 'suppliers', true, true, true, false, '{}', '{}', '{}');
    END IF;
  END LOOP;
END $$;
