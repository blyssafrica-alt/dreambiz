-- ============================================
-- SUPPLIER MARKETPLACE & SUPPLIER STORES
-- Run after: add_customers_suppliers.sql, add_user_roles.sql, ensure_premium_features_working.sql
-- ============================================

-- 1) Link existing private suppliers to marketplace (optional)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS marketplace_supplier_id UUID;
-- FK added after supplier_marketplace_profiles exists
CREATE INDEX IF NOT EXISTS idx_suppliers_marketplace_supplier_id ON public.suppliers(marketplace_supplier_id);

-- 2) Supplier marketplace profiles (sellers applying to be listed)
CREATE TABLE IF NOT EXISTS public.supplier_marketplace_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  category_focus TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  address TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'suspended')),
  verification_level INT DEFAULT 0,
  verification_badge_text TEXT,
  trust_score INT DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_profiles_user_id ON public.supplier_marketplace_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_profiles_status ON public.supplier_marketplace_profiles(status);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_profiles_slug ON public.supplier_marketplace_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_profiles_featured ON public.supplier_marketplace_profiles(featured) WHERE featured = true;

-- Optional application fields (legal/registration)
ALTER TABLE public.supplier_marketplace_profiles ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.supplier_marketplace_profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.supplier_marketplace_profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.supplier_marketplace_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.supplier_marketplace_profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.supplier_marketplace_profiles ADD COLUMN IF NOT EXISTS company_email TEXT;

-- Verification documents (application & admin verification)
CREATE TABLE IF NOT EXISTS public.supplier_verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_verification_documents_profile ON public.supplier_verification_documents(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_verification_documents_type ON public.supplier_verification_documents(document_type);

-- Conversations (user <-> supplier store)
CREATE TABLE IF NOT EXISTS public.supplier_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_profile_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_conversations_profile ON public.supplier_conversations(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_conversations_user ON public.supplier_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_conversations_updated ON public.supplier_conversations(updated_at DESC);

-- Messages (text + optional attachments: images, documents)
CREATE TABLE IF NOT EXISTS public.supplier_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.supplier_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  attachment_names TEXT[] DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_conversation ON public.supplier_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_created ON public.supplier_messages(created_at);

-- FK from suppliers to marketplace profile (after table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'suppliers_marketplace_supplier_id_fkey'
    AND table_name = 'suppliers'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_marketplace_supplier_id_fkey
      FOREIGN KEY (marketplace_supplier_id) REFERENCES public.supplier_marketplace_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Main categories (admin-managed, global)
CREATE TABLE IF NOT EXISTS public.supplier_marketplace_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_categories_slug ON public.supplier_marketplace_categories(slug);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_categories_active ON public.supplier_marketplace_categories(is_active) WHERE is_active = true;

-- 4) Subcategories (supplier-created under main categories)
CREATE TABLE IF NOT EXISTS public.supplier_marketplace_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.supplier_marketplace_categories(id) ON DELETE CASCADE,
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_profile_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_subcategories_category ON public.supplier_marketplace_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_subcategories_supplier ON public.supplier_marketplace_subcategories(supplier_profile_id);

-- 5) Marketplace products (supplier catalog)
CREATE TABLE IF NOT EXISTS public.supplier_marketplace_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES public.supplier_marketplace_subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  short_description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  price DECIMAL(15, 2),
  currency TEXT DEFAULT 'USD',
  min_order_qty INT DEFAULT 1,
  availability_status TEXT DEFAULT 'in_stock',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
  featured BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_products_supplier ON public.supplier_marketplace_products(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_products_status ON public.supplier_marketplace_products(status);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_products_category ON public.supplier_marketplace_products(subcategory_id);

-- 6) Reviews (one per user per supplier)
CREATE TABLE IF NOT EXISTS public.supplier_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_profile_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_reviews_supplier ON public.supplier_marketplace_reviews(supplier_profile_id);

-- 7) Complaints (buyers report suppliers; admin resolves)
CREATE TABLE IF NOT EXISTS public.supplier_marketplace_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_reference TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  admin_notes TEXT,
  admin_action TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_complaints_supplier ON public.supplier_marketplace_complaints(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_complaints_status ON public.supplier_marketplace_complaints(status);
CREATE INDEX IF NOT EXISTS idx_supplier_marketplace_complaints_user ON public.supplier_marketplace_complaints(user_id);

-- 8) Supplier subscription plans (admin CRUD)
CREATE TABLE IF NOT EXISTS public.supplier_subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  duration_days INT NOT NULL,
  product_limit INT NOT NULL DEFAULT 10,
  ads_allowed BOOLEAN DEFAULT false,
  featured_allowed BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9) Supplier subscriptions (seller pays; admin verifies)
