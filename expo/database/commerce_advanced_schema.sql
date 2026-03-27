-- ============================================
-- COMMERCE ADVANCED SCHEMA (PRODUCTION-GRADE)
-- Run after: super_admin_schema, store_orders_and_fulfillment, commerce_unified_schema
-- Adds: product_assets (unified), ticket_types, fulfillments, shipment_events, activity_logs
-- Extends: events, tickets, platform_products, store_orders
-- Backward compatible: no drops of existing columns/tables.
-- ============================================

-- ============================================
-- 1) PLATFORM_PRODUCTS: add missing columns
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'compare_at_price') THEN
    ALTER TABLE platform_products ADD COLUMN compare_at_price DECIMAL(15, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'shipping_required') THEN
    ALTER TABLE platform_products ADD COLUMN shipping_required BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_products' AND column_name = 'inventory_qty') THEN
    ALTER TABLE platform_products ADD COLUMN inventory_qty INTEGER;
  END IF;
END $$;
-- Sync inventory_qty from stock_quantity if present
UPDATE platform_products SET inventory_qty = stock_quantity WHERE inventory_qty IS NULL AND stock_quantity IS NOT NULL;

-- ============================================
-- 2) PRODUCT_ASSETS (unified: digital_download | course_resource | marketing | other)
-- ============================================
CREATE TABLE IF NOT EXISTS product_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('digital_download', 'course_resource', 'marketing', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  size BIGINT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_assets_product ON product_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_product_assets_scope ON product_assets(product_id, scope);

ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View product_assets published" ON product_assets;
CREATE POLICY "View product_assets published" ON product_assets FOR SELECT USING (
  EXISTS (SELECT 1 FROM platform_products p WHERE p.id = product_id AND p.status = 'published')
);
DROP POLICY IF EXISTS "Super admins manage product_assets" ON product_assets;
CREATE POLICY "Super admins manage product_assets" ON product_assets FOR ALL USING (is_super_admin());

-- ============================================
-- 3) EVENTS: extend with status, timezone, capacity
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'status') THEN
    ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ended', 'cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'timezone') THEN
    ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
  END IF;
END $$;

-- ============================================
-- 4) TICKET_TYPES
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  sale_start TIMESTAMP WITH TIME ZONE,
  sale_end TIMESTAMP WITH TIME ZONE,
  min_per_order INTEGER DEFAULT 1,
  max_per_order INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'sold_out')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);

ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View ticket_types for published events" ON ticket_types;
CREATE POLICY "View ticket_types for published events" ON ticket_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM events e JOIN platform_products p ON p.id = e.product_id WHERE e.id = event_id AND p.status = 'published')
);
DROP POLICY IF EXISTS "Super admins manage ticket_types" ON ticket_types;
CREATE POLICY "Super admins manage ticket_types" ON ticket_types FOR ALL USING (is_super_admin());

-- ============================================
-- 5) TICKETS: extend with ticket_type_id, attendee, check-in
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ticket_type_id') THEN
    ALTER TABLE tickets ADD COLUMN ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'attendee_name') THEN
    ALTER TABLE tickets ADD COLUMN attendee_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'attendee_email') THEN
    ALTER TABLE tickets ADD COLUMN attendee_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'attendee_phone') THEN
    ALTER TABLE tickets ADD COLUMN attendee_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'checked_in_at') THEN
    ALTER TABLE tickets ADD COLUMN checked_in_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'checked_in_by') THEN
    ALTER TABLE tickets ADD COLUMN checked_in_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Extend tickets.status
