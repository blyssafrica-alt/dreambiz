-- Create app_store_metadata table for app store listing content
-- Allows admins to manage privacy/terms/support URLs, screenshots, and metadata

CREATE TABLE IF NOT EXISTS app_store_metadata (
  key TEXT PRIMARY KEY DEFAULT 'default',
  privacy_policy_url TEXT,
  terms_url TEXT,
  support_url TEXT,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  screenshots TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_store_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read app store metadata
CREATE POLICY "Anyone can read app store metadata"
  ON app_store_metadata
  FOR SELECT
  USING (TRUE);

-- Policy: Only super admins can insert/update/delete
CREATE POLICY "Super admins can manage app store metadata"
  ON app_store_metadata
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

COMMENT ON TABLE app_store_metadata IS 'Stores app store listing metadata and legal URLs managed by admins.';


