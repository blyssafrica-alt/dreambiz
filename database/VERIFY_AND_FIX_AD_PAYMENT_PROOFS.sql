-- ============================================
-- VERIFY AND FIX AD_PAYMENT_PROOFS BUCKET
-- ============================================
-- This script verifies the bucket configuration and fixes it
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: CHECK IF BUCKET EXISTS AND IS PUBLIC
-- ============================================
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'ad_payment_proofs';

-- If no results, the bucket doesn't exist - create it in Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: ad_payment_proofs
-- 3. Public bucket: YES (CRITICAL!)
-- 4. File size limit: 10 MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- STEP 2: MAKE BUCKET PUBLIC (if it exists)
-- ============================================
UPDATE storage.buckets
SET public = true
WHERE name = 'ad_payment_proofs';

-- ============================================
-- STEP 3: DROP EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public Read - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - ad_payment_proofs" ON storage.objects;

-- ============================================
-- STEP 4: CREATE PUBLIC READ POLICY (CRITICAL!)
-- ============================================
-- This is the same policy that book_covers uses - it allows anyone to view images
CREATE POLICY "Public Read - ad_payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_payment_proofs');

-- ============================================
-- STEP 5: CREATE AUTHENTICATED UPLOAD POLICY
-- ============================================
CREATE POLICY "Authenticated Upload - ad_payment_proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad_payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- STEP 6: CREATE AUTHENTICATED UPDATE POLICY
-- ============================================
CREATE POLICY "Authenticated Update - ad_payment_proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ad_payment_proofs' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'ad_payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- STEP 7: CREATE AUTHENTICATED DELETE POLICY
-- ============================================
CREATE POLICY "Authenticated Delete - ad_payment_proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad_payment_proofs'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- STEP 8: VERIFY BUCKET IS PUBLIC
-- ============================================
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'ad_payment_proofs';
-- Expected: public = true

-- ============================================
-- STEP 9: VERIFY POLICIES WERE CREATED
-- ============================================
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;
-- Expected: 4 policies (Public Read, Authenticated Upload, Update, Delete)

-- ============================================
-- STEP 10: COMPARE WITH WORKING BOOK_COVERS
-- ============================================
-- Verify book_covers has the same setup
SELECT 
  b.name,
  b.public,
  COUNT(p.policyname) as policy_count
FROM storage.buckets b
LEFT JOIN pg_policies p ON p.schemaname = 'storage' 
  AND p.tablename = 'objects' 
  AND p.policyname LIKE '%' || b.name || '%'
WHERE b.name IN ('book_covers', 'ad_payment_proofs')
GROUP BY b.name, b.public;
-- Both should show public = true and similar policy counts

-- ============================================
-- STEP 11: TEST FILE ACCESS
-- ============================================
-- Check if any files exist in the bucket
SELECT 
  o.name,
  o.bucket_id,
  b.public as bucket_is_public,
  o.created_at,
  (o.metadata->>'size')::bigint as size_bytes
FROM storage.objects o
JOIN storage.buckets b ON b.name = o.bucket_id
WHERE o.bucket_id = 'ad_payment_proofs'
ORDER BY o.created_at DESC
LIMIT 5;

-- ============================================
-- IMPORTANT: ALSO CHECK IN DASHBOARD
-- ============================================
-- 1. Go to Supabase Dashboard > Storage > ad_payment_proofs
-- 2. Click Settings (gear icon)
-- 3. Ensure "Public bucket" checkbox is CHECKED
-- 4. Click Save
-- 5. This is CRITICAL - SQL alone might not be enough