CREATE TABLE IF NOT EXISTS public.supplier_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.supplier_subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  payment_method_id UUID,
  payment_reference TEXT,
  proof_of_payment_url TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_profile ON public.supplier_subscriptions(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_status ON public.supplier_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_expires ON public.supplier_subscriptions(expires_at) WHERE status = 'active';

-- 10) Audit log (admin actions)
CREATE TABLE IF NOT EXISTS public.supplier_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_admin_audit_log_admin ON public.supplier_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_admin_audit_log_created ON public.supplier_admin_audit_log(created_at);

-- 11) Analytics events (optional)
CREATE TABLE IF NOT EXISTS public.supplier_analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.supplier_marketplace_products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_analytics_events_supplier ON public.supplier_analytics_events(supplier_profile_id);
CREATE INDEX IF NOT EXISTS idx_supplier_analytics_events_created ON public.supplier_analytics_events(created_at);

-- 12) Supplier ads link (reuse advertisements)
CREATE TABLE IF NOT EXISTS public.supplier_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID NOT NULL,
  supplier_profile_id UUID NOT NULL REFERENCES public.supplier_marketplace_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.supplier_marketplace_products(id) ON DELETE SET NULL,
  placement_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_ads_supplier ON public.supplier_ads(supplier_profile_id);

