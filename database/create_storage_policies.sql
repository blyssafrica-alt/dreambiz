-- Create Storage Policies for All Buckets
-- Run this in Supabase SQL Editor
-- These policies allow authenticated users to upload and everyone to read

-- ============================================
-- BOOK_COVERS BUCKET POLICIES
-- ============================================

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public Read - book_covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book_covers');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated Upload - book_covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book_covers' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY IF NOT EXISTS "Authenticated Update - book_covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book_covers' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY IF NOT EXISTS "Authenticated Delete - book_covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book_covers' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- BOOK-DOCUMENTS BUCKET POLICIES
-- ============================================

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public Read - book-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-documents');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated Upload - book-documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY IF NOT EXISTS "Authenticated Update - book-documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY IF NOT EXISTS "Authenticated Delete - book-documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-documents' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- AD_IMAGES BUCKET POLICIES
-- ============================================

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public Read - ad_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_images');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated Upload - ad_images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY IF NOT EXISTS "Authenticated Update - ad_images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ad_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY IF NOT EXISTS "Authenticated Delete - ad_images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad_images' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- PRODUCT_IMAGES BUCKET POLICIES
-- ============================================

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public Read - product_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated Upload - product_images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY IF NOT EXISTS "Authenticated Update - product_images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY IF NOT EXISTS "Authenticated Delete - product_images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- BUSINESS_LOGOS BUCKET POLICIES
-- ============================================

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Public Read - business_logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business_logos');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Authenticated Upload - business_logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business_logos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update (for logo updates)
CREATE POLICY IF NOT EXISTS "Authenticated Update - business_logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business_logos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY IF NOT EXISTS "Authenticated Delete - business_logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business_logos' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check buckets exist:
-- SELECT name, public FROM storage.buckets WHERE name IN ('book_covers', 'book-documents', 'ad_images', 'product_images', 'business_logos');

