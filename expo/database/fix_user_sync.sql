-- Fix user sync issue - manually sync authenticated user to public.users table
-- Run this in Supabase SQL Editor

-- First, let's see what we're dealing with
-- This will show all auth users and whether they exist in public.users
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  CASE WHEN u.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as profile_status
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
ORDER BY au.created_at DESC;

-- Now sync the missing user(s) to public.users
-- This handles the case where user exists in auth but not in public table
-- Check for both ID and email to prevent conflicts
INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  '' as password_hash,
  CASE WHEN au.email = 'nashiezw@gmail.com' THEN true ELSE false END as is_super_admin
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id OR u.email = au.email
);

-- Update existing super admin if needed
UPDATE public.users
SET is_super_admin = true
WHERE email = 'nashiezw@gmail.com' AND is_super_admin = false;

-- Verify the fix
SELECT 
  id,
  email,
  name,
  is_super_admin,
  created_at
FROM public.users
ORDER BY created_at DESC;
