-- Create book_purchases table for DreamBig book purchases
-- This allows users to purchase books directly in the app

CREATE TABLE IF NOT EXISTS book_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Pricing
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_reference TEXT,
  payment_notes TEXT,
  
  -- Access
  access_granted BOOLEAN DEFAULT FALSE,
  access_granted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_book_purchases_user ON book_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_book_purchases_book ON book_purchases(book_id);
CREATE INDEX IF NOT EXISTS idx_book_purchases_status ON book_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_book_purchases_business ON book_purchases(business_id);

-- Enable RLS
ALTER TABLE book_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own purchases
CREATE POLICY "Users can view their own book purchases"
  ON book_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own purchases
CREATE POLICY "Users can create their own book purchases"
  ON book_purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Super admins can view all purchases
CREATE POLICY "Super admins can view all book purchases"
  ON book_purchases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- Trigger to update books sales stats when purchase is completed
CREATE OR REPLACE FUNCTION update_book_sales_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE books
    SET 
      total_sales = total_sales + 1,
      total_revenue = total_revenue + NEW.total_price,
      updated_at = NOW()
    WHERE id = NEW.book_id;
    
    -- Grant access
    UPDATE book_purchases
    SET 
      access_granted = TRUE,
      access_granted_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_sales_stats
  AFTER UPDATE OF payment_status ON book_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_book_sales_stats();

-- Add comment
COMMENT ON TABLE book_purchases IS 'Stores DreamBig book purchases made by users in the app';

