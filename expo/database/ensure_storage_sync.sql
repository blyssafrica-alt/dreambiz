-- Ensure all image fields use storage URLs, not base64
-- This script ensures all tables that store images reference Supabase Storage URLs

-- Update books table to ensure cover_image and document_file_url are URLs
-- Note: Run this after migrating any base64 images to storage

-- Update advertisements table - image_url, video_url, thumbnail_url should be storage URLs
-- These are already set up correctly in the schema

-- Update platform_products table - images array should contain storage URLs
-- The images field is JSONB array of URLs

-- Update business_profiles table - logo should be storage URL
-- Check if logo column exists and ensure it stores URLs not base64

DO $$ 
BEGIN
  -- Ensure business_profiles has logo column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'business_profiles' AND column_name = 'logo') THEN
    ALTER TABLE business_profiles ADD COLUMN logo TEXT;
    COMMENT ON COLUMN business_profiles.logo IS 'URL to business logo in Supabase Storage';
  END IF;
END $$;

-- Add comments to clarify image fields should be storage URLs
COMMENT ON COLUMN books.cover_image IS 'URL to book cover image in Supabase Storage (not base64)';
COMMENT ON COLUMN books.document_file_url IS 'URL to PDF/Word document in Supabase Storage';
COMMENT ON COLUMN advertisements.image_url IS 'URL to ad image in Supabase Storage';
COMMENT ON COLUMN advertisements.video_url IS 'URL to ad video in Supabase Storage';
COMMENT ON COLUMN advertisements.thumbnail_url IS 'URL to ad thumbnail in Supabase Storage';
COMMENT ON COLUMN platform_products.images IS 'JSONB array of image URLs in Supabase Storage';

