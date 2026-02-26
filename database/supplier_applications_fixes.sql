-- ============================================
-- SUPPLIER APPLICATIONS FIXES
-- Run after: supplier_applications.sql, supplier_marketplace_schema.sql
-- Enforces: one application per user, correct submission status, RPC-based submit.
-- ============================================

-- 1) Dedupe: keep one row per owner_user_id (most recently updated), then add UNIQUE
-- Run this before adding the constraint so existing duplicates are removed.
DO $$
DECLARE
  dup_count INT;
BEGIN
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY owner_user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
    FROM public.supplier_applications
  )
  DELETE FROM public.supplier_applications
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS dup_count = ROW_COUNT;
  IF dup_count > 0 THEN
    RAISE NOTICE 'Dedupe removed % duplicate supplier_application row(s).', dup_count;
  END IF;
END $$;

-- Now add UNIQUE(owner_user_id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_applications_owner_user_id_key'
      AND conrelid = 'public.supplier_applications'::regclass
  ) THEN
    ALTER TABLE public.supplier_applications
      ADD CONSTRAINT supplier_applications_owner_user_id_key UNIQUE (owner_user_id);
  END IF;
END $$;

-- 2) RPC: get_or_create_supplier_application
-- Returns the single application row for the current user; creates one with status=draft if none.
CREATE OR REPLACE FUNCTION public.get_or_create_supplier_application()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  row RECORD;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  INSERT INTO public.supplier_applications (owner_user_id, status, payload, updated_at)
  VALUES (uid, 'draft', '{}'::jsonb, NOW())
  ON CONFLICT (owner_user_id) DO UPDATE SET updated_at = NOW()
  RETURNING * INTO row;

  RETURN to_jsonb(row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_supplier_application() TO authenticated;

-- 3) RPC: submit_supplier_application
-- Validates ownership and status, sets status='submitted', submitted_at=now().
CREATE OR REPLACE FUNCTION public.submit_supplier_application(
  p_application_id UUID,
  p_payload JSONB,
  p_denormalized JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  app RECORD;
  new_status TEXT := 'submitted';
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO app
  FROM public.supplier_applications
  WHERE id = p_application_id AND owner_user_id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found_or_forbidden');
  END IF;

  IF app.status NOT IN ('draft', 'needs_info') THEN
    RETURN jsonb_build_object('error', 'invalid_status', 'current_status', app.status);
  END IF;

  -- Basic validation: required fields in payload
  IF (p_payload->'step1'->>'display_name') IS NULL OR trim(p_payload->'step1'->>'display_name') = '' THEN
    RETURN jsonb_build_object('error', 'validation', 'message', 'Business name is required');
  END IF;
  IF (p_payload->'step3'->>'email') IS NULL OR trim(p_payload->'step3'->>'email') = '' THEN
    RETURN jsonb_build_object('error', 'validation', 'message', 'Email is required');
  END IF;
  IF NOT COALESCE((p_payload->'step5'->'accept_supplier_rules')::boolean, false) THEN
    RETURN jsonb_build_object('error', 'validation', 'message', 'You must accept the supplier rules');
  END IF;

  UPDATE public.supplier_applications
  SET
    status = new_status,
    submitted_at = NOW(),
    updated_at = NOW(),
    payload = p_payload,
    display_name = p_denormalized->>'display_name',
    country = (p_denormalized->>'country')::text,
    city = (p_denormalized->>'city')::text,
    address = (p_denormalized->>'address')::text,
    email = (p_denormalized->>'email')::text,
    phone = (p_denormalized->>'phone')::text,
    whatsapp = (p_denormalized->>'whatsapp')::text,
    website = (p_denormalized->>'website')::text,
    registration_number = (p_denormalized->>'registration_number')::text,
    logo_url = (p_denormalized->>'logo_url')::text,
    cover_url = (p_denormalized->>'cover_url')::text,
    about_description = (p_denormalized->>'about_description')::text,
    accept_supplier_rules = COALESCE((p_denormalized->>'accept_supplier_rules')::boolean, false),
    product_keywords = CASE
      WHEN p_denormalized ? 'product_keywords' AND jsonb_typeof(p_denormalized->'product_keywords') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_denormalized->'product_keywords'))
      ELSE product_keywords
    END,
    doc_urls = CASE WHEN p_denormalized ? 'doc_urls' THEN (p_denormalized->'doc_urls')::jsonb ELSE doc_urls END
  WHERE id = p_application_id AND owner_user_id = uid;

  SELECT * INTO app FROM public.supplier_applications WHERE id = p_application_id;
  RETURN to_jsonb(app);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_supplier_application(UUID, JSONB, JSONB) TO authenticated;

-- 4) RPC: withdraw_supplier_application (submitted/pending -> draft)
CREATE OR REPLACE FUNCTION public.withdraw_supplier_application(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  app RECORD;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not_authenticated'); END IF;

  UPDATE public.supplier_applications
  SET status = 'draft', updated_at = NOW()
  WHERE id = p_application_id AND owner_user_id = uid
    AND status IN ('submitted', 'pending')
  RETURNING * INTO app;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found_or_invalid_status');
  END IF;
  RETURN to_jsonb(app);
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_supplier_application(UUID) TO authenticated;

-- 5) RPC: reapply_supplier_application (declined -> draft so user can edit and resubmit)
CREATE OR REPLACE FUNCTION public.reapply_supplier_application(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  app RECORD;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'not_authenticated'); END IF;

  UPDATE public.supplier_applications
  SET status = 'draft', updated_at = NOW()
  -- Keep admin_note for history; optionally clear admin_requested_fields
  WHERE id = p_application_id AND owner_user_id = uid
    AND status = 'declined'
  RETURNING * INTO app;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found_or_not_declined');
  END IF;
  RETURN to_jsonb(app);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reapply_supplier_application(UUID) TO authenticated;

-- 6) RLS: restrict user UPDATE to draft/needs_info only (submit goes through RPC)
DROP POLICY IF EXISTS "Users update own draft" ON public.supplier_applications;
CREATE POLICY "Users update own draft or needs_info"
  ON public.supplier_applications
  FOR UPDATE
  USING (auth.uid() = owner_user_id AND status IN ('draft', 'needs_info'))
  WITH CHECK (auth.uid() = owner_user_id);

-- Admins keep full update (already exists)
-- No change to Admins update applications
