-- ============================================
-- PROCUREMENT + INVENTORY INTELLIGENCE
-- Part 1: Data model extensions
-- Run after: supplier_po_inventory_integration.sql, create_employee_roles_permissions.sql
-- ============================================

-- ---------------------------------------------------------------------------
-- A) Product inventory fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_cost_price NUMERIC(15, 2) DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS average_cost_price NUMERIC(15, 2) DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ DEFAULT NULL;
-- Ensure default_supplier_id exists (from supplier_po_inventory_integration.sql)
-- quantity = stock; cost_price = current/weighted avg; selling_price already exists

CREATE INDEX IF NOT EXISTS idx_products_reorder_level ON public.products(business_id) WHERE reorder_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_last_purchase ON public.products(business_id, last_purchase_date DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- B) Inventory movements (all in/out for traceability)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return')),
  quantity NUMERIC(15, 3) NOT NULL,
  unit_cost NUMERIC(15, 2),
  unit_price NUMERIC(15, 2),
  supplier_id UUID REFERENCES public.supplier_marketplace_profiles(id) ON DELETE SET NULL,
  source_ref_type TEXT CHECK (source_ref_type IN ('purchase_order', 'pos_sale', 'manual', 'adjustment')),
  source_ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business ON public.inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(business_id, type);

-- ---------------------------------------------------------------------------
-- C) COGS tracking (per sale line)
-- ---------------------------------------------------------------------------
-- Link sale to document: add document_id to transactions if missing (optional; we can link via description + date or add column)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'document_id') THEN
    ALTER TABLE public.transactions ADD COLUMN document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_transactions_document_id ON public.transactions(document_id) WHERE document_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sales_cogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(15, 3) NOT NULL,
  unit_cost NUMERIC(15, 2) NOT NULL,
  total_cogs NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_cogs_business ON public.sales_cogs(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_cogs_sale ON public.sales_cogs(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_cogs_document ON public.sales_cogs(document_id);
CREATE INDEX IF NOT EXISTS idx_sales_cogs_product ON public.sales_cogs(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_cogs_created ON public.sales_cogs(created_at DESC);

-- ---------------------------------------------------------------------------
-- D) Supplier performance metrics (daily snapshot)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  purchases_count INTEGER NOT NULL DEFAULT 0,
  purchases_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  avg_unit_cost_index NUMERIC(15, 4),
  delivery_lead_time_avg NUMERIC(10, 2),
  rfq_response_time_avg NUMERIC(10, 2),
  complaints_count INTEGER NOT NULL DEFAULT 0,
  disputes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, business_id, date)
);
CREATE INDEX IF NOT EXISTS idx_supplier_metrics_daily_supplier ON public.supplier_metrics_daily(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_metrics_daily_date ON public.supplier_metrics_daily(date DESC);

-- ---------------------------------------------------------------------------
-- E) Reorder suggestions and settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reorder_settings (
  business_id UUID PRIMARY KEY REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  default_days_of_stock INTEGER NOT NULL DEFAULT 14,
  low_stock_threshold_pct INTEGER NOT NULL DEFAULT 20,
  suggestion_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (suggestion_frequency IN ('daily', 'weekly'))
);

CREATE TABLE IF NOT EXISTS public.reorder_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.supplier_marketplace_profiles(id) ON DELETE SET NULL,
  suggested_quantity NUMERIC(15, 3) NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('below_reorder_level', 'fast_selling', 'stockout_risk', 'seasonal')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'ordered', 'snoozed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_business ON public.reorder_suggestions(business_id);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_status ON public.reorder_suggestions(business_id, status);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_created ON public.reorder_suggestions(created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: inventory_movements, sales_cogs, reorder_suggestions, reorder_settings, supplier_metrics_daily
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage inventory_movements for own business" ON public.inventory_movements;
CREATE POLICY "Users manage inventory_movements for own business" ON public.inventory_movements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true)
  );

ALTER TABLE public.sales_cogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage sales_cogs for own business" ON public.sales_cogs;
CREATE POLICY "Users manage sales_cogs for own business" ON public.sales_cogs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true)
  );

ALTER TABLE public.reorder_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage reorder_settings for own business" ON public.reorder_settings;
CREATE POLICY "Users manage reorder_settings for own business" ON public.reorder_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true)
  );

ALTER TABLE public.reorder_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage reorder_suggestions for own business" ON public.reorder_suggestions;
CREATE POLICY "Users manage reorder_suggestions for own business" ON public.reorder_suggestions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true)
  );

