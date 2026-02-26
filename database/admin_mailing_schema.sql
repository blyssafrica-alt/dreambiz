-- ============================================
-- ADMIN MAILING SYSTEM
-- Requires: Resend config (RESEND_API_KEY, RESEND_FROM) in Edge Function secrets
-- Run after: supplier_marketplace_schema, promotion_engine, etc.
-- ============================================

-- 1) email_campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','paused','cancelled')),
  audience_mode TEXT NOT NULL DEFAULT 'segment' CHECK (audience_mode IN ('segment','manual_list')),
  segment_config JSONB,
  audience_count_estimate INT,
  scheduled_for TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  html TEXT NOT NULL,
  design_json JSONB,
  variables JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.email_templates(id);
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS html_content TEXT;

-- 3) email_recipients
CREATE TABLE IF NOT EXISTS public.email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','delivered','bounced','complained','opened','clicked','failed','skipped_unsubscribed')),
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  fail_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) email_events
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.email_recipients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) email_preferences
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_opt_in BOOLEAN DEFAULT true,
  transactional_opt_in BOOLEAN DEFAULT true,
  supplier_promos_opt_in BOOLEAN DEFAULT true,
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en','sn','nd')),
  unsubscribed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) saved_segments
CREATE TABLE IF NOT EXISTS public.saved_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  segment_config JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7) supplier_profile_metrics_daily (for segment engine: enquiries, views, clicks)
CREATE TABLE IF NOT EXISTS public.supplier_profile_metrics_daily (
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  enquiries_count INT DEFAULT 0,
  product_views INT DEFAULT 0,
  contact_clicks INT DEFAULT 0,
  PRIMARY KEY (supplier_profile_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status_created ON public.email_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON public.email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_status ON public.email_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign_id ON public.email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_unsubscribed ON public.email_preferences(unsubscribed_at) WHERE unsubscribed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_segments_created_by ON public.saved_segments(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_profile_metrics_daily_profile_date ON public.supplier_profile_metrics_daily(supplier_profile_id, date DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_email_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_campaigns_updated ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_email_campaigns_updated_at();

-- RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profile_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Admin-only: campaigns, templates, recipients, events, saved_segments
DROP POLICY IF EXISTS "Admins full access email_campaigns" ON public.email_campaigns;
CREATE POLICY "Admins full access email_campaigns" ON public.email_campaigns
  FOR ALL USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access email_templates" ON public.email_templates;
CREATE POLICY "Admins full access email_templates" ON public.email_templates
  FOR ALL USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access email_recipients" ON public.email_recipients;
CREATE POLICY "Admins full access email_recipients" ON public.email_recipients
  FOR ALL USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access email_events" ON public.email_events;
CREATE POLICY "Admins full access email_events" ON public.email_events
  FOR ALL USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access saved_segments" ON public.saved_segments;
CREATE POLICY "Admins full access saved_segments" ON public.saved_segments
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- Users: own email_preferences only
DROP POLICY IF EXISTS "Users read own email_preferences" ON public.email_preferences;
CREATE POLICY "Users read own email_preferences" ON public.email_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own email_preferences" ON public.email_preferences;
CREATE POLICY "Users update own email_preferences" ON public.email_preferences
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own email_preferences" ON public.email_preferences;
CREATE POLICY "Users insert own email_preferences" ON public.email_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role needs access for Edge Functions (send-campaign, webhook, etc.)
-- Edge functions use service role, bypassing RLS

-- supplier_profile_metrics_daily: admins read
DROP POLICY IF EXISTS "Admins read supplier_profile_metrics_daily" ON public.supplier_profile_metrics_daily;
CREATE POLICY "Admins read supplier_profile_metrics_daily" ON public.supplier_profile_metrics_daily
  FOR SELECT USING (public.user_is_admin(auth.uid()));

-- Allow service role (Edge Functions) to insert/update metrics - no RLS for service
-- Suppliers can read own metrics if we add that later

-- ============================================
-- RPC: estimate_segment_audience
-- ============================================
CREATE OR REPLACE FUNCTION public.estimate_segment_audience(p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_sample JSONB;
  v_role_filter TEXT;
  v_joined_days INT;
  v_inactive_days INT;
  v_country TEXT;
  v_profile_status TEXT;
  v_approved_days INT;
  v_products_min INT;
  v_sub_status TEXT;
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Admin only');
  END IF;

  v_role_filter := COALESCE(p_config->>'role', 'all');
  v_joined_days := (p_config->>'joined_within_days')::INT;
  v_inactive_days := (p_config->>'inactive_for_days')::INT;
  v_country := p_config->>'country';
  v_profile_status := p_config->>'profile_status';
  v_approved_days := (p_config->>'approved_within_days')::INT;
  v_products_min := (p_config->>'products_count_min')::INT;
  v_sub_status := p_config->>'subscription_status';

  -- Build dynamic query based on segment config
  -- Simplified: Owners (users with business) vs Suppliers (supplier_marketplace_profiles)
  IF v_role_filter = 'supplier' OR v_role_filter = 'suppliers' THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM public.supplier_marketplace_profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
      AND (v_country IS NULL OR p.country = v_country)
      AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
      AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL);
  ELSIF v_role_filter = 'owner' OR v_role_filter = 'owners' THEN
    SELECT COUNT(*)::INT INTO v_count
    FROM public.users u
    JOIN public.business_profiles b ON b.user_id = u.id
    WHERE (v_joined_days IS NULL OR u.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
      AND u.email IS NOT NULL;
  ELSE
    -- Mixed: union of suppliers + owners (deduped by user_id)
    WITH combined AS (
      SELECT DISTINCT u.id, u.email
      FROM public.supplier_marketplace_profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE u.email IS NOT NULL
        AND (v_profile_status IS NULL OR p.status = v_profile_status)
        AND (v_country IS NULL OR p.country = v_country)
        AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
        AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
      UNION
      SELECT u.id, u.email
      FROM public.users u
      JOIN public.business_profiles b ON b.user_id = u.id
      WHERE u.email IS NOT NULL
        AND (v_joined_days IS NULL OR u.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
    )
    SELECT COUNT(*)::INT INTO v_count FROM combined;
  END IF;

  -- Sample (up to 5)
  IF v_role_filter = 'supplier' OR v_role_filter = 'suppliers' THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_sample
    FROM (
      SELECT p.id, p.business_name, p.email, p.country, p.status
      FROM public.supplier_marketplace_profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
        AND (v_country IS NULL OR p.country = v_country)
        AND (v_approved_days IS NULL OR (p.status = 'approved' AND p.updated_at >= NOW() - (v_approved_days || ' days')::INTERVAL))
        AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
      LIMIT 5
    ) t;
  ELSE
    v_sample := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'sample', COALESCE(v_sample, '[]'::jsonb));
END;
$$;

-- ============================================
-- RPC: resolve_segment_audience
-- Returns: { recipients: [{ user_id, email, name, ... }] }
-- ============================================
CREATE OR REPLACE FUNCTION public.resolve_segment_audience(
  p_config JSONB,
  p_limit INT DEFAULT 10000,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_filter TEXT;
  v_joined_days INT;
  v_profile_status TEXT;
  v_country TEXT;
  v_approved_days INT;
  v_result JSONB;
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Admin only');
  END IF;

  v_role_filter := COALESCE(p_config->>'role', 'supplier');
  v_joined_days := (p_config->>'joined_within_days')::INT;
  v_profile_status := COALESCE(p_config->>'profile_status', 'approved');
  v_country := p_config->>'country';
  v_approved_days := (p_config->>'approved_within_days')::INT;

  IF v_role_filter = 'supplier' OR v_role_filter = 'suppliers' THEN
    SELECT jsonb_build_object(
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
          LIMIT p_limit
          OFFSET p_offset
        ) p
      ), '[]'::jsonb)
    ) INTO v_result;
  ELSIF v_role_filter = 'owner' OR v_role_filter = 'owners' THEN
    SELECT jsonb_build_object(
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
    ) INTO v_result;
  ELSE
    -- Mixed: suppliers (simplified - full mixed would need UNION)
    SELECT jsonb_build_object(
      'ok', true,
      'recipients', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('user_id', p.user_id, 'email', p.email, 'name', p.business_name, 'metadata', jsonb_build_object('supplier_profile_id', p.id)))
        FROM public.supplier_marketplace_profiles p
        WHERE (v_profile_status IS NULL OR p.status = v_profile_status)
          AND p.email IS NOT NULL
          AND (v_joined_days IS NULL OR p.created_at >= NOW() - (v_joined_days || ' days')::INTERVAL)
        LIMIT p_limit
        OFFSET p_offset
      ), '[]'::jsonb)
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON TABLE public.email_campaigns IS 'Admin mailing campaigns. Sending via Resend (RESEND_API_KEY, RESEND_FROM).';
COMMENT ON TABLE public.email_preferences IS 'User opt-in/out for marketing and transactional emails.';
