-- ============================================
-- VERIFY AD_PAYMENT_PROOFS BUCKET SETUP
-- ============================================
-- Run this in Supabase SQL Editor to verify bucket configuration

-- Step 1: Check if bucket exists and is public
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'ad_payment_proofs';

-- Step 2: Check RLS policies for the bucket
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

-- Step 3: Check if there are any files in the bucket
-- Note: This requires storage API access, but you can also check manually in Dashboard
-- Go to: Storage > ad_payment_proofs and check what files exist

-- Step 4: Test public access (this will show if policies allow public read)
-- The bucket should have a policy like:
-- CREATE POLICY "Public Read - ad_payment_proofs"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'ad_payment_proofs');

-- Step 5: Check specific file path
-- Replace 'ad-payment-proof-1770391637368.png' with your actual filename
SELECT 
  name,
  bucket_id,
  created_at,
  updated_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'ad_payment_proofs'
  AND name LIKE '%ad-payment-proof-1770391637368%'
ORDER BY created_at DESC;

-- Step 6: Check all files in the bucket (to see what actually exists)
SELECT 
  name,
  bucket_id,
  created_at,
  (metadata->>'size')::bigint as size_bytes
FROM storage.objects
WHERE bucket_id = 'ad_payment_proofs'
ORDER BY created_at DESC
LIMIT 20;

