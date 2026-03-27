-- TRIGGER-BASED SOLUTION: Automatic business profile management
-- This replaces the RPC function approach with a simpler, more reliable trigger-based system
-- Run this in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- STEP 1: Create a function to clean up duplicate business profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_business_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- After any INSERT or UPDATE, clean up duplicates for the same user
  -- Keep only the most recent one (by created_at)
  DELETE FROM public.business_profiles
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND id NOT IN (
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM public.business_profiles
        WHERE user_id = NEW.user_id
      ) ranked
      WHERE rn = 1
    );
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 2: Create trigger that fires AFTER INSERT or UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;

CREATE TRIGGER cleanup_duplicates_on_business_profile
  AFTER INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_duplicate_business_profiles();

-- ============================================================================
-- STEP 3: Create a unique constraint on user_id to prevent duplicates at the database level
-- ============================================================================
-- First, clean up any existing duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.business_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % users with duplicate business profiles. Cleaning up...', duplicate_count;
    
    -- Delete all but the most recent business profile for each user
    DELETE FROM public.business_profiles
    WHERE id IN (
      SELECT id
      FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
        FROM public.business_profiles
      ) ranked
      WHERE rn > 1
    );
    
    RAISE NOTICE 'Cleanup complete. Removed duplicate business profiles.';
  ELSE
    RAISE NOTICE 'No duplicates found.';
  END IF;
END $$;

-- Try to create unique constraint (may fail if duplicates still exist)
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;
  
  -- Create unique constraint to prevent future duplicates
  ALTER TABLE public.business_profiles 
    ADD CONSTRAINT business_profiles_user_id_unique UNIQUE (user_id);
    
  RAISE NOTICE 'Unique constraint created successfully.';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not create unique constraint: %. This is okay if duplicates still exist.', SQLERRM;
    -- The trigger will handle cleanup, so this is not critical
END $$;

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_business_profiles() TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check if trigger was created
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'cleanup_duplicates_on_business_profile';

-- Check if unique constraint was created
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- Verify no duplicates exist
SELECT 
  user_id,
  COUNT(*) as profile_count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- If the above query returns any rows, there are still duplicates
-- The trigger will clean them up on the next INSERT/UPDATE

