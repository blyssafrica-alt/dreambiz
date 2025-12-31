-- Fix RLS Policies for business_profiles table
-- This ensures users can create and manage their own business profiles
-- Run this in Supabase SQL Editor with "No limit" selected

-- Enable RLS on business_profiles (if not already enabled)
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can delete their own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can view own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can insert own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update own business" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can delete own business" ON public.business_profiles;

-- Policy: Users can view their own business profiles
CREATE POLICY "Users can view their own business" ON public.business_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own business profiles
-- This is critical for onboarding - users must be able to create their first business
CREATE POLICY "Users can insert their own business" ON public.business_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own business profiles
CREATE POLICY "Users can update their own business" ON public.business_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own business profiles
CREATE POLICY "Users can delete their own business" ON public.business_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

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

