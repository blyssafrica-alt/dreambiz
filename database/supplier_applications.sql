-- ============================================
-- SUPPLIER APPLICATIONS (draft + submission flow)
-- Run after: supplier_marketplace_schema.sql
-- ============================================

CREATE TABLE IF NOT EXISTS public.supplier_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'declined', 'needs_info')),
  payload JSONB DEFAULT '{}',
  display_name TEXT,
  supplier_type TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  years_in_operation INT,
  registration_number TEXT,
  selected_category_ids UUID[] DEFAULT '{}',
  subcategories JSONB DEFAULT '[]',
  product_keywords TEXT[] DEFAULT '{}',
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  preferred_contact TEXT,
  logo_url TEXT,
  cover_url TEXT,
  tagline TEXT,
  about_description TEXT,
  business_hours TEXT,
  doc_urls JSONB DEFAULT '{}',
  can_provide_invoices BOOLEAN DEFAULT false,
  accept_supplier_rules BOOLEAN DEFAULT false,
  intended_plan_id UUID REFERENCES public.supplier_subscription_plans(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  admin_requested_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_applications_owner ON public.supplier_applications(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_status ON public.supplier_applications(status);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_submitted ON public.supplier_applications(submitted_at DESC) WHERE status IN ('submitted', 'pending', 'needs_info');

-- RLS
ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own applications" ON public.supplier_applications;
CREATE POLICY "Users read own applications" ON public.supplier_applications
  FOR SELECT USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users insert own application" ON public.supplier_applications;
CREATE POLICY "Users insert own application" ON public.supplier_applications
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Users update own draft" ON public.supplier_applications;
CREATE POLICY "Users update own draft" ON public.supplier_applications
  FOR UPDATE USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Admins read all applications" ON public.supplier_applications;
CREATE POLICY "Admins read all applications" ON public.supplier_applications
  FOR SELECT USING (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update applications" ON public.supplier_applications;
CREATE POLICY "Admins update applications" ON public.supplier_applications
  FOR UPDATE USING (public.user_is_admin(auth.uid()));
