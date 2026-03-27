-- FINAL FIX: Remove ALL triggers and problematic functions
-- This will fix the "query returned more than one row" error
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Remove ALL triggers on business_profiles
-- ============================================================================
DROP TRIGGER IF EXISTS cleanup_duplicates_on_business_profile ON public.business_profiles;
DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON public.business_profiles;

-- ============================================================================
-- STEP 2: Remove ALL trigger functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles();
DROP FUNCTION IF EXISTS public.update_business_profiles_updated_at();

-- ============================================================================
-- STEP 3: Remove ALL problematic RPC functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles(UUID);

-- ============================================================================
-- STEP 4: Remove UNIQUE constraint (allows multiple businesses)
-- ============================================================================
ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;

-- ============================================================================
-- STEP 5: Verify RLS policies are correct (they should allow INSERT)
-- ============================================================================
-- Ensure INSERT policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_profiles' 
    AND policyname = 'Users can insert their own business'
  ) THEN
    CREATE POLICY "Users can insert their own business" ON public.business_profiles
      FOR INSERT
      WITH CHECK (auth.uid()::text = user_id::text);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check triggers (should be empty)
SELECT tgname as trigger_name
FROM pg_trigger
WHERE tgrelid = 'public.business_profiles'::regclass;

-- Check functions (should not have any business profile functions)
SELECT proname as function_name
FROM pg_proc
WHERE proname LIKE '%business_profile%'
ORDER BY proname;

-- Check constraints (should NOT have unique constraint)
SELECT conname as constraint_name
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ No triggers on business_profiles
-- ✅ No business_profile functions
-- ✅ No unique constraint on user_id
-- ✅ INSERT policy exists
-- ✅ Direct INSERT should now work without errors
-- ============================================================================

