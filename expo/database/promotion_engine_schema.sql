-- ============================================
-- PROMOTION ENGINE SCHEMA
-- Layered on top of subscription plans. Does NOT modify plans.
-- ============================================

-- 1) Subscription promotions
CREATE TABLE IF NOT EXISTS public.subscription_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('free_trial', 'percentage_discount', 'fixed_discount')),
  target_group TEXT NOT NULL CHECK (target_group IN ('manual', 'recent_signups', 'inactive')),

  -- Type-specific
  trial_days INT,
  discount_percent DECIMAL(5, 2),
  discount_amount DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',

  -- Targeting definitions (used for dynamic queries)
  recent_days_definition INT DEFAULT 14,
  inactive_days_definition INT DEFAULT 30,

  -- Validity
  duration_in_days INT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_redemptions INT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT promotion_type_check CHECK (
    (type = 'free_trial' AND trial_days IS NOT NULL) OR
    (type = 'percentage_discount' AND discount_percent IS NOT NULL) OR
    (type = 'fixed_discount' AND discount_amount IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_subscription_promotions_active ON public.subscription_promotions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_promotions_dates ON public.subscription_promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_promotions_type ON public.subscription_promotions(type);

-- 2) Manual promotion targets (for target_group = 'manual')
CREATE TABLE IF NOT EXISTS public.subscription_promotion_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID NOT NULL REFERENCES public.subscription_promotions(id) ON DELETE CASCADE,
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promotion_id, supplier_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_promotion_targets_promotion ON public.subscription_promotion_targets(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_targets_supplier ON public.subscription_promotion_targets(supplier_profile_id);

-- 3) Promotion redemptions (audit + one-trial-per-supplier + max_redemptions)
CREATE TABLE IF NOT EXISTS public.subscription_promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID NOT NULL REFERENCES public.subscription_promotions(id) ON DELETE CASCADE,
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.supplier_subscriptions(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion ON public.subscription_promotion_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_supplier ON public.subscription_promotion_redemptions(supplier_profile_id);

-- 4) One free trial ever per supplier (materialized check via redemptions)
-- Enforced in application/service layer when applying free_trial promotions

-- 5) Alter supplier_subscriptions for promotion support
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.subscription_promotions(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS base_price DECIMAL(15, 2);
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS final_price DECIMAL(15, 2);
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS discount_ends_at TIMESTAMPTZ;

-- Add 'trial' to status (drop and recreate constraint)
ALTER TABLE public.supplier_subscriptions DROP CONSTRAINT IF EXISTS supplier_subscriptions_status_check;
ALTER TABLE public.supplier_subscriptions
  ADD CONSTRAINT supplier_subscriptions_status_check
  CHECK (status IN ('pending_payment', 'active', 'trial', 'expired', 'cancelled', 'suspended', 'paused'));

CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_promotion ON public.supplier_subscriptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_trial_ends ON public.supplier_subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_discount_ends ON public.supplier_subscriptions(discount_ends_at) WHERE discount_ends_at IS NOT NULL;

-- 6) Promotion audit log (optional improvement)
CREATE TABLE IF NOT EXISTS public.subscription_promotion_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID REFERENCES public.subscription_promotions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promotion_audit_promotion ON public.subscription_promotion_audit(promotion_id);

-- 7) RLS for promotions (admin only)
ALTER TABLE public.subscription_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_promotion_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_promotion_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access promotions" ON public.subscription_promotions;
CREATE POLICY "Admins full access promotions" ON public.subscription_promotions
  FOR ALL USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access promotion targets" ON public.subscription_promotion_targets;
CREATE POLICY "Admins full access promotion targets" ON public.subscription_promotion_targets
  FOR ALL USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read redemptions" ON public.subscription_promotion_redemptions;
CREATE POLICY "Admins read redemptions" ON public.subscription_promotion_redemptions
  FOR SELECT USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role insert redemptions" ON public.subscription_promotion_redemptions;
CREATE POLICY "Service role insert redemptions" ON public.subscription_promotion_redemptions
  FOR INSERT WITH CHECK (true);

-- 8) Function: resolve promotion targets (dynamic query by target_group)
CREATE OR REPLACE FUNCTION public.resolve_promotion_target_suppliers(p_promotion_id UUID)
RETURNS TABLE(supplier_profile_id UUID) AS $$
DECLARE
  prom RECORD;
BEGIN
  SELECT * INTO prom FROM public.subscription_promotions WHERE id = p_promotion_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  IF prom.target_group = 'manual' THEN
    RETURN QUERY
    SELECT t.supplier_profile_id FROM public.subscription_promotion_targets t WHERE t.promotion_id = p_promotion_id;
  ELSIF prom.target_group = 'recent_signups' THEN
    RETURN QUERY
    SELECT p.id
    FROM public.supplier_marketplace_profiles p
    WHERE p.status = 'approved'
      AND p.created_at >= NOW() - (prom.recent_days_definition || ' days')::INTERVAL;
  ELSIF prom.target_group = 'inactive' THEN
    RETURN QUERY
    SELECT DISTINCT s.supplier_profile_id
    FROM public.supplier_subscriptions s
    WHERE s.status = 'expired'
      AND s.expires_at < NOW() - (prom.inactive_days_definition || ' days')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM public.supplier_subscriptions s2
        WHERE s2.supplier_profile_id = s.supplier_profile_id
          AND s2.status IN ('active', 'trial')
          AND (s2.expires_at IS NULL OR s2.expires_at > NOW())
      );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9) Update supplier_can_publish to treat 'trial' like 'active'
CREATE OR REPLACE FUNCTION public.supplier_can_publish(profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub RECORD;
  plan RECORD;
  product_count INT;
BEGIN
  IF profile_id IS NULL THEN RETURN false; END IF;
  SELECT status INTO sub FROM public.supplier_marketplace_profiles WHERE id = profile_id;
  IF sub.status <> 'approved' THEN RETURN false; END IF;
  SELECT * INTO sub FROM public.supplier_subscriptions
  WHERE supplier_profile_id = profile_id
    AND status IN ('active', 'trial')
  AND (
    (trial_ends_at IS NOT NULL AND trial_ends_at > NOW()) OR
    (trial_ends_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()))
  )
  ORDER BY expires_at DESC NULLS FIRST LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT product_limit INTO plan FROM public.supplier_subscription_plans WHERE id = sub.plan_id;
  SELECT COUNT(*) INTO product_count FROM public.supplier_marketplace_products
  WHERE supplier_profile_id = profile_id AND status = 'published';
  RETURN product_count < plan.product_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
