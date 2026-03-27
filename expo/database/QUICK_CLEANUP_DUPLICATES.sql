-- QUICK CLEANUP: Delete all duplicate business profiles
-- This keeps only the most recent business profile per user
-- Run this in Supabase SQL Editor with "No limit" selected

-- First, check how many duplicates exist
SELECT 
  user_id,
  COUNT(*) as count
FROM business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the most recent one per user
DELETE FROM business_profiles
WHERE id NOT IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM business_profiles
  ) ranked
  WHERE rn = 1
);

-- Verify cleanup worked (should return 0 rows or empty)
SELECT 
  user_id,
  COUNT(*) as count
FROM business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

