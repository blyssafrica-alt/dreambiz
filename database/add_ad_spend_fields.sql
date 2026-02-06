-- Add spend fields to advertisements for CPC/CPE calculations
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS spend DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS spend_currency TEXT DEFAULT 'USD';

