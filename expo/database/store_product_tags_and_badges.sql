-- Product tags and badge flags for Store (WooCommerce-style).
-- Run after platform_products exists. Badges can be set via columns or derived from tags/sale dates.

-- Optional: add badge columns to platform_products if your schema uses a single products table.
-- (DreamBiz uses platform_products with existing `featured` and `tags`; these are optional extras.)
/*
ALTER TABLE platform_products
  ADD COLUMN IF NOT EXISTS is_hot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false;
*/

-- Optional: normalized product_tags and product_tag_links (for future tag management UI).
-- App currently uses platform_products.tags (text[] or jsonb) for display.
/*
CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_tag_links (
  product_id uuid NOT NULL REFERENCES platform_products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tag_links_tag_id ON product_tag_links(tag_id);
*/

-- Badge display in app: Featured (featured), Hot Deal (sale price + date range), New (tags or createdAt), Low stock (stockQuantity <= lowStockThreshold).
