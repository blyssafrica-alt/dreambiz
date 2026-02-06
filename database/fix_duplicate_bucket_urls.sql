-- ============================================
-- FIX DUPLICATE BUCKET NAMES IN PAYMENT PROOF URLS
-- ============================================
-- This script fixes payment proof URLs that have duplicate bucket names
-- Example: .../ad_payment_proofs/ad_payment_proofs/file.png
-- Should be: .../ad_payment_proofs/file.png

-- Step 1: Show URLs that need fixing
SELECT 
  id,
  title,
  payment_proof_url as current_url,
  REPLACE(
    payment_proof_url,
    '/ad_payment_proofs/ad_payment_proofs/',
    '/ad_payment_proofs/'
  ) as fixed_url,
  'Needs fixing' as status
FROM advertisements
WHERE payment_proof_url LIKE '%/ad_payment_proofs/ad_payment_proofs/%';

-- Step 2: Fix URLs in advertisements table
UPDATE advertisements
SET payment_proof_url = REPLACE(
  payment_proof_url,
  '/ad_payment_proofs/ad_payment_proofs/',
  '/ad_payment_proofs/'
),
updated_at = NOW()
WHERE payment_proof_url LIKE '%/ad_payment_proofs/ad_payment_proofs/%';

-- Step 3: Verify the fix
SELECT 
  id,
  title,
  payment_proof_url as fixed_url,
  'Fixed' as status
FROM advertisements
WHERE payment_proof_url IS NOT NULL
  AND payment_proof_url != ''
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================
-- IMPORTANT: Check Storage Files
-- ============================================
-- After running this script, check in Supabase Dashboard:
-- Storage > ad_payment_proofs
--
-- If files exist at: ad_payment_proofs/ad_payment_proofs/filename.png
-- You need to either:
-- 1. Move them to: ad_payment_proofs/filename.png (in Dashboard)
-- 2. Or re-upload the payment proof images (they'll use correct path)

