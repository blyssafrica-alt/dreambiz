-- RPC Function to clean up duplicate business profiles
-- This bypasses RLS by using SECURITY DEFINER
-- Run this in Supabase SQL Editor with "No limit" selected

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_business_profiles(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_remaining_count INTEGER := 0;
BEGIN
  -- Verify the user_id matches the authenticated user
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID does not match authenticated user';
  END IF;

  -- Count duplicates before cleanup
  SELECT COUNT(*) INTO v_remaining_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- Delete duplicates, keeping only the most recent one
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

  -- Get count of deleted records
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Count remaining records
  SELECT COUNT(*) INTO v_remaining_count
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'remaining_count', v_remaining_count,
    'message', CASE 
      WHEN v_deleted_count > 0 THEN format('Cleaned up %s duplicate(s), %s remaining', v_deleted_count, v_remaining_count)
      ELSE format('No duplicates found, %s profile(s) remaining', v_remaining_count)
    END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_business_profiles(UUID) TO authenticated;

