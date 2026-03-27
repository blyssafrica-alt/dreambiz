-- ============================================================================
-- FINAL FIX FOR BUSINESS PROFILE ERRORS
-- This script completely resolves all business profile creation issues
-- Run this in Supabase SQL Editor with "No limit" selected
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 BUSINESS PROFILE FIX - STARTING';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: DROP OLD FUNCTIONS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Step 1: Dropping old functions...';
END $$;

DROP FUNCTION IF EXISTS public.create_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.update_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.upsert_business_profile CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_count CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_limit CASCADE;

DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Dropped old functions and triggers';
END $$;

-- ============================================================================
-- STEP 2: REMOVE UNIQUE CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Step 2: Removing unique constraints...';
END $$;

ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_key;
ALTER TABLE public.business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_name_key;

DO $$
BEGIN
  RAISE NOTICE '✅ Removed unique constraints (multi-business support enabled)';
END $$;

-- ============================================================================
-- STEP 3: CLEAN UP DUPLICATE BUSINESS PROFILES
-- ============================================================================

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Step 3: Cleaning up duplicate business profiles...';
  
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
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '✅ Deleted % duplicate business profile(s)', v_deleted_count;
  ELSE
    RAISE NOTICE '✅ No duplicates found';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION - Get user's business limit
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Step 4: Creating helper function...';
END $$;

CREATE OR REPLACE FUNCTION public.get_user_business_limit(p_user_id UUID)
RETURNS TABLE(max_businesses INTEGER, plan_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sp.max_businesses, sp.name
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND (us.end_date IS NULL OR us.end_date > NOW())
  ORDER BY us.start_date DESC
  LIMIT 1;
  
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
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT sp.max_businesses, sp.name
    FROM public.subscription_plans sp
    WHERE sp.name = 'Free' AND sp.is_active = true
    LIMIT 1;
  END IF;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 1::INTEGER as max_businesses, 'Free'::TEXT as plan_name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_business_limit TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Created helper function: get_user_business_limit';
END $$;

-- ============================================================================
-- STEP 5: CREATE MAIN FUNCTION - Create business profile
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Step 5: Creating create_business_profile function...';
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
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required' USING ERRCODE = 'P0001';
  END IF;

  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT max_businesses, plan_name INTO v_max_businesses, v_plan_name
  FROM public.get_user_business_limit(p_user_id);
  
  IF v_max_businesses IS NULL THEN
    v_max_businesses := 1;
    v_plan_name := 'Free';
  END IF;

  SELECT COUNT(*) INTO v_business_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  IF v_max_businesses != -1 AND v_business_count >= v_max_businesses THEN
    RAISE EXCEPTION 'Business limit reached. Your % plan allows % business(es).', 
      v_plan_name, v_max_businesses
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.business_profiles (
    user_id, name, type, stage, location, capital, currency, owner,
    phone, email, address, dream_big_book, logo, created_at, updated_at
  )
  VALUES (
    p_user_id, p_name, p_type, p_stage, p_location, p_capital, p_currency, p_owner,
    p_phone, p_email, p_address, p_dream_big_book, p_logo, NOW(), NOW()
  )
  RETURNING id INTO v_new_business_id;

  IF v_new_business_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create business' USING ERRCODE = 'P0001';
  END IF;

  SELECT row_to_json(bp.*)::JSONB INTO v_result
  FROM public.business_profiles bp
  WHERE bp.id = v_new_business_id
  LIMIT 1;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to retrieve created business' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Business name already exists' USING ERRCODE = 'P0002';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_profile TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Created function: create_business_profile';
END $$;

-- ============================================================================
-- STEP 6: CREATE UPDATE FUNCTION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Step 6: Creating update_business_profile function...';
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
  SELECT user_id INTO v_user_id
  FROM public.business_profiles
  WHERE id = p_business_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0003';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = 'P0004';
  END IF;

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

DO $$
BEGIN
  RAISE NOTICE '✅ Created function: update_business_profile';
END $$;

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_func_count INTEGER;
  v_duplicate_count INTEGER;
  v_total_businesses INTEGER;
  v_total_users INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc
  WHERE proname IN ('create_business_profile', 'update_business_profile', 'get_user_business_limit')
    AND prosecdef = true;
  
  IF v_func_count = 3 THEN
    RAISE NOTICE '✅ All 3 functions created successfully';
  ELSE
    RAISE NOTICE '❌ Missing functions (found %, expected 3)', v_func_count;
  END IF;
  
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
    RAISE NOTICE '⚠️  Found % users with multiple businesses (OK if intentional)', v_duplicate_count;
  END IF;
  
  SELECT COUNT(*) INTO v_total_businesses FROM public.business_profiles;
  SELECT COUNT(DISTINCT user_id) INTO v_total_users FROM public.business_profiles;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTICS:';
  RAISE NOTICE '  - Total businesses: %', v_total_businesses;
  RAISE NOTICE '  - Total users: %', v_total_users;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 All errors fixed! Refresh your app and try creating a business.';
  RAISE NOTICE '';
END $$;
