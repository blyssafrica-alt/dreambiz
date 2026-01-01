-- ============================================================================
-- COMPREHENSIVE FIX: Clean up duplicate business profiles and prevent future duplicates
-- Run this in Supabase SQL Editor with "No limit" selected
-- ============================================================================

-- ============================================================================
-- STEP 1: Clean up ALL existing duplicates
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
    RAISE NOTICE '🔍 Found % users with duplicate business profiles. Cleaning up...', duplicate_count;
    
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
    RAISE NOTICE '✅ Cleanup complete. Removed % duplicate business profiles.', deleted_count;
  ELSE
    RAISE NOTICE '✅ No duplicates found.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop old/conflicting functions and constraints
-- ============================================================================
-- Drop any old functions that might conflict
DROP FUNCTION IF EXISTS public.create_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Drop any unique constraint if exists (we'll handle duplicates differently)
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 3: Create the create_business_profile RPC function
-- This is what BusinessContext.tsx calls
-- This function:
-- - Cleans up duplicates FIRST (bulletproof approach)
-- - Creates OR updates the business profile (acts like upsert)
-- - Returns ONLY the single business profile
-- - Never fails with "query returned more than one row"
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_business_profile(
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
  v_deleted_count INTEGER;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user' USING ERRCODE = 'P0002';
  END IF;

  -- CRITICAL: Clean up ALL duplicates FIRST before any operation
  -- This prevents "query returned more than one row" errors
  WITH ranked_profiles AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at DESC, updated_at DESC) as rn
    FROM public.business_profiles
    WHERE user_id = p_user_id
  )
  DELETE FROM public.business_profiles
  WHERE user_id = p_user_id
  AND id IN (
    SELECT id FROM ranked_profiles WHERE rn > 1
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % duplicate business profiles for user %', v_deleted_count, p_user_id;
  END IF;

  -- Now check if a profile exists (LIMIT 1 ensures safety)
  SELECT id INTO v_existing_id
  FROM public.business_profiles
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

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
    
    RAISE NOTICE 'Updated existing business profile: %', v_existing_id;
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
    
    RAISE NOTICE 'Created new business profile';
  END IF;

  -- Ensure we got a result
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to create/update business profile: No data returned' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create business profile: %', SQLERRM USING ERRCODE = 'P0001';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- 1. Verify no duplicates exist
SELECT 
  user_id,
  COUNT(*) as profile_count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- 2. Check that RPC function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proargnames as parameters
FROM pg_proc
WHERE proname = 'create_business_profile';

-- 3. Display summary
DO $$
DECLARE
  total_users INTEGER;
  total_profiles INTEGER;
  users_with_profiles INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO total_users FROM public.business_profiles;
  SELECT COUNT(*) INTO total_profiles FROM public.business_profiles;
  SELECT COUNT(DISTINCT user_id) INTO users_with_profiles FROM public.business_profiles;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total business profiles: %', total_profiles;
  RAISE NOTICE 'Total users with profiles: %', users_with_profiles;
  RAISE NOTICE 'Average profiles per user: %', ROUND(total_profiles::NUMERIC / NULLIF(users_with_profiles, 0), 2);
  RAISE NOTICE '==========================================';
END $$;
