-- ============================================
-- POS SHIFTS & DAY-END CLOSING TABLE
-- ============================================
-- This table tracks POS shifts, opening/closing cash, and daily summaries

CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Shift Information
  shift_date DATE NOT NULL,
  shift_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  shift_end_time TIMESTAMP WITH TIME ZONE,
  opened_by UUID REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  
  -- Cash Management
  opening_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
  expected_cash DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Opening cash + cash sales
  actual_cash DECIMAL(15, 2), -- Cash counted at closing
  cash_at_hand DECIMAL(15, 2), -- Same as actual_cash (alias for clarity)
  cash_discrepancy DECIMAL(15, 2), -- actual_cash - expected_cash
  discrepancy_notes TEXT,
  
  -- Sales Summary by Payment Method
  total_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cash_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
  card_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
  mobile_money_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
  bank_transfer_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
  other_sales DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Transaction Counts
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_receipts INTEGER NOT NULL DEFAULT 0,
  
  -- Discounts & Returns
  total_discounts DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_returns DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Currency
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'ZWL')),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(business_id, shift_date, status) -- Only one open shift per day per business
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pos_shifts_business_date ON pos_shifts(business_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_user_date ON pos_shifts(user_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(status) WHERE status = 'open';

-- RLS Policies
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own business shifts
CREATE POLICY "Users can view their business shifts"
  ON pos_shifts
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create shifts for their businesses
CREATE POLICY "Users can create shifts for their businesses"
  ON pos_shifts
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- Policy: Users can update their business shifts
CREATE POLICY "Users can update their business shifts"
  ON pos_shifts
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Super admins can view all shifts
CREATE POLICY "Super admins can view all shifts"
  ON pos_shifts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- Function to automatically calculate sales totals when closing shift
CREATE OR REPLACE FUNCTION calculate_shift_totals(p_shift_id UUID)
RETURNS void AS $$
DECLARE
  v_business_id UUID;
  v_shift_date DATE;
  v_opening_cash DECIMAL(15, 2);
  v_cash_sales DECIMAL(15, 2);
  v_card_sales DECIMAL(15, 2);
  v_mobile_money_sales DECIMAL(15, 2);
  v_bank_transfer_sales DECIMAL(15, 2);
  v_other_sales DECIMAL(15, 2);
  v_total_sales DECIMAL(15, 2);
  v_total_transactions INTEGER;
  v_total_receipts INTEGER;
  v_total_discounts DECIMAL(15, 2);
  v_currency TEXT;
BEGIN
  -- Get shift details
  SELECT business_id, shift_date, opening_cash, currency
  INTO v_business_id, v_shift_date, v_opening_cash, v_currency
  FROM pos_shifts
  WHERE id = p_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Calculate sales by payment method from receipts
  SELECT 
    COALESCE(SUM(CASE WHEN d.payment_method = 'cash' THEN d.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.payment_method = 'card' THEN d.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.payment_method = 'mobile_money' THEN d.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.payment_method = 'bank_transfer' THEN d.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.payment_method NOT IN ('cash', 'card', 'mobile_money', 'bank_transfer') THEN d.total ELSE 0 END), 0),
    COALESCE(SUM(d.total), 0),
    COUNT(DISTINCT t.id),
    COUNT(DISTINCT d.id),
    COALESCE(SUM(COALESCE(d.discount_amount, 0)), 0)
  INTO 
    v_cash_sales,
    v_card_sales,
    v_mobile_money_sales,
    v_bank_transfer_sales,
    v_other_sales,
    v_total_sales,
    v_total_transactions,
    v_total_receipts,
    v_total_discounts
  FROM documents d
  LEFT JOIN transactions t ON t.business_id = v_business_id 
    AND t.date = v_shift_date 
    AND t.type = 'sale'
    AND t.description LIKE 'POS Sale%'
  WHERE d.business_id = v_business_id
    AND d.type = 'receipt'
    AND d.date = v_shift_date
    AND d.status = 'paid';

  -- Update shift with calculated totals
  UPDATE pos_shifts
  SET 
    cash_sales = v_cash_sales,
    card_sales = v_card_sales,
    mobile_money_sales = v_mobile_money_sales,
    bank_transfer_sales = v_bank_transfer_sales,
    other_sales = v_other_sales,
    total_sales = v_total_sales,
    total_transactions = v_total_transactions,
    total_receipts = v_total_receipts,
    total_discounts = v_total_discounts,
    expected_cash = v_opening_cash + v_cash_sales,
    updated_at = NOW()
  WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE pos_shifts IS 'Tracks POS shifts, opening/closing cash, and daily sales summaries for day-end closing';

