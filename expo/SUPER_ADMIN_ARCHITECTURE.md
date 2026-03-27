# 🎛️ DreamBig Business OS - Super Admin Architecture Design

## Executive Summary

This document outlines the complete architecture for transforming DreamBig Business OS into a **SUPER-ADMIN-CONTROLLED BUSINESS PLATFORM** where DreamBig HQ has absolute control over features, products, ads, templates, and system rules while preserving the app's core mission of turning business knowledge into daily execution.

---

## 📋 TABLE OF CONTENTS

1. [Core Authority Model](#core-authority-model)
2. [Super Admin Console Architecture](#super-admin-console-architecture)
3. [Role & Permission Matrix](#role--permission-matrix)
4. [Feature Visibility Logic](#feature-visibility-logic)
5. [Product & Ads Data Model](#product--ads-data-model)
6. [Supabase RLS Strategy](#supabase-rls-strategy)
7. [Example Flows](#example-flows)
8. [Mission Preservation](#mission-preservation)

---

## 🎯 CORE AUTHORITY MODEL

### 1. SUPER ADMIN (DreamBig HQ)
**Absolute Control Over:**
- ✅ Feature enable/disable/hide
- ✅ Tab visibility per book
- ✅ Product creation, pricing, variations
- ✅ Global & targeted advertisements
- ✅ Document templates & rules
- ✅ Mistake-prevention thresholds
- ✅ Alert definitions
- ✅ System-wide analytics
- ✅ User management
- ✅ Business type configurations

**Cannot Be Overridden By:**
- ❌ Business users
- ❌ Business admins
- ❌ Any client-side code

### 2. BUSINESS ADMIN (Entrepreneur)
**Can:**
- ✅ Use all enabled tools
- ✅ Manage their own business data
- ✅ Create documents (using Super Admin templates)
- ✅ Track finances
- ✅ View reports

**Cannot:**
- ❌ Disable alerts
- ❌ Edit templates
- ❌ Modify product logic
- ❌ Change system rules
- ❌ Hide features (even if they don't use them)

---

## 🖥️ SUPER ADMIN CONSOLE ARCHITECTURE

### Technology Stack
- **Platform:** Web-first (React/Next.js recommended for SEO & admin workflows)
- **Framework:** Can be built with React Native Web or separate web app
- **Database:** Supabase (same backend as mobile app)
- **Authentication:** Supabase Auth with `is_super_admin` check
- **Real-time:** Supabase Realtime for live updates

### Console Structure

```
/admin (Super Admin Console)
├── /dashboard          # Platform analytics
├── /features           # Feature management
├── /products           # Product catalog management
├── /ads                # Advertisement management
├── /templates          # Document template management
├── /alerts             # Alert rule management
├── /books              # Book configuration
├── /users              # User management
├── /businesses         # Business oversight
├── /analytics          # Platform analytics
└── /settings           # System settings
```

### Key Console Screens

#### 1. Feature Management (`/admin/features`)
- Enable/disable features globally
- Set feature visibility per book
- Define feature dependencies
- Set feature unlock rules
- Preview feature visibility by book

#### 2. Product Management (`/admin/products`)
- Create/edit/delete products
- Set pricing & variations
- Manage stock
- Upload images
- Set categories
- Define visibility rules (per business type, book, etc.)
- Product analytics

#### 3. Advertisement Management (`/admin/ads`)
- Create global ads
- Create targeted ads (by book, business type, health score, etc.)
- Set placement locations
- Schedule ads (start/end dates)
- Set priority & frequency
- Track impressions, clicks, conversions
- Ad analytics dashboard

#### 4. Template Management (`/admin/templates`)
- Create/edit document templates
- Set required fields per template
- Define numbering rules
- Set availability per business type
- Preview templates
- Template versioning

#### 5. Alert Management (`/admin/alerts`)
- Define alert rules
- Set thresholds (profit margin, cash position, etc.)
- Link alerts to book chapters
- Set alert severity
- Define alert actions

---

## 🔐 ROLE & PERMISSION MATRIX

### Permission Levels

| Action | Super Admin | Business Admin | Regular User |
|--------|-------------|----------------|--------------|
| **System Control** |
| Enable/disable features | ✅ | ❌ | ❌ |
| Modify templates | ✅ | ❌ | ❌ |
| Create products | ✅ | ❌ | ❌ |
| Create ads | ✅ | ❌ | ❌ |
| Set alert rules | ✅ | ❌ | ❌ |
| View all users | ✅ | ❌ | ❌ |
| **Business Operations** |
| Use enabled features | ✅ | ✅ | ✅ |
| Create documents | ✅ | ✅ | ✅ |
| Track finances | ✅ | ✅ | ✅ |
| Manage own data | ✅ | ✅ | ✅ |
| **Data Access** |
| View own business | ✅ | ✅ | ✅ |
| View all businesses | ✅ | ❌ | ❌ |
| View platform analytics | ✅ | ❌ | ❌ |

### Permission Implementation

```typescript
// types/permissions.ts
export type Permission = 
  | 'feature:manage'
  | 'product:create'
  | 'product:edit'
  | 'ad:create'
  | 'ad:edit'
  | 'template:manage'
  | 'alert:manage'
  | 'user:view_all'
  | 'business:view_all'
  | 'analytics:view';

export interface UserRole {
  id: string;
  name: 'super_admin' | 'business_admin' | 'user';
  permissions: Permission[];
}

export const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  'feature:manage',
  'product:create',
  'product:edit',
  'ad:create',
  'ad:edit',
  'template:manage',
  'alert:manage',
  'user:view_all',
  'business:view_all',
  'analytics:view',
];

export const BUSINESS_ADMIN_PERMISSIONS: Permission[] = [
  // No system permissions - can only use tools
];
```

---

## 👁️ FEATURE VISIBILITY LOGIC

### Visibility Rules

Features can be:
1. **Visible as Tab** - Shows in bottom navigation
2. **Hidden but Accessible** - Available via workflows/actions
3. **Completely Hidden** - Not accessible at all
4. **Contextual** - Appears based on conditions

### Feature Configuration Schema

```typescript
// types/features.ts
export interface Feature {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'document' | 'inventory' | 'crm' | 'analytics' | 'admin';
  
  // Visibility Control
  visibility: {
    type: 'tab' | 'hidden' | 'contextual' | 'workflow';
    showAsTab: boolean;
    tabIcon?: string;
    tabLabel?: string;
    contextualTriggers?: string[]; // e.g., ['low_stock', 'overdue_invoice']
  };
  
  // Access Control
  access: {
    requiresBook?: DreamBigBook[];
    requiresBusinessType?: BusinessType[];
    requiresFeature?: string[]; // Feature dependencies
    minBusinessStage?: BusinessStage;
  };
  
  // Super Admin Control
  enabled: boolean;
  enabledByDefault: boolean;
  canBeDisabled: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string; // Super admin user ID
}
```

### Feature Visibility Examples

| Feature | Visibility Type | When It Appears |
|---------|----------------|-----------------|
| **Dashboard** | Tab | Always (core feature) |
| **Finances** | Tab | Always (core feature) |
| **Documents** | Tab | Always (core feature) |
| **Products** | Tab | When book = 'start-your-business' OR 'grow-your-business' |
| **Low Stock Alert** | Contextual | When product quantity < threshold |
| **Payment Reminder** | Contextual | When invoice is overdue |
| **Bulk Import** | Workflow | Hidden, accessible via Products > Actions menu |
| **Advanced Reports** | Tab | When book = 'manage-your-money' OR 'scale-up' |

### Implementation Logic

```typescript
// lib/feature-visibility.ts
export function isFeatureVisible(
  feature: Feature,
  userBook: DreamBigBook | undefined,
  businessType: BusinessType | undefined,
  businessStage: BusinessStage | undefined,
  enabledFeatures: string[]
): boolean {
  // Super Admin can always see everything
  if (isSuperAdmin()) return true;
  
  // Feature must be enabled
  if (!feature.enabled) return false;
  
  // Check book requirement
  if (feature.access.requiresBook && feature.access.requiresBook.length > 0) {
    if (!userBook || !feature.access.requiresBook.includes(userBook)) {
      return false;
    }
  }
  
  // Check business type requirement
  if (feature.access.requiresBusinessType && businessType) {
    if (!feature.access.requiresBusinessType.includes(businessType)) {
      return false;
    }
  }
  
  // Check feature dependencies
  if (feature.access.requiresFeature) {
    const hasAllDeps = feature.access.requiresFeature.every(
      dep => enabledFeatures.includes(dep)
    );
    if (!hasAllDeps) return false;
  }
  
  // Check business stage
  if (feature.access.minBusinessStage && businessStage) {
    const stageOrder = ['idea', 'running', 'growing'];
    const minIndex = stageOrder.indexOf(feature.access.minBusinessStage);
    const currentIndex = stageOrder.indexOf(businessStage);
    if (currentIndex < minIndex) return false;
  }
  
  return true;
}

export function shouldShowAsTab(feature: Feature, context: FeatureContext): boolean {
  if (!isFeatureVisible(feature, context.userBook, context.businessType, context.businessStage, context.enabledFeatures)) {
    return false;
  }
  
  return feature.visibility.showAsTab && feature.visibility.type === 'tab';
}
```

---

## 🛍️ PRODUCT & ADS DATA MODEL

### Product System Schema

```sql
-- ============================================
-- PRODUCTS TABLE (Super Admin Controlled)
-- ============================================
CREATE TABLE IF NOT EXISTS platform_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('physical', 'digital', 'service', 'subscription')),
  
  -- Pricing
  base_price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  sale_price DECIMAL(15, 2),
  sale_start_date TIMESTAMP WITH TIME ZONE,
  sale_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Variations (JSONB for flexibility)
  variations JSONB DEFAULT '[]'::jsonb, -- [{name: "Size", options: ["S", "M", "L"]}]
  
  -- Stock Management
  manage_stock BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'on_backorder')),
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  video_url TEXT,
  
  -- Categorization
  category_id UUID REFERENCES product_categories(id),
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
      COALESCE(sku, '')
    )
  ) STORED
);

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id),
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Reviews (for future)
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES platform_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================
-- ADVERTISEMENTS TABLE
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
    --   "target_health_scores": {"min": 0, "max": 60}, // Show to struggling businesses
    --   "target_features": ["products"], // Show to users with products feature
    --   "target_workflows": ["document_creation"], // Show during document creation
    --   "exclude_users": [] // User IDs to exclude
    -- }
  
  -- Placement Rules
  placement JSONB NOT NULL DEFAULT '{}'::jsonb, -- {
    --   "locations": ["dashboard", "document_wizard_step_2", "insights"],
    --   "priority": 1, // Higher = shown first
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

-- Ad Impressions Tracking
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
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Product Purchases (for future e-commerce)
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
  ad_id UUID REFERENCES advertisements(id), -- Track which ad led to purchase
  UNIQUE(product_id, user_id, business_id)
);
```

### Product Visibility Logic

```typescript
// lib/product-visibility.ts
export function isProductVisible(
  product: PlatformProduct,
  userBook: DreamBigBook | undefined,
  businessType: BusinessType | undefined,
  businessStage: BusinessStage | undefined,
  enabledFeatures: string[]
): boolean {
  // Must be published
  if (product.status !== 'published') return false;
  
  const rules = product.visibility_rules;
  
  // Check book requirement
  if (rules.visible_to_books && rules.visible_to_books.length > 0) {
    if (!userBook || !rules.visible_to_books.includes(userBook)) {
      return false;
    }
  }
  
  // Check business type
  if (rules.visible_to_business_types && businessType) {
    if (!rules.visible_to_business_types.includes(businessType)) {
      return false;
    }
  }
  
  // Check feature requirement
  if (rules.requires_feature) {
    if (!enabledFeatures.includes(rules.requires_feature)) {
      return false;
    }
  }
  
  // Check business stage
  if (rules.min_business_stage && businessStage) {
    const stageOrder = ['idea', 'running', 'growing'];
    const minIndex = stageOrder.indexOf(rules.min_business_stage);
    const currentIndex = stageOrder.indexOf(businessStage);
    if (currentIndex < minIndex) return false;
  }
  
  return true;
}
```

### Ad Targeting Logic

```typescript
// lib/ad-targeting.ts
export function shouldShowAd(
  ad: Advertisement,
  userContext: {
    userId: string;
    businessId: string;
    userBook?: DreamBigBook;
    businessType?: BusinessType;
    businessStage?: BusinessStage;
    healthScore?: number;
    enabledFeatures: string[];
    currentLocation: string;
    sessionId: string;
  },
  impressionHistory: AdImpression[]
): boolean {
  // Check status
  if (ad.status !== 'active') return false;
  
  // Check date range
  const now = new Date();
  if (ad.start_date && new Date(ad.start_date) > now) return false;
  if (ad.end_date && new Date(ad.end_date) < now) return false;
  
  // Check placement location
  const placement = ad.placement;
  if (!placement.locations.includes(userContext.currentLocation)) {
    return false;
  }
  
  // Check frequency limits
  const userImpressions = impressionHistory.filter(
    imp => imp.user_id === userContext.userId && imp.ad_id === ad.id
  );
  
  if (placement.frequency === 'once_per_session') {
    const sessionImpressions = userImpressions.filter(
      imp => imp.session_id === userContext.sessionId
    );
    if (sessionImpressions.length > 0) return false;
  }
  
  if (placement.frequency === 'once_per_day') {
    const today = new Date().toDateString();
    const todayImpressions = userImpressions.filter(
      imp => new Date(imp.viewed_at).toDateString() === today
    );
    if (todayImpressions.length > 0) return false;
  }
  
  if (placement.max_impressions_per_user) {
    if (userImpressions.length >= placement.max_impressions_per_user) {
      return false;
    }
  }
  
  // Check targeting rules
  const targeting = ad.targeting;
  
  if (targeting.scope === 'global') {
    // Check exclusions
    if (targeting.exclude_users?.includes(userContext.userId)) {
      return false;
    }
    return true;
  }
  
  // Targeted ad - check all targeting criteria
  if (targeting.target_books && userContext.userBook) {
    if (!targeting.target_books.includes(userContext.userBook)) {
      return false;
    }
  }
  
  if (targeting.target_business_types && userContext.businessType) {
    if (!targeting.target_business_types.includes(userContext.businessType)) {
      return false;
    }
  }
  
  if (targeting.target_business_stages && userContext.businessStage) {
    if (!targeting.target_business_stages.includes(userContext.businessStage)) {
      return false;
    }
  }
  
  if (targeting.target_health_scores && userContext.healthScore !== undefined) {
    const { min, max } = targeting.target_health_scores;
    if (userContext.healthScore < min || userContext.healthScore > max) {
      return false;
    }
  }
  
  if (targeting.target_features) {
    const hasAllFeatures = targeting.target_features.every(
      feature => userContext.enabledFeatures.includes(feature)
    );
    if (!hasAllFeatures) return false;
  }
  
  if (targeting.target_workflows) {
    // This would be checked at the workflow level
    // e.g., if user is in document creation workflow
  }
  
  return true;
}
```

---

## 🔒 SUPABASE RLS STRATEGY

### Super Admin RLS Policies

```sql
-- ============================================
-- SUPER ADMIN RLS POLICIES
-- ============================================

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Platform Products Policies
ALTER TABLE platform_products ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all products" ON platform_products
  FOR ALL USING (is_super_admin());

-- Regular users can only view published products that match their visibility rules
CREATE POLICY "Users can view visible products" ON platform_products
  FOR SELECT USING (
    status = 'published' AND
    -- Visibility rules checked in application logic
    true -- RLS can't check JSONB visibility rules efficiently, so we check in app
  );

-- Advertisements Policies
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all ads" ON advertisements
  FOR ALL USING (is_super_admin());

-- Regular users can only view active ads (targeting checked in app)
CREATE POLICY "Users can view active ads" ON advertisements
  FOR SELECT USING (status = 'active');

-- Ad Impressions - Users can insert their own impressions
CREATE POLICY "Users can track ad impressions" ON ad_impressions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own impressions" ON ad_impressions
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Super admins can view all impressions
CREATE POLICY "Super admins can view all impressions" ON ad_impressions
  FOR SELECT USING (is_super_admin());

-- Feature Configuration (new table)
CREATE TABLE IF NOT EXISTS feature_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  visibility_config JSONB NOT NULL,
  access_config JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE feature_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage feature config
CREATE POLICY "Super admins can manage feature config" ON feature_config
  FOR ALL USING (is_super_admin());

-- Regular users can only read enabled features
CREATE POLICY "Users can view enabled features" ON feature_config
  FOR SELECT USING (enabled = true);

-- Document Templates (Super Admin Controlled)
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  business_type TEXT, -- NULL = available to all
  template_data JSONB NOT NULL, -- Full template structure
  required_fields JSONB DEFAULT '[]'::jsonb,
  numbering_rule JSONB NOT NULL, -- {prefix: "INV", format: "INV-{number}", start: 1}
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Super admins can manage templates
CREATE POLICY "Super admins can manage templates" ON document_templates
  FOR ALL USING (is_super_admin());

-- Users can only view active templates for their business type
CREATE POLICY "Users can view active templates" ON document_templates
  FOR SELECT USING (
    is_active = true AND
    (business_type IS NULL OR business_type = (
      SELECT type FROM business_profiles WHERE user_id = auth.uid()::text LIMIT 1
    ))
  );

-- Alert Rules (Super Admin Controlled)
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warning', 'danger', 'info')),
  condition_type TEXT NOT NULL, -- 'profit_margin', 'cash_position', 'no_sales', etc.
  threshold_value DECIMAL(15, 2),
  threshold_percentage DECIMAL(5, 2),
  message_template TEXT NOT NULL,
  action_template TEXT,
  book_reference JSONB, -- {book: "start-your-business", chapter: 4, chapterTitle: "Pricing"}
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher = shown first
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- Super admins can manage alert rules
CREATE POLICY "Super admins can manage alert rules" ON alert_rules
  FOR ALL USING (is_super_admin());

-- Users can only view active alert rules
CREATE POLICY "Users can view active alert rules" ON alert_rules
  FOR SELECT USING (is_active = true);
```

---

## 🔄 EXAMPLE FLOWS

### Flow 1: Super Admin Creates a Product

```
1. Super Admin logs into /admin/products
2. Clicks "Create Product"
3. Fills in:
   - Name: "DreamBig Book Bundle"
   - Type: "digital"
   - Price: $29.99
   - Description: "Get all 6 DreamBig books"
   - Visibility Rules:
     * Visible to books: ["none"] (show to users without books)
     * Requires feature: ["products"]
   - Status: "published"
4. Saves product
5. Product appears in mobile app for:
   - Users with no book
   - Users who have "products" feature enabled
   - In the in-app store
```

### Flow 2: Super Admin Creates Targeted Ad

```
1. Super Admin logs into /admin/ads
2. Clicks "Create Advertisement"
3. Fills in:
   - Title: "Struggling with Cashflow?"
   - Type: "card"
   - Image: Upload cashflow book cover
   - CTA: "Get Manage Your Money Book"
   - Targeting:
     * Scope: "targeted"
     * Target health scores: {min: 0, max: 50} (struggling businesses)
     * Target business stages: ["running"]
   - Placement:
     * Locations: ["dashboard", "insights"]
     * Frequency: "once_per_day"
   - Schedule: Start today, end in 30 days
4. Saves ad
5. Ad appears:
   - On dashboard for businesses with health score < 50
   - In insights screen
   - Once per day per user
   - For 30 days
```

### Flow 3: Business User Sees Product & Ad

```
1. Business user opens app
2. User has no book, health score = 45
3. System checks:
   - Feature visibility: "products" is enabled for no-book users
   - Product visibility: "DreamBig Book Bundle" is visible (targets no-book users)
   - Ad targeting: Cashflow ad matches (health score 45, running business)
4. User sees:
   - Products tab (enabled)
   - In-app store with "DreamBig Book Bundle"
   - Cashflow ad on dashboard
5. User clicks ad → Opens product page
6. User purchases → Tracked in product_purchases
7. Ad conversion tracked in ad_impressions
```

### Flow 4: Super Admin Modifies Document Template

```
1. Super Admin logs into /admin/templates
2. Selects "Invoice" template for "retail" business type
3. Edits template:
   - Adds required field: "SKU Number"
   - Changes numbering: "INV-RET-{number}"
   - Updates layout
4. Saves (creates new version)
5. Next time retail business creates invoice:
   - New template loads automatically
   - SKU field is required
   - Document number follows new format
6. Business user cannot modify template (read-only)
```

---

## 🎯 MISSION PRESERVATION

### How This Design Preserves DreamBig's Mission

#### 1. **Knowledge → Action** ✅
- **Preserved:** Book-based feature unlocking remains
- **Enhanced:** Super Admin can fine-tune which features unlock per book
- **Result:** More precise guidance based on user's learning journey

#### 2. **Guided Execution** ✅
- **Preserved:** Step-by-step document creation
- **Enhanced:** Super Admin controls templates, ensuring consistency
- **Result:** All documents follow best practices defined by DreamBig

#### 3. **Mistake Prevention** ✅
- **Preserved:** Alert system remains proactive
- **Enhanced:** Super Admin can adjust thresholds based on real data
- **Result:** Alerts become more accurate and helpful over time

#### 4. **Zimbabwean-First** ✅
- **Preserved:** Multi-currency, inflation awareness
- **Enhanced:** Super Admin can create Zimbabwe-specific products/ads
- **Result:** Platform stays relevant to local market

#### 5. **Execution Over Learning** ✅
- **Preserved:** Tools remain the focus
- **Enhanced:** Products/ads promote execution tools, not just content
- **Result:** Users are guided to tools that help them execute

#### 6. **Central Authority** ✅
- **New:** DreamBig HQ controls platform evolution
- **Benefit:** Platform improves based on collective learning
- **Result:** All users benefit from centralized improvements

---

## 📊 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- [ ] Create Super Admin console (web app)
- [ ] Implement RLS policies for super admin
- [ ] Create feature_config table
- [ ] Build feature management UI
- [ ] Test super admin authentication

### Phase 2: Product System (Week 3-4)
- [ ] Create platform_products table
- [ ] Build product management UI
- [ ] Implement product visibility logic
- [ ] Create in-app store in mobile app
- [ ] Test product visibility rules

### Phase 3: Ad System (Week 5-6)
- [ ] Create advertisements table
- [ ] Build ad management UI
- [ ] Implement ad targeting logic
- [ ] Create ad components for mobile app
- [ ] Track impressions and conversions

### Phase 4: Template System (Week 7-8)
- [ ] Create document_templates table
- [ ] Build template management UI
- [ ] Update document wizard to use templates
- [ ] Implement template versioning
- [ ] Test template enforcement

### Phase 5: Analytics & Polish (Week 9-10)
- [ ] Build analytics dashboards
- [ ] Implement reporting
- [ ] Performance optimization
- [ ] User testing
- [ ] Documentation

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### Super Admin Console Tech Stack Recommendation

**Option 1: Separate Web App (Recommended)**
- Framework: Next.js 14+ (App Router)
- UI: Tailwind CSS + shadcn/ui
- Database: Same Supabase instance
- Auth: Supabase Auth
- Real-time: Supabase Realtime subscriptions

**Option 2: React Native Web**
- Extend existing app with web-specific routes
- Use responsive design for admin console
- Share codebase with mobile app

### Mobile App Integration

```typescript
// contexts/FeatureContext.tsx (NEW)
export const [FeatureContext, useFeatures] = createContextHook(() => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  
  // Load feature config from Supabase
  const loadFeatures = async () => {
    const { data } = await supabase
      .from('feature_config')
      .select('*')
      .eq('enabled', true);
    
    if (data) {
      const visibleFeatures = data.filter(f => 
        isFeatureVisible(f, business?.dreamBigBook, business?.type, business?.stage, enabledFeatures)
      );
      setFeatures(visibleFeatures);
    }
  };
  
  // ... rest of implementation
});
```

---

## ✅ SUMMARY

This architecture provides:

1. ✅ **Absolute Super Admin Control** - DreamBig HQ controls everything
2. ✅ **Flexible Feature System** - Features can be tabs, hidden, or contextual
3. ✅ **WooCommerce-like Products** - Full product management with visibility rules
4. ✅ **Targeted Advertising** - Global and targeted ads with analytics
5. ✅ **Template Enforcement** - Documents follow Super Admin templates
6. ✅ **Mission Preservation** - Core values maintained while adding control
7. ✅ **Scalable Architecture** - Can grow with platform needs

**Next Step:** Begin Phase 1 implementation.

