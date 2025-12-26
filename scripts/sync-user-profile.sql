-- SQL script to sync a specific user profile
-- Run this in Supabase SQL Editor
-- IMPORTANT: Select "No limit" in the SQL Editor before running

-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from auth.users
SELECT public.sync_user_profile('d849bc7e-42ba-44ac-b4b1-598aeca0deb0'::UUID);

-- To find your user ID, run this first:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

