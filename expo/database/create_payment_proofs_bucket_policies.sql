-- ============================================
-- PAYMENT_PROOFS BUCKET POLICIES
-- ============================================
-- Run this in Supabase SQL Editor
-- These policies allow authenticated users to upload payment proofs
-- and public read access for viewing proofs via URLs

-- IMPORTANT: First create the bucket in Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: payment_proofs
-- 3. Public bucket: YES (or configure RLS as needed)
-- 4. File size limit: 10 MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

DROP POLICY IF EXISTS "Public Read - payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - payment_proofs" ON storage.objects;

-- ============================================
-- CREATE POLICIES
-- ============================================

-- Policy 1: Public Read Access
-- Allows anyone to view payment proof images via public URLs
-- This is needed because the app uses getPublicUrl() to generate URLs
-- If you want more security, change this to only allow authenticated users
CREATE POLICY "Public Read - payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment_proofs');

-- Policy 2: Authenticated Upload
-- Allows logged-in users to upload payment proof images
CREATE POLICY "Authenticated Upload - payment_proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Authenticated Update
-- Allows logged-in users to update/replace their payment proof images
CREATE POLICY "Authenticated Update - payment_proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Policy 4: Authenticated Delete
-- Allows logged-in users to delete payment proof images
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
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects' 
--   AND policyname LIKE '%payment_proofs%';

-- Check bucket exists:
-- SELECT name, public, file_size_limit, allowed_mime_types 
-- FROM storage.buckets 
-- WHERE name = 'payment_proofs';

-- ============================================
-- ALTERNATIVE: More Secure Policies (Optional)
-- ============================================
-- If you want to restrict read access to authenticated users only,
-- replace the "Public Read" policy with:

-- CREATE POLICY "Authenticated Read - payment_proofs"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'payment_proofs' 
--   AND auth.role() = 'authenticated'
-- );

-- Note: If you use authenticated-only read, you'll need to use
-- signed URLs instead of public URLs in your app code.

