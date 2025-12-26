-- ============================================
-- DREAMBIG BUSINESS OS - SUPER ADMIN SCHEMA
-- ============================================
-- This schema extends the existing database with Super Admin controlled systems:
-- 1. Platform Products (WooCommerce-like)
-- 2. Advertisements (Global & Targeted)
-- 3. Document Templates
-- 4. Feature Configuration
-- 5. Alert Rules
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- HELPER FUNCTION: Check if user is super admin
-- ============================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- PRODUCT CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PLATFORM PRODUCTS (Super Admin Controlled)
-- ============================================
CREATE TABLE IF NOT EXISTS platform_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  sku TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('physical', 'digital', 'service', 'subscription')),
  
  -- Pricing
  base_price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  sale_price DECIMAL(15, 2),
  sale_start_date TIMESTAMP WITH TIME ZONE,
  sale_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Variations (JSONB for flexibility)
  variations JSONB DEFAULT '[]'::jsonb, -- [{name: "Size", options: ["S", "M", "L", "price_modifiers": {"S": 0, "M": 5, "L": 10}]}]
  
  -- Stock Management
  manage_stock BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'on_backorder')),
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  video_url TEXT,
  
  -- Categorization
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Visibility Rules (Super Admin Controlled)
  visibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb, -- {
    --   "visible_to_books": ["start-your-business", "grow-your-business"],
    --   "visible_to_business_types": ["retail", "services"],
    --   "requires_feature": ["products"],
    --   "min_business_stage": "running"
    -- }
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_by UUID REFERENCES users(id), -- Super admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(name, '') || ' ' || 
      COALESCE(description, '') || ' ' ||
      COALESCE(short_description, '') || ' ' ||
      COALESCE(sku, '')
    )
  ) STORED
);

-- Product search index
CREATE INDEX IF NOT EXISTS idx_platform_products_search ON platform_products USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_platform_products_status ON platform_products(status);
CREATE INDEX IF NOT EXISTS idx_platform_products_category ON platform_products(category_id);
CREATE INDEX IF NOT EXISTS idx_platform_products_featured ON platform_products(featured) WHERE featured = true;

-- ============================================
-- PRODUCT REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES platform_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================
-- PRODUCT PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS product_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES platform_products(id),
  user_id UUID REFERENCES users(id),
  business_id UUID REFERENCES business_profiles(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ad_id UUID, -- Track which ad led to purchase (references advertisements table)
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional purchase data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_purchases_user ON product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_product ON product_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_status ON product_purchases(payment_status);

-- ============================================
-- ADVERTISEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('banner', 'card', 'modal', 'inline', 'video')),
  
  -- Media
  image_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Content
  headline TEXT,
  body_text TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  cta_url TEXT,
  cta_action TEXT, -- 'open_product', 'open_book', 'open_feature', 'external_url'
  cta_target_id UUID, -- Product ID, Book ID, Feature ID, etc.
  
  -- Targeting Rules (Super Admin Controlled)
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb, -- {
    --   "scope": "global" | "targeted",
    --   "target_books": ["start-your-business"],
    --   "target_business_types": ["retail"],
    --   "target_business_stages": ["running"],
    --   "target_health_scores": {"min": 0, "max": 60},
    --   "target_features": ["products"],
    --   "target_workflows": ["document_creation"],
    --   "exclude_users": []
    -- }
  
  -- Placement Rules
  placement JSONB NOT NULL DEFAULT '{}'::jsonb, -- {
    --   "locations": ["dashboard", "document_wizard_step_2", "insights"],
    --   "priority": 1,
    --   "frequency": "once_per_session" | "once_per_day" | "always",
    --   "max_impressions_per_user": 10
    -- }
  
  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'Africa/Harare',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  
  -- Analytics
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES users(id), -- Super admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);

