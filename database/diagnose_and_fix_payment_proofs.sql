-- ============================================
-- DIAGNOSE AND FIX PAYMENT PROOF URLS
-- ============================================
-- This script helps diagnose and fix payment proof URLs
-- Run this in Supabase SQL Editor

-- Step 1: Check what URLs are stored in the database
SELECT 
  id,
  title,
  payment_proof_url,
  CASE 
    WHEN payment_proof_url LIKE '%/ad_payment_proofs/ad_payment_proofs/%' THEN 'DUPLICATE_BUCKET'
    WHEN payment_proof_url LIKE '%/ad_payment_proofs/%' THEN 'CORRECT'
    ELSE 'UNKNOWN'
  END as url_status,
  created_at,
  updated_at
FROM advertisements
WHERE payment_proof_url IS NOT NULL
  AND payment_proof_url != ''
ORDER BY created_at DESC;

-- Step 2: Check if files exist in storage (this requires storage API access)
-- Note: You'll need to check manually in Supabase Dashboard > Storage > ad_payment_proofs
-- Look for files at:
-- - ad_payment_proofs/ad-payment-proof-*.png (correct location)
-- - ad_payment_proofs/ad_payment_proofs/ad-payment-proof-*.png (wrong location with duplicate)

-- Step 3: Fix URLs that have duplicate bucket names
-- This updates the database URLs to remove the duplicate bucket name
UPDATE advertisements
SET payment_proof_url = REPLACE(
  payment_proof_url,
  '/ad_payment_proofs/ad_payment_proofs/',
  '/ad_payment_proofs/'
)
WHERE payment_proof_url LIKE '%/ad_payment_proofs/ad_payment_proofs/%';

-- Step 4: Show the fixed URLs
SELECT 
  id,
  title,
  payment_proof_url as fixed_url,
  'Fixed' as status
FROM advertisements
WHERE payment_proof_url IS NOT NULL
  AND payment_proof_url != ''
ORDER BY updated_at DESC;

-- ============================================
-- MANUAL STEPS (if files are at wrong path):
-- ============================================
-- If files were uploaded to: ad_payment_proofs/ad_payment_proofs/filename.png
-- But should be at: ad_payment_proofs/filename.png
--
-- Option 1: Move files in Supabase Dashboard
-- 1. Go to Storage > ad_payment_proofs
-- 2. Navigate to ad_payment_proofs/ folder (if it exists)
-- 3. Move files from ad_payment_proofs/ad_payment_proofs/ to ad_payment_proofs/
--
-- Option 2: Re-upload the payment proof images
-- 1. Download the files from the wrong location
-- 2. Re-upload them to the correct location
-- 3. The new uploads will use the correct path automatically

