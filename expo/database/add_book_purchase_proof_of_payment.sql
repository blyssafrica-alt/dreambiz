-- Add proof_of_payment_url column to book_purchases table
-- This allows users to upload proof of payment when purchasing books

ALTER TABLE book_purchases 
ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT;

-- Add comment
COMMENT ON COLUMN book_purchases.proof_of_payment_url IS 'URL to proof of payment image uploaded by user';

