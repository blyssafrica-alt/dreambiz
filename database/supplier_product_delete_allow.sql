-- Allow deleting supplier_marketplace_products even when they appear in purchase order items.
-- PO lines that referenced the product will keep quantity/unit_price but product_id becomes NULL.
-- Run after: supplier_growth_procurement.sql (or whenever supplier_purchase_order_items exists).

-- 1) Drop the existing foreign key (name is auto-generated; discover it if needed)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'supplier_purchase_order_items'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'product_id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.supplier_purchase_order_items DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

-- 2) Allow product_id to be NULL (so we can set it to NULL when product is deleted)
ALTER TABLE public.supplier_purchase_order_items
  ALTER COLUMN product_id DROP NOT NULL;

-- 3) Re-add foreign key with ON DELETE SET NULL
ALTER TABLE public.supplier_purchase_order_items
  ADD CONSTRAINT supplier_purchase_order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.supplier_marketplace_products(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.supplier_purchase_order_items.product_id IS 'Nullable so product can be deleted; order line keeps quantity and unit_price.';
