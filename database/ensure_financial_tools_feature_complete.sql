-- ============================================
-- ENSURE FINANCIAL TOOLS FEATURE IS COMPLETE
-- ============================================
-- This script ensures the financial-tools feature is properly set up
-- with all necessary database components for premium/subscription control

-- Note: Run database/add_financial_tools_feature.sql separately in Supabase SQL Editor
-- The \i command doesn't work in Supabase SQL Editor

-- Ensure real-time is enabled for feature_config (check in Supabase Dashboard)
-- This ensures changes sync across all devices instantly

-- Verify the feature exists
DO $$
DECLARE
  feature_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM feature_config WHERE feature_id = 'financial-tools'
  ) INTO feature_exists;

  IF NOT feature_exists THEN
    RAISE EXCEPTION 'Financial tools feature was not created successfully';
  END IF;

  RAISE NOTICE 'Financial tools feature verified successfully';
END $$;

-- Add helpful comment
COMMENT ON COLUMN feature_config.is_premium IS 'Whether this feature requires a premium subscription';
COMMENT ON COLUMN feature_config.premium_plan_ids IS 'Array of subscription plan IDs that include this feature';

