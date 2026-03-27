-- ============================================
-- ADD PAYMENT METHOD AND RELATED COLUMNS TO DOCUMENTS TABLE
-- ============================================
-- This migration adds columns needed for POS day-end closing and payment tracking

-- Add payment_method column if it doesn't exist
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'other'));

-- Add discount_amount column if it doesn't exist (for POS discounts)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;

-- Add employee_name column if it doesn't exist (for POS employee tracking)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Add amount_received column if it doesn't exist (for POS cash transactions)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(15, 2);

-- Add change_amount column if it doesn't exist (for POS cash transactions)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS change_amount DECIMAL(15, 2);

-- Create index on payment_method for faster queries in calculate_shift_totals
CREATE INDEX IF NOT EXISTS idx_documents_payment_method ON documents(payment_method) WHERE payment_method IS NOT NULL;

-- Create index on date and type for faster shift calculations
CREATE INDEX IF NOT EXISTS idx_documents_date_type_status ON documents(date, type, status) 
WHERE type = 'receipt' AND status = 'paid';

-- Add comment
COMMENT ON COLUMN documents.payment_method IS 'Payment method used for this document (cash, card, mobile_money, bank_transfer, other)';
COMMENT ON COLUMN documents.discount_amount IS 'Discount amount applied to this document';
COMMENT ON COLUMN documents.employee_name IS 'Name of employee who created/processed this document';
COMMENT ON COLUMN documents.amount_received IS 'Amount received from customer (for cash payments)';
COMMENT ON COLUMN documents.change_amount IS 'Change given to customer (for cash payments)';

