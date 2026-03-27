-- BULLETPROOF RPC Function: Create or update business profile
-- This version handles ALL edge cases including existing duplicates
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
  v_existing_id UUID;
  v_existing_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- STEP 1: Clean up ALL duplicates, keeping only the most recent one
  -- This uses a CTE to safely identify and delete duplicates
  WITH ranked_profiles AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.business_profiles
    WHERE user_id = p_user_id
  )
  DELETE FROM public.business_profiles
  WHERE user_id = p_user_id
  AND id IN (
    SELECT id FROM ranked_profiles WHERE rn > 1
  );

  -- STEP 2: Get the existing profile ID and created_at (if any)
  -- Use LIMIT 1 to ensure only one row is returned
  SELECT id, created_at INTO v_existing_id, v_existing_created_at
  FROM public.business_profiles
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- STEP 3: Insert or Update
  IF v_existing_id IS NOT NULL THEN
    -- UPDATE existing profile
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
    WHERE id = v_existing_id
    RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;
  ELSE
    -- INSERT new profile
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
    RETURNING row_to_json(business_profiles.*)::JSONB INTO v_result;
  END IF;

  -- Return the result
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Failed to create or update business profile: No result returned';
  END IF;

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

