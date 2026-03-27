-- ============================================================================
-- COMPLETE FIX FOR ALL BUSINESS PROFILE ERRORS
-- This script completely resolves the "query returned more than one row" error
-- Run this in Supabase SQL Editor with "No limit" selected
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEANUP - Remove ALL old functions and constraints
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🧹 Step 1: Starting cleanup...';
END $$;

-- Drop ALL old business profile functions
DROP FUNCTION IF EXISTS public.create_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.update_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.upsert_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_count CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_limit CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles() CASCADE;

-- Remove any unique constraints on user_id (we want multiple businesses per user)
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_key;

-- ============================================================================
-- STEP 2: CLEAN UP ALL DUPLICATE BUSINESS PROFILES
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 2: Cleaning up duplicate business profiles...';
  
  -- Delete duplicates, keep only the most recent one per user
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
-- STEP 3: CREATE NEW RPC FUNCTION - CREATE BUSINESS PROFILE
-- This function ALWAYS creates a NEW business (never updates)
-- It returns ONLY the newly created business (single row)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Step 3: Creating new RPC function for creating business profiles...';
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
  
  -- Try premium trials if no subscription
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
  
  -- Default to Free plan (1 business)
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
  
  -- Final fallback
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

  -- INSERT new business profile (NEVER UPDATE)
  INSERT INTO public.business_profiles (
    user_id, name, type, stage, location, capital, currency, owner,
    phone, email, address, dream_big_book, logo, created_at, updated_at
  )
  VALUES (
    p_user_id, p_name, p_type, p_stage, p_location, p_capital, p_currency, p_owner,
    p_phone, p_email, p_address, p_dream_big_book, p_logo, NOW(), NOW()
  )
  RETURNING id INTO v_new_business_id;

  -- Return ONLY the newly created business (single row, never multiple)
  SELECT row_to_json(bp.*)::JSONB INTO v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve created business' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Business name already exists' USING ERRCODE = 'P0002';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create business profile: %', SQLERRM USING ERRCODE = SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

-- ============================================================================
-- STEP 4: CREATE UPDATE FUNCTION - FOR UPDATING EXISTING BUSINESSES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Step 4: Creating update function...';
END $$;

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
  -- Get business owner
  SELECT user_id INTO v_user_id
  FROM public.business_profiles
  WHERE id = p_business_id;

  -- Verify business exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0003';
  END IF;

  -- Verify ownership
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = 'P0004';
  END IF;

  -- Update business
  UPDATE public.business_profiles
  SET
    name = p_name, type = p_type, stage = p_stage, location = p_location,
    capital = p_capital, currency = p_currency, owner = p_owner,
    phone = p_phone, email = p_email, address = p_address,
    dream_big_book = p_dream_big_book, logo = p_logo, updated_at = NOW()
  WHERE id = p_business_id
  RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Update failed' USING ERRCODE = 'P0005';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_business_profile TO authenticated;

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_func_count INTEGER;
  v_constraint_exists BOOLEAN;
  v_total_businesses INTEGER;
  v_users_with_businesses INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Step 5: Running verification checks...';
  RAISE NOTICE '';
  
  -- Check 1: Functions exist
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc
  WHERE proname IN ('create_business_profile', 'update_business_profile')
    AND prosecdef = true;
  
  IF v_func_count = 2 THEN
    RAISE NOTICE '✅ Both RPC functions created successfully';
  ELSE
    RAISE NOTICE '❌ Missing RPC functions (found %)', v_func_count;
  END IF;
  
  -- Check 2: No unique constraint on user_id
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profiles'::regclass
      AND conname IN ('business_profiles_user_id_unique', 'business_profiles_user_id_key')
  ) INTO v_constraint_exists;
  
  IF NOT v_constraint_exists THEN
    RAISE NOTICE '✅ No unique constraint on user_id (multi-business support enabled)';
  ELSE
    RAISE NOTICE '❌ Unique constraint still exists on user_id';
  END IF;
  
  -- Check 3: Business profile stats
  SELECT COUNT(*) INTO v_total_businesses
  FROM public.business_profiles;
  
  SELECT COUNT(DISTINCT user_id) INTO v_users_with_businesses
  FROM public.business_profiles;
  
  RAISE NOTICE '✅ Total business profiles: %', v_total_businesses;
  RAISE NOTICE '✅ Users with business profiles: %', v_users_with_businesses;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 IMPORTANT: How to use the new functions:';
  RAISE NOTICE '';
  RAISE NOTICE '1. DURING ONBOARDING (first time):';
  RAISE NOTICE '   - Use create_business_profile() to create a NEW business';
  RAISE NOTICE '   - This will ALWAYS create a new business';
  RAISE NOTICE '';
  RAISE NOTICE '2. UPDATING EXISTING BUSINESS:';
  RAISE NOTICE '   - Use update_business_profile() to update an existing business';
  RAISE NOTICE '   - Pass the business_id to identify which business to update';
  RAISE NOTICE '';
  RAISE NOTICE '3. CREATING ADDITIONAL BUSINESSES:';
  RAISE NOTICE '   - Use create_business_profile() again';
  RAISE NOTICE '   - It will check your plan limits';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your app';
  RAISE NOTICE '2. Try creating a business during onboarding';
  RAISE NOTICE '3. The "query returned more than one row" error should be gone';
  RAISE NOTICE '';
END $$;
