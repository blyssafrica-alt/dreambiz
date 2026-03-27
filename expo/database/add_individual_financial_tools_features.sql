-- ============================================
-- INDIVIDUAL FINANCIAL TOOLS FEATURES
-- ============================================
-- This migration creates separate feature entries for each financial tool
-- so admins can assign individual tools to subscription plans

-- Helper function to safely add a feature
DO $$
DECLARE
  feature_record RECORD;
  category_val TEXT := 'financial';
  visibility_config JSONB := jsonb_build_object('type', 'contextual', 'showAsTab', false);
  access_config JSONB := jsonb_build_object('requiresBook', false, 'bookIds', '[]'::jsonb, 'businessTypes', '[]'::jsonb, 'businessStages', '[]'::jsonb);
BEGIN
  -- Array of individual financial tools
  FOR feature_record IN
    SELECT * FROM (VALUES
      ('break-even-calculator', 'Break-Even Calculator', 'Calculate when your business will break even', 'financial'),
      ('pricing-calculator', 'Pricing Calculator', 'Determine optimal product pricing', 'financial'),
      ('profit-margin-analyzer', 'Profit Margin Analyzer', 'Analyze your profit margins', 'financial'),
      ('markup-calculator', 'Business Markup Calculator', 'Calculate markup percentages', 'financial'),
      ('roi-calculator', 'Business ROI Calculator', 'Calculate return on investment', 'financial'),
      ('pl-statement', 'Profit & Loss Statement', 'Monthly and yearly P&L reports', 'financial'),
      ('cashflow-statement', 'Cash Flow Statement', 'Track cash inflows and outflows', 'financial'),
      ('balance-sheet', 'Balance Sheet', 'Statement of financial position', 'financial')
    ) AS t(feature_id, name, description, category)
  LOOP
    -- Check if feature already exists
    IF NOT EXISTS (SELECT 1 FROM feature_config WHERE feature_id = feature_record.feature_id) THEN
      -- Insert new feature
      INSERT INTO feature_config (
        feature_id,
        name,
        description,
        category,
        enabled,
        is_premium,
        premium_plan_ids,
        visibility,
        access,
        enabled_by_default,
        can_be_disabled,
        created_at,
        updated_at
      ) VALUES (
        feature_record.feature_id,
        feature_record.name,
        feature_record.description,
        feature_record.category,
        true, -- enabled by default
        false, -- not premium by default
        '{}'::uuid[], -- no plans assigned by default
        visibility_config,
        access_config,
        false, -- not enabled by default (admin must enable)
        true, -- can be disabled
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created feature: %', feature_record.feature_id;
    ELSE
      -- Update existing feature if needed
      UPDATE feature_config
      SET
        name = feature_record.name,
        description = feature_record.description,
        category = feature_record.category,
        updated_at = NOW()
      WHERE feature_id = feature_record.feature_id;
      
      RAISE NOTICE 'Updated feature: %', feature_record.feature_id;
    END IF;
  END LOOP;
END $$;

-- Optional: Keep the parent "financial-tools" feature for backward compatibility
-- But mark it as a container feature (not directly accessible)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM feature_config WHERE feature_id = 'financial-tools') THEN
    UPDATE feature_config
    SET
      description = 'Financial Tools Hub (container - individual tools can be assigned separately)',
      enabled = true,
      can_be_disabled = true
    WHERE feature_id = 'financial-tools';
    
    RAISE NOTICE 'Updated parent financial-tools feature';
  END IF;
END $$;

