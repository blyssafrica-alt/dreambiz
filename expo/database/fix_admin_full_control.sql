-- COMPLETE FIX: Give Super Admins Full Control Over All Admin Operations
-- This enables all admin operations: view, edit, delete users, grant trials/discounts
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
-- STEP 2: Fix RLS Policies for USERS table (Full Admin Control)
-- ============================================================================
-- Drop all existing policies
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

-- Regular users: Can view and update their own profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Super admins: FULL CONTROL (SELECT, UPDATE, DELETE, INSERT)
CREATE POLICY "Super admins can view all users" ON public.users
  FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can update any user" ON public.users
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete any user" ON public.users
  FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert users" ON public.users
  FOR INSERT
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- STEP 3: Fix RLS Policies for PREMIUM_TRIALS table (Admin can grant trials)
-- ============================================================================
-- Drop existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'premium_trials'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.premium_trials', r.policyname);
  END LOOP;
END $$;

-- Regular users: Can view their own trials
CREATE POLICY "Users can view their own trials" ON public.premium_trials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins: FULL CONTROL
CREATE POLICY "Super admins can manage all trials" ON public.premium_trials
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- STEP 4: Fix RLS Policies for USER_DISCOUNTS table (Admin can grant discounts)
-- ============================================================================
-- Drop existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'user_discounts'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_discounts', r.policyname);
  END LOOP;
END $$;

-- Regular users: Can view their own discounts
CREATE POLICY "Users can view their own discounts" ON public.user_discounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins: FULL CONTROL
CREATE POLICY "Super admins can manage all discounts" ON public.user_discounts
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- STEP 5: Fix RLS Policies for USER_SUBSCRIPTIONS table (Admin can view all)
-- ============================================================================
-- Drop existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'user_subscriptions'
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_subscriptions', r.policyname);
  END LOOP;
END $$;

-- Regular users: Can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins: FULL CONTROL
CREATE POLICY "Super admins can manage all subscriptions" ON public.user_subscriptions
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check users table policies
SELECT 'Users table policies:' as check_type, policyname, cmd
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- Check premium_trials policies
SELECT 'Premium trials policies:' as check_type, policyname, cmd
FROM pg_policies
WHERE tablename = 'premium_trials' AND schemaname = 'public'
ORDER BY policyname;

-- Check user_discounts policies
SELECT 'User discounts policies:' as check_type, policyname, cmd
FROM pg_policies
WHERE tablename = 'user_discounts' AND schemaname = 'public'
ORDER BY policyname;

-- Check user_subscriptions policies
SELECT 'User subscriptions policies:' as check_type, policyname, cmd
FROM pg_policies
WHERE tablename = 'user_subscriptions' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ Super admins can view ALL users
-- ✅ Super admins can update ANY user
-- ✅ Super admins can delete ANY user
-- ✅ Super admins can insert users
-- ✅ Super admins can grant trials (INSERT into premium_trials)
-- ✅ Super admins can grant discounts (INSERT into user_discounts)
-- ✅ Super admins can view/manage all subscriptions
-- ✅ All admin operations work correctly
-- ============================================================================

