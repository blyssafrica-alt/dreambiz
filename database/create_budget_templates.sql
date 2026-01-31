-- Budget templates managed by super admins

CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  business_types TEXT[] DEFAULT '{}',
  categories JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS budget_templates_name_unique
  ON budget_templates(name);

ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read budget templates"
  ON budget_templates
  FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Super admins can manage budget templates"
  ON budget_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

COMMENT ON TABLE budget_templates IS 'Budget templates for different business types.';

