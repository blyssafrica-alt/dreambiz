-- Fix RLS Policies for business_profiles table to allow super admins to view all businesses
-- This enables admin dashboard to show total business count
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
-- STEP 2: Add super admin policy for business_profiles
-- ============================================================================
-- Enable RLS on business_profiles (if not already enabled)
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Add policy for super admins to view all businesses
-- This policy must come BEFORE the user-specific policy to take precedence
CREATE POLICY "Super admins can view all businesses" ON public.business_profiles
  FOR SELECT
  USING (public.is_super_admin());

-- Note: The existing "Users can view their own business" policy will still work
-- for regular users. Super admins will match the super admin policy first.

