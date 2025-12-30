-- ============================================
-- EMPLOYEE ROLES AND PERMISSIONS SYSTEM
-- ============================================

-- Employee Roles Table
CREATE TABLE IF NOT EXISTS public.employee_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Cashier", "Manager", "Sales Associate"
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- System roles can't be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, name)
);

-- Employee Permissions Table
CREATE TABLE IF NOT EXISTS public.employee_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- e.g., "pos:void_sales", "products:create"
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., "pos", "products", "documents", "finances"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission Mapping Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID REFERENCES public.employee_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.employee_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Update employees table to link to auth.users and employee_roles
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.employee_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pin_code TEXT, -- For quick PIN-based login
  ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT FALSE; -- Whether employee can log in

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON public.employees(role_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON public.employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_roles_business_id ON public.employee_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- Insert default system permissions
INSERT INTO public.employee_permissions (code, name, description, category) VALUES
  -- POS Permissions
  ('pos:view', 'View POS', 'Can view the POS screen', 'pos'),
  ('pos:process_sales', 'Process Sales', 'Can process sales transactions', 'pos'),
  ('pos:void_sales', 'Void Sales', 'Can void/cancel sales transactions', 'pos'),
  ('pos:apply_discounts', 'Apply Discounts', 'Can apply discounts to sales', 'pos'),
  ('pos:view_reports', 'View POS Reports', 'Can view POS sales reports', 'pos'),
  
  -- Product Permissions
  ('products:view', 'View Products', 'Can view product list', 'products'),
  ('products:create', 'Create Products', 'Can add new products', 'products'),
  ('products:edit', 'Edit Products', 'Can edit existing products', 'products'),
  ('products:delete', 'Delete Products', 'Can delete products', 'products'),
  ('products:manage_stock', 'Manage Stock', 'Can update product stock levels', 'products'),
  
  -- Document Permissions
  ('documents:view', 'View Documents', 'Can view invoices, receipts, etc.', 'documents'),
  ('documents:create', 'Create Documents', 'Can create invoices, receipts, etc.', 'documents'),
  ('documents:edit', 'Edit Documents', 'Can edit documents', 'documents'),
  ('documents:delete', 'Delete Documents', 'Can delete documents', 'documents'),
  ('documents:void', 'Void Documents', 'Can void/cancel documents', 'documents'),
  
  -- Customer Permissions
  ('customers:view', 'View Customers', 'Can view customer list', 'customers'),
  ('customers:create', 'Create Customers', 'Can add new customers', 'customers'),
  ('customers:edit', 'Edit Customers', 'Can edit customer information', 'customers'),
  ('customers:delete', 'Delete Customers', 'Can delete customers', 'customers'),
  
  -- Financial Permissions
  ('finances:view', 'View Finances', 'Can view financial data', 'finances'),
  ('finances:view_reports', 'View Financial Reports', 'Can view financial reports', 'finances'),
  ('finances:manage_transactions', 'Manage Transactions', 'Can add/edit/delete transactions', 'finances'),
  
  -- Employee Permissions
  ('employees:view', 'View Employees', 'Can view employee list', 'employees'),
  ('employees:manage', 'Manage Employees', 'Can add/edit/delete employees', 'employees'),
  
  -- Settings Permissions
  ('settings:view', 'View Settings', 'Can view business settings', 'settings'),
  ('settings:edit', 'Edit Settings', 'Can edit business settings', 'settings')
ON CONFLICT (code) DO NOTHING;

-- Create default roles for each business (trigger function)
CREATE OR REPLACE FUNCTION public.create_default_employee_roles()
RETURNS TRIGGER AS $$
DECLARE
  manager_role_id UUID;
  cashier_role_id UUID;
  sales_associate_role_id UUID;
  inventory_clerk_role_id UUID;
  view_only_role_id UUID;
BEGIN
  -- Create default roles when a business is created
  INSERT INTO public.employee_roles (business_id, name, description, is_system_role) VALUES
    (NEW.id, 'Manager', 'Full access to all features', TRUE),
    (NEW.id, 'Cashier', 'Can process sales and view products', TRUE),
    (NEW.id, 'Sales Associate', 'Can process sales but cannot void transactions', TRUE),
    (NEW.id, 'Inventory Clerk', 'Can manage products and stock', TRUE),
    (NEW.id, 'View Only', 'Can only view data, cannot make changes', TRUE)
  ON CONFLICT (business_id, name) DO NOTHING
  RETURNING id INTO manager_role_id;
  
  -- Get all role IDs
  SELECT id INTO manager_role_id FROM public.employee_roles 
    WHERE business_id = NEW.id AND name = 'Manager';
  SELECT id INTO cashier_role_id FROM public.employee_roles 
    WHERE business_id = NEW.id AND name = 'Cashier';
  SELECT id INTO sales_associate_role_id FROM public.employee_roles 
    WHERE business_id = NEW.id AND name = 'Sales Associate';
  SELECT id INTO inventory_clerk_role_id FROM public.employee_roles 
    WHERE business_id = NEW.id AND name = 'Inventory Clerk';
  SELECT id INTO view_only_role_id FROM public.employee_roles 
    WHERE business_id = NEW.id AND name = 'View Only';
  
  -- Assign permissions to Manager (all permissions)
  IF manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT manager_role_id, id FROM public.employee_permissions
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE role_id = manager_role_id AND permission_id = public.employee_permissions.id
    );
  END IF;
  
  -- Assign permissions to Cashier
  IF cashier_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT cashier_role_id, id FROM public.employee_permissions
    WHERE code IN (
      'pos:view', 'pos:process_sales', 'pos:apply_discounts', 'pos:view_reports',
      'products:view', 'customers:view', 'customers:create', 'documents:view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE role_id = cashier_role_id AND permission_id = public.employee_permissions.id
    );
  END IF;
  
  -- Assign permissions to Sales Associate
  IF sales_associate_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT sales_associate_role_id, id FROM public.employee_permissions
    WHERE code IN (
      'pos:view', 'pos:process_sales', 'pos:apply_discounts',
      'products:view', 'customers:view', 'customers:create', 'documents:view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE role_id = sales_associate_role_id AND permission_id = public.employee_permissions.id
    );
  END IF;
  
  -- Assign permissions to Inventory Clerk
  IF inventory_clerk_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT inventory_clerk_role_id, id FROM public.employee_permissions
    WHERE code IN (
      'products:view', 'products:create', 'products:edit', 'products:manage_stock',
      'customers:view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE role_id = inventory_clerk_role_id AND permission_id = public.employee_permissions.id
    );
  END IF;
  
  -- Assign permissions to View Only
  IF view_only_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT view_only_role_id, id FROM public.employee_permissions
    WHERE code LIKE '%:view'
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE role_id = view_only_role_id AND permission_id = public.employee_permissions.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default roles
DROP TRIGGER IF EXISTS create_default_roles_on_business_create ON public.business_profiles;
CREATE TRIGGER create_default_roles_on_business_create
  AFTER INSERT ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_employee_roles();

