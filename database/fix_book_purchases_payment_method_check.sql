-- Remove rigid payment_method check constraint so custom payment method names
-- (e.g., EcoCash, M-Pesa) can be saved without insert failures.
ALTER TABLE book_purchases
  DROP CONSTRAINT IF EXISTS book_purchases_payment_method_check;

