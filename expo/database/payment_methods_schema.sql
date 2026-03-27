-- Payment Methods Management Schema
-- Allows Super Admin to create and manage custom payment methods

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or emoji
  type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'bank_transfer', 'mobile_money', 'crypto', 'other')),
  is_active BOOLEAN DEFAULT true,
  requires_setup BOOLEAN DEFAULT false,
  setup_instructions TEXT,
  api_config JSONB, -- For API-based payment methods
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);

-- RLS Policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin can manage payment methods"
  ON payment_methods
  FOR ALL
  USING (is_super_admin());

CREATE POLICY "Users can view active payment methods"
  ON payment_methods
  FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initial payment methods
INSERT INTO payment_methods (name, display_name, description, icon, type, is_active, display_order)
VALUES
  ('cash', 'Cash', 'Physical cash payments', '💵', 'cash', true, 1),
  ('card', 'Credit/Debit Card', 'Card payments via POS or online', '💳', 'card', true, 2),
  ('bank_transfer', 'Bank Transfer', 'Direct bank transfers', '🏦', 'bank_transfer', true, 3),
  ('mobile_money', 'Mobile Money', 'Mobile money payments (EcoCash, M-Pesa, etc.)', '📱', 'mobile_money', true, 4)
ON CONFLICT DO NOTHING;

