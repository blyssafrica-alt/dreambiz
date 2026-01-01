-- Subscription Payments Table
-- Links subscription purchases with the manual payment verification system

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  notes TEXT,
  proof_of_payment_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  subscription_id UUID REFERENCES user_subscriptions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_plan_id ON subscription_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(verification_status);

-- RLS Policies
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription payments"
  ON subscription_payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription payments"
  ON subscription_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super Admin can manage all subscription payments"
  ON subscription_payments
  FOR ALL
  USING (is_super_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE subscription_payments IS 'Manual payment records for subscription purchases - requires admin verification';
