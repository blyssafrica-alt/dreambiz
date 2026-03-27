-- ============================================
-- DREAMBIG BUSINESS OS - COMPLETE DATABASE SETUP
-- ============================================
-- Run this ENTIRE file in your Supabase SQL Editor
-- Select "No limit" before running
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP EXISTING POLICIES (Clean slate)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view books" ON books;
DROP POLICY IF EXISTS "Users can view their own books" ON user_books;
DROP POLICY IF EXISTS "Users can insert their own books" ON user_books;
DROP POLICY IF EXISTS "Users can view their own business" ON business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their own business" ON business_profiles;
DROP POLICY IF EXISTS "Users can delete their own business" ON business_profiles;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Users can view their own exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can insert their own exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Users can view their own business plans" ON business_plans;
DROP POLICY IF EXISTS "Users can insert their own business plans" ON business_plans;
DROP POLICY IF EXISTS "Users can update their own business plans" ON business_plans;
DROP POLICY IF EXISTS "Users can delete their own business plans" ON business_plans;
DROP POLICY IF EXISTS "Users can view their own viability calculations" ON viability_calculations;
DROP POLICY IF EXISTS "Users can insert their own viability calculations" ON viability_calculations;
DROP POLICY IF EXISTS "Users can view their own settings" ON app_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON app_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON app_settings;
DROP POLICY IF EXISTS "Users can view their own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can insert their own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can delete their own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;
DROP POLICY IF EXISTS "Users can view their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view their own cashflow projections" ON cashflow_projections;
DROP POLICY IF EXISTS "Users can insert their own cashflow projections" ON cashflow_projections;
DROP POLICY IF EXISTS "Users can update their own cashflow projections" ON cashflow_projections;
DROP POLICY IF EXISTS "Users can delete their own cashflow projections" ON cashflow_projections;

-- ============================================
-- CREATE TABLES
-- ============================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOOKS TABLE
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER BOOKS
CREATE TABLE IF NOT EXISTS user_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_code TEXT,
  UNIQUE(user_id, book_id)
);

