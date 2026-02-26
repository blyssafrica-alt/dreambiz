-- ============================================
-- PAID SPONSORED PLACEMENTS: schema + pricing + RLS
-- Run after supplier_growth_procurement.sql
-- ============================================

-- 1) Pricing config (admin-editable without code deploy)
CREATE TABLE IF NOT EXISTS public.supplier_sponsored_placement_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placement_type TEXT NOT NULL UNIQUE CHECK (placement_type IN ('homepage_featured', 'feed_featured', 'category_featured')),
  label TEXT NOT NULL,
  price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  duration_days INT NOT NULL CHECK (duration_days > 0),
  priority_weight INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsored_pricing_type ON public.supplier_sponsored_placement_pricing(placement_type);
CREATE INDEX IF NOT EXISTS idx_sponsored_pricing_active ON public.supplier_sponsored_placement_pricing(is_active) WHERE is_active = true;

-- Seed default pricing
INSERT INTO public.supplier_sponsored_placement_pricing (placement_type, label, price, currency, duration_days, priority_weight)
VALUES
  ('homepage_featured', 'Homepage featured', 99.00, 'USD', 30, 3),
  ('feed_featured', 'Feed featured', 49.00, 'USD', 14, 2),
  ('category_featured', 'Category featured', 29.00, 'USD', 7, 1)
ON CONFLICT (placement_type) DO NOTHING;

-- RLS: public read active pricing; admins full
ALTER TABLE public.supplier_sponsored_placement_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active placement pricing" ON public.supplier_sponsored_placement_pricing;
CREATE POLICY "Public read active placement pricing" ON public.supplier_sponsored_placement_pricing
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins full access placement pricing" ON public.supplier_sponsored_placement_pricing;
CREATE POLICY "Admins full access placement pricing" ON public.supplier_sponsored_placement_pricing
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- 2) Alter sponsored placements: add payment and approval columns
ALTER TABLE public.supplier_sponsored_placements
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS approved_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Drop old status check and add new one (status values; keep 'pending' for backward compat)
ALTER TABLE public.supplier_sponsored_placements DROP CONSTRAINT IF EXISTS supplier_sponsored_placements_status_check;
ALTER TABLE public.supplier_sponsored_placements
  ADD CONSTRAINT supplier_sponsored_placements_status_check
  CHECK (status IN (
    'draft', 'pending_payment', 'pending_admin_approval', 'approved', 'rejected', 'active', 'expired', 'cancelled', 'paused', 'pending'
  ));

-- Placement type: extend allowed values
ALTER TABLE public.supplier_sponsored_placements DROP CONSTRAINT IF EXISTS supplier_sponsored_placements_placement_check;
ALTER TABLE public.supplier_sponsored_placements
  ADD CONSTRAINT supplier_sponsored_placements_placement_check
  CHECK (placement IN ('home', 'category', 'search', 'profile', 'homepage_featured', 'feed_featured', 'category_featured'));

-- Backfill payment_status and migrate status BEFORE adding paid constraint
UPDATE public.supplier_sponsored_placements SET payment_status = 'unpaid' WHERE payment_status IS NULL;
UPDATE public.supplier_sponsored_placements SET payment_status = 'paid' WHERE status IN ('active', 'approved');
UPDATE public.supplier_sponsored_placements SET status = 'pending_payment' WHERE status = 'pending';

-- Constraint: approved/active only when paid
ALTER TABLE public.supplier_sponsored_placements DROP CONSTRAINT IF EXISTS chk_approved_requires_paid;
ALTER TABLE public.supplier_sponsored_placements
  ADD CONSTRAINT chk_approved_requires_paid
  CHECK (
    (status NOT IN ('approved', 'active')) OR (payment_status = 'paid')
  );

CREATE INDEX IF NOT EXISTS idx_supplier_sponsored_placements_payment_status
  ON public.supplier_sponsored_placements(payment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_sponsored_placements_approved_by
  ON public.supplier_sponsored_placements(approved_by_admin_id);

-- 3) RLS: Public read only approved+paid+within dates
DROP POLICY IF EXISTS "Public read active placements" ON public.supplier_sponsored_placements;
CREATE POLICY "Public read active placements" ON public.supplier_sponsored_placements
  FOR SELECT USING (
    status = 'approved'
    AND payment_status = 'paid'
    AND starts_at <= NOW()
    AND ends_at >= NOW()
  );

-- Supplier: can insert own (draft/pending_payment), can update own only for allowed transitions (e.g. cannot set approved)
-- Keep existing "Supplier manage own placements" for ALL - they can update payment_status via RPC only safely
DROP POLICY IF EXISTS "Supplier manage own placements" ON public.supplier_sponsored_placements;
CREATE POLICY "Supplier manage own placements" ON public.supplier_sponsored_placements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = supplier_id AND sp.user_id = auth.uid())
  );

-- Admins keep full access
DROP POLICY IF EXISTS "Admins full access sponsored" ON public.supplier_sponsored_placements;
CREATE POLICY "Admins full access sponsored" ON public.supplier_sponsored_placements
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- 4) RPC: Mark placement as paid (only from pending_payment, only owner). Called after payment gateway confirms.
CREATE OR REPLACE FUNCTION public.supplier_sponsored_placement_mark_paid(placement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT id, supplier_id, status, payment_status INTO rec
  FROM public.supplier_sponsored_placements WHERE id = placement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Placement not found');
  END IF;
  IF rec.status <> 'pending_payment' OR rec.payment_status = 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid state for payment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles sp WHERE sp.id = rec.supplier_id AND sp.user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your placement');
  END IF;
  UPDATE public.supplier_sponsored_placements
  SET payment_status = 'paid', status = 'pending_admin_approval', updated_at = NOW()
  WHERE id = placement_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 5) RPC: Admin approve (only when paid)
CREATE OR REPLACE FUNCTION public.supplier_sponsored_placement_admin_approve(
  placement_id UUID,
  admin_reject_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Admin only');
  END IF;
  SELECT id, status, payment_status INTO rec
  FROM public.supplier_sponsored_placements WHERE id = placement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Placement not found');
  END IF;
  IF rec.payment_status <> 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment required before approval');
  END IF;
  IF admin_reject_reason IS NOT NULL AND length(trim(admin_reject_reason)) > 0 THEN
    -- Reject
    UPDATE public.supplier_sponsored_placements
    SET status = 'rejected', rejected_reason = trim(admin_reject_reason), updated_at = NOW()
    WHERE id = placement_id;
    RETURN jsonb_build_object('ok', true, 'action', 'rejected');
  END IF;
  -- Approve
  UPDATE public.supplier_sponsored_placements
  SET status = 'approved', approved_by_admin_id = auth.uid(), approved_at = NOW(), rejected_reason = NULL, updated_at = NOW()
  WHERE id = placement_id;
  RETURN jsonb_build_object('ok', true, 'action', 'approved');
END;
$$;

-- 6) RPC: Admin cancel, expire, or set active
CREATE OR REPLACE FUNCTION public.supplier_sponsored_placement_admin_set_status(
  p_placement_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Admin only');
  END IF;
  IF p_new_status NOT IN ('cancelled', 'expired', 'active', 'paused') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;
  UPDATE public.supplier_sponsored_placements
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_placement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Placement not found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
