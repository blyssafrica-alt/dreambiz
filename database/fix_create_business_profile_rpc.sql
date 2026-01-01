-- BULLETPROOF FIX: create_business_profile RPC Function
-- This version NEVER uses SELECT INTO that could return multiple rows
-- Run this in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- Drop the old function first
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- Create bulletproof version that handles multiple businesses correctly
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
  v_temp_result RECORD;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- STEP 1: Get user's subscription plan and max_businesses limit
  -- Use a subquery with LIMIT 1 to ensure only one row is returned
  -- Handle all edge cases gracefully
  
  -- Try to get plan from get_user_subscription_plan function (if it exists)
  BEGIN
    SELECT public.get_user_subscription_plan(p_user_id) INTO STRICT v_plan_id;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist, continue with NULL
      v_plan_id := NULL;
    WHEN too_many_rows THEN
      -- Function returned multiple rows (shouldn't happen, but handle it)
      SELECT public.get_user_subscription_plan(p_user_id) INTO v_plan_id
      FROM (SELECT public.get_user_subscription_plan(p_user_id) as plan_id LIMIT 1) sub;
    WHEN OTHERS THEN
      -- Any other error, continue with NULL
      v_plan_id := NULL;
  END;
  
  -- If no plan found, try to get default Free plan
  -- Use subquery with LIMIT 1 to ensure only one row
  IF v_plan_id IS NULL THEN
    BEGIN
      SELECT id INTO STRICT v_plan_id
      FROM (
        SELECT id
        FROM public.subscription_plans
        WHERE name = 'Free'
        LIMIT 1
      ) sub;
    EXCEPTION
      WHEN no_data_found THEN
        -- No Free plan exists, continue with NULL
        v_plan_id := NULL;
      WHEN too_many_rows THEN
        -- Multiple Free plans (shouldn't happen, but handle it)
        SELECT id INTO v_plan_id
        FROM (
          SELECT id
          FROM public.subscription_plans
          WHERE name = 'Free'
          LIMIT 1
        ) sub;
      WHEN undefined_table THEN
        -- Table doesn't exist, continue with NULL
        v_plan_id := NULL;
      WHEN OTHERS THEN
        -- Any other error, continue with NULL
        v_plan_id := NULL;
    END;
  END IF;
  
  -- Get max_businesses from plan (-1 means unlimited)
  -- Use subquery with LIMIT 1 to ensure only one row
  IF v_plan_id IS NOT NULL THEN
    BEGIN
      SELECT max_businesses INTO STRICT v_max_businesses
      FROM (
        SELECT max_businesses
        FROM public.subscription_plans
        WHERE id = v_plan_id
        LIMIT 1
      ) sub;
    EXCEPTION
      WHEN no_data_found THEN
        -- Plan not found, default to 1
        v_max_businesses := 1;
      WHEN too_many_rows THEN
        -- Multiple plans with same ID (shouldn't happen, but handle it)
        SELECT max_businesses INTO v_max_businesses
        FROM (
          SELECT max_businesses
          FROM public.subscription_plans
          WHERE id = v_plan_id
          LIMIT 1
        ) sub;
      WHEN OTHERS THEN
        -- Any other error, default to 1
        v_max_businesses := 1;
    END;
  END IF;
  
  -- If plan not found or max_businesses is NULL, default to 1 (Free plan limit)
  IF v_max_businesses IS NULL THEN
    v_max_businesses := 1;
  END IF;

  -- STEP 2: Count existing businesses for this user
  -- COUNT(*) always returns exactly one row, so this is safe
  SELECT COUNT(*) INTO v_business_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- STEP 3: Check if user has reached their business limit
  IF v_max_businesses != -1 AND v_business_count >= v_max_businesses THEN
    RAISE EXCEPTION 'Business limit reached. Your plan allows % businesses. Please upgrade your plan to create more businesses.', v_max_businesses;
  END IF;

  -- STEP 4: Create the new business profile
  -- Use INSERT with RETURNING to get the newly created row ID
  -- This always returns exactly one row (the newly inserted row)
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
  RETURNING id INTO STRICT v_new_business_id;

  -- STEP 5: Get the newly created business (using the ID we just got)
  -- Use subquery with LIMIT 1 to ensure only one row is returned
  -- This ensures we return ONLY the newly created business, never multiple rows
  SELECT row_to_json(bp.*)::JSONB INTO STRICT v_result
  FROM (
    SELECT *
    FROM public.business_profiles
    WHERE id = v_new_business_id
    LIMIT 1
  ) bp;

  -- If result is still NULL (shouldn't happen with STRICT), return error
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve newly created business profile';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN too_many_rows THEN
    -- This should never happen with our subqueries, but handle it
    RAISE EXCEPTION 'Database error: Multiple rows returned unexpectedly. Please contact support.';
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Business profile with this name already exists for your account';
  WHEN OTHERS THEN
    -- Log the actual error for debugging
    RAISE EXCEPTION 'Failed to create business profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that function exists
SELECT 
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'create_business_profile';

-- Test query to verify it works (don't actually call it, just verify syntax)
-- SELECT public.create_business_profile(
--   auth.uid(),
--   'Test Business',
--   'retail',
--   'startup',
--   'Test Location',
--   1000.00,
--   'USD',
--   'Test Owner'
-- );

