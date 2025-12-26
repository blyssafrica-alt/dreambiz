-- DreamBig Business OS - Complete Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BOOKS TABLE (DreamBig Books)
-- ============================================
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER BOOKS (Books owned by users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_code TEXT,
  UNIQUE(user_id, book_id)
);

-- ============================================
-- BUSINESS PROFILES
-- ============================================
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

-- ============================================
-- TRANSACTIONS (Sales & Expenses)
-- ============================================
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

-- ============================================
-- DOCUMENTS (Invoices, Receipts, Quotations, etc.)
-- ============================================
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

-- ============================================
-- EXCHANGE RATES
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usd_to_zwl DECIMAL(15, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BUSINESS PLANS
-- ============================================
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

-- ============================================
-- PRODUCTS/INVENTORY
-- ============================================
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

-- ============================================
-- BUDGET TEMPLATES
-- ============================================
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

-- ============================================
-- CASHFLOW PROJECTIONS
-- ============================================
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

-- ============================================
-- VIABILITY CALCULATIONS
-- ============================================
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

-- ============================================
-- APP SETTINGS
-- ============================================
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

-- ============================================
-- ALERTS & WARNINGS
-- ============================================
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
-- INDEXES FOR PERFORMANCE
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
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

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Books policies (public read)
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
-- FUNCTIONS & TRIGGERS
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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_plans_updated_at BEFORE UPDATE ON business_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA - DEFAULT BOOKS
-- ============================================
INSERT INTO books (title, description, category, features) VALUES
  ('Starting Your Business', 'Complete guide to starting a business in Zimbabwe', 'startup', 
   '["Business plan templates", "Registration guide", "Financial planning", "Market research"]'::jsonb),
  ('Financial Management', 'Master your business finances and cashflow', 'finance', 
   '["Cashflow tracking", "Profit calculation", "Budgeting tools", "Financial reports"]'::jsonb),
  ('Marketing & Sales', 'Grow your customer base and increase sales', 'marketing', 
   '["Customer acquisition", "Pricing strategies", "Social media marketing", "Sales tracking"]'::jsonb),
  ('Business Growth', 'Scale your business sustainably', 'growth', 
   '["Expansion strategies", "Team building", "Systems & processes", "Risk management"]'::jsonb);

-- ============================================
-- CREATE SUPER ADMIN USER
-- ============================================
-- IMPORTANT: The super admin account must be created in Supabase Auth first!
-- The users table entry will be created automatically when the user signs up,
-- OR you can run the script: node scripts/create-super-admin.js
--
-- Super Admin Credentials:
-- Email: nashiezw@gmail.com
-- Password: @12345678
--
-- To create the super admin:
-- 1. Run: node scripts/create-super-admin.js
-- OR
-- 2. Manually create in Supabase Dashboard:
--    - Go to Authentication > Users > Add User
--    - Email: nashiezw@gmail.com
--    - Password: @12345678
--    - Then update the users table to set is_super_admin = true
--
-- This SQL will only set is_super_admin = true if the user already exists
-- (it won't create the auth user, only the profile)
UPDATE users 
SET is_super_admin = true 
WHERE email = 'nashiezw@gmail.com';

-- ============================================
-- ANALYTICS & REPORTING VIEWS
-- ============================================

-- Monthly sales summary view
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT 
  user_id,
  business_id,
  DATE_TRUNC('month', date) as month,
  currency,
  COUNT(*) as transaction_count,
  SUM(amount) as total_sales,
  AVG(amount) as average_sale
FROM transactions
WHERE type = 'sale'
GROUP BY user_id, business_id, DATE_TRUNC('month', date), currency;

-- Monthly expenses summary view
CREATE OR REPLACE VIEW monthly_expenses_summary AS
SELECT 
  user_id,
  business_id,
  DATE_TRUNC('month', date) as month,
  currency,
  category,
  COUNT(*) as transaction_count,
  SUM(amount) as total_expenses
FROM transactions
WHERE type = 'expense'
GROUP BY user_id, business_id, DATE_TRUNC('month', date), currency, category;

-- Business health dashboard view
CREATE OR REPLACE VIEW business_health_dashboard AS
SELECT 
  bp.id as business_id,
  bp.user_id,
  bp.name as business_name,
  bp.currency,
  bp.capital,
  COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END), 0) as total_sales,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as net_profit,
  bp.capital + COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as current_cash_position,
  COUNT(DISTINCT t.id) as total_transactions
FROM business_profiles bp
LEFT JOIN transactions t ON bp.id = t.business_id
GROUP BY bp.id, bp.user_id, bp.name, bp.currency, bp.capital;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
-- Schema created successfully!
-- Next steps:
-- 1. Set up Supabase project at https://supabase.com
-- 2. Copy your project URL and anon key
-- 3. Add them to your .env file
-- 4. Run this schema in the Supabase SQL Editor
-- 5. Enable Email Auth in Supabase Auth settings
