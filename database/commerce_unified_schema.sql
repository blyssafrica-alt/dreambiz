-- ============================================
-- UNIFIED COMMERCE SCHEMA (NON-DESTRUCTIVE)
-- Run after: super_admin_schema, store_orders_and_fulfillment
-- Adds: product types (course, event), product_files, courses, events, tickets, shipping, user_access
-- Keeps all existing tables and columns; adds new ones only.
-- ============================================

-- ============================================
-- 1) PLATFORM_PRODUCTS: extend type enum + optional media columns
-- ============================================
-- Allow new product types (course, event); keep existing types.
DO $$ BEGIN
  ALTER TABLE platform_products DROP CONSTRAINT IF EXISTS platform_products_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint name may vary
END $$;
DO $$ BEGIN
  ALTER TABLE platform_products ADD CONSTRAINT platform_products_type_check
    CHECK (type IN ('physical', 'digital', 'course', 'event', 'service', 'subscription'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Optional thumbnail/gallery (app can keep using images JSONB if preferred)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'thumbnail_url') THEN
    ALTER TABLE platform_products ADD COLUMN thumbnail_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'gallery_urls') THEN
    ALTER TABLE platform_products ADD COLUMN gallery_urls TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- 2) PRODUCT_FILES (digital products: PDF, ZIP, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS product_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  size BIGINT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_files_product ON product_files(product_id);

ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view product files for published products" ON product_files;
CREATE POLICY "Users can view product files for published products" ON product_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM platform_products p WHERE p.id = product_id AND p.status = 'published')
  );
DROP POLICY IF EXISTS "Super admins can manage product files" ON product_files;
CREATE POLICY "Super admins can manage product files" ON product_files
  FOR ALL USING (is_super_admin());

-- ============================================
-- 3) COURSES (linked to product)
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES platform_products(id) ON DELETE CASCADE,
  overview TEXT,
  level TEXT,
  estimated_duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_product ON courses(product_id);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view courses for published products" ON courses;
CREATE POLICY "Users can view courses for published products" ON courses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM platform_products p WHERE p.id = product_id AND p.status = 'published')
  );
DROP POLICY IF EXISTS "Super admins can manage courses" ON courses;
CREATE POLICY "Super admins can manage courses" ON courses FOR ALL USING (is_super_admin());

-- ============================================
-- 4) COURSE_MODULES
-- ============================================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View course modules via course" ON course_modules;
CREATE POLICY "View course modules via course" ON course_modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses c JOIN platform_products p ON p.id = c.product_id WHERE c.id = course_id AND p.status = 'published')
);
DROP POLICY IF EXISTS "Super admins manage course modules" ON course_modules;
CREATE POLICY "Super admins manage course modules" ON course_modules FOR ALL USING (is_super_admin());

-- ============================================
-- 5) COURSE_LESSONS
-- ============================================
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);

ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View lessons via module" ON course_lessons;
CREATE POLICY "View lessons via module" ON course_lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_modules m
    JOIN courses c ON c.id = m.course_id
    JOIN platform_products p ON p.id = c.product_id
    WHERE m.id = module_id AND p.status = 'published'
  )
);
DROP POLICY IF EXISTS "Super admins manage lessons" ON course_lessons;
CREATE POLICY "Super admins manage lessons" ON course_lessons FOR ALL USING (is_super_admin());

-- ============================================
-- 6) LESSON_ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS lesson_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson ON lesson_attachments(lesson_id);

ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View attachments via lesson" ON lesson_attachments;
CREATE POLICY "View attachments via lesson" ON lesson_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_lessons l
    JOIN course_modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    JOIN platform_products p ON p.id = c.product_id
    WHERE l.id = lesson_id AND p.status = 'published'
  )
);
DROP POLICY IF EXISTS "Super admins manage lesson attachments" ON lesson_attachments;
CREATE POLICY "Super admins manage lesson attachments" ON lesson_attachments FOR ALL USING (is_super_admin());

-- ============================================
-- 7) EVENTS (linked to product)
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES platform_products(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE,
  venue_name TEXT,
  address TEXT,
  city TEXT,
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_product ON events(product_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view events for published products" ON events;
CREATE POLICY "Users can view events for published products" ON events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM platform_products p WHERE p.id = product_id AND p.status = 'published')
  );
DROP POLICY IF EXISTS "Super admins can manage events" ON events;
CREATE POLICY "Super admins can manage events" ON events FOR ALL USING (is_super_admin());

-- ============================================
-- 8) STORE_ORDERS: add order_status (backward compatible)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_orders' AND column_name = 'order_status') THEN
    ALTER TABLE store_orders ADD COLUMN order_status TEXT DEFAULT 'pending_payment'
      CHECK (order_status IN ('pending_payment', 'paid', 'pending_verification', 'fulfilled', 'cancelled'));
    COMMENT ON COLUMN store_orders.order_status IS 'Unified status; payment_status remains for payment flow.';
  END IF;
END $$;

-- Sync order_status from payment_status for existing rows (one-time)
UPDATE store_orders
SET order_status = CASE
  WHEN payment_status = 'completed' THEN 'paid'
  WHEN payment_status = 'pending' THEN 'pending_verification'
  WHEN payment_status = 'failed' OR payment_status = 'refunded' THEN 'cancelled'
  ELSE COALESCE(order_status, 'pending_payment')
END
WHERE order_status IS NULL OR order_status = 'pending_payment';

