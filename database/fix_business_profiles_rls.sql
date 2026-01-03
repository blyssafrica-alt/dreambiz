-- Fix RLS Policies for business_profiles table
-- This ensures users can create and manage their own business profiles
-- Super admins can view all businesses for admin dashboard
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

-- Enable RLS on business_profiles (if not already enabled)
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Super admins can view all businesses" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can delete their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can insert own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can delete own business" ON public.business_profiles;

-- ============================================================================
-- STEP 2: Super Admin Policies (must come first)
-- ============================================================================
-- Policy: Super admins can view all businesses (for admin dashboard)
CREATE POLICY "Super admins can view all businesses" ON public.business_profiles
  FOR SELECT
  USING (public.is_super_admin());

-- ============================================================================
-- STEP 3: Regular User Policies
-- ============================================================================
-- Policy: Users can view their own business profiles
-- Using text casting for reliable comparison
CREATE POLICY "Users can view their own business" ON public.business_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can insert their own business profiles
-- This is critical for onboarding - users must be able to create their first business
-- Using text casting for reliable comparison
CREATE POLICY "Users can insert their own business" ON public.business_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own business profiles
-- Using text casting for reliable comparison
CREATE POLICY "Users can update their own business" ON public.business_profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can delete their own business profiles
-- Using text casting for reliable comparison
CREATE POLICY "Users can delete their own business" ON public.business_profiles
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Verify policies were created
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
ORDER BY policyname;

-- Test query to verify RLS is working (should return your business if you have one)
-- SELECT * FROM public.business_profiles WHERE user_id = auth.uid();

