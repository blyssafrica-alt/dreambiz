CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived', 'rejected')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(15, 2),
  spend_actual DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad campaigns" ON ad_campaigns;
CREATE POLICY "Super admins can manage ad campaigns"
  ON ad_campaigns
  FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users can manage their own ad campaigns" ON ad_campaigns;
CREATE POLICY "Users can manage their own ad campaigns"
  ON ad_campaigns
  FOR ALL
  USING (auth.uid()::text = created_by::text)
  WITH CHECK (auth.uid()::text = created_by::text);

DROP TRIGGER IF EXISTS update_ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

