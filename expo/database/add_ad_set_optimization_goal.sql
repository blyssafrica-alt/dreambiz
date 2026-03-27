ALTER TABLE ad_sets
  ADD COLUMN IF NOT EXISTS optimization_goal TEXT DEFAULT 'impressions'
    CHECK (optimization_goal IN ('impressions', 'clicks', 'conversions'));