-- ============================================
-- RPC: user_is_admin (for RLS and app)
-- ============================================
CREATE OR REPLACE FUNCTION public.user_is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_uuid
    AND (is_super_admin = true OR role IN ('super_admin', 'admin', 'moderator'))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RPC: supplier_can_publish(supplier_profile_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.supplier_can_publish(profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub RECORD;
  plan RECORD;
  product_count INT;
BEGIN
  IF profile_id IS NULL THEN RETURN false; END IF;
  SELECT status INTO sub FROM public.supplier_marketplace_profiles WHERE id = profile_id;
  IF sub.status <> 'approved' THEN RETURN false; END IF;
  SELECT * INTO sub FROM public.supplier_subscriptions
  WHERE supplier_profile_id = profile_id AND status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY expires_at DESC NULLS FIRST LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT product_limit INTO plan FROM public.supplier_subscription_plans WHERE id = sub.plan_id;
  SELECT COUNT(*) INTO product_count FROM public.supplier_marketplace_products
  WHERE supplier_profile_id = profile_id AND status = 'published';
  RETURN product_count < plan.product_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RPC: get_supplier_trust_score(supplier_profile_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_supplier_trust_score(profile_id UUID)
RETURNS INT AS $$
DECLARE
  score INT := 50;
  rev_avg NUMERIC;
  rev_count INT;
  comp_count INT;
  lvl INT;
BEGIN
  IF profile_id IS NULL THEN RETURN 0; END IF;
  SELECT verification_level INTO lvl FROM public.supplier_marketplace_profiles WHERE id = profile_id;
  score := score + COALESCE(lvl, 0) * 5;
  SELECT AVG(rating)::NUMERIC, COUNT(*) INTO rev_avg, rev_count
  FROM public.supplier_marketplace_reviews WHERE supplier_profile_id = profile_id AND is_hidden = false;
  IF rev_count > 0 AND rev_avg IS NOT NULL THEN
    score := score + (rev_avg - 3) * 10;
  END IF;
  SELECT COUNT(*) INTO comp_count FROM public.supplier_marketplace_complaints
  WHERE supplier_profile_id = profile_id AND status NOT IN ('dismissed');
  score := score - comp_count * 5;
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS: supplier_marketplace_profiles
-- ============================================
ALTER TABLE public.supplier_marketplace_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved supplier profiles" ON public.supplier_marketplace_profiles;
CREATE POLICY "Public read approved supplier profiles" ON public.supplier_marketplace_profiles
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users read own supplier profile" ON public.supplier_marketplace_profiles;
CREATE POLICY "Users read own supplier profile" ON public.supplier_marketplace_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own supplier profile" ON public.supplier_marketplace_profiles;
CREATE POLICY "Users insert own supplier profile" ON public.supplier_marketplace_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own supplier profile" ON public.supplier_marketplace_profiles;
CREATE POLICY "Users update own supplier profile" ON public.supplier_marketplace_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins full access supplier profiles" ON public.supplier_marketplace_profiles;
CREATE POLICY "Admins full access supplier profiles" ON public.supplier_marketplace_profiles
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_marketplace_categories (public read active)
-- ============================================
ALTER TABLE public.supplier_marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read active categories" ON public.supplier_marketplace_categories;
CREATE POLICY "Anyone read active categories" ON public.supplier_marketplace_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.supplier_marketplace_categories;
CREATE POLICY "Admins manage categories" ON public.supplier_marketplace_categories
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_marketplace_subcategories
-- ============================================
ALTER TABLE public.supplier_marketplace_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read subcategories for approved suppliers" ON public.supplier_marketplace_subcategories;
CREATE POLICY "Read subcategories for approved suppliers" ON public.supplier_marketplace_subcategories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.status = 'approved')
  );

DROP POLICY IF EXISTS "Supplier owner manage own subcategories" ON public.supplier_marketplace_subcategories;
CREATE POLICY "Supplier owner manage own subcategories" ON public.supplier_marketplace_subcategories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

-- ============================================
-- RLS: supplier_marketplace_products
-- ============================================
ALTER TABLE public.supplier_marketplace_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published products" ON public.supplier_marketplace_products;
CREATE POLICY "Public read published products" ON public.supplier_marketplace_products
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Supplier owner full access own products" ON public.supplier_marketplace_products;
CREATE POLICY "Supplier owner full access own products" ON public.supplier_marketplace_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access products" ON public.supplier_marketplace_products;
CREATE POLICY "Admins full access products" ON public.supplier_marketplace_products
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_marketplace_reviews
-- ============================================
ALTER TABLE public.supplier_marketplace_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read non-hidden reviews" ON public.supplier_marketplace_reviews;
CREATE POLICY "Read non-hidden reviews" ON public.supplier_marketplace_reviews
  FOR SELECT USING (is_hidden = false);

DROP POLICY IF EXISTS "Users create own review" ON public.supplier_marketplace_reviews;
CREATE POLICY "Users create own review" ON public.supplier_marketplace_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own review" ON public.supplier_marketplace_reviews;
CREATE POLICY "Users update own review" ON public.supplier_marketplace_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own review" ON public.supplier_marketplace_reviews;
CREATE POLICY "Users delete own review" ON public.supplier_marketplace_reviews
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins hide reviews" ON public.supplier_marketplace_reviews;
CREATE POLICY "Admins hide reviews" ON public.supplier_marketplace_reviews
  FOR UPDATE USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_marketplace_complaints
-- ============================================
ALTER TABLE public.supplier_marketplace_complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own complaint" ON public.supplier_marketplace_complaints;
CREATE POLICY "Users create own complaint" ON public.supplier_marketplace_complaints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own complaints" ON public.supplier_marketplace_complaints;
CREATE POLICY "Users read own complaints" ON public.supplier_marketplace_complaints
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins full access complaints" ON public.supplier_marketplace_complaints;
CREATE POLICY "Admins full access complaints" ON public.supplier_marketplace_complaints
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_subscription_plans (public read active)
-- ============================================
ALTER TABLE public.supplier_subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read active supplier plans" ON public.supplier_subscription_plans;
CREATE POLICY "Anyone read active supplier plans" ON public.supplier_subscription_plans
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage supplier plans" ON public.supplier_subscription_plans;
CREATE POLICY "Admins manage supplier plans" ON public.supplier_subscription_plans
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_subscriptions
-- ============================================
ALTER TABLE public.supplier_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supplier read own subscriptions" ON public.supplier_subscriptions;
CREATE POLICY "Supplier read own subscriptions" ON public.supplier_subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Supplier insert own subscription" ON public.supplier_subscriptions;
CREATE POLICY "Supplier insert own subscription" ON public.supplier_subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access supplier subscriptions" ON public.supplier_subscriptions;
CREATE POLICY "Admins full access supplier subscriptions" ON public.supplier_subscriptions
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_admin_audit_log (admin only)
-- ============================================
ALTER TABLE public.supplier_admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit log" ON public.supplier_admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.supplier_admin_audit_log
  FOR SELECT USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert audit log" ON public.supplier_admin_audit_log;
CREATE POLICY "Admins insert audit log" ON public.supplier_admin_audit_log
  FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_analytics_events (supplier owner read; insert via app)
-- ============================================
ALTER TABLE public.supplier_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supplier read own analytics" ON public.supplier_analytics_events;
CREATE POLICY "Supplier read own analytics" ON public.supplier_analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated insert analytics" ON public.supplier_analytics_events;
CREATE POLICY "Authenticated insert analytics" ON public.supplier_analytics_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- RLS: supplier_ads
-- ============================================
ALTER TABLE public.supplier_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supplier manage own ads" ON public.supplier_ads;
CREATE POLICY "Supplier manage own ads" ON public.supplier_ads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access supplier ads" ON public.supplier_ads;
CREATE POLICY "Admins full access supplier ads" ON public.supplier_ads
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_verification_documents
-- ============================================
ALTER TABLE public.supplier_verification_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supplier read own verification docs" ON public.supplier_verification_documents;
CREATE POLICY "Supplier read own verification docs" ON public.supplier_verification_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Supplier insert own verification docs" ON public.supplier_verification_documents;
CREATE POLICY "Supplier insert own verification docs" ON public.supplier_verification_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access verification docs" ON public.supplier_verification_documents;
CREATE POLICY "Admins full access verification docs" ON public.supplier_verification_documents
  FOR ALL USING (public.user_is_admin(auth.uid()));

-- ============================================
-- RLS: supplier_conversations
-- ============================================
ALTER TABLE public.supplier_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own conversations" ON public.supplier_conversations;
CREATE POLICY "Users read own conversations" ON public.supplier_conversations
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert conversation" ON public.supplier_conversations;
CREATE POLICY "Users insert conversation" ON public.supplier_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Supplier update conversation updated_at" ON public.supplier_conversations;
CREATE POLICY "Supplier update conversation updated_at" ON public.supplier_conversations
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = supplier_profile_id AND p.user_id = auth.uid()));

