-- ============================================
-- EMPLOYEE ACCESS POLICIES (RLS)
-- ============================================
-- Allows employees to access assigned business data based on permissions.
-- Run in Supabase SQL Editor (No limit).

-- Helper: check if current auth user is an active employee for a business
CREATE OR REPLACE FUNCTION public.is_active_employee(business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.business_id = is_active_employee.business_id
      AND e.auth_user_id = auth.uid()
      AND e.is_active = TRUE
      AND e.can_login = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Helper: check if current auth user has a specific permission in a business
CREATE OR REPLACE FUNCTION public.employee_has_permission(business_id UUID, permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employee_roles r ON r.id = e.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.employee_permissions p ON p.id = rp.permission_id
    WHERE e.business_id = employee_has_permission.business_id
      AND e.auth_user_id = auth.uid()
      AND e.is_active = TRUE
      AND e.can_login = TRUE
      AND p.code = permission_code
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================
-- BUSINESS PROFILES (read-only for employees)
-- ============================================
DROP POLICY IF EXISTS "Employees can view assigned business" ON public.business_profiles;
CREATE POLICY "Employees can view assigned business" ON public.business_profiles
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.is_active_employee(id)
  );

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
DROP POLICY IF EXISTS "Employees can view employees by permission" ON public.employees;
CREATE POLICY "Employees can view employees by permission" ON public.employees
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'employees:view')
    OR auth.uid()::text = auth_user_id::text
  );

DROP POLICY IF EXISTS "Employees can manage employees by permission" ON public.employees;
CREATE POLICY "Employees can manage employees by permission" ON public.employees
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'employees:manage')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'employees:manage')
  );

-- ============================================
-- PRODUCTS
-- ============================================
DROP POLICY IF EXISTS "Employees can view products by permission" ON public.products;
CREATE POLICY "Employees can view products by permission" ON public.products
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'products:view')
    OR public.employee_has_permission(business_id, 'products:create')
    OR public.employee_has_permission(business_id, 'products:edit')
    OR public.employee_has_permission(business_id, 'products:delete')
    OR public.employee_has_permission(business_id, 'products:manage_stock')
  );

DROP POLICY IF EXISTS "Employees can create products by permission" ON public.products;
CREATE POLICY "Employees can create products by permission" ON public.products
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'products:create')
  );

DROP POLICY IF EXISTS "Employees can update products by permission" ON public.products;
CREATE POLICY "Employees can update products by permission" ON public.products
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'products:edit')
    OR public.employee_has_permission(business_id, 'products:manage_stock')
  );

DROP POLICY IF EXISTS "Employees can delete products by permission" ON public.products;
CREATE POLICY "Employees can delete products by permission" ON public.products
  FOR DELETE USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'products:delete')
  );

-- ============================================
-- CUSTOMERS
-- ============================================
DROP POLICY IF EXISTS "Employees can view customers by permission" ON public.customers;
CREATE POLICY "Employees can view customers by permission" ON public.customers
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'customers:view')
    OR public.employee_has_permission(business_id, 'customers:create')
    OR public.employee_has_permission(business_id, 'customers:edit')
    OR public.employee_has_permission(business_id, 'customers:delete')
  );

DROP POLICY IF EXISTS "Employees can create customers by permission" ON public.customers;
CREATE POLICY "Employees can create customers by permission" ON public.customers
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'customers:create')
  );

DROP POLICY IF EXISTS "Employees can update customers by permission" ON public.customers;
CREATE POLICY "Employees can update customers by permission" ON public.customers
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'customers:edit')
  );

DROP POLICY IF EXISTS "Employees can delete customers by permission" ON public.customers;
CREATE POLICY "Employees can delete customers by permission" ON public.customers
  FOR DELETE USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'customers:delete')
  );

-- ============================================
-- SUPPLIERS
-- ============================================
DROP POLICY IF EXISTS "Employees can view suppliers by permission" ON public.suppliers;
CREATE POLICY "Employees can view suppliers by permission" ON public.suppliers
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:view')
  );

DROP POLICY IF EXISTS "Employees can manage suppliers by permission" ON public.suppliers;
CREATE POLICY "Employees can manage suppliers by permission" ON public.suppliers
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

