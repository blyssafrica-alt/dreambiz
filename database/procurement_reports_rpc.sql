-- ============================================
-- PROCUREMENT REPORTS: RPCs for P&L (COGS), Supplier profit, Inventory valuation
-- Run after: procurement_inventory_intelligence.sql, procurement_cogs_and_movements.sql
-- ============================================

-- P&L summary including COGS (for Reports tab)
CREATE OR REPLACE FUNCTION public.get_pnl_summary(
  p_business_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sales NUMERIC := 0;
  v_total_expenses NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM business_profiles b WHERE b.id = p_business_id AND b.user_id::text = auth.uid()::text)
     AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.business_id = p_business_id AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your business');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_sales
  FROM transactions
  WHERE business_id = p_business_id AND type = 'sale' AND date >= p_date_from AND date <= p_date_to;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM transactions
  WHERE business_id = p_business_id AND type = 'expense' AND date >= p_date_from AND date <= p_date_to;

  SELECT COALESCE(SUM(total_cogs), 0) INTO v_total_cogs
  FROM sales_cogs
  WHERE business_id = p_business_id AND created_at::date >= p_date_from AND created_at::date <= p_date_to;

  RETURN jsonb_build_object(
    'ok', true,
    'total_sales', v_total_sales,
    'total_expenses', v_total_expenses,
    'total_cogs', v_total_cogs,
    'gross_profit', v_total_sales - v_total_cogs,
    'net_profit', v_total_sales - v_total_cogs - v_total_expenses
  );
END;
$$;

-- Supplier profit summary (for Supplier profit report)
CREATE OR REPLACE FUNCTION public.get_supplier_profit_summary(
  p_business_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  purchases_value NUMERIC,
  revenue NUMERIC,
  cogs NUMERIC,
  gross_profit NUMERIC,
  margin_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM business_profiles b WHERE b.id = p_business_id AND b.user_id::text = auth.uid()::text)
     AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.business_id = p_business_id AND e.auth_user_id::text = auth.uid()::text AND e.is_active = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH supplier_cogs AS (
    SELECT p.default_supplier_id AS sid,
           COALESCE(SUM(sc.total_cogs), 0) AS c
    FROM sales_cogs sc
    JOIN products p ON p.id = sc.product_id AND p.business_id = sc.business_id
    WHERE sc.business_id = p_business_id
      AND sc.created_at::date >= p_date_from AND sc.created_at::date <= p_date_to
      AND p.default_supplier_id IS NOT NULL
    GROUP BY p.default_supplier_id
  ),
  supplier_purchases AS (
    SELECT it.supplier_id AS sid,
           COALESCE(SUM(it.total_cost), 0) AS p
    FROM inventory_transactions it
    WHERE it.business_id = p_business_id
      AND it.created_at::date >= p_date_from AND it.created_at::date <= p_date_to
      AND it.supplier_id IS NOT NULL
    GROUP BY it.supplier_id
  ),
  supplier_revenue AS (
    SELECT p.default_supplier_id AS sid,
           COALESCE(SUM(
             COALESCE((elem->>'total')::NUMERIC, ((elem->>'quantity')::NUMERIC * (elem->>'unitPrice')::NUMERIC))
           ), 0) AS r
    FROM documents d
    CROSS JOIN LATERAL jsonb_array_elements(d.items) AS elem
    JOIN products p ON p.id = ((elem->>'productId')::UUID) AND p.business_id = d.business_id AND p.default_supplier_id IS NOT NULL
    WHERE d.business_id = p_business_id
      AND d.type = 'receipt'
      AND d.status = 'paid'
      AND d.date >= p_date_from AND d.date <= p_date_to
      AND (elem->>'productId') IS NOT NULL
    GROUP BY p.default_supplier_id
  )
  SELECT
    COALESCE(sp.sid, sc.sid, sr.sid),
    smp.business_name,
    COALESCE(sp.p, 0),
    COALESCE(sr.r, 0),
    COALESCE(sc.c, 0),
    COALESCE(sr.r, 0) - COALESCE(sc.c, 0),
    CASE WHEN COALESCE(sr.r, 0) > 0 THEN ROUND(100.0 * (COALESCE(sr.r, 0) - COALESCE(sc.c, 0)) / sr.r, 2) ELSE NULL END
  FROM (SELECT DISTINCT sid FROM supplier_cogs UNION SELECT sid FROM supplier_purchases UNION SELECT sid FROM supplier_revenue) u(sid)
  LEFT JOIN supplier_purchases sp ON sp.sid = u.sid
  LEFT JOIN supplier_cogs sc ON sc.sid = u.sid
  LEFT JOIN supplier_revenue sr ON sr.sid = u.sid
  LEFT JOIN supplier_marketplace_profiles smp ON smp.id = u.sid
  WHERE u.sid IS NOT NULL;
END;
$$;
