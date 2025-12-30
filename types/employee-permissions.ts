/**
 * Employee Roles and Permissions Types
 */

export type PermissionCode =
  // POS Permissions
  | 'pos:view'
  | 'pos:process_sales'
  | 'pos:void_sales'
  | 'pos:apply_discounts'
  | 'pos:view_reports'
  // Product Permissions
  | 'products:view'
  | 'products:create'
  | 'products:edit'
  | 'products:delete'
  | 'products:manage_stock'
  // Document Permissions
  | 'documents:view'
  | 'documents:create'
  | 'documents:edit'
  | 'documents:delete'
  | 'documents:void'
  // Customer Permissions
  | 'customers:view'
  | 'customers:create'
  | 'customers:edit'
  | 'customers:delete'
  // Financial Permissions
  | 'finances:view'
  | 'finances:view_reports'
  | 'finances:manage_transactions'
  // Employee Permissions
  | 'employees:view'
  | 'employees:manage'
  // Settings Permissions
  | 'settings:view'
  | 'settings:edit';

export interface EmployeePermission {
  id: string;
  code: PermissionCode;
  name: string;
  description: string;
  category: string;
  createdAt: string;
}

export interface EmployeeRole {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: EmployeePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeWithRole {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  roleId?: string;
  role?: EmployeeRole;
  authUserId?: string;
  canLogin: boolean;
  pinCode?: string;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export const PERMISSION_CATEGORIES = {
  pos: 'Point of Sale',
  products: 'Products',
  documents: 'Documents',
  customers: 'Customers',
  finances: 'Finances',
  employees: 'Employees',
  settings: 'Settings',
} as const;

export const DEFAULT_ROLES = {
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  SALES_ASSOCIATE: 'Sales Associate',
  INVENTORY_CLERK: 'Inventory Clerk',
  VIEW_ONLY: 'View Only',
} as const;

