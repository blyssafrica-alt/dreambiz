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
-- USER DEMOGRAPHICS (Ad Analytics)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'::text[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_tracking_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personalized_ads_consent BOOLEAN DEFAULT FALSE;

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

-- ============================================
-- AD PACKAGES
-- ============================================
CREATE TABLE IF NOT EXISTS ad_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  price_per_location DECIMAL(6, 2) NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_packages_active ON ad_packages(is_active) WHERE is_active = true;

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
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived')),
  
  -- Analytics
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  revenue DECIMAL(15, 2) DEFAULT 0,

  -- Budget + billing
  spend DECIMAL(15, 2), -- Budget limit
  spend_currency TEXT DEFAULT 'USD',
  spend_actual DECIMAL(15, 2) DEFAULT 0,
  billing_type TEXT DEFAULT 'cpc' CHECK (billing_type IN ('cpc', 'cpe', 'cpa')),
  billing_rate DECIMAL(15, 4) DEFAULT 0,

  -- Payment tracking for self-serve ads
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected')),
  payment_amount DECIMAL(15, 2),
  payment_currency TEXT DEFAULT 'USD',
  payment_reference TEXT,
  payment_proof_url TEXT,
  admin_notes TEXT,
  ad_package_id UUID REFERENCES ad_packages(id) ON DELETE SET NULL,
  auto_renew BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  ad_set_id UUID REFERENCES ad_sets(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID REFERENCES users(id), -- Super admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_campaign_id ON advertisements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_ad_set_id ON advertisements(ad_set_id);

ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS revenue DECIMAL(15, 2) DEFAULT 0;

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

DROP POLICY IF EXISTS "Anyone can view product categories" ON product_categories;
CREATE POLICY "Anyone can view product categories" ON product_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can manage categories" ON product_categories;
CREATE POLICY "Super admins can manage categories" ON product_categories
  FOR ALL USING (is_super_admin());

-- Platform Products
ALTER TABLE platform_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all products" ON platform_products;
CREATE POLICY "Super admins can manage all products" ON platform_products
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view published products" ON platform_products;
CREATE POLICY "Users can view published products" ON platform_products
  FOR SELECT USING (status = 'published');

-- Product Reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON product_reviews;
CREATE POLICY "Anyone can view reviews" ON product_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own reviews" ON product_reviews;
CREATE POLICY "Users can create their own reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own reviews" ON product_reviews;
CREATE POLICY "Users can update their own reviews" ON product_reviews
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Product Purchases
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own purchases" ON product_purchases;
CREATE POLICY "Users can view their own purchases" ON product_purchases
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can create their own purchases" ON product_purchases;
CREATE POLICY "Users can create their own purchases" ON product_purchases
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Super admins can view all purchases" ON product_purchases;
CREATE POLICY "Super admins can view all purchases" ON product_purchases
  FOR SELECT USING (is_super_admin());

-- Advertisements
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all ads" ON advertisements;
CREATE POLICY "Super admins can manage all ads" ON advertisements
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view active ads" ON advertisements;
CREATE POLICY "Users can view active ads" ON advertisements
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can submit ads" ON advertisements;
CREATE POLICY "Users can submit ads" ON advertisements
  FOR INSERT
  WITH CHECK (auth.uid()::text = created_by::text AND status = 'pending');

DROP POLICY IF EXISTS "Users can view their own ads" ON advertisements;
CREATE POLICY "Users can view their own ads" ON advertisements
  FOR SELECT
  USING (auth.uid()::text = created_by::text);

DROP POLICY IF EXISTS "Users can update their own pending ads" ON advertisements;
CREATE POLICY "Users can update their own pending ads" ON advertisements
  FOR UPDATE
  USING (auth.uid()::text = created_by::text AND status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid()::text = created_by::text AND status IN ('pending', 'rejected'));

-- Ad Impressions
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can track their own impressions" ON ad_impressions;
CREATE POLICY "Users can track their own impressions" ON ad_impressions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can view their own impressions" ON ad_impressions;
CREATE POLICY "Users can view their own impressions" ON ad_impressions
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own impressions" ON ad_impressions;
CREATE POLICY "Users can update their own impressions" ON ad_impressions
  FOR UPDATE USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Super admins can insert impressions" ON ad_impressions;
CREATE POLICY "Super admins can insert impressions" ON ad_impressions
  FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins can view all impressions" ON ad_impressions;
CREATE POLICY "Super admins can view all impressions" ON ad_impressions
  FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can update all impressions" ON ad_impressions;
CREATE POLICY "Super admins can update all impressions" ON ad_impressions
  FOR UPDATE USING (is_super_admin());

-- Ad Packages
ALTER TABLE ad_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active ad packages" ON ad_packages;
CREATE POLICY "Anyone can view active ad packages"
  ON ad_packages
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage ad packages" ON ad_packages;
CREATE POLICY "Super admins can manage ad packages"
  ON ad_packages
  FOR ALL
  USING (is_super_admin());

-- Ad Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived', 'rejected')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(15, 2),
  spend_actual DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad campaigns" ON ad_campaigns;
CREATE POLICY "Super admins can manage ad campaigns"
  ON ad_campaigns
  FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users can manage their own ad campaigns" ON ad_campaigns;
CREATE POLICY "Users can manage their own ad campaigns"
  ON ad_campaigns
  FOR ALL
  USING (auth.uid()::text = created_by::text)
  WITH CHECK (auth.uid()::text = created_by::text);

DROP TRIGGER IF EXISTS update_ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ad Sets
CREATE TABLE IF NOT EXISTS ad_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived', 'rejected')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget DECIMAL(15, 2),
  spend_actual DECIMAL(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  pacing_enabled BOOLEAN DEFAULT false,
  daily_budget DECIMAL(15, 2),
  attribution_click_days INTEGER DEFAULT 7,
  attribution_view_days INTEGER DEFAULT 1,
  optimization_goal TEXT DEFAULT 'impressions' CHECK (optimization_goal IN ('impressions', 'clicks', 'conversions')),
  learning_event_threshold INTEGER DEFAULT 50,
  billing_type TEXT DEFAULT 'cpc' CHECK (billing_type IN ('cpc', 'cpe', 'cpa')),
  billing_rate DECIMAL(15, 4) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad sets" ON ad_sets;
CREATE POLICY "Super admins can manage ad sets"
  ON ad_sets
  FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users can manage their own ad sets" ON ad_sets;
CREATE POLICY "Users can manage their own ad sets"
  ON ad_sets
  FOR ALL
  USING (auth.uid()::text = created_by::text)
  WITH CHECK (auth.uid()::text = created_by::text);

DROP TRIGGER IF EXISTS update_ad_sets_updated_at ON ad_sets;
CREATE TRIGGER update_ad_sets_updated_at BEFORE UPDATE ON ad_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ad Set Daily Spend
CREATE TABLE IF NOT EXISTS ad_set_daily_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_set_id UUID REFERENCES ad_sets(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL,
  spend_amount DECIMAL(15, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ad_set_id, spend_date)
);

CREATE INDEX IF NOT EXISTS idx_ad_set_daily_spend_date ON ad_set_daily_spend(spend_date);

ALTER TABLE ad_set_daily_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad set daily spend" ON ad_set_daily_spend;
CREATE POLICY "Super admins can manage ad set daily spend"
  ON ad_set_daily_spend
  FOR ALL
  USING (is_super_admin());

-- Ad Billing Defaults
CREATE TABLE IF NOT EXISTS ad_billing_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  billing_type TEXT NOT NULL DEFAULT 'cpc' CHECK (billing_type IN ('cpc', 'cpe', 'cpa')),
  billing_rate DECIMAL(15, 4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ad_billing_settings_billing_type_key UNIQUE (billing_type)
);

ALTER TABLE ad_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad billing settings" ON ad_billing_settings;
CREATE POLICY "Super admins can manage ad billing settings"
  ON ad_billing_settings
  FOR ALL
  USING (is_super_admin());

DROP TRIGGER IF EXISTS update_ad_billing_settings_updated_at ON ad_billing_settings;
CREATE TRIGGER update_ad_billing_settings_updated_at BEFORE UPDATE ON ad_billing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Feature Config
ALTER TABLE feature_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage feature config" ON feature_config;
CREATE POLICY "Super admins can manage feature config" ON feature_config
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view enabled features" ON feature_config;
CREATE POLICY "Users can view enabled features" ON feature_config
  FOR SELECT USING (enabled = true);

-- Document Templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage templates" ON document_templates;
CREATE POLICY "Super admins can manage templates" ON document_templates
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view active templates for their business type" ON document_templates;
CREATE POLICY "Users can view active templates for their business type" ON document_templates
  FOR SELECT USING (
    is_active = true AND
    (business_type IS NULL OR business_type = (
      SELECT type FROM business_profiles WHERE user_id::text = auth.uid()::text LIMIT 1
    ))
  );

-- Alert Rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage alert rules" ON alert_rules;
CREATE POLICY "Super admins can manage alert rules" ON alert_rules
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view active alert rules" ON alert_rules;
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
  ('pos', 'POS', 'Point of sale for retail transactions', 'financial',
   '{"type": "tab", "showAsTab": true, "tabIcon": "scan", "tabLabel": "POS"}'::jsonb,
   '{}'::jsonb, true, true, true),
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

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_products_updated_at ON platform_products;
CREATE TRIGGER update_platform_products_updated_at BEFORE UPDATE ON platform_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_advertisements_updated_at ON advertisements;
CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_config_updated_at ON feature_config;
CREATE TRIGGER update_feature_config_updated_at BEFORE UPDATE ON feature_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ad_packages_updated_at ON ad_packages;
CREATE TRIGGER update_ad_packages_updated_at BEFORE UPDATE ON ad_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON alert_rules;
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: Update ad analytics
-- ============================================
CREATE OR REPLACE FUNCTION update_ad_analytics()
RETURNS TRIGGER AS $$
DECLARE
  ad_billing_type TEXT;
  ad_billing_rate DECIMAL(15, 4);
  default_billing_rate DECIMAL(15, 4);
  cost_to_add DECIMAL(15, 4) DEFAULT 0;
BEGIN
  -- Get ad billing info
  SELECT billing_type, billing_rate INTO ad_billing_type, ad_billing_rate
  FROM advertisements
  WHERE id = NEW.ad_id;

  -- Default billing type if missing
  IF ad_billing_type IS NULL THEN
    ad_billing_type := 'cpc';
    -- Update the ad with default billing type
    UPDATE advertisements
    SET billing_type = ad_billing_type
    WHERE id = NEW.ad_id AND billing_type IS NULL;
  END IF;

  -- If billing_rate is NULL, try to get default from ad_billing_settings for this specific billing type
  IF ad_billing_rate IS NULL OR ad_billing_rate = 0 THEN
    SELECT billing_rate INTO default_billing_rate
    FROM ad_billing_settings
    WHERE billing_type = ad_billing_type
    LIMIT 1;
    
    IF default_billing_rate IS NOT NULL AND default_billing_rate > 0 THEN
      ad_billing_rate := default_billing_rate;
      -- Also update the ad with the default rate for future use
      UPDATE advertisements
      SET billing_rate = default_billing_rate
      WHERE id = NEW.ad_id AND (billing_rate IS NULL OR billing_rate = 0);
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    cost_to_add = CASE
      WHEN ad_billing_type = 'cpc' AND NEW.clicked = true THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpa' AND NEW.converted = true THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpe' AND (NEW.clicked = true OR NEW.converted = true) THEN COALESCE(ad_billing_rate, 0)
      ELSE 0
    END;

    UPDATE advertisements 
    SET
      impressions_count = COALESCE(impressions_count, 0) + 1,
      clicks_count = COALESCE(clicks_count, 0) + CASE WHEN NEW.clicked = true THEN 1 ELSE 0 END,
      conversions_count = COALESCE(conversions_count, 0) + CASE WHEN NEW.converted = true THEN 1 ELSE 0 END,
      revenue = COALESCE(revenue, 0) + CASE WHEN NEW.converted = true THEN COALESCE(NEW.conversion_value, 0) ELSE 0 END,
      spend_actual = COALESCE(spend_actual, 0) + cost_to_add
    WHERE id = NEW.ad_id;

    -- Update ad set spend if ad_set_id exists
    IF EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL) THEN
      UPDATE ad_sets
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT ad_set_id FROM advertisements WHERE id = NEW.ad_id);
    END IF;

    -- Update daily spend for ad set
    IF cost_to_add > 0 AND EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL) THEN
      INSERT INTO ad_set_daily_spend (ad_set_id, spend_date, spend_amount)
      SELECT ad_set_id, (NEW.viewed_at::date), cost_to_add
      FROM advertisements
      WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL
      ON CONFLICT (ad_set_id, spend_date)
      DO UPDATE SET
        spend_amount = COALESCE(ad_set_daily_spend.spend_amount, 0) + EXCLUDED.spend_amount,
        updated_at = NOW();
    END IF;

    -- Update campaign spend if campaign_id exists
    IF EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND campaign_id IS NOT NULL) THEN
      UPDATE ad_campaigns
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT campaign_id FROM advertisements WHERE id = NEW.ad_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    cost_to_add = CASE
      WHEN ad_billing_type = 'cpc' AND NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpa' AND NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpe' AND NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpe' AND NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) AND COALESCE(OLD.clicked, false) = false THEN COALESCE(ad_billing_rate, 0)
      ELSE 0
    END;

    UPDATE advertisements
    SET
      clicks_count = COALESCE(clicks_count, 0) + CASE WHEN NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN 1 ELSE 0 END,
      conversions_count = COALESCE(conversions_count, 0) + CASE WHEN NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN 1 ELSE 0 END,
      revenue = COALESCE(revenue, 0) + CASE
        WHEN NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN COALESCE(NEW.conversion_value, 0)
        ELSE 0
      END,
      spend_actual = COALESCE(spend_actual, 0) + cost_to_add
    WHERE id = NEW.ad_id;

    -- Update ad set spend if ad_set_id exists
    IF cost_to_add > 0 AND EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL) THEN
      UPDATE ad_sets
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT ad_set_id FROM advertisements WHERE id = NEW.ad_id);

      -- Update daily spend
      INSERT INTO ad_set_daily_spend (ad_set_id, spend_date, spend_amount)
      SELECT ad_set_id, (NEW.viewed_at::date), cost_to_add
      FROM advertisements
      WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL
      ON CONFLICT (ad_set_id, spend_date)
      DO UPDATE SET
        spend_amount = COALESCE(ad_set_daily_spend.spend_amount, 0) + EXCLUDED.spend_amount,
        updated_at = NOW();
    END IF;

    -- Update campaign spend if campaign_id exists
    IF cost_to_add > 0 AND EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND campaign_id IS NOT NULL) THEN
      UPDATE ad_campaigns
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT campaign_id FROM advertisements WHERE id = NEW.ad_id);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in update_ad_analytics trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_ad_analytics_trigger ON ad_impressions;
CREATE TRIGGER update_ad_analytics_trigger AFTER INSERT OR UPDATE ON ad_impressions
  FOR EACH ROW EXECUTE FUNCTION update_ad_analytics();

-- ============================================
-- COMPLETE
-- ============================================
-- Run this SQL in your Supabase SQL Editor to set up the Super Admin system
-- After running, you can start using the Super Admin console

