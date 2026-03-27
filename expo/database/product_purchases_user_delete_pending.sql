-- Allow users to delete their own product_purchases when payment is still pending.
-- Run in Supabase SQL Editor so "Remove" works on My Purchases for pending orders.

DROP POLICY IF EXISTS "Users can delete own pending purchases" ON product_purchases;
CREATE POLICY "Users can delete own pending purchases" ON product_purchases
  FOR DELETE
  USING (
    auth.uid()::text = user_id::text
    AND payment_status = 'pending'
  );
