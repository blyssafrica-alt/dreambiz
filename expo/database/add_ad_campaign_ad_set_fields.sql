ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ad_set_id UUID REFERENCES ad_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advertisements_campaign_id ON advertisements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_ad_set_id ON advertisements(ad_set_id);

