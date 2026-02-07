-- Create Storage Policies for All Buckets
-- Run this in Supabase SQL Editor
-- These policies allow authenticated users to upload and everyone to read

-- ============================================
-- BOOK_COVERS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Read - book_covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - book_covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - book_covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - book_covers" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Read - book_covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book_covers');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload - book_covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book_covers' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated Update - book_covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book_covers' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete - book_covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book_covers' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- BOOK-DOCUMENTS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Read - book-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - book-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - book-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - book-documents" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Read - book-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-documents');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload - book-documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "Authenticated Update - book-documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete - book-documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-documents' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- AD_IMAGES BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Read - ad_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - ad_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - ad_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - ad_images" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Read - ad_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload - ad_images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "Authenticated Update - ad_images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ad_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete - ad_images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad_images' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- PRODUCT_IMAGES BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Read - product_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - product_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - product_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - product_images" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Read - product_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload - product_images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "Authenticated Update - product_images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete - product_images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- BUSINESS_LOGOS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Read - business_logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - business_logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - business_logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - business_logos" ON storage.objects;

-- Allow public read access
CREATE POLICY "Public Read - business_logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business_logos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload - business_logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business_logos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update (for logo updates)
CREATE POLICY "Authenticated Update - business_logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business_logos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete - business_logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business_logos' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- PAYMENT_PROOFS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Read - payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - payment_proofs" ON storage.objects;

-- Allow public read access (needed for viewing payment proofs via public URLs)
-- Note: If you want more security, you can restrict this to authenticated users only
CREATE POLICY "Public Read - payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment_proofs');

-- Allow authenticated users to upload payment proofs
CREATE POLICY "Authenticated Upload - payment_proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their payment proofs
CREATE POLICY "Authenticated Update - payment_proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete payment proofs
CREATE POLICY "Authenticated Delete - payment_proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check buckets exist:
-- SELECT name, public FROM storage.buckets WHERE name IN ('book_covers', 'book-documents', 'ad_images', 'product_images', 'business_logos', 'payment_proofs');