-- Function to assign default permissions to system roles
CREATE OR REPLACE FUNCTION public.assign_default_role_permissions()
RETURNS void AS $$
DECLARE
  business_record RECORD;
  manager_role_id UUID;
  cashier_role_id UUID;
  sales_associate_role_id UUID;
  inventory_clerk_role_id UUID;
  view_only_role_id UUID;
BEGIN
  -- For each business, assign permissions to default roles
  FOR business_record IN SELECT id FROM public.business_profiles LOOP
    -- Get role IDs (only if they exist)
    SELECT id INTO manager_role_id FROM public.employee_roles 
      WHERE business_id = business_record.id AND name = 'Manager';
    SELECT id INTO cashier_role_id FROM public.employee_roles 
      WHERE business_id = business_record.id AND name = 'Cashier';
    SELECT id INTO sales_associate_role_id FROM public.employee_roles 
      WHERE business_id = business_record.id AND name = 'Sales Associate';
    SELECT id INTO inventory_clerk_role_id FROM public.employee_roles 
      WHERE business_id = business_record.id AND name = 'Inventory Clerk';
    SELECT id INTO view_only_role_id FROM public.employee_roles 
      WHERE business_id = business_record.id AND name = 'View Only';
    
    -- Manager: All permissions (only if role exists)
    IF manager_role_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT manager_role_id, id FROM public.employee_permissions
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role_id = manager_role_id AND permission_id = public.employee_permissions.id
      );
    END IF;
    
    -- Cashier: POS and basic product viewing (only if role exists)
    IF cashier_role_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT cashier_role_id, id FROM public.employee_permissions
      WHERE code IN (
        'pos:view', 'pos:process_sales', 'pos:apply_discounts', 'pos:view_reports',
        'products:view', 'customers:view', 'customers:create', 'documents:view'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role_id = cashier_role_id AND permission_id = public.employee_permissions.id
      );
    END IF;
    
    -- Sales Associate: Can process sales but not void (only if role exists)
    IF sales_associate_role_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT sales_associate_role_id, id FROM public.employee_permissions
      WHERE code IN (
        'pos:view', 'pos:process_sales', 'pos:apply_discounts',
        'products:view', 'customers:view', 'customers:create', 'documents:view'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role_id = sales_associate_role_id AND permission_id = public.employee_permissions.id
      );
    END IF;
    
    -- Inventory Clerk: Product management (only if role exists)
    IF inventory_clerk_role_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT inventory_clerk_role_id, id FROM public.employee_permissions
      WHERE code IN (
        'products:view', 'products:create', 'products:edit', 'products:manage_stock',
        'customers:view'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role_id = inventory_clerk_role_id AND permission_id = public.employee_permissions.id
      );
    END IF;
    
    -- View Only: Just viewing (only if role exists)
    IF view_only_role_id IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT view_only_role_id, id FROM public.employee_permissions
      WHERE code LIKE '%:view'
      AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role_id = view_only_role_id AND permission_id = public.employee_permissions.id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to assign permissions to existing businesses
-- Note: This will only work if default roles already exist for businesses
-- The trigger will create roles for new businesses automatically
-- For existing businesses, you may need to manually create roles first
DO $$
BEGIN
  -- Only run if there are businesses with roles
  IF EXISTS (SELECT 1 FROM public.employee_roles LIMIT 1) THEN
    PERFORM public.assign_default_role_permissions();
  END IF;
END $$;

-- RLS Policies for employee_roles
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles for their businesses"
  ON public.employee_roles FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create roles for their businesses"
  ON public.employee_roles FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roles for their businesses"
  ON public.employee_roles FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete non-system roles for their businesses"
  ON public.employee_roles FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
    AND is_system_role = FALSE
  );

-- RLS Policies for employee_permissions (read-only for all authenticated users)
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON public.employee_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role permissions for their businesses"
  ON public.role_permissions FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM public.employee_roles 
      WHERE business_id IN (
        SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage role permissions for their businesses"
  ON public.role_permissions FOR ALL
  USING (
    role_id IN (
      SELECT id FROM public.employee_roles 
      WHERE business_id IN (
        SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Update employees RLS to allow employees to view their own data
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
CREATE POLICY "Employees can view their own data"
  ON public.employees FOR SELECT
  USING (
    auth_user_id = auth.uid() OR
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_employee_roles_updated_at ON public.employee_roles;
CREATE TRIGGER update_employee_roles_updated_at
  BEFORE UPDATE ON public.employee_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

