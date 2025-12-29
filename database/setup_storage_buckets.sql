-- Setup Supabase Storage Buckets for All Images and Documents
-- Run this in Supabase SQL Editor after creating buckets in Storage UI

-- Note: You need to create these buckets manually in Supabase Storage UI first:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create each bucket with public access (or configure RLS policies)
-- 3. Then run this script to set up policies

-- Buckets needed:
-- - book_covers (for book cover images)
-- - book-documents (for PDF/Word book documents)
-- - ad_images (for advertisement images)
-- - product_images (for product images)
-- - business_logos (for business logo images)

-- Storage policies for book_covers bucket
-- Allow authenticated users to upload
-- Allow public read access

-- Storage policies for book-documents bucket
-- Allow authenticated users to upload
-- Allow public read access

-- Storage policies for ad_images bucket
-- Allow authenticated users to upload
-- Allow public read access

-- Storage policies for product_images bucket
-- Allow authenticated users to upload
-- Allow public read access

-- Storage policies for business_logos bucket
-- Allow authenticated users to upload
-- Allow public read access

-- Example RLS Policy (adjust based on your needs):
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'book_covers');
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'book_covers' AND auth.role() = 'authenticated');

COMMENT ON SCHEMA storage IS 'All images and documents are stored in Supabase Storage buckets for cross-device sync';

