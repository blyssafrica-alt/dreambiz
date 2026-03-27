-- Add ad attribution to book purchases
ALTER TABLE book_purchases
  ADD COLUMN IF NOT EXISTS ad_id UUID REFERENCES advertisements(id) ON DELETE SET NULL;

