-- Fix RLS Policies for users table to allow super admins to see all users
-- This fixes the issue where admin dashboard only shows 1 user (the admin)
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
-- STEP 2: Add super admin policy to users table
-- ============================================================================
-- Drop existing super admin policy if it exists
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;

-- Create policy: Super admins can view all users
CREATE POLICY "Super admins can view all users" ON public.users
  FOR SELECT
  USING (public.is_super_admin());

-- ============================================================================
-- STEP 3: Verify policies
-- ============================================================================
-- Check all policies on users table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ Super admins can now see all users
-- ✅ Regular users can still only see their own profile
-- ✅ Admin dashboard should now show correct user count
-- ============================================================================

