-- ============================================
-- FIX DUPLICATE BUCKET NAMES IN PAYMENT PROOF URLS
-- ============================================
-- This script fixes payment proof URLs that have duplicate bucket names
-- Example: .../ad_payment_proofs/ad_payment_proofs/file.png
-- Should be: .../ad_payment_proofs/file.png

-- Fix URLs in advertisements table
UPDATE advertisements
SET payment_proof_url = REPLACE(
  payment_proof_url,
  '/ad_payment_proofs/ad_payment_proofs/',
  '/ad_payment_proofs/'
)
WHERE payment_proof_url LIKE '%/ad_payment_proofs/ad_payment_proofs/%';

-- Show affected rows
SELECT 
  id,
  title,
  payment_proof_url as old_url,
  REPLACE(
    payment_proof_url,
    '/ad_payment_proofs/ad_payment_proofs/',
    '/ad_payment_proofs/'
  ) as fixed_url
FROM advertisements
WHERE payment_proof_url LIKE '%/ad_payment_proofs/ad_payment_proofs/%';

