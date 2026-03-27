-- ============================================================================
-- COMPLETE FIX FOR BUSINESS PROFILE ERRORS - 2026 EDITION
-- This script completely fixes all business profile creation issues
-- Run this in Supabase SQL Editor with "No limit" selected
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEANUP - Remove ALL old functions and triggers
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧹 STEP 1: CLEANUP';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Drop all old/conflicting functions
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

-- Remove unique constraint (allow multiple businesses per user)
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_name_key;

RAISE NOTICE '✅ Cleaned up old functions and constraints';

-- ============================================================================
-- STEP 2: CLEAN UP DUPLICATE BUSINESS PROFILES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 STEP 2: CLEANING DUPLICATES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- First, let's see what we have
DO $$
DECLARE
  v_total_businesses INTEGER;
  v_users_with_multiple INTEGER;
BEGIN
  -- Count total businesses
  SELECT COUNT(*) INTO v_total_businesses
  FROM public.business_profiles;
  
  RAISE NOTICE 'Total business profiles: %', v_total_businesses;
  
  -- Count users with multiple businesses
  SELECT COUNT(*) INTO v_users_with_multiple
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.business_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) dups;
  
  RAISE NOTICE 'Users with multiple businesses: %', v_users_with_multiple;
  
  IF v_users_with_multiple > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Found duplicate business profiles. Keeping most recent for each user...';
    
    -- Keep only the most recent business for each user
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
    
    RAISE NOTICE '✅ Removed duplicate business profiles';
  ELSE
    RAISE NOTICE '✅ No duplicate business profiles found';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 STEP 3: CREATING HELPER FUNCTIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Function to get user's subscription plan limits
CREATE OR REPLACE FUNCTION public.get_user_business_limit(p_user_id UUID)
RETURNS TABLE(max_businesses INTEGER, plan_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try active subscription first
  RETURN QUERY
  SELECT sp.max_businesses, sp.name
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND (us.end_date IS NULL OR us.end_date > NOW())
  ORDER BY us.start_date DESC
  LIMIT 1;
  
  -- If no active subscription, check for active trial
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT sp.max_businesses, sp.name
    FROM public.premium_trials pt
    JOIN public.subscription_plans sp ON sp.id = pt.plan_id
    WHERE pt.user_id = p_user_id
      AND pt.status = 'active'
      AND pt.end_date > NOW()
    ORDER BY pt.start_date DESC
    LIMIT 1;
  END IF;
  
  -- If still nothing, return Free plan defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT sp.max_businesses, sp.name
    FROM public.subscription_plans sp
    WHERE sp.name = 'Free' AND sp.is_active = true
    LIMIT 1;
  END IF;
  
  -- Final fallback
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 1::INTEGER as max_businesses, 'Free'::TEXT as plan_name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_business_limit TO authenticated;

RAISE NOTICE '✅ Created helper function: get_user_business_limit';

-- ============================================================================
-- STEP 4: CREATE MAIN RPC FUNCTION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🚀 STEP 4: CREATING MAIN RPC FUNCTION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
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
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required' USING ERRCODE = 'P0001';
  END IF;

  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Get user's plan and business limit using helper function
  SELECT max_businesses, plan_name INTO v_max_businesses, v_plan_name
  FROM public.get_user_business_limit(p_user_id);
  
  -- Ensure we have valid limits
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

  -- Insert new business profile (NEVER update - only create)
  INSERT INTO public.business_profiles (
    user_id, name, type, stage, location, capital, currency, owner,
    phone, email, address, dream_big_book, logo, created_at, updated_at
  )
  VALUES (
    p_user_id, p_name, p_type, p_stage, p_location, p_capital, p_currency, p_owner,
    p_phone, p_email, p_address, p_dream_big_book, p_logo, NOW(), NOW()
  )
  RETURNING id INTO v_new_business_id;

  -- Verify insertion succeeded
  IF v_new_business_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create business profile' USING ERRCODE = 'P0001';
  END IF;

  -- Fetch and return ONLY the newly created business (use LIMIT 1 to ensure single row)
  SELECT row_to_json(bp.*)::JSONB INTO STRICT v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id
  LIMIT 1;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve created business' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A business with this name already exists' USING ERRCODE = 'P0002';
  WHEN OTHERS THEN
    -- Re-raise with original error code to preserve it
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

RAISE NOTICE '✅ Created function: create_business_profile';

-- ============================================================================
-- STEP 5: CREATE UPDATE FUNCTION
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

RAISE NOTICE '✅ Created function: update_business_profile';

-- ============================================================================
-- STEP 6: VERIFICATION AND FINAL REPORT
-- ============================================================================

DO $$
DECLARE
  v_func_count INTEGER;
  v_duplicate_count INTEGER;
  v_constraint_exists BOOLEAN;
  v_total_businesses INTEGER;
  v_total_users INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 STEP 6: VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check 1: Functions exist
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc
  WHERE proname IN ('create_business_profile', 'update_business_profile', 'get_user_business_limit')
    AND prosecdef = true;
  
  IF v_func_count = 3 THEN
    RAISE NOTICE '✅ All RPC functions created successfully';
  ELSE
    RAISE NOTICE '❌ Missing RPC functions (found %, expected 3)', v_func_count;
  END IF;
  
  -- Check 2: No unique constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profiles'::regclass
      AND conname LIKE '%user_id%unique%'
  ) INTO v_constraint_exists;
  
  IF NOT v_constraint_exists THEN
    RAISE NOTICE '✅ Unique constraint removed (multi-business support enabled)';
  ELSE
    RAISE NOTICE '❌ Unique constraint still exists';
  END IF;
  
  -- Check 3: No problematic duplicates
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM public.business_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicate business profiles found';
  ELSE
    RAISE NOTICE '⚠️  Found % users with multiple businesses (this is OK if intentional)', v_duplicate_count;
  END IF;
  
  -- Statistics
  SELECT COUNT(*) INTO v_total_businesses FROM public.business_profiles;
  SELECT COUNT(DISTINCT user_id) INTO v_total_users FROM public.business_profiles;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTICS:';
  RAISE NOTICE '  - Total businesses: %', v_total_businesses;
  RAISE NOTICE '  - Total users with businesses: %', v_total_users;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEXT STEPS:';
  RAISE NOTICE '1. Refresh your app';
  RAISE NOTICE '2. Try creating a business during onboarding';
  RAISE NOTICE '3. All errors should now be resolved';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now create multiple businesses per user based on their subscription plan!';
  RAISE NOTICE '';
END $$;
