-- ============================================
-- ADD FINANCIAL TOOLS FEATURE
-- ============================================
-- This migration adds the financial-tools feature to feature_config
-- so it can be controlled by admins and assigned to subscription plans

-- Ensure feature_config table exists with all required columns
DO $$
BEGIN
  -- Add is_premium column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN is_premium BOOLEAN DEFAULT false;
  END IF;

  -- Add premium_plan_ids column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'premium_plan_ids'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN premium_plan_ids UUID[] DEFAULT '{}'::uuid[];
  END IF;
END $$;

-- Ensure all required columns exist
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'name'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'description'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'category'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN category TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'enabled_by_default'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN enabled_by_default BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'can_be_disabled'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN can_be_disabled BOOLEAN DEFAULT true;
  END IF;

  -- Use 'visibility' (not 'visibility_config') to match app code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN visibility JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Use 'access' (not 'access_config') to match app code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'access'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN access JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE feature_config ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Insert financial-tools feature if it doesn't exist
-- Build the INSERT dynamically based on which columns exist
DO $$
DECLARE
  has_enabled_by_default BOOLEAN;
  has_can_be_disabled BOOLEAN;
  has_created_at BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'enabled_by_default'
  ) INTO has_enabled_by_default;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'can_be_disabled'
  ) INTO has_can_be_disabled;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_config' AND column_name = 'created_at'
  ) INTO has_created_at;

  -- Insert or update the feature
  IF NOT EXISTS (SELECT 1 FROM feature_config WHERE feature_id = 'financial-tools') THEN
    IF has_enabled_by_default AND has_can_be_disabled AND has_created_at THEN
      -- Full schema
      INSERT INTO feature_config (
        feature_id, name, description, category, enabled, is_premium, premium_plan_ids,
        visibility, access, enabled_by_default, can_be_disabled, created_at, updated_at
      ) VALUES (
        'financial-tools',
        'Financial Tools',
        'Comprehensive financial calculators and statements including break-even, pricing, profit margin, markup, ROI calculators, and P&L, Cash Flow, and Balance Sheet statements',
        'financial',
        true,
        false,
        '{}'::uuid[],
        jsonb_build_object('type', 'contextual', 'showAsTab', false),
        jsonb_build_object('requiresBook', false, 'bookIds', '[]'::jsonb, 'businessTypes', '[]'::jsonb, 'businessStages', '[]'::jsonb),
        false,
        true,
        NOW(),
        NOW()
      );
    ELSE
      -- Minimal schema (only required columns)
      INSERT INTO feature_config (
        feature_id, name, description, category, enabled, is_premium, premium_plan_ids,
        visibility, access, updated_at
      ) VALUES (
        'financial-tools',
        'Financial Tools',
        'Comprehensive financial calculators and statements including break-even, pricing, profit margin, markup, ROI calculators, and P&L, Cash Flow, and Balance Sheet statements',
        'financial',
        true,
        false,
        '{}'::uuid[],
        jsonb_build_object('type', 'contextual', 'showAsTab', false),
        jsonb_build_object('requiresBook', false, 'bookIds', '[]'::jsonb, 'businessTypes', '[]'::jsonb, 'businessStages', '[]'::jsonb),
        NOW()
      );
    END IF;
  ELSE
    -- Update existing feature
    UPDATE feature_config SET
      name = 'Financial Tools',
      description = 'Comprehensive financial calculators and statements including break-even, pricing, profit margin, markup, ROI calculators, and P&L, Cash Flow, and Balance Sheet statements',
        category = 'financial',
      updated_at = NOW()
    WHERE feature_id = 'financial-tools';
  END IF;
END $$;

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_feature_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_config_updated_at ON feature_config;
CREATE TRIGGER update_feature_config_updated_at
  BEFORE UPDATE ON feature_config
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_config_updated_at();

-- Enable real-time for feature_config if not already enabled
-- (This should already be done, but ensuring it's enabled)
-- Note: Real-time is enabled via Supabase Dashboard, but we ensure the table is ready

-- Add comment
COMMENT ON TABLE feature_config IS 'Feature configuration table - controls which features are available and to whom';

