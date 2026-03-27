CREATE TABLE IF NOT EXISTS ad_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived', 'rejected')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(15, 2),
  spend_actual DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  pacing_enabled BOOLEAN DEFAULT false,
  daily_budget DECIMAL(15, 2),
  attribution_click_days INTEGER DEFAULT 7,
  attribution_view_days INTEGER DEFAULT 1,
  optimization_goal TEXT DEFAULT 'impressions' CHECK (optimization_goal IN ('impressions', 'clicks', 'conversions')),
  learning_event_threshold INTEGER DEFAULT 50,
  billing_type TEXT DEFAULT 'cpc' CHECK (billing_type IN ('cpc', 'cpe', 'cpa')),
  billing_rate DECIMAL(15, 4) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad sets" ON ad_sets;
CREATE POLICY "Super admins can manage ad sets"
  ON ad_sets
  FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users can manage their own ad sets" ON ad_sets;
CREATE POLICY "Users can manage their own ad sets"
  ON ad_sets
  FOR ALL
  USING (auth.uid()::text = created_by::text)
  WITH CHECK (auth.uid()::text = created_by::text);

DROP TRIGGER IF EXISTS update_ad_sets_updated_at ON ad_sets;
CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

