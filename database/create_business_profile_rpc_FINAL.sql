-- FINAL SIMPLIFIED RPC Function: Create or update business profile
-- Uses PostgreSQL UPSERT (ON CONFLICT) to automatically handle duplicates
-- This is the SIMPLEST and MOST RELIABLE approach
-- Run this in Supabase SQL Editor with "No limit" selected

CREATE OR REPLACE FUNCTION public.create_or_update_business_profile(
  p_user_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_stage TEXT,
  p_location TEXT,
  p_capital NUMERIC,
  p_currency TEXT,
  p_owner TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_dream_big_book TEXT DEFAULT 'none',
  p_logo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- CRITICAL: Clean up any existing duplicates FIRST
  -- This ensures ON CONFLICT will work properly
  DELETE FROM public.business_profiles
  WHERE user_id = p_user_id
  AND id NOT IN (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
      FROM public.business_profiles
      WHERE user_id = p_user_id
    ) ranked
    WHERE rn = 1
  );

  -- Use UPSERT: If business profile exists for this user_id, UPDATE it; otherwise, INSERT new
  -- The UNIQUE constraint on user_id ensures only one business profile per user
  INSERT INTO public.business_profiles (
    user_id,
    name,
    type,
    stage,
    location,
    capital,
    currency,
    owner,
    phone,
    email,
    address,
    dream_big_book,
    logo,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_name,
    p_type,
    p_stage,
    p_location,
    p_capital,
    p_currency,
    p_owner,
    p_phone,
    p_email,
    p_address,
    p_dream_big_book,
    p_logo,
    COALESCE(
      (SELECT created_at FROM public.business_profiles WHERE user_id = p_user_id LIMIT 1),
      NOW()
    ),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    stage = EXCLUDED.stage,
    location = EXCLUDED.location,
    capital = EXCLUDED.capital,
    currency = EXCLUDED.currency,
    owner = EXCLUDED.owner,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    dream_big_book = EXCLUDED.dream_big_book,
    logo = EXCLUDED.logo,
    updated_at = NOW()
  RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;

  -- Return the result
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create/update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_or_update_business_profile TO authenticated;

-- Verify the function was created
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proargnames as argument_names
FROM pg_proc
WHERE proname = 'create_or_update_business_profile';

