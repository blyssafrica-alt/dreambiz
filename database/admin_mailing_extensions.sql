-- ============================================
-- ADMIN MAILING EXTENSIONS
-- Run after admin_mailing_schema.sql
-- Adds: manual_list audience, supplier presets, segment extensions, email_unsubscribes
-- ============================================

-- For manual-list recipients without user_id: track unsubscribes by email
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_at ON public.email_unsubscribes(unsubscribed_at);
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
-- No direct user access; Edge Functions use service role

-- Extend resolve_segment_audience to support manual_list (emails in segment_config)
-- row_security = off so admin functions see all rows (incl. admin's own supplier profile)
CREATE OR REPLACE FUNCTION public.resolve_segment_audience(
  p_config JSONB,
  p_limit INT DEFAULT 10000,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_mode TEXT;
  v_emails JSONB;
  v_email TEXT;
  v_result JSONB;
  v_role_filter TEXT;
  v_joined_days INT;
  v_profile_status TEXT;
  v_country TEXT;
  v_approved_days INT;
  v_products_min INT;
  v_no_products_only BOOLEAN;
  v_trial_ends_days INT;
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Admin only');
  END IF;

  v_mode := COALESCE(p_config->>'mode', 'segment');
  v_emails := p_config->'emails';

  -- Manual list: segment_config has { "mode": "manual_list", "emails": ["a@b.com", "b@c.com"] }
  IF v_mode = 'manual_list' AND v_emails IS NOT NULL AND jsonb_typeof(v_emails) = 'array' THEN
    v_result := jsonb_build_object(
      'ok', true,
      'recipients', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', NULL::UUID,
          'email', TRIM(elem::TEXT, '"'),
          'name', NULL::TEXT,
          'metadata', '{}'::jsonb
        ))
        FROM (
          SELECT elem
          FROM jsonb_array_elements_text(v_emails) AS elem
          WHERE TRIM(elem::TEXT, '"') ~ '^[^@]+@[^@]+\.[^@]+$'
          LIMIT p_limit
          OFFSET p_offset
        ) sub(elem)
      ), '[]'::jsonb)
    );
    RETURN v_result;
  END IF;

  v_role_filter := COALESCE(p_config->>'role', 'supplier');
  v_joined_days := (p_config->>'joined_within_days')::INT;
  v_profile_status := NULLIF(TRIM(p_config->>'profile_status'), '');
  v_country := p_config->>'country';
  v_approved_days := (p_config->>'approved_within_days')::INT;
  v_products_min := (p_config->>'products_count_min')::INT;
  v_no_products_only := (p_config->>'no_products_only')::BOOLEAN = true;
  v_trial_ends_days := (p_config->>'trial_ends_in_days')::INT;

  IF v_role_filter = 'supplier' OR v_role_filter = 'suppliers' THEN
    v_result := jsonb_build_object(
      'ok', true,
      'recipients', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', p.user_id,
          'email', p.email,
          'name', p.business_name,
          'metadata', jsonb_build_object('supplier_profile_id', p.id, 'business_name', p.business_name, 'country', p.country)
        ))
        FROM (
          SELECT p.user_id, p.email, p.business_name, p.id, p.country
          FROM public.supplier_marketplace_profiles p
          WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
            AND (v_country IS NULL OR p.country = v_country)
            AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
            AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
            AND p.email IS NOT NULL
            AND (v_products_min IS NULL OR (SELECT COUNT(*) FROM public.supplier_marketplace_products mp WHERE mp.supplier_profile_id = p.id) >= v_products_min)
            AND (NOT v_no_products_only OR (SELECT COUNT(*) FROM public.supplier_marketplace_products mp WHERE mp.supplier_profile_id = p.id) = 0)
            AND (v_trial_ends_days IS NULL OR EXISTS (
              SELECT 1 FROM public.supplier_subscriptions ss
              WHERE ss.supplier_profile_id = p.id AND ss.status = 'trial'
                AND ss.expires_at IS NOT NULL AND ss.expires_at <= NOW() + (v_trial_ends_days || ' days')::INTERVAL
            ))
          LIMIT p_limit
          OFFSET p_offset
        ) p
      ), '[]'::jsonb)
    );
  ELSIF v_role_filter = 'owner' OR v_role_filter = 'owners' THEN
    v_result := jsonb_build_object(
      'ok', true,
      'recipients', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', u.id,
          'email', u.email,
          'name', COALESCE(b.name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
          'metadata', jsonb_build_object('business_id', b.id)
        ))
        FROM auth.users u
        JOIN public.business_profiles b ON b.user_id = u.id
        WHERE u.email IS NOT NULL
          AND (v_joined_days IS NULL OR u.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
        LIMIT p_limit
        OFFSET p_offset
      ), '[]'::jsonb)
    );
  ELSE
    v_result := jsonb_build_object(
      'ok', true,
      'recipients', COALESCE((
        SELECT jsonb_agg(rec)
        FROM (
          SELECT rec FROM (
            SELECT jsonb_build_object('user_id', p.user_id, 'email', p.email, 'name', p.business_name, 'metadata', jsonb_build_object('supplier_profile_id', p.id)) AS rec
            FROM public.supplier_marketplace_profiles p
            WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
              AND p.email IS NOT NULL
              AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
            UNION
            SELECT jsonb_build_object('user_id', u.id, 'email', u.email, 'name', COALESCE(b.name, split_part(u.email, '@', 1)), 'metadata', jsonb_build_object('business_id', b.id)) AS rec
            FROM auth.users u
            JOIN public.business_profiles b ON b.user_id = u.id
            WHERE u.email IS NOT NULL
              AND (v_joined_days IS NULL OR u.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
          ) u
          LIMIT p_limit
          OFFSET p_offset
        ) sub(rec)
      ), '[]'::jsonb)
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Extend estimate_segment_audience for manual_list and supplier presets
-- row_security = off so admin functions see all rows (incl. admin's own supplier profile)
CREATE OR REPLACE FUNCTION public.estimate_segment_audience(p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_count INT;
  v_sample JSONB;
  v_mode TEXT;
  v_emails JSONB;
  v_role_filter TEXT;
  v_joined_days INT;
  v_inactive_days INT;
  v_country TEXT;
  v_profile_status TEXT;
  v_approved_days INT;
  v_products_min INT;
  v_no_products_only BOOLEAN;
  v_trial_ends_days INT;
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Admin only');
  END IF;

  v_mode := COALESCE(p_config->>'mode', 'segment');
  v_emails := p_config->'emails';

  IF v_mode = 'manual_list' AND v_emails IS NOT NULL AND jsonb_typeof(v_emails) = 'array' THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM jsonb_array_elements_text(v_emails) elem
    WHERE TRIM(elem::TEXT, '"') ~ '^[^@]+@[^@]+\.[^@]+$';
    SELECT COALESCE(jsonb_agg(jsonb_build_object('email', em)), '[]'::jsonb) INTO v_sample
    FROM (SELECT TRIM(elem::TEXT, '"') AS em FROM jsonb_array_elements_text(v_emails) AS elem WHERE TRIM(elem::TEXT, '"') ~ '^[^@]+@[^@]+\.[^@]+$' LIMIT 5) sub;
    RETURN jsonb_build_object('ok', true, 'count', COALESCE(v_count, 0), 'sample', COALESCE(v_sample, '[]'::jsonb));
  END IF;

  v_role_filter := COALESCE(p_config->>'role', 'all');
  v_joined_days := (p_config->>'joined_within_days')::INT;
  v_inactive_days := (p_config->>'inactive_for_days')::INT;
  v_country := p_config->>'country';
  v_profile_status := p_config->>'profile_status';
  v_approved_days := (p_config->>'approved_within_days')::INT;
  v_products_min := (p_config->>'products_count_min')::INT;
  v_no_products_only := (p_config->>'no_products_only')::BOOLEAN = true;
  v_trial_ends_days := (p_config->>'trial_ends_in_days')::INT;

  IF v_role_filter = 'supplier' OR v_role_filter = 'suppliers' THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM public.supplier_marketplace_profiles p
    WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
      AND (v_country IS NULL OR p.country = v_country)
      AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
      AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
      AND p.email IS NOT NULL
      AND (v_products_min IS NULL OR (SELECT COUNT(*) FROM public.supplier_marketplace_products mp WHERE mp.supplier_profile_id = p.id) >= v_products_min)
      AND (NOT v_no_products_only OR (SELECT COUNT(*) FROM public.supplier_marketplace_products mp WHERE mp.supplier_profile_id = p.id) = 0)
      AND (v_trial_ends_days IS NULL OR EXISTS (
        SELECT 1 FROM public.supplier_subscriptions ss
        WHERE ss.supplier_profile_id = p.id AND ss.status = 'trial'
          AND ss.expires_at IS NOT NULL AND ss.expires_at <= NOW() + (v_trial_ends_days || ' days')::INTERVAL
      ));
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_sample
    FROM (
      SELECT p.id, p.business_name, p.email, p.country, p.status
      FROM public.supplier_marketplace_profiles p
      WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
        AND (v_country IS NULL OR p.country = v_country)
        AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
        AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
        AND p.email IS NOT NULL
        AND (v_products_min IS NULL OR (SELECT COUNT(*) FROM public.supplier_marketplace_products mp WHERE mp.supplier_profile_id = p.id) >= v_products_min)
        AND (NOT v_no_products_only OR (SELECT COUNT(*) FROM public.supplier_marketplace_products mp WHERE mp.supplier_profile_id = p.id) = 0)
        AND (v_trial_ends_days IS NULL OR EXISTS (
          SELECT 1 FROM public.supplier_subscriptions ss
          WHERE ss.supplier_profile_id = p.id AND ss.status = 'trial'
            AND ss.expires_at IS NOT NULL AND ss.expires_at <= NOW() + (v_trial_ends_days || ' days')::INTERVAL
        ))
      LIMIT 5
    ) t;
  ELSIF v_role_filter = 'owner' OR v_role_filter = 'owners' THEN
    -- Use auth.users (business_profiles.user_id = auth user id)
    SELECT COUNT(*)::INT INTO v_count
    FROM auth.users u
    JOIN public.business_profiles b ON b.user_id = u.id
    WHERE (v_joined_days IS NULL OR u.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
      AND u.email IS NOT NULL;
    v_sample := '[]'::jsonb;
  ELSE
    -- Mixed: suppliers ∪ owners (deduped by user id)
    WITH combined AS (
      SELECT u.id
      FROM public.supplier_marketplace_profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE u.email IS NOT NULL
        AND (v_profile_status IS NULL OR p.status = v_profile_status)
        AND (v_country IS NULL OR p.country = v_country)
        AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
        AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
      UNION
      SELECT u.id
      FROM auth.users u
      JOIN public.business_profiles b ON b.user_id = u.id
      WHERE u.email IS NOT NULL
        AND (v_joined_days IS NULL OR u.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
    )
    SELECT COUNT(*)::INT INTO v_count FROM combined;
    v_sample := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', COALESCE(v_count, 0), 'sample', COALESCE(v_sample, '[]'::jsonb));
END;
$$;

COMMENT ON FUNCTION public.resolve_segment_audience IS 'Resolve audience for campaigns. Supports segment (role, filters) and manual_list (emails array).';
COMMENT ON FUNCTION public.estimate_segment_audience IS 'Estimate audience count. Supports manual_list and supplier presets (no_products_only, trial_ends_in_days).';
