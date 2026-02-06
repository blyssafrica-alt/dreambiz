-- Add payment tracking fields for advertisements
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

ALTER TABLE advertisements
  DROP CONSTRAINT IF EXISTS advertisements_payment_status_check;

ALTER TABLE advertisements
  ADD CONSTRAINT advertisements_payment_status_check
  CHECK (payment_status IN ('pending', 'approved', 'rejected'));