-- ============================================
-- 9) PRODUCT_PURCHASES: type_snapshot (optional)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_purchases' AND column_name = 'type_snapshot') THEN
    ALTER TABLE product_purchases ADD COLUMN type_snapshot JSONB DEFAULT '{}';
    COMMENT ON COLUMN product_purchases.type_snapshot IS 'Snapshot of product type/delivery at purchase (physical|digital|course|event).';
  END IF;
END $$;

-- Extend fulfillment_status to include processing, delivered, ready (keep existing values)
DO $$ BEGIN
  ALTER TABLE product_purchases DROP CONSTRAINT IF EXISTS product_purchases_fulfillment_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE product_purchases ADD CONSTRAINT product_purchases_fulfillment_status_check
    CHECK (fulfillment_status IN (
      'pending', 'unlocked', 'shipped', 'enrolled', 'ticket_issued', 'na',
      'none', 'processing', 'delivered', 'ready'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 10) TICKETS (event fulfillment)
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES product_purchases(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_code TEXT UNIQUE NOT NULL,
  qr_value TEXT,
  downloadable_ticket_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "Users can view own tickets" ON tickets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Super admins can manage tickets" ON tickets;
CREATE POLICY "Super admins can manage tickets" ON tickets FOR ALL USING (is_super_admin());

-- ============================================
-- 11) SHIPPING (physical orders)
-- ============================================
CREATE TABLE IF NOT EXISTS shipping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipping_status TEXT DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'dispatched', 'in_transit', 'delivered', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_order ON shipping(order_id);

ALTER TABLE shipping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view shipping for own orders" ON shipping;
CREATE POLICY "Users can view shipping for own orders" ON shipping FOR SELECT USING (
  EXISTS (SELECT 1 FROM store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Super admins can manage shipping" ON shipping;
CREATE POLICY "Super admins can manage shipping" ON shipping FOR ALL USING (is_super_admin());

-- ============================================
-- 12) USER_ACCESS (digital/course/event access after purchase)
-- ============================================
CREATE TABLE IF NOT EXISTS user_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('digital', 'course', 'event')),
  order_id UUID REFERENCES store_orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES product_purchases(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id, access_type)
);

CREATE INDEX IF NOT EXISTS idx_user_access_user ON user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_product ON user_access(product_id);

ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own access" ON user_access;
CREATE POLICY "Users can view own access" ON user_access FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Super admins can manage user_access" ON user_access;
CREATE POLICY "Super admins can manage user_access" ON user_access FOR ALL USING (is_super_admin());

-- ============================================
-- 13) RPC: Create user_access + tickets when order is paid (call after checkout or admin verification)
-- ============================================
CREATE OR REPLACE FUNCTION fulfill_order_access(_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _payment_status TEXT;
  _row RECORD;
  _ticket_code TEXT;
  _ev_id UUID;
  i INT;
BEGIN
  SELECT user_id, payment_status INTO _user_id, _payment_status
  FROM store_orders WHERE id = _order_id;
  IF _user_id IS NULL OR _payment_status IS NULL THEN
    RETURN;
  END IF;
  IF _payment_status <> 'completed' AND _payment_status <> 'paid' THEN
    RETURN;
  END IF;
  -- Only order owner or super admin
  IF auth.uid() <> _user_id AND NOT is_super_admin() THEN
    RETURN;
  END IF;

  FOR _row IN
    SELECT pp.id AS purchase_id, pp.product_id, pp.quantity, pp.fulfillment_status,
           p.type AS product_type, p.delivery_type
    FROM product_purchases pp
    JOIN platform_products p ON p.id = pp.product_id
    WHERE pp.order_id = _order_id
  LOOP
    -- Grant user_access for digital/course/event
    IF _row.delivery_type = 'download' OR _row.product_type = 'digital' THEN
      INSERT INTO user_access (user_id, product_id, access_type, order_id, order_item_id)
      VALUES (_user_id, _row.product_id, 'digital', _order_id, _row.purchase_id)
      ON CONFLICT (user_id, product_id, access_type) DO NOTHING;
    ELSIF _row.delivery_type = 'course' OR _row.product_type = 'course' THEN
      INSERT INTO user_access (user_id, product_id, access_type, order_id, order_item_id)
      VALUES (_user_id, _row.product_id, 'course', _order_id, _row.purchase_id)
      ON CONFLICT (user_id, product_id, access_type) DO NOTHING;
    ELSIF _row.delivery_type = 'event' OR _row.product_type = 'event' THEN
      INSERT INTO user_access (user_id, product_id, access_type, order_id, order_item_id)
      VALUES (_user_id, _row.product_id, 'event', _order_id, _row.purchase_id)
      ON CONFLICT (user_id, product_id, access_type) DO NOTHING;

      -- Create ticket(s) for event
      SELECT e.id INTO _ev_id FROM events e WHERE e.product_id = _row.product_id LIMIT 1;
      IF _ev_id IS NOT NULL THEN
        FOR i IN 1..GREATEST(1, _row.quantity) LOOP
          _ticket_code := 'T' || UPPER(SUBSTRING(REPLACE(_order_id::text, '-', '') FROM 1 FOR 10)) || '-' || i || '-' || encode(gen_random_bytes(4), 'hex');
          INSERT INTO tickets (order_id, order_item_id, event_id, user_id, ticket_code, status)
          VALUES (_order_id, _row.purchase_id, _ev_id, _user_id, _ticket_code, 'active')
          ON CONFLICT (ticket_code) DO NOTHING;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  UPDATE store_orders SET order_status = 'paid', updated_at = NOW() WHERE id = _order_id;
END;
$$;

-- ============================================
-- COMPLETE
-- ============================================
