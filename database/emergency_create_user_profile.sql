-- EMERGENCY: Create user profile directly (bypasses all RLS)
-- Use this if the RPC function and trigger aren't working
-- Run this in Supabase SQL Editor with "No limit" selected
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users

-- First, find your user ID:
SELECT id, email FROM auth.users WHERE email = 'nashiezw@gmail.com';

-- Then create/update the profile directly (handles both ID and email conflicts):
-- Step 1: Delete any existing profile with this email (in case ID is different)
DELETE FROM public.users WHERE email = 'nashiezw@gmail.com';

-- Step 2: Insert the profile with the correct ID from auth.users
INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  '',
  CASE WHEN au.email = 'nashiezw@gmail.com' THEN true ELSE false END
FROM auth.users au
WHERE au.email = 'nashiezw@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  is_super_admin = EXCLUDED.is_super_admin;

-- Or if you know your user ID, use this:
-- INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
-- VALUES (
--   'd849bc7e-42ba-44ac-b4b1-598aeca0deb0'::UUID,
--   'nashiezw@gmail.com',
--   'Super Admin',
--   '',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   email = EXCLUDED.email,
--   name = EXCLUDED.name,
--   is_super_admin = EXCLUDED.is_super_admin;

-- Verify it worked:
SELECT id, email, name, is_super_admin, created_at 
FROM public.users 
WHERE email = 'nashiezw@gmail.com';

