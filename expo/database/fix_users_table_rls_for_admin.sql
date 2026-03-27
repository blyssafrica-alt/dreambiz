-- Fix RLS Policies for users table to allow super admins FULL CONTROL
-- This enables all admin operations: view, edit, delete, grant trials/discounts
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Ensure is_super_admin() function exists
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Drop all existing policies on users table
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'users'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create comprehensive policies for regular users
-- ============================================================================
-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Note: INSERT is handled by trigger/RPC function with SECURITY DEFINER
-- Users cannot directly insert (RLS blocks it), but the trigger/RPC function can

-- ============================================================================
-- STEP 4: Create comprehensive policies for SUPER ADMINS (FULL CONTROL)
-- ============================================================================
-- Policy: Super admins can view ALL users
CREATE POLICY "Super admins can view all users" ON public.users
  FOR SELECT
  USING (public.is_super_admin());

-- Policy: Super admins can update ANY user
CREATE POLICY "Super admins can update any user" ON public.users
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Policy: Super admins can delete ANY user
CREATE POLICY "Super admins can delete any user" ON public.users
  FOR DELETE
  USING (public.is_super_admin());

-- Policy: Super admins can insert users (for manual user creation)
CREATE POLICY "Super admins can insert users" ON public.users
  FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- STEP 5: Verify policies
-- ============================================================================
-- Check all policies on users table
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'users'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ Regular users can view/update their own profile
-- ✅ Super admins can view ALL users
-- ✅ Super admins can update ANY user
-- ✅ Super admins can delete ANY user
-- ✅ Super admins can insert users
-- ✅ Admin dashboard shows correct user count
-- ✅ All admin operations (edit, delete, grant) work correctly
-- ============================================================================
