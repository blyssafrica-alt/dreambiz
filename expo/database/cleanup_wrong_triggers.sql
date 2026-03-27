-- CLEANUP: Remove All Wrong Triggers and Functions
-- These were created assuming one business per user, but the system supports multiple businesses
-- Run this in Supabase SQL Editor with "No limit" selected

-- ============================================================================
-- STEP 1: Drop ALL wrong triggers that delete "duplicate" businesses
-- ============================================================================
-- These triggers incorrectly delete businesses when users should be allowed multiple businesses

DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;

-- ============================================================================
-- STEP 2: Drop ALL wrong trigger functions
-- ============================================================================
-- These functions delete "duplicate" businesses, which is wrong for multi-business support

DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles();

-- ============================================================================
-- STEP 3: Drop ALL wrong RPC functions that assume one business per user
-- ============================================================================
-- These functions use UPSERT or assume one business per user

DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- STEP 4: Remove the incorrect UNIQUE constraint (if it exists)
-- ============================================================================
-- This constraint prevents users from having multiple businesses

ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 5: Drop the cleanup RPC function (if it exists)
-- ============================================================================
-- This function also assumes duplicates should be deleted

DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles(UUID);

-- ============================================================================
-- VERIFICATION: Check what triggers/functions still exist
-- ============================================================================

-- Check for any remaining wrong triggers
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname LIKE '%business_profile%' OR tgname LIKE '%duplicate%'
ORDER BY tgname;

-- Check for any remaining wrong functions
SELECT 
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN (
  'cleanup_duplicate_business_profiles',
  'upsert_business_profile',
  'create_or_update_business_profile',
  'safe_upsert_business_profile'
);

-- Check for unique constraint (should not exist)
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- After running this script:
-- ✅ No triggers should exist for business_profiles (unless you have other valid triggers)
-- ✅ No wrong functions should exist
-- ✅ No unique constraint on user_id should exist
-- ✅ Users can now have multiple business profiles
-- ============================================================================

