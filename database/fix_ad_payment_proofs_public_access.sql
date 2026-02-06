-- ============================================
-- FIX AD_PAYMENT_PROOFS PUBLIC ACCESS
-- ============================================
-- Run this in Supabase SQL Editor
-- This ensures the bucket is public and has correct RLS policies

-- Step 1: Make sure bucket is public
-- Note: This might need to be done in Dashboard, but we can check here
UPDATE storage.buckets
SET public = true
WHERE name = 'ad_payment_proofs';

-- Step 2: Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Public Read - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own ad payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can manage ad payment proofs" ON storage.objects;

-- Step 3: Create Public Read Policy (MOST IMPORTANT - allows anyone to view images)
CREATE POLICY "Public Read - ad_payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_payment_proofs');

-- Step 4: Create Authenticated Upload Policy
CREATE POLICY "Authenticated Upload - ad_payment_proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad_payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Step 5: Create Authenticated Update Policy
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

-- Step 6: Create Authenticated Delete Policy
CREATE POLICY "Authenticated Delete - ad_payment_proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad_payment_proofs'
  AND auth.role() = 'authenticated'
);

-- Step 7: Verify bucket is public
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'ad_payment_proofs';

-- Step 8: Verify policies were created
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;

-- Step 9: Test public access to a specific file
-- Replace the filename with your actual file
SELECT 
  o.name,
  o.bucket_id,
  b.public as bucket_is_public,
  o.created_at,
  o.metadata->>'size' as size_bytes
FROM storage.objects o
JOIN storage.buckets b ON b.name = o.bucket_id
WHERE o.bucket_id = 'ad_payment_proofs'
  AND o.name = 'ad-payment-proof-1770391637368.png';

-- ============================================
-- IMPORTANT: Also check in Dashboard
-- ============================================
-- 1. Go to Storage > ad_payment_proofs
-- 2. Click Settings (gear icon)
-- 3. Ensure "Public bucket" is checked/enabled
-- 4. Save if you made changes