DO $$ BEGIN
  ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('active', 'used', 'refunded', 'cancelled', 'transferred'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure qr_value unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_qr_value ON tickets(qr_value) WHERE qr_value IS NOT NULL AND qr_value <> '';

-- ============================================
-- 6) STORE_ORDERS: extend order_status
-- ============================================
DO $$ BEGIN
  ALTER TABLE store_orders DROP CONSTRAINT IF EXISTS store_orders_order_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE store_orders ADD CONSTRAINT store_orders_order_status_check
    CHECK (order_status IN ('pending_payment', 'paid', 'pending_verification', 'fulfilled', 'cancelled', 'refunded'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 7) PRODUCT_PURCHASES: extend fulfillment_status
-- ============================================
DO $$ BEGIN
  ALTER TABLE product_purchases DROP CONSTRAINT IF EXISTS product_purchases_fulfillment_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE product_purchases ADD CONSTRAINT product_purchases_fulfillment_status_check
    CHECK (fulfillment_status IN (
      'pending', 'unlocked', 'shipped', 'enrolled', 'ticket_issued', 'na',
      'none', 'processing', 'ready', 'packed', 'delivered'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 8) FULFILLMENTS (shipping packages)
-- ============================================
CREATE TABLE IF NOT EXISTS fulfillments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_pack' CHECK (status IN (
    'pending_pack', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'
  )),
  carrier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON fulfillments(order_id);

ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own fulfillments" ON fulfillments;
CREATE POLICY "Users view own fulfillments" ON fulfillments FOR SELECT USING (
  EXISTS (SELECT 1 FROM store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Super admins manage fulfillments" ON fulfillments;
CREATE POLICY "Super admins manage fulfillments" ON fulfillments FOR ALL USING (is_super_admin());

-- ============================================
-- 9) FULFILLMENT_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS fulfillment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_id UUID NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES product_purchases(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_items_fulfillment ON fulfillment_items(fulfillment_id);

ALTER TABLE fulfillment_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View fulfillment_items via fulfillment" ON fulfillment_items;
CREATE POLICY "View fulfillment_items via fulfillment" ON fulfillment_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM fulfillments f JOIN store_orders o ON o.id = f.order_id WHERE f.id = fulfillment_id AND o.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Super admins manage fulfillment_items" ON fulfillment_items;
CREATE POLICY "Super admins manage fulfillment_items" ON fulfillment_items FOR ALL USING (is_super_admin());

-- ============================================
-- 10) SHIPMENT_EVENTS (timeline)
-- ============================================
CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_id UUID NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
  status_code TEXT NOT NULL,
  description TEXT,
  location_text TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_fulfillment ON shipment_events(fulfillment_id);

ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View shipment_events via fulfillment" ON shipment_events;
CREATE POLICY "View shipment_events via fulfillment" ON shipment_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM fulfillments f JOIN store_orders o ON o.id = f.order_id WHERE f.id = fulfillment_id AND o.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Super admins manage shipment_events" ON shipment_events;
CREATE POLICY "Super admins manage shipment_events" ON shipment_events FOR ALL USING (is_super_admin());

-- ============================================
-- 11) COURSE_LESSONS: add content_rich, ensure video_url
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'course_lessons' AND column_name = 'content_rich') THEN
    ALTER TABLE course_lessons ADD COLUMN content_rich TEXT;
  END IF;
END $$;

-- ============================================
-- 12) LESSON_ATTACHMENTS: add size, sort_order
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_attachments' AND column_name = 'size') THEN
    ALTER TABLE lesson_attachments ADD COLUMN size BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_attachments' AND column_name = 'sort_order') THEN
    ALTER TABLE lesson_attachments ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 13) ACTIVITY_LOGS (admin audit)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins view activity_logs" ON activity_logs;
CREATE POLICY "Super admins view activity_logs" ON activity_logs FOR SELECT USING (is_super_admin());
DROP POLICY IF EXISTS "Authenticated insert activity_logs" ON activity_logs;
CREATE POLICY "Authenticated insert activity_logs" ON activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 14) RPC: create_signed_download_url (for private assets)
-- ============================================
-- Call from app: pass asset path + user_id; function checks user_access then returns signed URL (handled in Edge Function or app with service role).
-- For Supabase Storage signed URLs, use storage.from(bucket).createSignedUrl(path, expiresIn) in app after verifying access.
-- This RPC logs the access attempt for audit.
CREATE OR REPLACE FUNCTION log_download_access(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_asset_path TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (p_user_id, 'download_access', p_entity_type, p_entity_id, jsonb_build_object('asset_path', p_asset_path));
END;
$$;

-- ============================================
-- 15) RPC: check_in_ticket (admin)
-- ============================================
CREATE OR REPLACE FUNCTION check_in_ticket(
  p_ticket_code TEXT,
  p_checked_in_by UUID,
  p_undo BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(success BOOLEAN, message TEXT, ticket_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t RECORD;
BEGIN
  IF NOT is_super_admin() AND p_checked_in_by IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT t.id, t.status, t.checked_in_at INTO _t
  FROM tickets t
  WHERE t.ticket_code = p_ticket_code
  LIMIT 1;

  IF _t.id IS NULL THEN
    RETURN QUERY SELECT false, 'Ticket not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_undo THEN
    IF _t.checked_in_at IS NULL THEN
      RETURN QUERY SELECT false, 'Ticket was not checked in'::TEXT, _t.id;
      RETURN;
    END IF;
    UPDATE tickets SET checked_in_at = NULL, checked_in_by = NULL, status = 'active' WHERE id = _t.id;
    INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, metadata_json)
    VALUES (p_checked_in_by, 'check_in_undo', 'ticket', _t.id::TEXT, jsonb_build_object('ticket_code', p_ticket_code));
    RETURN QUERY SELECT true, 'Check-in undone'::TEXT, _t.id;
    RETURN;
  END IF;

  IF _t.checked_in_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Already checked in'::TEXT, _t.id;
    RETURN;
  END IF;

  IF _t.status <> 'active' THEN
    RETURN QUERY SELECT false, 'Ticket is not active'::TEXT, _t.id;
    RETURN;
  END IF;

  UPDATE tickets SET status = 'used', checked_in_at = NOW(), checked_in_by = p_checked_in_by WHERE id = _t.id;
  INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, metadata_json)
  VALUES (p_checked_in_by, 'check_in', 'ticket', _t.id::TEXT, jsonb_build_object('ticket_code', p_ticket_code));
  RETURN QUERY SELECT true, 'Checked in'::TEXT, _t.id;
END;
$$;

-- ============================================
-- COMPLETE
-- ============================================
