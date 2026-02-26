-- Store orders and fulfillment (mega-store flow)
-- Run after super_admin_schema / product_purchases exist.

-- ============================================
-- STORE ORDERS (one per cart checkout)
-- ============================================
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_reference TEXT,
  payment_notes TEXT,
  proof_of_payment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_business ON store_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(created_at DESC);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store orders"
  ON store_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own store orders"
  ON store_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins can view all store orders"
  ON store_orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
  );

-- ============================================
-- PLATFORM PRODUCTS: delivery type for fulfillment
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE platform_products
    ADD COLUMN delivery_type TEXT CHECK (delivery_type IN ('download', 'shipping', 'course', 'event'));
    COMMENT ON COLUMN platform_products.delivery_type IS 'How the product is delivered: download (unlock file), shipping (physical), course (e.g. WhatsApp), event (ticket)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'delivery_config'
  ) THEN
    ALTER TABLE platform_products
    ADD COLUMN delivery_config JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN platform_products.delivery_config IS 'e.g. { "download_url": "...", "course_platform": "whatsapp", "event_id": "...", "event_name": "..." }';
  END IF;
END $$;

-- ============================================
-- PRODUCT PURCHASES: link to order + fulfillment
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_purchases' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE product_purchases ADD COLUMN order_id UUID REFERENCES store_orders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_product_purchases_order ON product_purchases(order_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_purchases' AND column_name = 'fulfillment_status'
  ) THEN
    ALTER TABLE product_purchases
    ADD COLUMN fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN (
      'pending', 'unlocked', 'shipped', 'enrolled', 'ticket_issued', 'na'
    ));
    COMMENT ON COLUMN product_purchases.fulfillment_status IS 'pending | unlocked (download) | shipped | enrolled (course) | ticket_issued (event) | na';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_purchases' AND column_name = 'fulfillment_metadata'
  ) THEN
    ALTER TABLE product_purchases   ADD COLUMN fulfillment_metadata JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN product_purchases.fulfillment_metadata IS 'download_url, ticket_id, shipping_tracking, course_link, etc.';
  END IF;
END $$;

-- Add payment proof columns to existing store_orders if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_orders' AND column_name = 'payment_reference') THEN
    ALTER TABLE store_orders ADD COLUMN payment_reference TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_orders' AND column_name = 'payment_notes') THEN
    ALTER TABLE store_orders ADD COLUMN payment_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_orders' AND column_name = 'proof_of_payment_url') THEN
    ALTER TABLE store_orders ADD COLUMN proof_of_payment_url TEXT;
  END IF;
END $$;
