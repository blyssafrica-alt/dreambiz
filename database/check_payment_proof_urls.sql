-- Check payment proof URLs stored in advertisements table
-- Compare with actual files in storage

-- 1. Check what URLs are stored in the database
SELECT 
  id,
  title,
  status,
  payment_status,
  payment_proof_url,
  payment_amount,
  payment_currency,
  created_at
FROM advertisements
WHERE payment_proof_url IS NOT NULL 
  AND payment_proof_url != ''
ORDER BY created_at DESC
LIMIT 10;

-- 2. Extract the file path from stored URLs to compare with storage
SELECT 
  id,
  title,
  payment_proof_url,
  -- Extract path after /storage/v1/object/public/ad_payment_proofs/
  CASE 
    WHEN payment_proof_url LIKE '%/storage/v1/object/public/ad_payment_proofs/%' THEN
      SUBSTRING(payment_proof_url FROM '%/storage/v1/object/public/ad_payment_proofs/#"%#"' FOR '#')
    WHEN payment_proof_url LIKE '%ad_payment_proofs/%' THEN
      SUBSTRING(payment_proof_url FROM '%ad_payment_proofs/#"%#"' FOR '#')
    ELSE payment_proof_url
  END as extracted_path
FROM advertisements
WHERE payment_proof_url IS NOT NULL 
  AND payment_proof_url != ''
ORDER BY created_at DESC;

-- 3. Check files in storage bucket
SELECT 
  name,
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id = 'ad_payment_proofs'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Try to match database URLs with storage files
-- This will help identify if URLs are correct
SELECT 
  a.id as ad_id,
  a.title,
  a.payment_proof_url,
  o.name as storage_file_name,
  CASE 
    WHEN a.payment_proof_url LIKE '%' || o.name || '%' THEN 'MATCH'
    ELSE 'NO MATCH'
  END as url_match
FROM advertisements a
LEFT JOIN storage.objects o ON o.bucket_id = 'ad_payment_proofs'
WHERE a.payment_proof_url IS NOT NULL 
  AND a.payment_proof_url != ''
ORDER BY a.created_at DESC
LIMIT 20;

