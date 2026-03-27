-- Add package + admin notes to advertisements
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS ad_package_id UUID REFERENCES ad_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

