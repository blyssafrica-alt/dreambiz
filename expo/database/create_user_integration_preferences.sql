-- ============================================
-- USER INTEGRATION PREFERENCES TABLE
-- ============================================
-- This table stores user-level preferences for integrations
-- (whether they want to use SMS, Email, WhatsApp, etc.)
-- Separate from integration_configs which stores admin-level API keys

CREATE TABLE IF NOT EXISTS public.user_integration_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL, -- e.g., 'sms', 'email', 'whatsapp'
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, integration_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_integration_preferences_user_id ON public.user_integration_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integration_preferences_integration_id ON public.user_integration_preferences(integration_id);

-- Enable RLS
ALTER TABLE public.user_integration_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and modify their own preferences
CREATE POLICY "Users can manage their own integration preferences"
  ON public.user_integration_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.user_integration_preferences IS 'Stores user-level preferences for which integrations they want to use (SMS, Email, WhatsApp, etc.)';

