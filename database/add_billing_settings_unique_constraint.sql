-- Add unique constraint on billing_type to ensure one row per type
ALTER TABLE ad_billing_settings
DROP CONSTRAINT IF EXISTS ad_billing_settings_billing_type_key;

ALTER TABLE ad_billing_settings
ADD CONSTRAINT ad_billing_settings_billing_type_key UNIQUE (billing_type);

-- Initialize default rates for all three billing types if they don't exist
INSERT INTO ad_billing_settings (billing_type, billing_rate, currency)
VALUES 
  ('cpc', 0.10, 'USD'),
  ('cpe', 0.15, 'USD'),
  ('cpa', 0.50, 'USD')
ON CONFLICT (billing_type) DO NOTHING;

