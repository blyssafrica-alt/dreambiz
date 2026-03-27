-- ============================================
-- RPC: get_supplier_applications_for_admin
-- Returns merged list of wizard applications + pending profiles.
-- Uses SECURITY DEFINER so RLS does not block. App restricts this screen to admins.
-- Run in Supabase SQL Editor after supplier_applications.sql and supplier_marketplace_schema.sql.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_supplier_applications_for_admin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  apps_json JSONB;
  profiles_json JSONB;
  merged JSONB := '[]'::JSONB;
BEGIN
  -- No admin check here: RLS would block direct SELECT; this RPC bypasses RLS.
  -- The app only shows the Supplier Applications screen to admin users.

  SELECT COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'display_name', a.display_name,
        'email', a.email,
        'phone', a.phone,
        'country', a.country,
        'status', a.status,
        'submitted_at', a.submitted_at,
        'created_at', a.created_at,
        'source', 'application'
      ) ORDER BY COALESCE(a.submitted_at, a.created_at) DESC NULLS LAST
    )
    FROM public.supplier_applications a
    WHERE a.status IN ('draft', 'submitted', 'pending', 'needs_info')),
    '[]'::JSONB
  ) INTO apps_json;

  SELECT COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'display_name', p.business_name,
        'email', p.email,
        'phone', p.phone,
        'country', p.country,
        'status', 'pending',
        'submitted_at', p.created_at,
        'created_at', p.created_at,
        'source', 'profile'
      ) ORDER BY p.created_at DESC NULLS LAST
    )
    FROM public.supplier_marketplace_profiles p
    WHERE p.status = 'pending'),
    '[]'::JSONB
  ) INTO profiles_json;

  merged := apps_json || profiles_json;
  RETURN merged;
END;
$$;

-- Ensure the RPC is callable by the API (authenticated and anon roles used by Supabase)
GRANT EXECUTE ON FUNCTION public.get_supplier_applications_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_applications_for_admin() TO anon;
