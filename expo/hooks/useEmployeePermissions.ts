/**
 * React Hook for Employee Permissions
 */

import { useState, useEffect } from 'react';
import { 
  getCurrentUserEmployeePermissions, 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  isBusinessOwner 
} from '@/lib/employee-permissions';
import type { PermissionCode } from '@/types/employee-permissions';

export function useEmployeePermissions() {
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const [userPermissions, ownerStatus] = await Promise.all([
        getCurrentUserEmployeePermissions(),
        isBusinessOwner(),
      ]);
      setPermissions(userPermissions);
      setIsOwner(ownerStatus);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
      setIsOwner(true); // Default to owner if error
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (permission: PermissionCode): boolean => {
    // Business owners have all permissions
    if (isOwner) return true;
    return permissions.includes(permission);
  };

  const checkAnyPermission = (perms: PermissionCode[]): boolean => {
    if (isOwner) return true;
    return perms.some(p => permissions.includes(p));
  };

  const checkAllPermissions = (perms: PermissionCode[]): boolean => {
    if (isOwner) return true;
    return perms.every(p => permissions.includes(p));
  };

  return {
    permissions,
    isOwner,
    loading,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    refreshPermissions: loadPermissions,
  };
}

