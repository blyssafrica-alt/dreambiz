-- FIX: Support Multiple Business Profiles Per User
-- This script removes the incorrect UNIQUE constraint and creates proper RPC functions
-- Run this in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- STEP 1: Remove the incorrect UNIQUE constraint (allows multiple businesses)
-- ============================================================================
ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 2: Drop old trigger that assumes one business per user
-- ============================================================================
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles();

-- ============================================================================
-- STEP 3: Drop old RPC functions that assume one business per user
-- ============================================================================
DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- STEP 4: Create RPC function to CREATE a new business (never updates)
-- This function:
-- - Checks subscription plan limits
-- - Creates a NEW business profile
-- - Returns ONLY the newly created business
-- - Never uses SELECT INTO that could return multiple rows
-- NOTE: This is a simplified version. For the bulletproof version with
-- full error handling, see database/fix_create_business_profile_rpc.sql
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
  -- Try to get plan from get_user_subscription_plan function (if it exists)
  BEGIN
    SELECT public.get_user_subscription_plan(p_user_id) INTO v_plan_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Function might not exist, continue with NULL
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
        -- Table might not exist, continue with NULL
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
        -- Plan might not exist, default to 1
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

  -- STEP 5: Get the newly created business (using the ID we just got)
  -- This ensures we return ONLY the newly created business, never multiple rows
  SELECT row_to_json(bp.*)::JSONB INTO v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id;

  -- If result is still NULL (shouldn't happen), return error
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve newly created business profile';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Business profile with this name already exists for your account';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- STEP 5: Create RPC function to UPDATE an existing business
-- This function:
-- - Updates a specific business by ID
-- - Returns ONLY the updated business
-- - Never uses SELECT INTO that could return multiple rows
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
  SELECT user_id INTO v_user_id
  FROM public.business_profiles
  WHERE id = p_business_id
  LIMIT 1;

  -- Verify the business exists and belongs to the authenticated user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Business profile not found';
  END IF;

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
  RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;

  -- If result is NULL, the update didn't affect any rows
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to update business profile';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that unique constraint was removed
SELECT 
  conname as constraint_name
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';
-- Should return 0 rows

-- Check that RPC functions exist
SELECT 
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN ('create_business_profile', 'update_business_profile');

-- Verify users can have multiple businesses
SELECT 
  user_id,
  COUNT(*) as business_count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;
-- This should return rows if users have multiple businesses (which is correct)

