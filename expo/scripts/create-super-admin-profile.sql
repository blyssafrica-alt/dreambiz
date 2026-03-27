-- SQL to update super admin profile in users table
-- Run this in Supabase SQL Editor
-- This will update the existing user to be a super admin

-- Step 1: Check current user data
SELECT id, email, name, is_super_admin, created_at
FROM users
WHERE email = 'nashiezw@gmail.com';

-- Step 2: Update the user to set is_super_admin = true
-- (This works if the user ID matches the Auth user ID)
UPDATE users 
SET 
  is_super_admin = true,
  name = 'Super Admin'
WHERE email = 'nashiezw@gmail.com';

-- Step 3: If the ID doesn't match, you need to:
-- Option A: Delete the old user and create new one with correct ID
-- DELETE FROM users WHERE email = 'nashiezw@gmail.com' AND id != 'd849bc7e-42ba-44ac-b4b1-598aeca0deb0';
-- Then run the INSERT below

-- Option B: Insert with correct ID (if old one was deleted)
-- INSERT INTO users (id, email, name, password_hash, is_super_admin)
-- VALUES (
--   'd849bc7e-42ba-44ac-b4b1-598aeca0deb0',
--   'nashiezw@gmail.com',
--   'Super Admin',
--   '',
--   true
-- )
-- ON CONFLICT (email) DO UPDATE SET
--   id = EXCLUDED.id,
--   is_super_admin = true,
--   name = EXCLUDED.name;

-- Step 4: Verify the update
SELECT id, email, name, is_super_admin, created_at
FROM users
WHERE email = 'nashiezw@gmail.com';

