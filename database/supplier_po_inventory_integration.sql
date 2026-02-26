-- ============================================
-- Supplier PO → Products, Inventory, Finances integration
-- Run after supplier_growth_procurement.sql and existing products/transactions schema
-- ============================================

-- 1) inventory_transactions: traceability and reporting
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.supplier_marketplace_profiles(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.supplier_purchase_orders(id) ON DELETE SET NULL,
  quantity NUMERIC(15, 3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(15, 2) NOT NULL,
  total_cost NUMERIC(15, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'credit')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_business ON public.inventory_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_po ON public.inventory_transactions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON public.inventory_transactions(created_at DESC);

-- 2) products: link to supplier when created from PO
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_supplier_id UUID REFERENCES public.supplier_marketplace_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_default_supplier ON public.products(default_supplier_id);

-- 3) supplier_accounts_payable: when paying by credit
CREATE TABLE IF NOT EXISTS public.supplier_accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.supplier_purchase_orders(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_ap_business ON public.supplier_accounts_payable(business_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ap_supplier ON public.supplier_accounts_payable(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ap_po ON public.supplier_accounts_payable(purchase_order_id);

-- 4) PO: mark when inventory has been added (optional, prevents double-add)
ALTER TABLE public.supplier_purchase_orders ADD COLUMN IF NOT EXISTS inventory_added BOOLEAN NOT NULL DEFAULT false;

-- 5) transactions: allow type 'inventory_purchase' (reduces cash, not expense for P&L)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('sale', 'expense', 'inventory_purchase'));

-- 6) RLS
-- Note: business_profiles.user_id references public.users(id), and public.users(id) = auth.users(id).
-- employees.auth_user_id is the auth user who can log in as that employee (see create_employee_roles_permissions.sql).
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage inventory_transactions for own business" ON public.inventory_transactions;
CREATE POLICY "Users manage inventory_transactions for own business" ON public.inventory_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true)
  );

ALTER TABLE public.supplier_accounts_payable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage supplier_ap for own business" ON public.supplier_accounts_payable;
CREATE POLICY "Users manage supplier_ap for own business" ON public.supplier_accounts_payable
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = business_id AND b.user_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.business_id = business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true)
  );

-- 7) RPC: add PO to inventory (atomic)
CREATE OR REPLACE FUNCTION public.add_po_to_inventory(
  p_business_id UUID,
  p_purchase_order_id UUID,
  p_item_ids UUID[],
  p_payment_method TEXT,
  p_selling_prices JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po RECORD;
  v_item RECORD;
  v_supplier_product RECORD;
  v_existing_product RECORD;
  v_new_product_id UUID;
  v_total_cost NUMERIC := 0;
  v_user_id UUID;
  v_weighted_avg NUMERIC;
  v_new_qty INT;
  v_created_ids UUID[] := '{}';
BEGIN
  IF p_payment_method NOT IN ('cash', 'bank_transfer', 'mobile_money', 'credit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid payment method');
  END IF;

  SELECT buyer_id, supplier_id, status, total_amount, currency INTO v_po
  FROM supplier_purchase_orders WHERE id = p_purchase_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Purchase order not found');
  END IF;
  -- buyer_id on supplier_purchase_orders references auth.users(id)
  IF v_po.buyer_id::text <> auth.uid()::text THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your purchase order');
  END IF;
  IF v_po.status NOT IN ('accepted', 'completed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PO must be accepted or completed');
  END IF;

  -- business_profiles.user_id = owner's public.users(id) = auth.uid() for owner
  SELECT user_id INTO v_user_id FROM business_profiles WHERE id = p_business_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Business not found');
  END IF;
  IF v_user_id::text <> auth.uid()::text AND NOT EXISTS (
    SELECT 1 FROM public.employees e WHERE e.business_id = p_business_id AND e.auth_user_id IS NOT NULL AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your business');
  END IF;

  FOR v_item IN
    SELECT i.id, i.product_id, i.quantity, i.unit_price
    FROM supplier_purchase_order_items i
    WHERE i.purchase_order_id = p_purchase_order_id
      AND (p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL OR i.id = ANY(p_item_ids))
  LOOP
    SELECT name, subcategory_id INTO v_supplier_product
    FROM supplier_marketplace_products WHERE id = v_item.product_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT id, quantity, cost_price INTO v_existing_product
    FROM products
    WHERE business_id = p_business_id AND LOWER(TRIM(name)) = LOWER(TRIM(v_supplier_product.name))
    LIMIT 1;

    IF FOUND THEN
      v_new_qty := COALESCE(v_existing_product.quantity, 0) + v_item.quantity::INT;
      v_weighted_avg := (COALESCE(v_existing_product.cost_price, 0) * COALESCE(v_existing_product.quantity, 0) + v_item.unit_price * v_item.quantity) / NULLIF(v_new_qty, 0);
      UPDATE products SET quantity = v_new_qty, cost_price = v_weighted_avg, updated_at = NOW()
      WHERE id = v_existing_product.id;
      v_new_product_id := v_existing_product.id;
    ELSE
      INSERT INTO products (user_id, business_id, name, description, cost_price, selling_price, currency, quantity, category, is_active, default_supplier_id)
      VALUES (
        v_user_id, p_business_id, v_supplier_product.name, NULL,
        v_item.unit_price, COALESCE((p_selling_prices->>v_item.product_id::text)::NUMERIC, v_item.unit_price * 1.2),
        v_po.currency, v_item.quantity::INT, NULL, true, v_po.supplier_id
      )
      RETURNING id INTO v_new_product_id;
    END IF;

    v_total_cost := v_total_cost + (v_item.unit_price * v_item.quantity);
    INSERT INTO inventory_transactions (business_id, product_id, supplier_id, purchase_order_id, quantity, unit_cost, total_cost, payment_method)
    VALUES (p_business_id, v_new_product_id, v_po.supplier_id, p_purchase_order_id, v_item.quantity, v_item.unit_price, v_item.unit_price * v_item.quantity, p_payment_method);
  END LOOP;

  IF v_total_cost <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No valid items selected');
  END IF;

  IF p_payment_method = 'credit' THEN
    INSERT INTO supplier_accounts_payable (business_id, supplier_id, purchase_order_id, amount, currency, reference)
    VALUES (p_business_id, v_po.supplier_id, p_purchase_order_id, v_total_cost, v_po.currency, 'PO-' || p_purchase_order_id::text);
  ELSE
    INSERT INTO transactions (user_id, business_id, type, amount, currency, description, category, date)
    VALUES (v_user_id, p_business_id, 'inventory_purchase', v_total_cost, v_po.currency,
      'Inventory purchase from supplier (PO)', p_payment_method, CURRENT_DATE);
  END IF;

  UPDATE supplier_purchase_orders SET inventory_added = true, updated_at = NOW() WHERE id = p_purchase_order_id;
  RETURN jsonb_build_object('ok', true, 'total_cost', v_total_cost);
END;
$$;
