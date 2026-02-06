ALTER TABLE ad_sets
  ADD COLUMN IF NOT EXISTS learning_event_threshold INTEGER DEFAULT 50;

