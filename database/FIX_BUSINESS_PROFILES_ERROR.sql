-- EMERGENCY FIX: Business Profile "query returned more than one row" Error
-- Run this in Supabase SQL Editor with "No limit" selected
-- This will clean up duplicates and recreate the RPC functions

-- ============================================================================
-- STEP 1: Clean up ALL duplicate business profiles
-- ============================================================================
DO $$
DECLARE
  duplicate_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count users with duplicates
  SELECT COUNT(DISTINCT user_id) INTO duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.business_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️  Found % users with duplicate business profiles. Cleaning up...', duplicate_count;
    
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
-- STEP 2: Drop ALL old RPC functions that might be causing issues
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- ============================================================================
-- STEP 3: Remove unique constraint (allow multiple businesses per user)
-- ============================================================================
ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 4: Create NEW RPC function to CREATE a business (with better error handling)
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
  v_business_count INTEGER;
  v_max_businesses INTEGER;
  v_plan_id UUID;
  v_new_business_id UUID;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- STEP 1: Get user's subscription plan and max_businesses limit
  BEGIN
    SELECT public.get_user_subscription_plan(p_user_id) INTO v_plan_id;
  EXCEPTION
    WHEN OTHERS THEN
      v_plan_id := NULL;
  END;
  
  -- If no plan found, try to get default Free plan
  IF v_plan_id IS NULL THEN
    BEGIN
      SELECT id INTO v_plan_id
      FROM public.subscription_plans
      WHERE name = 'Free'
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_plan_id := NULL;
    END;
  END IF;
  
  -- Get max_businesses from plan (-1 means unlimited)
  IF v_plan_id IS NOT NULL THEN
    BEGIN
      SELECT max_businesses INTO v_max_businesses
      FROM public.subscription_plans
      WHERE id = v_plan_id
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_max_businesses := 1;
    END;
  END IF;
  
  -- If plan not found or max_businesses is NULL, default to 1 (Free plan limit)
  IF v_max_businesses IS NULL THEN
    v_max_businesses := 1;
  END IF;

  -- STEP 2: Count existing businesses for this user
  SELECT COUNT(*) INTO v_business_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- STEP 3: Check if user has reached their business limit
  IF v_max_businesses != -1 AND v_business_count >= v_max_businesses THEN
    RAISE EXCEPTION 'Business limit reached. Your plan allows % businesses. Please upgrade your plan to create more businesses.', v_max_businesses;
  END IF;

  -- STEP 4: Create the new business profile
  -- Use INSERT with RETURNING to get the newly created row
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
  RETURNING id INTO v_new_business_id;

  -- STEP 5: Get the newly created business using the specific ID
  -- Use STRICT to ensure exactly one row is returned
  SELECT row_to_json(bp.*)::JSONB INTO STRICT v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Business profile with this name already exists for your account';
  WHEN too_many_rows THEN
    RAISE EXCEPTION 'Database integrity error: Multiple businesses found with same ID. Please contact support.';
  WHEN no_data_found THEN
    RAISE EXCEPTION 'Failed to retrieve newly created business profile';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- STEP 5: Create RPC function to UPDATE an existing business
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_business_profile(
  p_business_id UUID,
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
  v_user_id UUID;
BEGIN
  -- Get the user_id from the business profile to verify ownership
  SELECT user_id INTO STRICT v_user_id
  FROM public.business_profiles
  WHERE id = p_business_id;

  -- Verify the business belongs to the authenticated user
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to update this business profile';
  END IF;

  -- Update the business profile
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
  WHERE id = p_business_id
  RETURNING row_to_json(business_profiles.*)::JSONB INTO STRICT v_result;

  RETURN v_result;
EXCEPTION
  WHEN no_data_found THEN
    RAISE EXCEPTION 'Business profile not found';
  WHEN too_many_rows THEN
    RAISE EXCEPTION 'Database integrity error: Multiple businesses found with same ID. Please contact support.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check for duplicates (should return 0 rows)
SELECT 
  user_id,
  COUNT(*) as profile_count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 2. Verify unique constraint was removed (should return 0 rows)
SELECT 
  conname as constraint_name
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- 3. Check that RPC functions exist (should return 2 rows)
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('create_business_profile', 'update_business_profile')
  AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Business profile fix complete!';
  RAISE NOTICE '✅ Duplicates cleaned up';
  RAISE NOTICE '✅ RPC functions recreated';
  RAISE NOTICE '✅ Ready to create business profiles';
END $$;