-- ============================================
-- AD IMPRESSIONS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS ad_impressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  location TEXT NOT NULL, -- 'dashboard', 'document_wizard', etc.
  session_id TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_value DECIMAL(15, 2), -- If conversion was a purchase
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_session ON ad_impressions(session_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_date ON ad_impressions(viewed_at);

-- ============================================
-- FEATURE CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS feature_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id TEXT UNIQUE NOT NULL, -- e.g., 'products', 'customers', 'reports'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('financial', 'document', 'inventory', 'crm', 'analytics', 'admin')),
  
  -- Visibility Control
  visibility JSONB NOT NULL DEFAULT '{}'::jsonb, -- {
    --   "type": "tab" | "hidden" | "contextual" | "workflow",
    --   "showAsTab": true,
    --   "tabIcon": "package",
    --   "tabLabel": "Products",
    --   "contextualTriggers": ["low_stock"]
    -- }
  
  -- Access Control
  access JSONB NOT NULL DEFAULT '{}'::jsonb, -- {
    --   "requiresBook": ["start-your-business"],
    --   "requiresBusinessType": ["retail"],
    --   "requiresFeature": ["products"],
    --   "minBusinessStage": "running"
    -- }
  
  enabled BOOLEAN DEFAULT true,
  enabledByDefault BOOLEAN DEFAULT true,
  canBeDisabled BOOLEAN DEFAULT false, -- Core features cannot be disabled
  
  -- Metadata
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_config_enabled ON feature_config(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_config_feature_id ON feature_config(feature_id);

-- ============================================
-- DOCUMENT TEMPLATES (Super Admin Controlled)
-- ============================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'receipt', 'quotation', 'purchase_order', 'supplier_agreement', 'contract')),
  business_type TEXT, -- NULL = available to all business types
  template_data JSONB NOT NULL, -- Full template structure
  required_fields JSONB DEFAULT '[]'::jsonb, -- ["customer_name", "items", "due_date"]
  numbering_rule JSONB NOT NULL, -- {prefix: "INV", format: "INV-{number}", start: 1, padding: 4}
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(document_type, business_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

-- ============================================
-- ALERT RULES (Super Admin Controlled)
-- ============================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warning', 'danger', 'info', 'success')),
  condition_type TEXT NOT NULL, -- 'profit_margin', 'cash_position', 'no_sales', 'low_stock', etc.
  threshold_value DECIMAL(15, 2), -- For absolute values
  threshold_percentage DECIMAL(5, 2), -- For percentages
  threshold_days INTEGER, -- For time-based conditions (e.g., no sales for X days)
  message_template TEXT NOT NULL, -- "Low profit margin ({percentage}%)"
  action_template TEXT, -- "Consider raising prices or reducing costs"
  book_reference JSONB, -- {book: "start-your-business", chapter: 4, chapterTitle: "Pricing for Profit"}
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher = shown first
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alert_rules_priority ON alert_rules(priority DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Product Categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product categories" ON product_categories
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage categories" ON product_categories
  FOR ALL USING (is_super_admin());

-- Platform Products
ALTER TABLE platform_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all products" ON platform_products
  FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view published products" ON platform_products
  FOR SELECT USING (status = 'published');

-- Product Reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own reviews" ON product_reviews
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Product Purchases
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON product_purchases
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own purchases" ON product_purchases
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Super admins can view all purchases" ON product_purchases
  FOR SELECT USING (is_super_admin());

-- Advertisements
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all ads" ON advertisements
  FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view active ads" ON advertisements
  FOR SELECT USING (status = 'active');

-- Ad Impressions
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can track their own impressions" ON ad_impressions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own impressions" ON ad_impressions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Super admins can view all impressions" ON ad_impressions
  FOR SELECT USING (is_super_admin());

-- Feature Config
ALTER TABLE feature_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage feature config" ON feature_config
  FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view enabled features" ON feature_config
  FOR SELECT USING (enabled = true);

-- Document Templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage templates" ON document_templates
  FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view active templates for their business type" ON document_templates
  FOR SELECT USING (
    is_active = true AND
    (business_type IS NULL OR business_type = (
      SELECT type FROM business_profiles WHERE user_id::text = auth.uid()::text LIMIT 1
    ))
  );

-- Alert Rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage alert rules" ON alert_rules
  FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view active alert rules" ON alert_rules
  FOR SELECT USING (is_active = true);

-- ============================================
-- INITIAL DATA: Default Feature Configurations
-- ============================================
INSERT INTO feature_config (feature_id, name, description, category, visibility, access, enabled, enabledByDefault, canBeDisabled) VALUES
  ('dashboard', 'Dashboard', 'Main business dashboard with metrics and alerts', 'analytics', 
   '{"type": "tab", "showAsTab": true, "tabIcon": "home", "tabLabel": "Dashboard"}'::jsonb,
   '{}'::jsonb, true, true, false),
  ('finances', 'Finances', 'Track sales and expenses', 'financial',
   '{"type": "tab", "showAsTab": true, "tabIcon": "dollar-sign", "tabLabel": "Finances"}'::jsonb,
   '{}'::jsonb, true, true, false),
  ('documents', 'Documents', 'Create invoices, receipts, and quotations', 'document',
   '{"type": "tab", "showAsTab": true, "tabIcon": "file-text", "tabLabel": "Documents"}'::jsonb,
   '{}'::jsonb, true, true, false),
  ('calculator', 'Calculator', 'Business viability calculator', 'analytics',
   '{"type": "tab", "showAsTab": true, "tabIcon": "calculator", "tabLabel": "Calculator"}'::jsonb,
   '{}'::jsonb, true, true, false),
  ('settings', 'Settings', 'Business profile and app settings', 'admin',
   '{"type": "tab", "showAsTab": true, "tabIcon": "settings", "tabLabel": "Settings"}'::jsonb,
   '{}'::jsonb, true, true, false),
  ('products', 'Products', 'Product catalog and inventory', 'inventory',
   '{"type": "tab", "showAsTab": true, "tabIcon": "package", "tabLabel": "Products"}'::jsonb,
   '{"requiresBook": ["start-your-business", "grow-your-business", "scale-up"]}'::jsonb,
   true, true, true),
  ('customers', 'Customers', 'Customer relationship management', 'crm',
   '{"type": "tab", "showAsTab": true, "tabIcon": "users", "tabLabel": "Customers"}'::jsonb,
   '{"requiresBook": ["start-your-business", "grow-your-business", "marketing-mastery", "scale-up"]}'::jsonb,
   true, true, true),
  ('suppliers', 'Suppliers', 'Supplier management', 'crm',
   '{"type": "tab", "showAsTab": true, "tabIcon": "truck", "tabLabel": "Suppliers"}'::jsonb,
   '{"requiresBook": ["grow-your-business", "scale-up"]}'::jsonb,
   true, true, true),
  ('reports', 'Reports', 'Business reports and analytics', 'analytics',
   '{"type": "tab", "showAsTab": true, "tabIcon": "bar-chart", "tabLabel": "Reports"}'::jsonb,
   '{"requiresBook": ["start-your-business", "grow-your-business", "manage-your-money", "hire-and-lead", "marketing-mastery", "scale-up"]}'::jsonb,
   true, true, true),
  ('budgets', 'Budgets', 'Budget planning and tracking', 'financial',
   '{"type": "tab", "showAsTab": true, "tabIcon": "pie-chart", "tabLabel": "Budgets"}'::jsonb,
   '{"requiresBook": ["start-your-business", "manage-your-money", "scale-up"]}'::jsonb,
   true, true, true),
  ('cashflow', 'Cashflow', 'Cashflow projections', 'financial',
   '{"type": "tab", "showAsTab": true, "tabIcon": "trending-up", "tabLabel": "Cashflow"}'::jsonb,
   '{"requiresBook": ["manage-your-money", "scale-up"]}'::jsonb,
   true, true, true),
  ('tax', 'Tax', 'Tax rate management', 'financial',
   '{"type": "tab", "showAsTab": true, "tabIcon": "receipt", "tabLabel": "Tax"}'::jsonb,
   '{"requiresBook": ["manage-your-money", "scale-up"]}'::jsonb,
   true, true, true),
  ('employees', 'Employees', 'Employee management', 'admin',
   '{"type": "tab", "showAsTab": true, "tabIcon": "user-check", "tabLabel": "Employees"}'::jsonb,
   '{"requiresBook": ["hire-and-lead", "scale-up"]}'::jsonb,
   true, true, true),
  ('projects', 'Projects', 'Project tracking', 'admin',
   '{"type": "tab", "showAsTab": true, "tabIcon": "folder", "tabLabel": "Projects"}'::jsonb,
   '{"requiresBook": ["grow-your-business", "hire-and-lead", "marketing-mastery", "scale-up"]}'::jsonb,
   true, true, true)
ON CONFLICT (feature_id) DO NOTHING;

-- ============================================
-- TRIGGERS: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_products_updated_at BEFORE UPDATE ON platform_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_config_updated_at BEFORE UPDATE ON feature_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: Update ad analytics
-- ============================================
CREATE OR REPLACE FUNCTION update_ad_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment impressions
    UPDATE advertisements 
    SET impressions_count = impressions_count + 1
    WHERE id = NEW.ad_id;
    
    -- If clicked, increment clicks
    IF NEW.clicked = true THEN
      UPDATE advertisements 
      SET clicks_count = clicks_count + 1
      WHERE id = NEW.ad_id;
    END IF;
    
    -- If converted, increment conversions
    IF NEW.converted = true THEN
      UPDATE advertisements 
      SET conversions_count = conversions_count + 1
      WHERE id = NEW.ad_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ad_analytics_trigger AFTER INSERT OR UPDATE ON ad_impressions
  FOR EACH ROW EXECUTE FUNCTION update_ad_analytics();

-- ============================================
-- COMPLETE
-- ============================================
-- Run this SQL in your Supabase SQL Editor to set up the Super Admin system
-- After running, you can start using the Super Admin console

