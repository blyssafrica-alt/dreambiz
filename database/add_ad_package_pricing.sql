-- Add price_per_location to ad packages
ALTER TABLE ad_packages
  ADD COLUMN IF NOT EXISTS price_per_location DECIMAL(6, 2) NOT NULL DEFAULT 1;

