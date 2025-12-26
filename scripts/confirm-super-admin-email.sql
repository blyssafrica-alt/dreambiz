-- SQL to confirm super admin email in Supabase Auth
-- Run this in Supabase SQL Editor
-- This will confirm the email for the super admin user

-- Confirm the email by setting email_confirmed_at
-- Note: confirmed_at is a generated column and will be set automatically
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'nashiezw@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'nashiezw@gmail.com';

