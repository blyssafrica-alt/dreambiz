-- RPC Function to create/update business profile with elevated privileges
-- This bypasses RLS by using SECURITY DEFINER
-- Run this in Supabase SQL Editor with "No limit" selected

-- Function to create or update business profile
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
SECURITY DEFINER -- This allows bypassing RLS
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_result JSONB;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- Check if business profile already exists for this user
  SELECT id INTO v_business_id
  FROM public.business_profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_business_id IS NOT NULL THEN
    -- Update existing business profile
    UPDATE public.business_profiles
    SET
      name = p_name,
      type = p_type,
      stage = p_stage,
      location = p_location,
      capital = p_capital,
      currency = p_currency,
      owner = p_owner,
      phone = p_phone,
      email = p_email,
      address = p_address,
      dream_big_book = p_dream_big_book,
      logo = p_logo,
      updated_at = NOW()
    WHERE id = v_business_id;

    SELECT row_to_json(bp.*)::JSONB INTO v_result
    FROM public.business_profiles bp
    WHERE bp.id = v_business_id;
  ELSE
    -- Insert new business profile
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
      NOW(),
      NOW()
    )
    RETURNING id INTO v_business_id;

    SELECT row_to_json(bp.*)::JSONB INTO v_result
    FROM public.business_profiles bp
    WHERE bp.id = v_business_id;
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create/update business profile: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_or_update_business_profile TO authenticated;

-- Verify the function was created
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proargnames as argument_names
FROM pg_proc
WHERE proname = 'create_or_update_business_profile';