-- BUSINESS PROFILES
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('retail', 'services', 'manufacturing', 'agriculture', 'restaurant', 'salon', 'construction', 'transport', 'other')),
  stage TEXT NOT NULL CHECK (stage IN ('idea', 'running', 'growing')),
  location TEXT NOT NULL,
  capital DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  owner TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'expense')),
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'receipt', 'quotation', 'purchase_order', 'supplier_agreement', 'contract', 'business_plan')),
  document_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax DECIMAL(15, 2),
  total DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  date DATE NOT NULL,
  due_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EXCHANGE RATES
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usd_to_zwl DECIMAL(15, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BUSINESS PLANS
CREATE TABLE IF NOT EXISTS business_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  executive_summary TEXT,
  market_analysis TEXT,
  financial_projections JSONB,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_price DECIMAL(15, 2) NOT NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  quantity INTEGER DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_budget DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CASHFLOW PROJECTIONS
CREATE TABLE IF NOT EXISTS cashflow_projections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  opening_balance DECIMAL(15, 2) NOT NULL,
  projected_income DECIMAL(15, 2) NOT NULL,
  projected_expenses DECIMAL(15, 2) NOT NULL,
  closing_balance DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VIABILITY CALCULATIONS
CREATE TABLE IF NOT EXISTS viability_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  capital DECIMAL(15, 2) NOT NULL,
  monthly_expenses DECIMAL(15, 2) NOT NULL,
  price_per_unit DECIMAL(15, 2) NOT NULL,
  cost_per_unit DECIMAL(15, 2) NOT NULL,
  expected_sales_per_month INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ZWL')),
  break_even_units INTEGER,
  break_even_revenue DECIMAL(15, 2),
  monthly_profit DECIMAL(15, 2),
  months_to_recover_capital DECIMAL(10, 2),
  verdict TEXT CHECK (verdict IN ('viable', 'risky', 'not-viable')),
  warnings JSONB DEFAULT '[]'::jsonb,
  profit_margin DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APP SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  currency_preference TEXT DEFAULT 'USD' CHECK (currency_preference IN ('USD', 'ZWL')),
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('warning', 'danger', 'info')),
  message TEXT NOT NULL,
  action TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_business_id ON documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_user_id ON exchange_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_business_id ON budgets(business_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_user_id ON cashflow_projections(user_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_business_id ON cashflow_projections(business_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE viability_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_projections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Books policies
CREATE POLICY "Anyone can view books" ON books
  FOR SELECT USING (true);

-- User books policies
CREATE POLICY "Users can view their own books" ON user_books
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own books" ON user_books
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Business profiles policies
CREATE POLICY "Users can view their own business" ON business_profiles
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own business" ON business_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own business" ON business_profiles
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own business" ON business_profiles
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Documents policies
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Exchange rates policies
CREATE POLICY "Users can view their own exchange rates" ON exchange_rates
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own exchange rates" ON exchange_rates
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Business plans policies
CREATE POLICY "Users can view their own business plans" ON business_plans
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own business plans" ON business_plans
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own business plans" ON business_plans
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own business plans" ON business_plans
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Viability calculations policies
CREATE POLICY "Users can view their own viability calculations" ON viability_calculations
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own viability calculations" ON viability_calculations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- App settings policies
CREATE POLICY "Users can view their own settings" ON app_settings
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own settings" ON app_settings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own settings" ON app_settings
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Alerts policies
CREATE POLICY "Users can view their own alerts" ON alerts
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own alerts" ON alerts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own alerts" ON alerts
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own alerts" ON alerts
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Products policies
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own products" ON products
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Budgets policies
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Cashflow projections policies
CREATE POLICY "Users can view their own cashflow projections" ON cashflow_projections
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own cashflow projections" ON cashflow_projections
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own cashflow projections" ON cashflow_projections
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own cashflow projections" ON cashflow_projections
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON business_profiles;
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_plans_updated_at ON business_plans;
CREATE TRIGGER update_business_plans_updated_at BEFORE UPDATE ON business_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USER PROFILE AUTO-CREATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    '',
    CASE WHEN NEW.email = 'nashiezw@gmail.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    is_super_admin = CASE WHEN EXCLUDED.email = 'nashiezw@gmail.com' THEN true ELSE users.is_super_admin END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SYNC FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    '',
    CASE WHEN au.email = 'nashiezw@gmail.com' THEN true ELSE false END
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    is_super_admin = CASE WHEN EXCLUDED.email = 'nashiezw@gmail.com' THEN true ELSE users.is_super_admin END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.sync_user_profile(UUID);
CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  auth_user_email TEXT;
  auth_user_name TEXT;
  profile_exists BOOLEAN;
  was_created BOOLEAN := false;
BEGIN
  SELECT email, COALESCE(raw_user_meta_data->>'name', email) INTO auth_user_email, auth_user_name
  FROM auth.users
  WHERE id = user_id_param;
  
  IF auth_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', user_id_param
    );
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id_param) INTO profile_exists;
  
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
      VALUES (
        user_id_param,
        auth_user_email,
        auth_user_name,
        '',
        CASE WHEN auth_user_email = 'nashiezw@gmail.com' THEN true ELSE false END
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        is_super_admin = CASE WHEN EXCLUDED.email = 'nashiezw@gmail.com' THEN true ELSE users.is_super_admin END;
      
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id_param) INTO profile_exists;
      was_created := profile_exists;
    EXCEPTION
      WHEN unique_violation THEN
        profile_exists := true;
        was_created := false;
      WHEN others THEN
        RAISE;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'created', was_created,
    'exists', profile_exists,
    'user_id', user_id_param,
    'message', CASE 
      WHEN was_created THEN 'Profile created successfully'
      WHEN profile_exists THEN 'Profile already exists'
      ELSE 'Profile status unknown'
    END
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'user_id', user_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO anon;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO books (title, description, category, features) VALUES
  ('Starting Your Business', 'Complete guide to starting a business in Zimbabwe', 'startup', 
   '["Business plan templates", "Registration guide", "Financial planning", "Market research"]'::jsonb),
  ('Financial Management', 'Master your business finances and cashflow', 'finance', 
   '["Cashflow tracking", "Profit calculation", "Budgeting tools", "Financial reports"]'::jsonb),
  ('Marketing & Sales', 'Grow your customer base and increase sales', 'marketing', 
   '["Customer acquisition", "Pricing strategies", "Social media marketing", "Sales tracking"]'::jsonb),
  ('Business Growth', 'Scale your business sustainably', 'growth', 
   '["Expansion strategies", "Team building", "Systems & processes", "Risk management"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- SYNC EXISTING USERS & SET SUPER ADMIN
-- ============================================

SELECT public.sync_existing_users();

UPDATE users 
SET is_super_admin = true 
WHERE email = 'nashiezw@gmail.com';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  auth_count INTEGER;
  users_count INTEGER;
  missing_count INTEGER;
  super_admin_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO users_count FROM public.users;
  
  SELECT COUNT(*) INTO missing_count 
  FROM auth.users au 
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);
  
  SELECT EXISTS(SELECT 1 FROM public.users WHERE email = 'nashiezw@gmail.com' AND is_super_admin = true) 
  INTO super_admin_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth users: %', auth_count;
  RAISE NOTICE 'User profiles: %', users_count;
  RAISE NOTICE 'Missing profiles: %', missing_count;
  RAISE NOTICE 'Super admin (nashiezw@gmail.com): %', CASE WHEN super_admin_exists THEN '✅ SET' ELSE '❌ NOT FOUND' END;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- DONE! 
-- ============================================
-- Your database is ready to use.
-- Super admin: nashiezw@gmail.com
-- Password: @12345678
-- 
-- Next steps:
-- 1. Sign in with the super admin credentials
-- 2. Start using the app
-- ============================================