-- ============================================
-- DOCUMENTS
-- ============================================
DROP POLICY IF EXISTS "Employees can view documents by permission" ON public.documents;
CREATE POLICY "Employees can view documents by permission" ON public.documents
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:view')
    OR public.employee_has_permission(business_id, 'documents:create')
    OR public.employee_has_permission(business_id, 'documents:edit')
    OR public.employee_has_permission(business_id, 'documents:delete')
  );

DROP POLICY IF EXISTS "Employees can create documents by permission" ON public.documents;
CREATE POLICY "Employees can create documents by permission" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:create')
  );

DROP POLICY IF EXISTS "Employees can update documents by permission" ON public.documents;
CREATE POLICY "Employees can update documents by permission" ON public.documents
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:edit')
    OR public.employee_has_permission(business_id, 'documents:void')
  );

DROP POLICY IF EXISTS "Employees can delete documents by permission" ON public.documents;
CREATE POLICY "Employees can delete documents by permission" ON public.documents
  FOR DELETE USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:delete')
  );

-- ============================================
-- TRANSACTIONS
-- ============================================
DROP POLICY IF EXISTS "Employees can view transactions by permission" ON public.transactions;
CREATE POLICY "Employees can view transactions by permission" ON public.transactions
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:view')
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

DROP POLICY IF EXISTS "Employees can manage transactions by permission" ON public.transactions;
CREATE POLICY "Employees can manage transactions by permission" ON public.transactions
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

-- ============================================
-- BUDGETS / CASHFLOW / TAX RATES / PAYMENTS
-- ============================================
DROP POLICY IF EXISTS "Employees can view budgets by permission" ON public.budgets;
CREATE POLICY "Employees can view budgets by permission" ON public.budgets
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:view')
  );

DROP POLICY IF EXISTS "Employees can manage budgets by permission" ON public.budgets;
CREATE POLICY "Employees can manage budgets by permission" ON public.budgets
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

DROP POLICY IF EXISTS "Employees can view cashflow by permission" ON public.cashflow_projections;
CREATE POLICY "Employees can view cashflow by permission" ON public.cashflow_projections
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:view')
  );

DROP POLICY IF EXISTS "Employees can manage cashflow by permission" ON public.cashflow_projections;
CREATE POLICY "Employees can manage cashflow by permission" ON public.cashflow_projections
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

DROP POLICY IF EXISTS "Employees can view tax rates by permission" ON public.tax_rates;
CREATE POLICY "Employees can view tax rates by permission" ON public.tax_rates
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:view')
  );

DROP POLICY IF EXISTS "Employees can manage tax rates by permission" ON public.tax_rates;
CREATE POLICY "Employees can manage tax rates by permission" ON public.tax_rates
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

DROP POLICY IF EXISTS "Employees can view payments by permission" ON public.payments;
CREATE POLICY "Employees can view payments by permission" ON public.payments
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:view')
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

DROP POLICY IF EXISTS "Employees can manage payments by permission" ON public.payments;
CREATE POLICY "Employees can manage payments by permission" ON public.payments
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'finances:manage_transactions')
  );

-- ============================================
-- DOCUMENT FOLDERS
-- ============================================
DROP POLICY IF EXISTS "Employees can view document folders by permission" ON public.document_folders;
CREATE POLICY "Employees can view document folders by permission" ON public.document_folders
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:view')
  );

DROP POLICY IF EXISTS "Employees can manage document folders by permission" ON public.document_folders;
CREATE POLICY "Employees can manage document folders by permission" ON public.document_folders
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:edit')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'documents:edit')
  );

-- ============================================
-- POS SHIFTS
-- ============================================
DROP POLICY IF EXISTS "Employees can access POS shifts by permission" ON public.pos_shifts;
CREATE POLICY "Employees can access POS shifts by permission" ON public.pos_shifts
  FOR ALL USING (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'pos:view')
    OR public.employee_has_permission(business_id, 'pos:process_sales')
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR public.employee_has_permission(business_id, 'pos:view')
    OR public.employee_has_permission(business_id, 'pos:process_sales')
  );

