# Employee Roles and Permissions System

## Overview

This system allows business owners to:
- Add employees with specific roles
- Control what features employees can access
- Restrict actions (e.g., void sales, add products) based on roles
- Allow employees to log in with email/password or PIN code

## Database Setup

Run the SQL migration to create the necessary tables:

```sql
-- Run this file in Supabase SQL Editor
database/create_employee_roles_permissions.sql
```

This creates:
- `employee_roles` - Custom roles for each business
- `employee_permissions` - Available permissions
- `role_permissions` - Maps permissions to roles
- Updates `employees` table with authentication fields

## Default Roles

Each business automatically gets these roles:

1. **Manager** - Full access to all features
2. **Cashier** - Can process sales, view products, cannot void sales
3. **Sales Associate** - Can process sales but cannot void transactions
4. **Inventory Clerk** - Can manage products and stock
5. **View Only** - Can only view data, cannot make changes

## Permissions

### POS Permissions
- `pos:view` - View POS screen
- `pos:process_sales` - Process sales transactions
- `pos:void_sales` - Void/cancel sales (restricted)
- `pos:apply_discounts` - Apply discounts
- `pos:view_reports` - View POS reports

### Product Permissions
- `products:view` - View products
- `products:create` - Add new products
- `products:edit` - Edit products
- `products:delete` - Delete products
- `products:manage_stock` - Update stock levels

### Document Permissions
- `documents:view` - View invoices, receipts
- `documents:create` - Create documents
- `documents:edit` - Edit documents
- `documents:delete` - Delete documents
- `documents:void` - Void documents

### Customer Permissions
- `customers:view` - View customers
- `customers:create` - Add customers
- `customers:edit` - Edit customers
- `customers:delete` - Delete customers

### Financial Permissions
- `finances:view` - View financial data
- `finances:view_reports` - View reports
- `finances:manage_transactions` - Manage transactions

## Employee Login

Employees can log in in two ways:

### 1. Email/Password Login
- Employee must have an email and password set up
- Business owner creates employee account with email
- Employee receives login credentials

### 2. PIN Code Login (Future)
- Quick PIN-based login for POS terminals
- 4-6 digit PIN code
- Requires employee account setup

## Usage in Code

### Check Permissions

```typescript
import { useEmployeePermissions } from '@/hooks/useEmployeePermissions';

function MyComponent() {
  const { hasPermission, isOwner, loading } = useEmployeePermissions();

  if (loading) return <Loading />;

  // Business owners have all permissions
  if (isOwner) {
    // Show all features
  }

  // Check specific permission
  if (hasPermission('pos:void_sales')) {
    // Show void sales button
  }

  // Check multiple permissions
  if (hasPermission('products:create') || hasPermission('products:edit')) {
    // Show product management
  }
}
```

### Protect Actions

```typescript
const handleVoidSale = async () => {
  if (!hasPermission('pos:void_sales')) {
    Alert.alert('Permission Denied', 'You do not have permission to void sales');
    return;
  }
  
  // Proceed with voiding sale
};
```

## Setting Up Employees

1. **Add Employee** (in Employees screen)
   - Enter employee details
   - Select a role
   - Enable "Can Login" if they should have access
   - Set email for login

2. **Create User Account** (for email login)
   - Employee receives invitation email
   - Or business owner creates account manually
   - Employee uses email/password to log in

3. **Assign Role**
   - Select from default roles or create custom role
   - Role determines what employee can do

## Custom Roles

Business owners can:
- Create custom roles
- Assign specific permissions to roles
- Edit role permissions
- Delete custom roles (system roles cannot be deleted)

## Security

- Row Level Security (RLS) ensures employees only see their business data
- Permissions are checked on both frontend and backend
- Employees cannot access other businesses' data
- Business owners always have full access

## Next Steps

1. Run the database migration
2. Update employees screen to manage roles
3. Add permission checks to POS and products
4. Test employee login flow
5. Configure roles for your business needs

