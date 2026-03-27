-- Comprehensive Migration to Ensure Premium/Feature System Works Across All Devices
-- This script ensures all tables, columns, functions, and real-time subscriptions are properly set up

-- ============================================
-- 1. ENSURE ALL TABLES EXIST
-- ============================================

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  features JSONB DEFAULT '[]'::jsonb, -- Array of feature IDs included in this plan
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
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_code TEXT,
  price_paid DECIMAL(10, 2),
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
  granted_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Config Table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS feature_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  visibility JSONB DEFAULT '{}'::jsonb,
  access JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  enabled_by_default BOOLEAN DEFAULT false,
  can_be_disabled BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  premium_plan_ids UUID[] DEFAULT '{}'::uuid[],
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ENSURE ALL COLUMNS EXIST
-- ============================================

-- Add premium columns to feature_config if they don't exist
ALTER TABLE feature_config 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_plan_ids UUID[] DEFAULT '{}'::uuid[];

-- Ensure features column in subscription_plans is JSONB array (not object)
DO $$ 
BEGIN
  -- Check if features column exists and is correct type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' 
    AND column_name = 'features'
    AND data_type != 'jsonb'
  ) THEN
    ALTER TABLE subscription_plans ALTER COLUMN features TYPE JSONB USING features::jsonb;
  END IF;
  
  -- Ensure default is array, not object
  ALTER TABLE subscription_plans 
  ALTER COLUMN features SET DEFAULT '[]'::jsonb;
END $$;

-- Add subscription columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'premium', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- ============================================
-- 3. ENSURE ALL INDEXES EXIST
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_active_unique 
  ON user_subscriptions(user_id, plan_id) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_premium_trials_user_id ON premium_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_trials_status ON premium_trials(status);
CREATE INDEX IF NOT EXISTS idx_premium_trials_end_date ON premium_trials(end_date);

CREATE INDEX IF NOT EXISTS idx_feature_config_feature_id ON feature_config(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_config_enabled ON feature_config(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_config_is_premium ON feature_config(is_premium);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);

-- ============================================
-- 4. ENSURE ALL FUNCTIONS EXIST
-- ============================================

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

-- Function to get user's active subscription plan ID
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

-- Function to check if user has access to a specific feature
CREATE OR REPLACE FUNCTION user_has_feature_access(user_uuid UUID, feature_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id UUID;
  plan_features JSONB;
  feature_is_premium BOOLEAN;
  feature_plan_ids UUID[];
BEGIN
  -- Get user's active plan
  user_plan_id := get_user_subscription_plan(user_uuid);
  
  -- If no plan, check if feature is premium
  IF user_plan_id IS NULL THEN
    SELECT is_premium INTO feature_is_premium
    FROM feature_config
    WHERE feature_id = feature_id_param;
    
    -- If feature is not premium, allow access
    RETURN COALESCE(feature_is_premium, false) = false;
  END IF;
  
  -- Get plan features
  SELECT features INTO plan_features
  FROM subscription_plans
  WHERE id = user_plan_id;
  
  -- Enterprise plan (all features)
  IF plan_features::text = '["*"]' OR (plan_features::jsonb ? '*') THEN
    RETURN true;
  END IF;
  
  -- Check if feature is in plan's features array
  IF plan_features::jsonb ? feature_id_param THEN
    RETURN true;
  END IF;
  
  -- Check if feature's premium_plan_ids includes user's plan
  SELECT is_premium, premium_plan_ids 
  INTO feature_is_premium, feature_plan_ids
  FROM feature_config
  WHERE feature_id = feature_id_param;
  
  -- If feature is premium and has plan restrictions
  IF feature_is_premium AND feature_plan_ids IS NOT NULL AND array_length(feature_plan_ids, 1) > 0 THEN
    RETURN user_plan_id = ANY(feature_plan_ids);
  END IF;
  
  -- If feature is premium but no plan restrictions, deny access
  IF feature_is_premium THEN
    RETURN false;
  END IF;
  
  -- Feature is not premium, allow access
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ENSURE ALL TRIGGERS EXIST
-- ============================================

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_premium_trials_updated_at ON premium_trials;
CREATE TRIGGER update_premium_trials_updated_at
  BEFORE UPDATE ON premium_trials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_config_updated_at ON feature_config;
CREATE TRIGGER update_feature_config_updated_at
  BEFORE UPDATE ON feature_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ENSURE ALL RLS POLICIES EXIST
-- ============================================

-- Subscription Plans RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin can manage subscription plans" ON subscription_plans;
CREATE POLICY "Super Admin can manage subscription plans"
  ON subscription_plans
  FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view active subscription plans" ON subscription_plans;
CREATE POLICY "Users can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- User Subscriptions RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super Admin can manage all subscriptions" ON user_subscriptions;
CREATE POLICY "Super Admin can manage all subscriptions"
  ON user_subscriptions
  FOR ALL
  USING (is_super_admin());

-- Premium Trials RLS
ALTER TABLE premium_trials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own trials" ON premium_trials;
CREATE POLICY "Users can view their own trials"
  ON premium_trials
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super Admin can manage all trials" ON premium_trials;
CREATE POLICY "Super Admin can manage all trials"
  ON premium_trials
  FOR ALL
  USING (is_super_admin());

-- Feature Config RLS
ALTER TABLE feature_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view enabled features" ON feature_config;
CREATE POLICY "All users can view enabled features"
  ON feature_config
  FOR SELECT
  USING (enabled = true OR is_super_admin());

DROP POLICY IF EXISTS "Super Admin can manage features" ON feature_config;
CREATE POLICY "Super Admin can manage features"
  ON feature_config
  FOR ALL
  USING (is_super_admin());

-- ============================================
-- 7. ENABLE REALTIME FOR ALL TABLES
-- ============================================

-- Enable realtime for subscription_plans
ALTER PUBLICATION supabase_realtime ADD TABLE subscription_plans;

-- Enable realtime for user_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;

-- Enable realtime for premium_trials
ALTER PUBLICATION supabase_realtime ADD TABLE premium_trials;

-- Enable realtime for feature_config
ALTER PUBLICATION supabase_realtime ADD TABLE feature_config;

-- ============================================
-- 8. FIX EXISTING DATA
-- ============================================

-- Ensure all subscription_plans.features are arrays, not objects
UPDATE subscription_plans 
SET features = '[]'::jsonb 
WHERE features IS NULL OR features::text = '{}' OR jsonb_typeof(features) != 'array';

-- Ensure all feature_config.premium_plan_ids are arrays
UPDATE feature_config 
SET premium_plan_ids = '{}'::uuid[] 
WHERE premium_plan_ids IS NULL;

-- ============================================
-- COMPLETE
-- ============================================

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Premium/Feature system setup complete!';
  RAISE NOTICE 'All tables, columns, functions, triggers, and RLS policies are in place.';
  RAISE NOTICE 'Real-time subscriptions are enabled for cross-device sync.';
END $$;

