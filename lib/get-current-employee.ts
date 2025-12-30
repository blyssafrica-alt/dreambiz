/**
 * Get current employee information
 */

import { supabase } from './supabase';

export interface CurrentEmployee {
  id: string;
  name: string;
  email?: string;
  roleId?: string;
  roleName?: string;
}

/**
 * Get current logged-in employee information
 */
export async function getCurrentEmployee(): Promise<CurrentEmployee | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user is an employee
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        email,
        role_id,
        employee_roles (
          id,
          name
        )
      `)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !employee) {
      // User is not an employee, return null
      return null;
    }

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email || undefined,
      roleId: employee.role_id || undefined,
      roleName: (employee.employee_roles as any)?.name || undefined,
    };
  } catch (error) {
    console.error('Error getting current employee:', error);
    return null;
  }
}

/**
 * Get current user name (employee or business owner)
 */
export async function getCurrentUserName(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First check if they're an employee
    const employee = await getCurrentEmployee();
    if (employee) {
      return employee.name;
    }

    // If not employee, get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    return profile?.name || null;
  } catch (error) {
    console.error('Error getting current user name:', error);
    return null;
  }
}

