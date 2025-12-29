-- Add proof of payment attachment to payments table
-- This allows users to attach proof of payment (receipts, screenshots, etc.)

-- First, ensure the payments table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to payments table if they don't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Enable RLS if not already enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create if they don't exist)
-- Note: DROP POLICY IF EXISTS and CREATE POLICY will work even if policy exists in some PostgreSQL versions
-- Using a safer approach with exception handling

DO $$
BEGIN
  -- Users can view their own payments
  BEGIN
    CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Users can insert their own payments
  BEGIN
    CREATE POLICY "Users can insert their own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Users can update their own payments
  BEGIN
    CREATE POLICY "Users can update their own payments" ON payments FOR UPDATE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Users can delete their own payments
  BEGIN
    CREATE POLICY "Users can delete their own payments" ON payments FOR DELETE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Super admins can view all payments
  BEGIN
    CREATE POLICY "Super admins can view all payments" ON payments FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Super admins can update all payments (for verification)
  BEGIN
    CREATE POLICY "Super admins can update all payments" ON payments FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_document_id ON payments(document_id);
CREATE INDEX IF NOT EXISTS idx_payments_verification_status ON payments(verification_status);

-- Add comments
COMMENT ON COLUMN payments.proof_of_payment_url IS 'URL to proof of payment document (receipt, screenshot, etc.)';
COMMENT ON COLUMN payments.verification_status IS 'Payment verification status: pending, approved, or rejected';
COMMENT ON COLUMN payments.verified_by IS 'User ID of admin who verified the payment';
COMMENT ON COLUMN payments.verified_at IS 'Timestamp when payment was verified';
COMMENT ON COLUMN payments.verification_notes IS 'Admin notes about payment verification';

