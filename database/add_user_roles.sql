-- Add role-based access control for users
-- Run in Supabase SQL editor

-- 1) Add role column with defaults and constraints
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'moderator', 'admin', 'super_admin'));
  END IF;
END $$;

-- Backfill roles for existing users
UPDATE public.users
SET role = 'super_admin'
WHERE is_super_admin = TRUE AND role <> 'super_admin';

UPDATE public.users
SET role = 'user'
WHERE role IS NULL;

-- 2) Helper functions for role checks
CREATE OR REPLACE FUNCTION public.role_rank(role TEXT)
RETURNS INT AS $$
  SELECT CASE role
    WHEN 'super_admin' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'moderator' THEN 1
    ELSE 0
  END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id::text = auth.uid()::text),
    CASE WHEN EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND is_super_admin = TRUE
    ) THEN 'super_admin' ELSE 'user' END
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT public.role_rank(public.current_user_role()) >= public.role_rank(required_role);
$$ LANGUAGE sql SECURITY DEFINER;

-- Keep legacy helper working
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT public.has_role('super_admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- 3) RLS policies for role management on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can update limited roles" ON public.users;
DROP POLICY IF EXISTS "Moderators can update limited roles" ON public.users;

-- Staff can view all users (moderator or higher)
CREATE POLICY "Staff can view all users" ON public.users
  FOR SELECT
  USING (public.has_role('moderator'));

-- Staff can view all businesses (moderator or higher)
DROP POLICY IF EXISTS "Staff can view all businesses" ON public.business_profiles;
CREATE POLICY "Staff can view all businesses" ON public.business_profiles
  FOR SELECT
  USING (public.has_role('moderator'));

-- Super admins can update any user/role
CREATE POLICY "Super admins can update users" ON public.users
  FOR UPDATE
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- Admins can update user/moderator roles only
CREATE POLICY "Admins can update limited roles" ON public.users
  FOR UPDATE
  USING (public.has_role('admin') AND users.role IN ('user', 'moderator'))
  WITH CHECK (role IN ('user', 'moderator'));

-- Moderators can promote users to moderator or keep user
CREATE POLICY "Moderators can update limited roles" ON public.users
  FOR UPDATE
  USING (public.has_role('moderator') AND users.role = 'user')
  WITH CHECK (role IN ('user', 'moderator'));

