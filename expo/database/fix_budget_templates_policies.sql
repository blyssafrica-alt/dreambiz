-- Ensure budget templates are visible to all authenticated users
-- while keeping admin-only write access.

ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read budget templates" ON budget_templates;
CREATE POLICY "Anyone can read budget templates"
  ON budget_templates
  FOR SELECT
  USING (COALESCE(is_active, TRUE) = TRUE);

DROP POLICY IF EXISTS "Super admins can manage budget templates" ON budget_templates;
CREATE POLICY "Super admins can manage budget templates"
  ON budget_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

