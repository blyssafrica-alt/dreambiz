-- ============================================
-- COMPLETE DATABASE SETUP FOR DREAMBIG BUSINESS OS
-- ============================================
-- Run this ENTIRE file in your Supabase SQL Editor
-- Make sure to select "No limit" before running
-- ============================================

-- Step 1: Run the main schema (if not already done)
-- This creates all tables, policies, and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Step 2: Create User Profile Trigger Function
-- ============================================
-- This automatically creates user profiles when users sign up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    '',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 3: Create Trigger on Auth Users
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Step 4: Create Sync Functions
-- ============================================
-- These functions allow syncing existing users and fixing profiles

CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    '',
    false
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id OR u.email = au.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  UPDATE public.users u
  SET 
    name = COALESCE(au.raw_user_meta_data->>'name', au.email),
    email = au.email
  FROM auth.users au
  WHERE u.email = au.email 
    AND u.id != au.id
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = au.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 5: Create Single User Sync Function (RPC)
-- ============================================

DROP FUNCTION IF EXISTS public.sync_user_profile(UUID);

CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  auth_user_email TEXT;
  auth_user_name TEXT;
  profile_exists BOOLEAN;
  was_created BOOLEAN := false;
BEGIN
  SELECT email, COALESCE(raw_user_meta_data->>'name', email) INTO auth_user_email, auth_user_name
  FROM auth.users
  WHERE id = user_id_param;
  
  IF auth_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', user_id_param
    );
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id_param) INTO profile_exists;
  
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
      VALUES (
        user_id_param,
        auth_user_email,
        auth_user_name,
        '',
        false
      )
      ON CONFLICT (id) DO NOTHING;
      
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id_param) INTO profile_exists;
      was_created := profile_exists;
    EXCEPTION
      WHEN unique_violation THEN
        profile_exists := true;
        was_created := false;
      WHEN others THEN
        RAISE;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'created', was_created,
    'exists', profile_exists,
    'user_id', user_id_param,
    'message', CASE 
      WHEN was_created THEN 'Profile created successfully'
      WHEN profile_exists THEN 'Profile already exists'
      ELSE 'Profile status unknown'
    END
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'user_id', user_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO anon;

-- ============================================
-- Step 6: Set Super Admin
-- ============================================
-- Update existing user to be super admin

UPDATE users 
SET is_super_admin = true 
WHERE email = 'nashiezw@gmail.com';

-- ============================================
-- Step 7: Sync All Existing Users
-- ============================================
-- This creates profiles for any users who signed up before the trigger was set up

SELECT public.sync_existing_users();

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if everything is set up correctly

-- Check how many users exist in auth vs users table
DO $$
DECLARE
  auth_count INTEGER;
  users_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO users_count FROM public.users;
  
  SELECT COUNT(*) INTO missing_count 
  FROM auth.users au 
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Auth users count: %', auth_count;
  RAISE NOTICE 'Users table count: %', users_count;
  RAISE NOTICE 'Missing profiles: %', missing_count;
  
  IF missing_count = 0 THEN
    RAISE NOTICE 'STATUS: ✅ All users have profiles';
  ELSE
    RAISE NOTICE 'STATUS: ⚠️  Some users are missing profiles';
    RAISE NOTICE 'Run: SELECT public.sync_existing_users(); to fix';
  END IF;
  
  RAISE NOTICE '===========================================';
END $$;

-- List all users and their profile status
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_verified,
  u.id IS NOT NULL as has_profile,
  u.is_super_admin,
  au.created_at as auth_created,
  u.created_at as profile_created
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY au.created_at DESC;

-- ============================================
-- DONE!
-- ============================================
-- Your database is now set up correctly.
-- New users will automatically get profiles when they sign up.
-- Existing users have been synced.
