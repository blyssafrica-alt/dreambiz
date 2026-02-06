-- Diagnostic query to check payment proof URLs in advertisements
-- Run this in Supabase SQL Editor to see if payment proofs are being saved

-- Check ads with payment proofs
SELECT 
  id,
  title,
  status,
  payment_status,
  payment_proof_url,
  payment_amount,
  payment_currency,
  payment_reference,
  created_at
FROM advertisements
WHERE payment_proof_url IS NOT NULL 
  AND payment_proof_url != ''
ORDER BY created_at DESC
LIMIT 20;

-- Count ads with payment proofs by status
SELECT 
  status,
  payment_status,
  COUNT(*) as count,
  COUNT(payment_proof_url) as with_proof_url
FROM advertisements
GROUP BY status, payment_status
ORDER BY status, payment_status;

-- Check if ad_payment_proofs bucket exists
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'ad_payment_proofs';

-- Check storage policies for ad_payment_proofs
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;

-- Check if there are any files in ad_payment_proofs bucket
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'ad_payment_proofs'
ORDER BY created_at DESC
LIMIT 10;

