-- ============================================
-- SUPPLIER PRODUCT SPECIFICATIONS
-- Run after: supplier_network_upgrade.sql
-- Adds: specifications JSONB to supplier_marketplace_products
-- Format: [{ "key": "Material", "value": "Cotton" }, { "key": "Weight", "value": "500g" }]
-- ============================================

ALTER TABLE public.supplier_marketplace_products
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.supplier_marketplace_products.specifications IS 'Array of { key, value } for product specs: Material, Size, Weight, Color, etc.';
