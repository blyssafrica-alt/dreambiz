-- SIMPLIFIED RPC Function: Create or update business profile
-- This uses UPSERT logic to automatically handle duplicates
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

  -- Use UPSERT: If a business profile exists for this user, update it; otherwise, insert new
  -- This automatically handles duplicates by updating the existing one
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
    COALESCE((SELECT created_at FROM public.business_profiles WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1), NOW()),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    stage = EXCLUDED.stage,
    location = EXCLUDED.location,
    capital = EXCLUDED.capital,
    currency = EXCLUDED.capital,
    owner = EXCLUDED.owner,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    dream_big_book = EXCLUDED.dream_big_book,
    logo = EXCLUDED.logo,
    updated_at = NOW()
  RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;

  -- If no result (shouldn't happen), return error
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to create or update business profile';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    -- If unique constraint violation, try to get existing record
    SELECT row_to_json(bp.*)::JSONB INTO v_result
    FROM public.business_profiles bp
    WHERE bp.user_id = p_user_id
    ORDER BY bp.created_at DESC
    LIMIT 1;
    
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Business profile not found after conflict';
    END IF;
    
    RETURN v_result;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create/update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_or_update_business_profile TO authenticated;

