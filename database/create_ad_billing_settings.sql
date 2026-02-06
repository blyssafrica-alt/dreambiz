CREATE TABLE IF NOT EXISTS ad_billing_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  billing_type TEXT NOT NULL DEFAULT 'cpc' CHECK (billing_type IN ('cpc', 'cpe', 'cpa')),
  billing_rate DECIMAL(15, 4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad billing settings" ON ad_billing_settings;
CREATE POLICY "Super admins can manage ad billing settings"
  ON ad_billing_settings
  FOR ALL
  USING (is_super_admin());

DROP TRIGGER IF EXISTS update_ad_billing_settings_updated_at ON ad_billing_settings;
CREATE TRIGGER update_ad_billing_settings_updated_at BEFORE UPDATE ON ad_billing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

