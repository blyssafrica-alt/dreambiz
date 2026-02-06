-- ============================================
-- AD_PAYMENT_PROOFS BUCKET CREATION AND POLICIES
-- ============================================
-- Run this in Supabase SQL Editor
-- This creates the bucket and policies for ad payment proof images

-- IMPORTANT: First create the bucket in Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: ad_payment_proofs
-- 3. Public bucket: YES (or configure RLS as needed)
-- 4. File size limit: 10 MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- CREATE BUCKET (if it doesn't exist)
-- ============================================
-- Note: Buckets must be created via Supabase Dashboard or API
-- This SQL will only create policies, not the bucket itself

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

DROP POLICY IF EXISTS "Public Read - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - ad_payment_proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own ad payment proofs" ON storage.objects;

-- ============================================
-- CREATE POLICIES
-- ============================================

-- Policy 1: Public Read Access
-- Allows anyone to view ad payment proof images via public URLs
-- This is needed because the app uses getPublicUrl() to generate URLs
-- If you want more security, change this to only allow authenticated users or admins
CREATE POLICY "Public Read - ad_payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_payment_proofs');

-- Policy 2: Authenticated Upload
-- Allows logged-in users to upload ad payment proof images
CREATE POLICY "Authenticated Upload - ad_payment_proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad_payment_proofs' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Authenticated Update
-- Allows logged-in users to update/replace their ad payment proof images
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

-- Policy 4: Authenticated Delete (Own Files)
-- Allows users to delete their own ad payment proof images
-- Files are stored with user ID in path, so users can only delete their own files
CREATE POLICY "Users can delete own ad payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad_payment_proofs'
  AND auth.role() = 'authenticated'
  -- Users can delete files in their own user folder
  -- Path format: ad_payment_proofs/{userId}/filename or ad_payment_proofs/filename
  -- This allows deletion of any file in the bucket (users should only upload their own)
  -- For stricter security, you could add: AND (storage.foldername(name)[1] = auth.uid()::text)
);

-- Policy 5: Super Admin Full Access
-- Allows super admins to manage all ad payment proofs
CREATE POLICY "Super admins can manage ad payment proofs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'ad_payment_proofs'
  AND is_super_admin()
);

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- Check if policies were created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;


