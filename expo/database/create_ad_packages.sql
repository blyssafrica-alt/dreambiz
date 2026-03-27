-- Ad packages for self-serve ads
CREATE TABLE IF NOT EXISTS ad_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  price_per_location DECIMAL(6, 2) NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_packages_active ON ad_packages(is_active) WHERE is_active = true;

ALTER TABLE ad_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active ad packages" ON ad_packages;
CREATE POLICY "Anyone can view active ad packages"
  ON ad_packages
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage ad packages" ON ad_packages;
CREATE POLICY "Super admins can manage ad packages"
  ON ad_packages
  FOR ALL
  USING (is_super_admin());

DROP TRIGGER IF EXISTS update_ad_packages_updated_at ON ad_packages;
CREATE TRIGGER update_ad_packages_updated_at BEFORE UPDATE ON ad_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO ad_packages (name, description, price, currency, price_per_location, duration_days, display_order)
VALUES
  ('Starter', '7 days · Standard placement', 10, 'USD', 1, 7, 1),
  ('Growth', '14 days · Priority placement', 25, 'USD', 1.25, 14, 2),
  ('Pro', '30 days · Premium placement', 50, 'USD', 1.5, 30, 3)
ON CONFLICT DO NOTHING;

