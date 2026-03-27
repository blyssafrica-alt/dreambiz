-- Add RLS Policy to Allow Super Admins to Delete Any Business
-- This enables super admins to delete businesses from the admin panel
-- Run this in Supabase SQL Editor with "No limit" selected

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
-- STEP 2: Add Super Admin DELETE Policy
-- ============================================================================
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Super admins can delete any business" ON public.business_profiles;

-- Policy: Super admins can delete any business
CREATE POLICY "Super admins can delete any business" ON public.business_profiles
  FOR DELETE
  USING (public.is_super_admin());

-- Verify policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'business_profiles'
  AND cmd = 'DELETE'
ORDER BY policyname;

