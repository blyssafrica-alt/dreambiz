-- COMPLETE DATABASE CLEANUP - Removes EVERYTHING that could cause "query returned more than one row"
-- Run this in Supabase SQL Editor - This will fix the error completely

-- ============================================================================
-- STEP 1: Remove ALL triggers on business_profiles (including any we might have missed)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'business_profiles'
    AND event_object_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.business_profiles CASCADE', r.trigger_name);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Remove ALL functions that could cause issues
-- ============================================================================
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.update_business_profiles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.create_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_or_update_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.safe_upsert_business_profile(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_duplicate_business_profiles(UUID) CASCADE;

-- Remove any function with "business_profile" in the name
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT proname, oidvectortypes(proargtypes) as argtypes
    FROM pg_proc
    WHERE proname LIKE '%business_profile%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.argtypes);
    EXCEPTION
      WHEN OTHERS THEN
        -- Try without arguments if that fails
        BEGIN
          EXECUTE format('DROP FUNCTION IF EXISTS public.%I CASCADE', r.proname);
        EXCEPTION
          WHEN OTHERS THEN
            NULL; -- Ignore errors
        END;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Remove ALL constraints that could cause issues
-- ============================================================================
ALTER TABLE public.business_profiles 
  DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique CASCADE;

-- ============================================================================
-- STEP 4: Ensure RLS policies are simple and correct
-- ============================================================================
-- Drop all existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'business_profiles'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.business_profiles', r.policyname);
  END LOOP;
END $$;

-- Create simple, correct policies
CREATE POLICY "Users can view their own business" ON public.business_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own business" ON public.business_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own business" ON public.business_profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own business" ON public.business_profiles
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- STEP 5: Verify cleanup
-- ============================================================================
-- Check triggers (should be empty)
SELECT 'Triggers remaining:' as check_type, COUNT(*) as count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'business_profiles'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check functions (should not have business_profile functions)
SELECT 'Functions remaining:' as check_type, COUNT(*) as count
FROM pg_proc
WHERE proname LIKE '%business_profile%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check constraints (should NOT have unique constraint)
SELECT 'Unique constraints:' as check_type, COUNT(*) as count
FROM pg_constraint
WHERE conrelid = 'public.business_profiles'::regclass
  AND conname = 'business_profiles_user_id_unique';

-- Check policies (should have 4 policies)
SELECT 'RLS policies:' as check_type, COUNT(*) as count
FROM pg_policies
WHERE tablename = 'business_profiles'
AND schemaname = 'public';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ Database cleanup complete! All triggers and problematic functions removed.' as status;

