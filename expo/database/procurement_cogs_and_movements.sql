-- ============================================
-- PROCUREMENT INTELLIGENCE: COGS + inventory_movements
-- Run after: procurement_inventory_intelligence.sql, supplier_po_inventory_integration.sql
-- ============================================

-- RPC: Record COGS for a receipt (document type=receipt). Items in document.items may have product_id (uuid string).
-- Call after creating the receipt and sale transaction; pass document id and transaction id.
CREATE OR REPLACE FUNCTION public.record_sale_cogs(
  p_document_id UUID,
  p_sale_transaction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_item JSONB;
  v_product_id UUID;
  v_qty NUMERIC;
  v_unit_cost NUMERIC;
  v_total_cogs NUMERIC;
  v_business_id UUID;
  v_sale_id UUID := p_sale_transaction_id;
  v_count INT := 0;
BEGIN
  SELECT id, business_id, type INTO v_doc FROM documents WHERE id = p_document_id;
  IF NOT FOUND OR v_doc.type <> 'receipt' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Receipt not found');
  END IF;
  v_business_id := v_doc.business_id;

  IF v_sale_id IS NULL THEN
    SELECT id INTO v_sale_id FROM transactions WHERE document_id = p_document_id AND type = 'sale' LIMIT 1;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements((SELECT items FROM documents WHERE id = p_document_id))
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    IF v_product_id IS NULL THEN
      v_product_id := (v_item->>'productId')::UUID;
    END IF;
    IF v_product_id IS NULL THEN
      CONTINUE;
    END IF;
    v_qty := (v_item->>'quantity')::NUMERIC;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(average_cost_price, cost_price) INTO v_unit_cost
    FROM products WHERE id = v_product_id AND business_id = v_business_id;
    IF v_unit_cost IS NULL THEN
      v_unit_cost := 0;
    END IF;
    v_total_cogs := v_qty * v_unit_cost;

    INSERT INTO sales_cogs (business_id, sale_id, document_id, product_id, quantity, unit_cost, total_cogs)
    VALUES (v_business_id, v_sale_id, p_document_id, v_product_id, v_qty, v_unit_cost, v_total_cogs);

    INSERT INTO inventory_movements (business_id, product_id, type, quantity, unit_price, source_ref_type, source_ref_id)
    SELECT v_business_id, v_product_id, 'sale', v_qty, (v_item->>'unitPrice')::NUMERIC, 'pos_sale', p_document_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'lines_recorded', v_count);
END;
$$;

-- Optional: when add_po_to_inventory runs, also insert inventory_movements (purchase) and set products.last_cost_price, last_purchase_date, average_cost_price.
-- We do this by creating a wrapper or updating the existing function. To avoid editing supplier_po_inventory_integration.sql, we add a trigger on inventory_transactions
-- that inserts into inventory_movements and updates products.last_cost_price/last_purchase_date. That way existing RPC stays unchanged.

CREATE OR REPLACE FUNCTION public.sync_inventory_transaction_to_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO inventory_movements (business_id, product_id, type, quantity, unit_cost, supplier_id, source_ref_type, source_ref_id)
  VALUES (NEW.business_id, NEW.product_id, 'purchase', NEW.quantity, NEW.unit_cost, NEW.supplier_id, 'purchase_order', NEW.purchase_order_id);

  UPDATE products
  SET last_cost_price = NEW.unit_cost,
      average_cost_price = cost_price,
      last_purchase_date = NOW(),
      updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_transaction_to_movement ON public.inventory_transactions;
CREATE TRIGGER trg_sync_inventory_transaction_to_movement
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_transaction_to_movement();
