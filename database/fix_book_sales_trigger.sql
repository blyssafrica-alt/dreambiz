-- ============================================
-- FIX BOOK SALES STATS TRIGGER
-- ============================================
-- This removes the redundant access_granted update from the trigger
-- The frontend already sets access_granted when payment_status is updated to 'completed'
-- Updating the same table from within its own trigger can cause issues

-- Drop and recreate the trigger function without the redundant access_granted update
CREATE OR REPLACE FUNCTION update_book_sales_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update books table stats when payment_status changes to 'completed'
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE books
    SET 
      total_sales = COALESCE(total_sales, 0) + 1,
      total_revenue = COALESCE(total_revenue, 0) + NEW.total_price,
      updated_at = NOW()
    WHERE id = NEW.book_id;
  END IF;
  
  -- Note: access_granted and access_granted_at are set by the frontend
  -- when payment_status is updated to 'completed', so we don't update them here
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger itself should already exist, but recreate it to be sure
DROP TRIGGER IF EXISTS trigger_update_book_sales_stats ON book_purchases;

CREATE TRIGGER trigger_update_book_sales_stats
  AFTER UPDATE OF payment_status ON book_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_book_sales_stats();

