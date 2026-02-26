-- Add suspended and paused status for admin control of supplier subscriptions

ALTER TABLE public.supplier_subscriptions DROP CONSTRAINT IF EXISTS supplier_subscriptions_status_check;
ALTER TABLE public.supplier_subscriptions
  ADD CONSTRAINT supplier_subscriptions_status_check
  CHECK (status IN ('pending_payment', 'active', 'expired', 'cancelled', 'suspended', 'paused'));

-- Optional: add admin_reason for audit
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS admin_reason TEXT;
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS admin_acted_at TIMESTAMPTZ;
ALTER TABLE public.supplier_subscriptions ADD COLUMN IF NOT EXISTS admin_acted_by UUID REFERENCES auth.users(id);
