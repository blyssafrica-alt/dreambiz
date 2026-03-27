-- ============================================================================
-- COMPREHENSIVE BUSINESS PROFILE FIX
-- This script completely fixes all business profile issues
-- Run this in Supabase SQL Editor with "No limit" selected
-- ============================================================================

-- ============================================================================
-- PART 1: CLEANUP - Remove ALL existing duplicates and constraints
-- ============================================================================

-- Step 1.1: Drop all old functions that might cause conflicts
DROP FUNCTION IF EXISTS public.create_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Step 1.2: Drop old triggers
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles();

-- Step 1.3: Remove unique constraint (we want to allow multiple businesses per user)
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- Step 1.4: Clean up all existing duplicates (keep only the most recent for each user)
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
    RAISE NOTICE '🧹 Found % users with duplicate business profiles. Cleaning up...', duplicate_count;
    
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
    RAISE NOTICE '✅ Cleanup complete. Removed % duplicate business profiles.', deleted_count;
  ELSE
    RAISE NOTICE '✅ No duplicates found. Database is clean.';
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE NEW RPC FUNCTION - CREATE BUSINESS (supports multiple businesses)
-- ============================================================================

-- This function creates a NEW business profile
-- It checks subscription plan limits and enforces them
-- It NEVER causes "query returned more than one row" errors
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
  v_plan_name TEXT;
  v_new_business_id UUID;
BEGIN
  -- Step 1: Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- Step 2: Get user's plan and max_businesses limit
  -- Try to get from user_subscriptions first
  BEGIN
    SELECT sp.max_businesses, sp.name INTO v_max_businesses, v_plan_name
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date > NOW())
    ORDER BY us.start_date DESC
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_max_businesses := NULL;
      v_plan_name := NULL;
  END;
  
  -- If no active subscription, check for active trial
  IF v_max_businesses IS NULL THEN
    BEGIN
      SELECT sp.max_businesses, sp.name INTO v_max_businesses, v_plan_name
      FROM public.premium_trials pt
      JOIN public.subscription_plans sp ON sp.id = pt.plan_id
      WHERE pt.user_id = p_user_id
        AND pt.status = 'active'
        AND pt.end_date > NOW()
      ORDER BY pt.start_date DESC
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_max_businesses := NULL;
        v_plan_name := NULL;
    END;
  END IF;
  
  -- If still no plan, try to get default Free plan
  IF v_max_businesses IS NULL THEN
    BEGIN
      SELECT max_businesses, name INTO v_max_businesses, v_plan_name
      FROM public.subscription_plans
      WHERE name = 'Free' AND is_active = true
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Subscription plans table might not exist, default to 1
        v_max_businesses := 1;
        v_plan_name := 'Free (default)';
    END;
  END IF;
  
  -- Final fallback: if still NULL, default to 1
  IF v_max_businesses IS NULL THEN
    v_max_businesses := 1;
    v_plan_name := 'Free (default)';
  END IF;

  -- Step 3: Count existing businesses for this user
  SELECT COUNT(*) INTO v_business_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- Step 4: Check if user has reached their business limit
  -- -1 means unlimited
  IF v_max_businesses != -1 AND v_business_count >= v_max_businesses THEN
    RAISE EXCEPTION 'Business limit reached. Your % plan allows % business(es). You currently have % business(es). Please upgrade your plan to create more businesses.', 
      v_plan_name, v_max_businesses, v_business_count
      USING ERRCODE = 'P0001';
  END IF;

  -- Step 5: Insert the new business profile
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

  -- Step 6: Fetch and return the newly created business
  -- Using the specific ID ensures we never get multiple rows
  SELECT row_to_json(bp.*)::JSONB INTO v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id;

  -- Verify we got a result
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve newly created business profile';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A business with this name already exists'
      USING ERRCODE = 'P0002';
  WHEN OTHERS THEN
    -- Re-raise with better error message
    RAISE EXCEPTION 'Failed to create business profile: %', SQLERRM
      USING ERRCODE = SQLSTATE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- PART 3: CREATE RPC FUNCTION - UPDATE BUSINESS
