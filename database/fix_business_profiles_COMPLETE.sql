-- COMPLETE FIX: Business Profile Duplicate Prevention and Cleanup
-- This script provides a comprehensive solution to prevent and fix duplicate business profiles
-- Run this in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- STEP 1: Clean up ALL existing duplicates FIRST
-- ============================================================================
DO $$
DECLARE
  duplicate_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count how many users have duplicates
  SELECT COUNT(DISTINCT user_id) INTO duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.business_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % users with duplicate business profiles. Cleaning up...', duplicate_count;
    
    -- Delete all but the most recent business profile for each user
    WITH ranked_profiles AS (
      SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, updated_at DESC) as rn
      FROM public.business_profiles
    )
    DELETE FROM public.business_profiles
    WHERE id IN (
      SELECT id FROM ranked_profiles WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Cleanup complete. Removed % duplicate business profiles.', deleted_count;
  ELSE
    RAISE NOTICE 'No duplicates found.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop existing unique constraint if it exists (to recreate it)
-- ============================================================================
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 3: Create unique constraint on user_id to prevent future duplicates
-- ============================================================================
ALTER TABLE public.business_profiles 
  ADD CONSTRAINT business_profiles_user_id_unique UNIQUE (user_id);

-- ============================================================================
-- STEP 4: Create/Replace trigger function to clean up duplicates
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_business_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- After any INSERT or UPDATE, check for and clean up duplicates for the same user
  -- Keep only the most recent one (by created_at, then updated_at)
  
  SELECT COUNT(*) INTO duplicate_count
  FROM public.business_profiles
  WHERE user_id = NEW.user_id;
  
  -- If there are duplicates, delete all but the most recent
  IF duplicate_count > 1 THEN
    DELETE FROM public.business_profiles
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND id NOT IN (
        SELECT id
        FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY created_at DESC, updated_at DESC) as rn
          FROM public.business_profiles
          WHERE user_id = NEW.user_id
        ) ranked
        WHERE rn = 1
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 5: Create/Replace trigger
-- ============================================================================
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;

CREATE TRIGGER cleanup_duplicates_on_business_profile
  AFTER INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_duplicate_business_profiles();

-- ============================================================================
-- STEP 6: Create a helper function to safely upsert business profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION public.safe_upsert_business_profile(
  p_user_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_stage TEXT,
  p_location TEXT,
  p_capital NUMERIC,
  p_currency TEXT,
  p_owner TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_dream_big_book TEXT DEFAULT 'none',
  p_logo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_existing_id UUID;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- CRITICAL: Clean up duplicates FIRST before attempting UPSERT
  DELETE FROM public.business_profiles
  WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id
      FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (ORDER BY created_at DESC, updated_at DESC) as rn
        FROM public.business_profiles
        WHERE user_id = p_user_id
      ) ranked
      WHERE rn = 1
    );

  -- Get existing profile ID (should be at most 1 now)
  SELECT id INTO v_existing_id
  FROM public.business_profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Update or Insert
  IF v_existing_id IS NOT NULL THEN
    -- UPDATE existing profile
    UPDATE public.business_profiles
    SET
      name = p_name,
      type = p_type,
      stage = p_stage,
      location = p_location,
      capital = p_capital,
      currency = p_currency,
      owner = p_owner,
      phone = p_phone,
      email = p_email,
      address = p_address,
      dream_big_book = p_dream_big_book,
      logo = p_logo,
      updated_at = NOW()
    WHERE id = v_existing_id
    RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;
  ELSE
    -- INSERT new profile
    INSERT INTO public.business_profiles (
      user_id,
      name,
      type,
      stage,
      location,
      capital,
      currency,
      owner,
      phone,
      email,
      address,
      dream_big_book,
      logo,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_name,
      p_type,
      p_stage,
      p_location,
      p_capital,
      p_currency,
      p_owner,
      p_phone,
      p_email,
      p_address,
      p_dream_big_book,
      p_logo,
      NOW(),
      NOW()
    )
    RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create/update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.safe_upsert_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check if unique constraint exists
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'cleanup_duplicates_on_business_profile';

-- Check if function exists
SELECT 
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN ('cleanup_duplicate_business_profiles', 'safe_upsert_business_profile');

-- Verify no duplicates exist
SELECT 
  user_id,
  COUNT(*) as profile_count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- If the above query returns any rows, there are still duplicates
-- Run the cleanup section again

