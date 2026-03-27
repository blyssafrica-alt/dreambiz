ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS spend_actual DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'cpc' CHECK (billing_type IN ('cpc', 'cpe', 'cpa')),
  ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(15, 4) DEFAULT 0;

COMMENT ON COLUMN advertisements.spend IS 'Budget limit for the ad';
COMMENT ON COLUMN advertisements.spend_actual IS 'Actual spend accrued from billing events';
COMMENT ON COLUMN advertisements.billing_type IS 'Billing model: cpc, cpe, or cpa';
COMMENT ON COLUMN advertisements.billing_rate IS 'Cost per billing event';

