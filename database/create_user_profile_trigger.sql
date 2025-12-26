-- Database trigger to automatically create user profile when a user signs up
-- This bypasses RLS issues by running with elevated privileges
-- Run this in Supabase SQL Editor

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    '', -- Not needed for Supabase Auth
    false
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows bypassing RLS

-- Trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle existing users - create a function to sync existing auth users
CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
BEGIN
  -- Insert users that don't exist by ID or email
  -- Check for both to prevent email conflicts
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    '',
    CASE WHEN au.email = 'nashiezw@gmail.com' THEN true ELSE false END
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = au.id OR u.email = au.email
  );
  
  -- Update super admin status for existing users
  UPDATE public.users
  SET is_super_admin = true
  WHERE email = 'nashiezw@gmail.com' AND is_super_admin = false;
EXCEPTION
  WHEN unique_violation THEN
    -- If we get a unique violation (ID or email), it means a profile exists
    -- This is fine - just continue
    -- Also update super admin status
    UPDATE public.users
    SET is_super_admin = true
    WHERE email = 'nashiezw@gmail.com' AND is_super_admin = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this once to sync existing users
-- SELECT public.sync_existing_users();

-- Create an RPC function that can be called from the client to sync a single user
-- This allows the app to request profile creation for existing users
-- Drop the old function first if it exists (in case return type changed)
DROP FUNCTION IF EXISTS public.sync_user_profile(UUID);

CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  auth_user_email TEXT;
  auth_user_name TEXT;
  profile_exists BOOLEAN;
  was_created BOOLEAN := false;
BEGIN
  -- Get user info from auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'name', email) INTO auth_user_email, auth_user_name
  FROM auth.users
  WHERE id = user_id_param;
  
  -- If user doesn't exist in auth.users, return error
  IF auth_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', user_id_param
    );
  END IF;
  
  -- Check if profile already exists by ID
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id_param) INTO profile_exists;
  
  -- If profile doesn't exist, try to create it
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
      
      -- Check if it was actually inserted (might have been created by trigger)
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id_param) INTO profile_exists;
      was_created := profile_exists;
    EXCEPTION
      WHEN unique_violation THEN
        -- Duplicate key error - profile exists (maybe created by another process)
        -- This is fine, just mark as already existing
        profile_exists := true;
        was_created := false;
      WHEN others THEN
        -- Other errors - re-raise to be caught by outer exception handler
        RAISE;
    END;
  END IF;
  
  -- Return success status (even if profile already existed, that's success)
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
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'user_id', user_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO anon;

-- Example: Sync a specific user profile
-- IMPORTANT: Make sure to select "No limit" in SQL Editor before running this
-- SELECT public.sync_user_profile('d849bc7e-42ba-44ac-b4b1-598aeca0deb0'::UUID);

-- Example: Sync all existing users
-- SELECT public.sync_existing_users();