-- ============================================================================

-- This function updates an EXISTING business profile
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
  -- Step 1: Get the user_id from the business profile to verify ownership
  SELECT user_id INTO v_user_id
  FROM public.business_profiles
  WHERE id = p_business_id
  LIMIT 1;

  -- Step 2: Verify the business exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Business profile not found'
      USING ERRCODE = 'P0003';
  END IF;

  -- Step 3: Verify ownership
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to update this business profile'
      USING ERRCODE = 'P0004';
  END IF;

  -- Step 4: Update the business profile
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

  -- Step 5: Verify the update succeeded
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to update business profile'
      USING ERRCODE = 'P0005';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update business profile: %', SQLERRM
      USING ERRCODE = SQLSTATE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_business_profile TO authenticated;

-- ============================================================================
-- PART 4: CREATE HELPER FUNCTION - GET USER'S BUSINESS COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_business_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;
  
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_business_count TO authenticated;

-- ============================================================================
-- PART 5: CREATE HELPER FUNCTION - GET USER'S BUSINESS LIMIT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_business_limit(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_businesses INTEGER;
BEGIN
  -- Try to get from user_subscriptions first
  BEGIN
    SELECT sp.max_businesses INTO v_max_businesses
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date > NOW())
    ORDER BY us.start_date DESC
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_max_businesses := NULL;
  END;
  
  -- If no active subscription, check for active trial
  IF v_max_businesses IS NULL THEN
    BEGIN
      SELECT sp.max_businesses INTO v_max_businesses
      FROM public.premium_trials pt
      JOIN public.subscription_plans sp ON sp.id = pt.plan_id
      WHERE pt.user_id = p_user_id
        AND pt.status = 'active'
        AND pt.end_date > NOW()
      ORDER BY pt.start_date DESC
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_max_businesses := NULL;
    END;
  END IF;
  
  -- If still no plan, try to get default Free plan
  IF v_max_businesses IS NULL THEN
    BEGIN
      SELECT max_businesses INTO v_max_businesses
      FROM public.subscription_plans
      WHERE name = 'Free' AND is_active = true
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_max_businesses := 1;
    END;
  END IF;
  
  -- Final fallback
  IF v_max_businesses IS NULL THEN
    v_max_businesses := 1;
  END IF;
  
  RETURN v_max_businesses;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_business_limit TO authenticated;

-- ============================================================================
-- PART 6: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Running verification checks...';
  RAISE NOTICE '';
  
  -- Check 1: Verify unique constraint is removed
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.business_profiles'::regclass
      AND conname = 'business_profiles_user_id_unique'
  ) THEN
    RAISE NOTICE '❌ FAILED: Unique constraint still exists';
  ELSE
    RAISE NOTICE '✅ PASSED: Unique constraint removed (users can have multiple businesses)';
  END IF;
  
  -- Check 2: Verify RPC functions exist
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'create_business_profile'
      AND prosecdef = true
  ) THEN
    RAISE NOTICE '✅ PASSED: create_business_profile function exists';
  ELSE
    RAISE NOTICE '❌ FAILED: create_business_profile function not found';
  END IF;
  
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_business_profile'
      AND prosecdef = true
  ) THEN
    RAISE NOTICE '✅ PASSED: update_business_profile function exists';
  ELSE
    RAISE NOTICE '❌ FAILED: update_business_profile function not found';
  END IF;
  
  -- Check 3: Verify no duplicates exist
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, COUNT(*) as cnt
      FROM public.business_profiles
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE NOTICE '❌ FAILED: Duplicate business profiles still exist';
  ELSE
    RAISE NOTICE '✅ PASSED: No duplicate business profiles found';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Refresh your app';
  RAISE NOTICE '2. Try creating a business profile during onboarding';
  RAISE NOTICE '3. After login, you can create additional businesses (based on your plan)';
END $$;
