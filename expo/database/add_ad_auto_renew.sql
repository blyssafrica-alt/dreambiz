-- Add auto-renew flag to advertisements
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;


