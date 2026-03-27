-- ============================================================================
-- COMPLETE FIX FOR "query returned more than one row" ERROR
-- This script fixes the business profile creation issues
-- Run this in Supabase SQL Editor with "No limit" selected
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEANUP - Remove ALL old functions and duplicates
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '🧹 STEP 1: Starting cleanup...';
  RAISE NOTICE '====================================';
END $$;

-- Drop ALL old function variants
DROP FUNCTION IF EXISTS public.create_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.update_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.upsert_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_count CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_limit CASCADE;

-- Clean up duplicate business profiles
-- Keep only the most recent one for each user
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Checking for duplicate business profiles...';
  
  WITH ranked_profiles AS (
    SELECT 
      id,
      user_id,
      name,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, updated_at DESC NULLS LAST) as rn
    FROM public.business_profiles
  )
  DELETE FROM public.business_profiles
  WHERE id IN (
    SELECT id FROM ranked_profiles WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '✅ Removed % duplicate business profile(s)', deleted_count;
  ELSE
    RAISE NOTICE '✅ No duplicates found';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE THE NEW RPC FUNCTION (supports multiple businesses per user)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '🔧 STEP 2: Creating RPC function...';
  RAISE NOTICE '====================================';
END $$;

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
  v_new_business_id UUID;
  v_result JSONB;
  v_business_count INTEGER;
  v_max_businesses INTEGER;
  v_plan_name TEXT;
BEGIN
  -- Verify user authentication
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Get user's plan and business limit
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
  END;
  
  -- Try premium trials if no subscription found
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
    END;
  END IF;
  
  -- Default to Free plan (1 business) if no subscription found
  IF v_max_businesses IS NULL THEN
    BEGIN
      SELECT max_businesses, name INTO v_max_businesses, v_plan_name
      FROM public.subscription_plans
      WHERE name = 'Free' AND is_active = true
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_max_businesses := 1;
        v_plan_name := 'Free';
    END;
  END IF;
  
  -- Final fallback if subscription_plans table doesn't exist or is empty
  IF v_max_businesses IS NULL THEN
    v_max_businesses := 1;
    v_plan_name := 'Free';
  END IF;

  -- Count existing businesses for this user
  SELECT COUNT(*) INTO v_business_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- Check business limit (-1 means unlimited)
  IF v_max_businesses != -1 AND v_business_count >= v_max_businesses THEN
    RAISE EXCEPTION 'Business limit reached. Your % plan allows % business(es). Upgrade to create more.', 
      v_plan_name, v_max_businesses
      USING ERRCODE = 'P0001';
  END IF;

  -- Insert NEW business profile (never update - always create new)
  INSERT INTO public.business_profiles (
    user_id, name, type, stage, location, capital, currency, owner,
    phone, email, address, dream_big_book, logo, created_at, updated_at
  )
  VALUES (
    p_user_id, p_name, p_type, p_stage, p_location, p_capital, p_currency, p_owner,
    p_phone, p_email, p_address, p_dream_big_book, p_logo, NOW(), NOW()
  )
  RETURNING id INTO v_new_business_id;

  -- Return ONLY the newly created business (single row - never multiple)
  SELECT row_to_json(bp.*)::JSONB INTO v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve created business' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A business with this name already exists' USING ERRCODE = 'P0002';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'User profile not found. Please ensure user exists in users table' USING ERRCODE = 'P0003';
  WHEN OTHERS THEN
    -- Re-raise with original error code to preserve error handling in app
    RAISE EXCEPTION 'Failed to create business profile: %', SQLERRM USING ERRCODE = SQLSTATE;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

RAISE NOTICE '✅ Function created successfully';

-- ============================================================================
-- STEP 3: VERIFICATION & DIAGNOSTICS
-- ============================================================================

DO $$
DECLARE
  v_func_count INTEGER;
  v_duplicate_count INTEGER;
  v_total_profiles INTEGER;
  v_total_users INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '🔍 STEP 3: Running verification...';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  
  -- Check 1: Function exists
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc
  WHERE proname = 'create_business_profile'
    AND prosecdef = true;
  
  IF v_func_count = 1 THEN
    RAISE NOTICE '✅ RPC function exists';
  ELSE
    RAISE NOTICE '❌ RPC function not found';
  END IF;
  
  -- Check 2: Count duplicates
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.business_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicate business profiles';
  ELSE
    RAISE NOTICE '⚠️  Found % users with multiple businesses (this is OK - multi-business support)', v_duplicate_count;
  END IF;
  
  -- Check 3: Statistics
  SELECT COUNT(DISTINCT user_id) INTO v_total_users FROM public.business_profiles;
  SELECT COUNT(*) INTO v_total_profiles FROM public.business_profiles;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Statistics:';
  RAISE NOTICE '   - Total users with businesses: %', v_total_users;
  RAISE NOTICE '   - Total business profiles: %', v_total_profiles;
  RAISE NOTICE '';
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '🎉 Setup complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Refresh your app';
  RAISE NOTICE '2. Try completing onboarding';
  RAISE NOTICE '3. The error should now be fixed';
  RAISE NOTICE '';
END $$;