-- supplier_metrics_daily: buyers see their business row; suppliers see their supplier_id
ALTER TABLE public.supplier_metrics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view supplier_metrics for own business or supplier" ON public.supplier_metrics_daily;
CREATE POLICY "Users view supplier_metrics for own business or supplier" ON public.supplier_metrics_daily
  FOR SELECT USING (
    (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text))
    OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles s WHERE s.id = supplier_id AND s.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Feature config entries (Part 8)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('reorder-suggestions', 'Reorder suggestions', 'Smart low-stock and reorder suggestions', 'inventory'),
    ('one-tap-reorder', 'One-tap reorder', 'Create purchase order from suggestion in one tap', 'inventory'),
    ('supplier-profit-report', 'Supplier profit report', 'See profit and margin by supplier', 'analytics'),
    ('inventory-valuation-report', 'Inventory valuation report', 'Stock value and category breakdown', 'analytics'),
    ('supplier-performance-analytics', 'Supplier performance', 'Response time, repeat purchase, badges', 'suppliers'),
    ('automated-cogs', 'Automated COGS', 'Cost of goods sold and gross profit from sales', 'financial')
  ) AS t(feature_id, name, description, category)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.feature_config WHERE feature_id = f.feature_id) THEN
      INSERT INTO public.feature_config (feature_id, name, description, category, enabled, enabled_by_default, can_be_disabled, is_premium, premium_plan_ids, access, visibility)
      VALUES (f.feature_id, f.name, f.description, f.category, true, true, true, false, '{}', '{}', '{}');
      RAISE NOTICE 'Created feature: %', f.feature_id;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- RPC: Generate reorder suggestions for a business (Part 2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_reorder_suggestions(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_product RECORD;
  v_avg_daily_sales NUMERIC := 0;
  v_days_left NUMERIC := 999;
  v_target_days INT := 14;
  v_suggested_qty NUMERIC;
  v_reason TEXT;
  v_count INT := 0;
BEGIN
  SELECT user_id INTO v_user_id FROM business_profiles WHERE id = p_business_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Business not found');
  END IF;
  IF v_user_id::text <> auth.uid()::text AND NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.business_id = p_business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your business');
  END IF;

  SELECT COALESCE(default_days_of_stock, 14) INTO v_target_days FROM reorder_settings WHERE business_id = p_business_id;

  -- Clear existing open suggestions for this business so we don't duplicate
  DELETE FROM reorder_suggestions WHERE business_id = p_business_id AND status = 'open';

  FOR v_product IN
    SELECT p.id, p.name, p.quantity, p.reorder_level, p.reorder_quantity, p.cost_price, p.default_supplier_id
    FROM products p
    WHERE p.business_id = p_business_id AND p.is_active = true
  LOOP
    v_reason := NULL;
    v_suggested_qty := COALESCE(v_product.reorder_quantity, 1);

    -- Below reorder level
    IF v_product.reorder_level IS NOT NULL AND (v_product.quantity IS NULL OR v_product.quantity <= v_product.reorder_level) THEN
      v_reason := 'below_reorder_level';
      v_suggested_qty := GREATEST(COALESCE(v_product.reorder_quantity, 1), v_product.reorder_level - COALESCE(v_product.quantity, 0));
    ELSE
      -- Optional: fast_selling / stockout_risk from sales velocity (simplified: skip if no inventory_transactions/sales data)
      NULL;
    END IF;

    IF v_reason IS NOT NULL AND v_suggested_qty > 0 THEN
      INSERT INTO reorder_suggestions (business_id, product_id, supplier_id, suggested_quantity, reason, status)
      VALUES (p_business_id, v_product.id, v_product.default_supplier_id, v_suggested_qty, v_reason, 'open');
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Create draft PO from a reorder suggestion (Part 3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase_order_from_suggestion(p_suggestion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sugg RECORD;
  v_buyer_id UUID;
  v_marketplace_product_id UUID;
  v_po_id UUID;
  v_total NUMERIC;
  v_unit_price NUMERIC;
BEGIN
  SELECT s.id, s.business_id, s.product_id, s.supplier_id, s.suggested_quantity, p.name AS product_name, p.cost_price, p.last_cost_price
  INTO v_sugg
  FROM reorder_suggestions s
  JOIN products p ON p.id = s.product_id
  WHERE s.id = p_suggestion_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Suggestion not found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_profiles b WHERE b.id = v_sugg.business_id AND b.user_id::text = auth.uid()::text)
     AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.business_id = v_sugg.business_id AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your business');
  END IF;

  SELECT user_id INTO v_buyer_id FROM business_profiles WHERE id = v_sugg.business_id;
  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Business owner not found');
  END IF;

  IF v_sugg.supplier_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No default supplier for this product');
  END IF;

  -- Resolve marketplace product by supplier and product name (first match)
  SELECT id INTO v_marketplace_product_id
  FROM supplier_marketplace_products
  WHERE supplier_profile_id = v_sugg.supplier_id AND LOWER(TRIM(name)) = LOWER(TRIM(v_sugg.product_name))
  LIMIT 1;
  IF v_marketplace_product_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Supplier does not list a product matching "' || v_sugg.product_name || '"');
  END IF;

  v_unit_price := COALESCE(v_sugg.last_cost_price, v_sugg.cost_price, 0);
  v_total := v_sugg.suggested_quantity * v_unit_price;

  INSERT INTO supplier_purchase_orders (supplier_id, buyer_id, status, total_amount, currency)
  VALUES (v_sugg.supplier_id, v_buyer_id, 'draft', v_total, 'USD')
  RETURNING id INTO v_po_id;

  INSERT INTO supplier_purchase_order_items (purchase_order_id, product_id, quantity, unit_price)
  VALUES (v_po_id, v_marketplace_product_id, v_sugg.suggested_quantity, v_unit_price);

  UPDATE reorder_suggestions SET status = 'ordered', updated_at = NOW() WHERE id = p_suggestion_id;

  RETURN jsonb_build_object('ok', true, 'purchase_order_id', v_po_id);
END;
$$;
