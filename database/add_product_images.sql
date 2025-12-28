-- Add image support to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN products.featured_image IS 'Base64 encoded image or URI for the featured/main product image';
COMMENT ON COLUMN products.images IS 'JSON array of additional product images (Base64 or URIs)';

