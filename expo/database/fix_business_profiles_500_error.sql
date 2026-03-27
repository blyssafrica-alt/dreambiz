-- COMPLETE FIX FOR "query returned more than one row" 500 ERROR
-- This script fixes the root cause of the 500 error during business profile creation
-- Run this in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- ROOT CAUSE ANALYSIS:
-- ============================================================================
-- 1. The error "query returned more than one row" occurs when:
--    - A SELECT INTO statement returns multiple rows
--    - A .single() call in Supabase client expects one row but gets multiple
--    - Duplicate business_profiles exist for the same user_id
--
-- 2. The error happens because:
--    - No unique constraint exists on user_id (allows duplicates)
--    - Client code uses .single() which fails with multiple rows
--    - Triggers or RPC functions use SELECT INTO without LIMIT 1
--
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
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, updated_at DESC NULLS LAST) as rn
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
ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 3: Create unique constraint on user_id to prevent future duplicates
-- ============================================================================
-- This is CRITICAL - it prevents duplicates at the database level
ALTER TABLE public.business_profiles 
  ADD CONSTRAINT business_profiles_user_id_unique UNIQUE (user_id);

-- ============================================================================
-- STEP 4: Drop and recreate trigger function to ensure it's correct
-- ============================================================================
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles();

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_business_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- After any INSERT or UPDATE, clean up duplicates for the same user
  -- Keep only the most recent one (by created_at, then updated_at)
  -- This is a safety net in case the unique constraint is somehow bypassed
  
  DELETE FROM public.business_profiles
  WHERE user_id = NEW.user_id
    AND id != NEW.id;
  
  -- With the unique constraint, this should never delete anything,
  -- but it's here as a safety measure
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 5: Create trigger that fires AFTER INSERT or UPDATE
-- ============================================================================
CREATE TRIGGER cleanup_duplicates_on_business_profile
  AFTER INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_duplicate_business_profiles();

-- ============================================================================
-- STEP 6: Create a safe RPC function that uses UPSERT (ON CONFLICT)
-- ============================================================================
-- This function uses PostgreSQL's native UPSERT to handle duplicates atomically
CREATE OR REPLACE FUNCTION public.upsert_business_profile(
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
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- Use PostgreSQL's native UPSERT (ON CONFLICT) to handle duplicates atomically
  -- This is the SAFEST and MOST RELIABLE method
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
    COALESCE((SELECT created_at FROM public.business_profiles WHERE user_id = p_user_id LIMIT 1), NOW()),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    stage = EXCLUDED.stage,
    location = EXCLUDED.location,
    capital = EXCLUDED.capital,
    currency = EXCLUDED.currency,
    owner = EXCLUDED.owner,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    dream_big_book = EXCLUDED.dream_big_book,
    logo = EXCLUDED.logo,
    updated_at = NOW()
  RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    -- This should never happen with ON CONFLICT, but handle it gracefully
    RAISE EXCEPTION 'Duplicate business profile detected. Please contact support.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create/update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check if unique constraint exists
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  CASE WHEN contype = 'u' THEN 'UNIQUE' ELSE contype::text END as constraint_type_name
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

-- Check if RPC function exists
SELECT 
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'upsert_business_profile';

-- Verify no duplicates exist
SELECT 
  user_id,
  COUNT(*) as profile_count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- If the above query returns any rows, there are still duplicates
-- Run the cleanup section (STEP 1) again

