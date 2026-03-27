-- Fix RLS Policies for subscription_payments table
-- This ensures super admins can view all subscription payments

-- ============================================
-- STEP 1: Ensure is_super_admin() function exists
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- STEP 2: Drop and recreate RLS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Users can create their own subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Super Admin can manage all subscription payments" ON subscription_payments;

-- Recreate policies with explicit schema references

-- Policy 1: Users can view their own subscription payments
CREATE POLICY "Users can view their own subscription payments"
  ON subscription_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can create their own subscription payments
CREATE POLICY "Users can create their own subscription payments"
  ON subscription_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Super Admin can view all subscription payments (SELECT)
CREATE POLICY "Super Admin can view all subscription payments"
  ON subscription_payments
  FOR SELECT
  USING (public.is_super_admin());

-- Policy 4: Super Admin can update all subscription payments (UPDATE)
CREATE POLICY "Super Admin can update all subscription payments"
  ON subscription_payments
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Policy 5: Super Admin can delete subscription payments (DELETE)
CREATE POLICY "Super Admin can delete subscription payments"
  ON subscription_payments
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename = 'subscription_payments';

-- Test query (should work for super admin):
-- SELECT COUNT(*) FROM subscription_payments;

-- Check if function exists:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'is_super_admin';

