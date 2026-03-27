-- COMPLETE FIX: Remove Wrong Triggers + Create Bulletproof RPC
-- Run this ONE script to fix everything
-- Run in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- STEP 1: Remove ALL wrong triggers and functions
-- ============================================================================

-- Drop wrong trigger
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;

-- Drop wrong trigger function
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles();

-- Drop wrong RPC functions
DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles(UUID);

-- Remove wrong UNIQUE constraint
ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 2: Create bulletproof create_business_profile RPC
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

  -- STEP 1: Get max_businesses limit (handle all edge cases)
  -- Default to 1 if plan system doesn't exist or plan not found
  v_max_businesses := 1;
  
  -- Try to get plan (handle gracefully if function/table doesn't exist)
  BEGIN
    -- Try get_user_subscription_plan function
    BEGIN
      SELECT public.get_user_subscription_plan(p_user_id) INTO v_plan_id
      FROM (SELECT public.get_user_subscription_plan(p_user_id) as plan_id LIMIT 1) sub;
    EXCEPTION
      WHEN OTHERS THEN
        v_plan_id := NULL;
    END;
    
    -- If no plan, try to get Free plan
    IF v_plan_id IS NULL THEN
      BEGIN
        SELECT id INTO v_plan_id
        FROM (SELECT id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1) sub;
      EXCEPTION
        WHEN OTHERS THEN
          v_plan_id := NULL;
      END;
    END IF;
    
    -- Get max_businesses from plan
    IF v_plan_id IS NOT NULL THEN
      BEGIN
        SELECT max_businesses INTO v_max_businesses
        FROM (SELECT max_businesses FROM public.subscription_plans WHERE id = v_plan_id LIMIT 1) sub;
        -- If NULL, keep default of 1
        IF v_max_businesses IS NULL THEN
          v_max_businesses := 1;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          v_max_businesses := 1;
      END;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If anything fails, default to 1
      v_max_businesses := 1;
  END;

  -- STEP 2: Count existing businesses (COUNT always returns one row)
  SELECT COUNT(*) INTO v_business_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- STEP 3: Check business limit (-1 means unlimited)
  IF v_max_businesses != -1 AND v_business_count >= v_max_businesses THEN
    RAISE EXCEPTION 'Business limit reached. Your plan allows % businesses. Please upgrade your plan to create more businesses.', v_max_businesses;
  END IF;

  -- STEP 4: Create the new business profile
  -- RETURNING always returns exactly one row (the newly inserted row)
  INSERT INTO public.business_profiles (
    user_id, name, type, stage, location, capital, currency, owner,
    phone, email, address, dream_big_book, logo, created_at, updated_at
  )
  VALUES (
    p_user_id, p_name, p_type, p_stage, p_location, p_capital, p_currency, p_owner,
    p_phone, p_email, p_address, p_dream_big_book, p_logo, NOW(), NOW()
  )
  RETURNING id INTO v_new_business_id;

  -- STEP 5: Get the newly created business by ID (always returns one row)
  SELECT row_to_json(bp.*)::JSONB INTO v_result
  FROM (
    SELECT * FROM public.business_profiles WHERE id = v_new_business_id LIMIT 1
  ) bp;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve newly created business profile';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN too_many_rows THEN
    RAISE EXCEPTION 'Database error: Multiple rows returned unexpectedly. Please contact support.';
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Business profile with this name already exists for your account';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create business profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check triggers (should be empty or only valid triggers)
SELECT tgname as trigger_name
FROM pg_trigger
WHERE tgrelid = 'public.business_profiles'::regclass
  AND tgname LIKE '%business_profile%';

-- Check functions (should only have create_business_profile and update_business_profile)
SELECT proname as function_name
FROM pg_proc
WHERE proname IN (
  'create_business_profile',
  'update_business_profile',
  'cleanup_duplicate_business_profiles',
  'upsert_business_profile',
  'create_or_update_business_profile',
  'safe_upsert_business_profile'
)
ORDER BY proname;

-- Check constraints (should NOT have business_profiles_user_id_unique)
SELECT conname as constraint_name
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ No triggers on business_profiles (or only valid ones)
-- ✅ Only create_business_profile and update_business_profile functions exist
-- ✅ No unique constraint on user_id
-- ✅ Users can now have multiple business profiles
-- ============================================================================

