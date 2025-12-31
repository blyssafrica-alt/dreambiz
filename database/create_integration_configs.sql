-- ============================================
-- INTEGRATION CONFIGURATIONS TABLE
-- ============================================
-- This table stores API keys, webhook URLs, and other configuration
-- for third-party integrations (Stripe, PayPal, QuickBooks, etc.)

CREATE TABLE IF NOT EXISTS public.integration_configs (
  id TEXT PRIMARY KEY, -- e.g., 'stripe', 'paypal', 'quickbooks'
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'payment', 'accounting', 'communication', 'storage'
  api_key TEXT, -- Encrypted API key
  api_secret TEXT, -- Encrypted API secret
  webhook_url TEXT, -- Webhook URL for receiving events
  base_url TEXT, -- Base API URL
  is_active BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}', -- Additional configuration as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integration_configs_category ON public.integration_configs(category);
CREATE INDEX IF NOT EXISTS idx_integration_configs_is_active ON public.integration_configs(is_active);

-- Enable RLS
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can view and modify integration configs
CREATE POLICY "Only super admins can manage integration configs"
  ON public.integration_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- Add comment
COMMENT ON TABLE public.integration_configs IS 'Stores API keys and configuration for third-party integrations. Only accessible by super admins.';

