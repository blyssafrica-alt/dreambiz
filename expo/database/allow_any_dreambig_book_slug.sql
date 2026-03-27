-- Remove CHECK constraint on dream_big_book to allow any book slug from database
-- This allows admin-added books to be selected by users
-- Run this in your Supabase SQL Editor

-- First, drop the existing CHECK constraint if it exists
DO $$ 
BEGIN
  -- Find and drop the constraint
  ALTER TABLE business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_dream_big_book_check;
  
  -- Also try dropping with the auto-generated name if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname LIKE '%dream_big_book%check%'
    AND conrelid = 'business_profiles'::regclass
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE business_profiles DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conname LIKE '%dream_big_book%check%'
      AND conrelid = 'business_profiles'::regclass
      LIMIT 1
    );
  END IF;
END $$;

-- Verify the constraint is removed
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'business_profiles' 
AND column_name = 'dream_big_book';

-- Note: The column now accepts any TEXT value, allowing book slugs from the database

