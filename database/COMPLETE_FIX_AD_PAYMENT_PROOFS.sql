-- ============================================
-- COMPLETE FIX FOR AD_PAYMENT_PROOFS BUCKET
-- ============================================
-- Run this in Supabase SQL Editor
-- This is a comprehensive fix that ensures the bucket is public
-- and has all necessary RLS policies

-- ============================================
-- STEP 1: ENSURE BUCKET EXISTS AND IS PUBLIC
-- ============================================
-- Note: Buckets must be created via Dashboard, but we can make it public via SQL

-- Make bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'ad_payment_proofs';

-- If bucket doesn't exist, you'll need to create it in Dashboard first:
-- 1. Go to Storage > New Bucket
-- 2. Name: ad_payment_proofs
-- 3. Public bucket: YES
-- 4. File size limit: 10 MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public Read - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own ad payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can manage ad payment proofs" ON storage.objects;

-- ============================================
-- STEP 3: CREATE PUBLIC READ POLICY (CRITICAL)
-- ============================================
-- This allows anyone to view images via public URLs
CREATE POLICY "Public Read - ad_payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_payment_proofs');

-- ============================================
-- STEP 4: CREATE AUTHENTICATED UPLOAD POLICY
-- ============================================
CREATE POLICY "Authenticated Upload - ad_payment_proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad_payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- STEP 5: CREATE AUTHENTICATED UPDATE POLICY
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
-- STEP 6: CREATE AUTHENTICATED DELETE POLICY
-- ============================================
CREATE POLICY "Authenticated Delete - ad_payment_proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad_payment_proofs'
  AND auth.role() = 'authenticated'
);

-- ============================================
-- STEP 7: VERIFY BUCKET CONFIGURATION
-- ============================================
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'ad_payment_proofs';

-- ============================================
-- STEP 8: VERIFY POLICIES WERE CREATED
-- ============================================
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;

-- ============================================
-- STEP 9: TEST - CHECK RECENT FILES
-- ============================================
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
LIMIT 10;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- After running this script:
-- 1. Bucket should show public = true
-- 2. You should see 4 policies:
--    - Public Read - ad_payment_proofs (SELECT)
--    - Authenticated Upload - ad_payment_proofs (INSERT)
--    - Authenticated Update - ad_payment_proofs (UPDATE)
--    - Authenticated Delete - ad_payment_proofs (DELETE)
-- 3. Recent files should be visible

-- ============================================
-- IF STILL NOT WORKING
-- ============================================
-- 1. Go to Supabase Dashboard > Storage > ad_payment_proofs
-- 2. Click Settings (gear icon)
-- 3. Ensure "Public bucket" is checked
-- 4. Save changes
-- 5. Try accessing a file URL directly in browser:
--    https://[your-project].supabase.co/storage/v1/object/public/ad_payment_proofs/[filename]
-- 6. If it loads in browser but not in app, check CORS settings

