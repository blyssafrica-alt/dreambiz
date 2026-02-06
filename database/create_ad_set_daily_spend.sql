CREATE TABLE IF NOT EXISTS ad_set_daily_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_set_id UUID REFERENCES ad_sets(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL,
  spend_amount DECIMAL(15, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ad_set_id, spend_date)
);

CREATE INDEX IF NOT EXISTS idx_ad_set_daily_spend_date ON ad_set_daily_spend(spend_date);

ALTER TABLE ad_set_daily_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad set daily spend" ON ad_set_daily_spend;
CREATE POLICY "Super admins can manage ad set daily spend"
  ON ad_set_daily_spend
  FOR ALL
  USING (is_super_admin());

