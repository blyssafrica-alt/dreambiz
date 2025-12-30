/**
 * Employee Permission Checking Utilities
 */

import { supabase } from '@/lib/supabase';
import type { PermissionCode, EmployeeRole, EmployeePermission } from '@/types/employee-permissions';

/**
 * Get all permissions for the current employee
 */
export async function getEmployeePermissions(employeeId: string): Promise<PermissionCode[]> {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        role_id,
        employee_roles!inner (
          id,
          role_permissions (
            employee_permissions (
              code
            )
          )
        )
      `)
      .eq('id', employeeId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching employee permissions:', error);
      return [];
    }

    if (!data?.employee_roles) {
      return [];
    }

    const role = data.employee_roles as any;
    const permissions: PermissionCode[] = [];

    if (role.role_permissions && Array.isArray(role.role_permissions)) {
      role.role_permissions.forEach((rp: any) => {
        if (rp.employee_permissions?.code) {
          permissions.push(rp.employee_permissions.code as PermissionCode);
        }
      });
    }

    return permissions;
  } catch (error) {
    console.error('Error in getEmployeePermissions:', error);
    return [];
  }
}

/**
 * Get permissions for current user if they're an employee
 */
export async function getCurrentUserEmployeePermissions(): Promise<PermissionCode[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        role_id,
        employee_roles!inner (
          id,
          role_permissions (
            employee_permissions (
              code
            )
          )
        )
      `)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .eq('can_login', true)
      .single();

    if (error || !employee) {
      return [];
    }

    const role = (employee as any).employee_roles;
    const permissions: PermissionCode[] = [];

    if (role?.role_permissions && Array.isArray(role.role_permissions)) {
      role.role_permissions.forEach((rp: any) => {
        if (rp.employee_permissions?.code) {
          permissions.push(rp.employee_permissions.code as PermissionCode);
        }
      });
    }

    return permissions;
  } catch (error) {
    console.error('Error in getCurrentUserEmployeePermissions:', error);
    return [];
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(permission: PermissionCode): Promise<boolean> {
  const permissions = await getCurrentUserEmployeePermissions();
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: PermissionCode[]): Promise<boolean> {
  const userPermissions = await getCurrentUserEmployeePermissions();
  return permissions.some(p => userPermissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(permissions: PermissionCode[]): Promise<boolean> {
  const userPermissions = await getCurrentUserEmployeePermissions();
  return permissions.every(p => userPermissions.includes(p));
}

/**
 * Get all available permissions
 */
export async function getAllPermissions(): Promise<EmployeePermission[]> {
  try {
    const { data, error } = await supabase
      .from('employee_permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    return [];
  }
}

/**
 * Get all roles for a business
 */
export async function getBusinessRoles(businessId: string): Promise<EmployeeRole[]> {
  try {
    const { data, error } = await supabase
      .from('employee_roles')
      .select(`
        *,
        role_permissions (
          employee_permissions (*)
        )
      `)
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    if (!data) return [];

    return data.map((role: any) => ({
      id: role.id,
      businessId: role.business_id,
      name: role.name,
      description: role.description,
      isSystemRole: role.is_system_role,
      permissions: (role.role_permissions || []).map((rp: any) => rp.employee_permissions).filter(Boolean),
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    }));
  } catch (error) {
    console.error('Error in getBusinessRoles:', error);
    return [];
  }
}

/**
 * Check if current user is a business owner (not an employee)
 */
export async function isBusinessOwner(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is linked as an employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    // If they're an employee, they're not the owner
    return !employee;
  } catch (error) {
    // If error, assume they're the owner
    return true;
  }
}

