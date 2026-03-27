-- ============================================
-- Migration: Add Decimal Quantity Support
-- ============================================
-- This migration updates the products table to support decimal quantities
-- (e.g., 1.5kg, 2.3kg) for products sold by weight or other fractional units.
--
-- Date: 2024
-- Purpose: Support decimal quantities in POS and product management

-- Update products table to use DECIMAL instead of INTEGER for quantity
ALTER TABLE products 
  ALTER COLUMN quantity TYPE DECIMAL(15, 2) USING quantity::DECIMAL(15, 2);

-- Add a comment to document the change
COMMENT ON COLUMN products.quantity IS 'Product quantity - supports decimal values (e.g., 1.5, 2.3) for products sold by weight or other fractional units';

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration: Decimal Quantity Support';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Updated products.quantity to DECIMAL(15, 2)';
  RAISE NOTICE '';
  RAISE NOTICE 'The quantity column now supports decimal values like:';
  RAISE NOTICE '  - 1.5 (for 1.5kg)';
  RAISE NOTICE '  - 2.3 (for 2.3kg)';
  RAISE NOTICE '  - 0.75 (for 0.75 units)';
  RAISE NOTICE '';
  RAISE NOTICE 'Verifying column type...';
  
  PERFORM column_name, data_type, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_name = 'products' AND column_name = 'quantity';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '========================================';
END $$;

