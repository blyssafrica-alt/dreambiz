-- Premium/Subscription System Schema
-- This schema enables Super Admin to manage subscriptions, trials, discounts, and premium features

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  features JSONB DEFAULT '{}'::jsonb, -- List of feature IDs included in this plan
  max_businesses INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 1,
  max_storage_mb INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'past_due')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  discount_percentage DECIMAL(5, 2) DEFAULT 0, -- Applied discount percentage
  discount_code TEXT, -- If discount was applied via code
  price_paid DECIMAL(10, 2), -- Actual price paid (after discount)
  payment_method TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premium Trials Table
CREATE TABLE IF NOT EXISTS premium_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),
  converted_to_subscription_id UUID REFERENCES user_subscriptions(id),
  granted_by UUID REFERENCES users(id), -- Super Admin who granted the trial
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Discounts Table
CREATE TABLE IF NOT EXISTS user_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  discount_code TEXT NOT NULL,
  discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  discount_amount DECIMAL(10, 2), -- Fixed amount discount (alternative to percentage)
  applicable_plans UUID[], -- Array of plan IDs this discount applies to (empty = all plans)
  max_uses INTEGER DEFAULT 1, -- Maximum times this discount can be used
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES users(id), -- Super Admin who granted the discount
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global Discount Codes Table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percentage DECIMAL(5, 2),
  discount_amount DECIMAL(10, 2),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  applicable_plans UUID[],
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add premium flag to feature_config
ALTER TABLE feature_config 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_plan_ids UUID[] DEFAULT '{}'::uuid[]; -- Which plans include this feature

-- Add subscription status to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'premium', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_premium_trials_user_id ON premium_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_trials_status ON premium_trials(status);
CREATE INDEX IF NOT EXISTS idx_user_discounts_user_id ON user_discounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discounts_code ON user_discounts(discount_code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);

-- RLS Policies

-- Subscription Plans: Super Admin can manage, all users can read active plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin can manage subscription plans"
  ON subscription_plans
  FOR ALL
  USING (is_super_admin());

CREATE POLICY "Users can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- User Subscriptions: Users can only see their own, Super Admin can see all
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super Admin can manage all subscriptions"
  ON user_subscriptions
  FOR ALL
  USING (is_super_admin());

-- Premium Trials: Users can only see their own, Super Admin can manage all
ALTER TABLE premium_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trials"
  ON premium_trials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super Admin can manage all trials"
  ON premium_trials
  FOR ALL
  USING (is_super_admin());

-- User Discounts: Users can only see their own, Super Admin can manage all
ALTER TABLE user_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own discounts"
  ON user_discounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super Admin can manage all discounts"
  ON user_discounts
  FOR ALL
  USING (is_super_admin());

-- Discount Codes: All authenticated users can view active codes, Super Admin can manage
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active discount codes"
  ON discount_codes
  FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Super Admin can manage discount codes"
  ON discount_codes
  FOR ALL
  USING (is_super_admin());

-- Functions

-- Function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION has_active_premium(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = user_uuid
      AND status IN ('active', 'trial')
      AND (end_date IS NULL OR end_date > NOW())
  ) OR EXISTS (
    SELECT 1 FROM premium_trials
    WHERE user_id = user_uuid
      AND status = 'active'
      AND end_date > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active subscription plan
CREATE OR REPLACE FUNCTION get_user_subscription_plan(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  plan_uuid UUID;
BEGIN
  -- Check active subscription first
  SELECT plan_id INTO plan_uuid
  FROM user_subscriptions
  WHERE user_id = user_uuid
    AND status = 'active'
    AND (end_date IS NULL OR end_date > NOW())
  ORDER BY start_date DESC
  LIMIT 1;
  
  -- If no active subscription, check active trial
  IF plan_uuid IS NULL THEN
    SELECT plan_id INTO plan_uuid
    FROM premium_trials
    WHERE user_id = user_uuid
      AND status = 'active'
      AND end_date > NOW()
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;
  
  RETURN plan_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_premium_trials_updated_at
  BEFORE UPDATE ON premium_trials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_discounts_updated_at
  BEFORE UPDATE ON user_discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initial Data: Default Subscription Plans
INSERT INTO subscription_plans (name, description, price, currency, billing_period, features, max_businesses, max_users, display_order)
VALUES
  ('Free', 'Basic features for small businesses', 0.00, 'USD', 'monthly', '{}'::jsonb, 1, 1, 1),
  ('Starter', 'Essential features for growing businesses', 9.99, 'USD', 'monthly', '{"products", "customers", "documents"}'::jsonb, 3, 2, 2),
  ('Professional', 'Advanced features for established businesses', 29.99, 'USD', 'monthly', '{"products", "customers", "documents", "reports", "integrations"}'::jsonb, 10, 5, 3),
  ('Enterprise', 'Full feature access for large businesses', 99.99, 'USD', 'monthly', '{"*"}'::jsonb, -1, -1, 4)
ON CONFLICT DO NOTHING;

