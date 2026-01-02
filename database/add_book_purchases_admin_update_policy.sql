-- Add UPDATE policy for super admins on book_purchases table
-- This allows super admins to update payment_status for verification purposes

-- Policy: Super admins can update all purchases (for payment verification)
CREATE POLICY "Super admins can update all book purchases"
  ON book_purchases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

