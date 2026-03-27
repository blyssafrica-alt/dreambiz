-- Add POS feature configuration (one-time fix)
-- Run in Supabase SQL Editor (No limit)
INSERT INTO feature_config (feature_id, name, description, category, visibility, access, enabled, enabledByDefault, canBeDisabled)
VALUES (
  'pos',
  'POS',
  'Point of sale for retail transactions',
  'financial',
  '{"type": "tab", "showAsTab": true, "tabIcon": "scan", "tabLabel": "POS"}'::jsonb,
  '{}'::jsonb,
  true,
  true,
  true
)
ON CONFLICT (feature_id) DO UPDATE
SET visibility = EXCLUDED.visibility,
    access = EXCLUDED.access,
    enabled = EXCLUDED.enabled,
    enabledByDefault = EXCLUDED.enabledByDefault,
    canBeDisabled = EXCLUDED.canBeDisabled;