-- ============================================
-- RLS: supplier_messages
-- ============================================
ALTER TABLE public.supplier_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read messages" ON public.supplier_messages;
CREATE POLICY "Participants read messages" ON public.supplier_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supplier_conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = c.supplier_profile_id AND p.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants insert messages" ON public.supplier_messages;
CREATE POLICY "Participants insert messages" ON public.supplier_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "Participants update read_at" ON public.supplier_messages;
CREATE POLICY "Participants update read_at" ON public.supplier_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.supplier_conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.supplier_marketplace_profiles p WHERE p.id = c.supplier_profile_id AND p.user_id = auth.uid()))
    )
  );

-- ============================================
-- Trigger: update trust_score on supplier_marketplace_profiles (optional refresh)
-- ============================================
CREATE OR REPLACE FUNCTION public.refresh_supplier_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.supplier_profile_id, OLD.supplier_profile_id);
  IF pid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.supplier_marketplace_profiles
  SET trust_score = public.get_supplier_trust_score(pid),
      updated_at = NOW()
  WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_trust_score_on_review ON public.supplier_marketplace_reviews;
CREATE TRIGGER refresh_trust_score_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_supplier_trust_score();

-- ============================================
-- Seed: feature_config rows (supplier marketplace features)
-- Allow category 'suppliers' in feature_config (expand check constraint if present).
-- ============================================
-- Allow category 'suppliers' in feature_config (expand check constraint).
ALTER TABLE public.feature_config DROP CONSTRAINT IF EXISTS feature_config_category_check;
ALTER TABLE public.feature_config
  ADD CONSTRAINT feature_config_category_check
  CHECK (category IN ('financial', 'document', 'inventory', 'crm', 'analytics', 'admin', 'suppliers'));

DO $$
DECLARE
  f RECORD;
  feat RECORD;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('supplier-section', 'Suppliers section', 'Show Suppliers group in More menu'),
    ('supplier-marketplace', 'Find Suppliers', 'Browse supplier marketplace'),
    ('supplier-storefront', 'Supplier storefront', 'View supplier profile and products'),
    ('supplier-reviews', 'Supplier reviews', 'View and post supplier reviews'),
    ('supplier-complaints', 'Supplier complaints', 'Submit complaint about supplier'),
    ('supplier-search-products', 'Search marketplace products', 'Search products in supplier marketplace'),
    ('supplier-sell', 'Become a supplier', 'Access supplier dashboard'),
    ('supplier-list-products', 'List products', 'Create and publish marketplace products'),
    ('supplier-subcategories', 'Supplier subcategories', 'Create subcategories under main categories'),
    ('supplier-ads', 'Supplier ads', 'Create ads for store or products'),
    ('supplier-analytics', 'Supplier analytics', 'View store and product analytics'),
    ('supplier-admin', 'Supplier admin', 'Access admin supplier management')
  ) AS t(feature_id, name, description)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.feature_config WHERE feature_id = f.feature_id) THEN
      INSERT INTO public.feature_config (feature_id, name, description, category, enabled, enabled_by_default, can_be_disabled, is_premium, premium_plan_ids, access, visibility)
      VALUES (f.feature_id, f.name, f.description, 'suppliers', true, true, true, false, '{}', '{}', '{}');
      RAISE NOTICE 'Created feature: %', f.feature_id;
    END IF;
  END LOOP;
END $$;

-- Optional: Create Storage bucket for supplier assets (logos, covers, evidence, application docs, message attachments).
-- In Supabase Dashboard: Storage → New bucket → name: supplier_assets.
-- Allow paths: logos/, covers/, application_docs/, message_attachments/, supplier_complaint_evidence/ (if used).
-- Set public read for logos/covers/store images if needed; otherwise use signed URLs.
