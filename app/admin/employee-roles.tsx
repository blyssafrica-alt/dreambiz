/**
 * Employee Roles and Permissions Management
 * Allows business owners to manage employee roles and their permissions
 */

import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Shield, Users, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { PermissionCode } from '@/types/employee-permissions';
import { PERMISSION_CATEGORIES } from '@/types/employee-permissions';

interface EmployeeRole {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: string[];
}

export default function EmployeeRolesScreen() {
  const { theme } = useTheme();
  const { business } = useBusiness();
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<EmployeeRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissions: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [business]);

  const loadData = async () => {
    if (!business?.id) return;

    try {
      setIsLoading(true);

      // Load permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('employee_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (permissionsError) throw permissionsError;
      if (permissionsData) {
        setPermissions(permissionsData);
      }

      // Load roles for this business
      const { data: rolesData, error: rolesError } = await supabase
        .from('employee_roles')
        .select(`
          id,
          name,
          description,
          is_system_role,
          role_permissions (
            permission_id,
            employee_permissions (
              code
            )
          )
        `)
        .eq('business_id', business.id)
        .order('name', { ascending: true });

      if (rolesError) throw rolesError;

      if (rolesData) {
        const formattedRoles: EmployeeRole[] = rolesData.map((role: any) => ({
          id: role.id,
          name: role.name,
          description: role.description || undefined,
          isSystemRole: role.is_system_role,
          permissions: (role.role_permissions || []).map((rp: any) => rp.employee_permissions?.code).filter(Boolean),
        }));
        setRoles(formattedRoles);
      }
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      RNAlert.alert('Error', 'Failed to load roles and permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (role?: EmployeeRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        selectedPermissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        selectedPermissions: [],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      selectedPermissions: [],
    });
  };

  const togglePermission = (permissionCode: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(permissionCode)
        ? prev.selectedPermissions.filter(p => p !== permissionCode)
        : [...prev.selectedPermissions, permissionCode],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      RNAlert.alert('Required', 'Please enter role name');
      return;
    }

    if (!business?.id) {
      RNAlert.alert('Error', 'Business not found');
      return;
    }

    try {
      if (editingRole) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('employee_roles')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRole.id);

        if (updateError) throw updateError;

        // Update permissions
        // First, remove all existing permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', editingRole.id);

        // Then add new permissions
        if (formData.selectedPermissions.length > 0) {
          const permissionIds = permissions
            .filter(p => formData.selectedPermissions.includes(p.code))
            .map(p => p.id);

          if (permissionIds.length > 0) {
            const { error: permissionsError } = await supabase
              .from('role_permissions')
              .insert(
                permissionIds.map(permissionId => ({
                  role_id: editingRole.id,
                  permission_id: permissionId,
                }))
              );

            if (permissionsError) throw permissionsError;
          }
        }
      } else {
        // Create new role
        const { data: newRole, error: createError } = await supabase
          .from('employee_roles')
          .insert({
            business_id: business.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_system_role: false,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add permissions
        if (formData.selectedPermissions.length > 0 && newRole) {
          const permissionIds = permissions
            .filter(p => formData.selectedPermissions.includes(p.code))
            .map(p => p.id);

          if (permissionIds.length > 0) {
            const { error: permissionsError } = await supabase
              .from('role_permissions')
              .insert(
                permissionIds.map(permissionId => ({
                  role_id: newRole.id,
                  permission_id: permissionId,
                }))
              );

            if (permissionsError) throw permissionsError;
          }
        }
      }

      handleCloseModal();
      loadData();
      RNAlert.alert('Success', editingRole ? 'Role updated' : 'Role created');
    } catch (error: any) {
      console.error('Failed to save role:', error);
      RNAlert.alert('Error', error.message || 'Failed to save role');
    }
  };

  const handleDelete = async (role: EmployeeRole) => {
    if (role.isSystemRole) {
      RNAlert.alert('Cannot Delete', 'System roles cannot be deleted');
      return;
    }

    RNAlert.alert(
      'Delete Role',
      `Are you sure you want to delete "${role.name}"? This will remove the role from all employees assigned to it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('employee_roles')
                .delete()
                .eq('id', role.id);

              if (error) throw error;

              loadData();
              RNAlert.alert('Success', 'Role deleted');
            } catch (error: any) {
              console.error('Failed to delete role:', error);
              RNAlert.alert('Error', error.message || 'Failed to delete role');
            }
          },
        },
      ]
    );
  };

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <Stack.Screen options={{ title: 'Employee Roles', headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading roles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Employee Roles', headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Employee Roles</Text>
        <TouchableOpacity
          onPress={() => handleOpenModal()}
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
        >
          <Plus size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {roles.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={64} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.primary }]}>No roles created yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.secondary }]}>
              Create custom roles to control what your employees can do
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => handleOpenModal()}
            >
              <Text style={styles.emptyButtonText}>Create First Role</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>System Roles</Text>
            {roles.filter(r => r.isSystemRole).map(role => (
              <View key={role.id} style={[styles.roleCard, { backgroundColor: theme.background.card }]}>
                <View style={styles.roleHeader}>
                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleName, { color: theme.text.primary }]}>{role.name}</Text>
                    {role.description && (
                      <Text style={[styles.roleDescription, { color: theme.text.secondary }]}>
                        {role.description}
                      </Text>
                    )}
                    <Text style={[styles.rolePermissionsCount, { color: theme.text.tertiary }]}>
                      {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.systemBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                    <Text style={[styles.systemBadgeText, { color: theme.accent.primary }]}>System</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.viewButton, { backgroundColor: theme.background.secondary }]}
                  onPress={() => handleOpenModal(role)}
                >
                  <Text style={[styles.viewButtonText, { color: theme.accent.primary }]}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 24 }]}>Custom Roles</Text>
            {roles.filter(r => !r.isSystemRole).length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.emptyCardText, { color: theme.text.secondary }]}>
                  No custom roles yet. Create one to get started.
                </Text>
              </View>
            ) : (
              roles.filter(r => !r.isSystemRole).map(role => (
                <View key={role.id} style={[styles.roleCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.roleHeader}>
                    <View style={styles.roleInfo}>
                      <Text style={[styles.roleName, { color: theme.text.primary }]}>{role.name}</Text>
                      {role.description && (
                        <Text style={[styles.roleDescription, { color: theme.text.secondary }]}>
                          {role.description}
                        </Text>
                      )}
                      <Text style={[styles.rolePermissionsCount, { color: theme.text.tertiary }]}>
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.roleActions}>
                      <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => handleOpenModal(role)}
                      >
                        <Edit size={18} color={theme.accent.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => handleDelete(role)}
                      >
                        <Trash2 size={18} color={theme.accent.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Role Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingRole ? 'Edit Role' : 'Create Role'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Role Name *</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor: theme.border.light,
                  }]}
                  placeholder="e.g., Senior Cashier"
                  placeholderTextColor={theme.text.tertiary}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  editable={!editingRole?.isSystemRole}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                <TextInput
                  style={[styles.textArea, { 
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor: theme.border.light,
                  }]}
                  placeholder="Describe what this role can do..."
                  placeholderTextColor={theme.text.tertiary}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                  editable={!editingRole?.isSystemRole}
                />
              </View>

              <Text style={[styles.permissionsTitle, { color: theme.text.primary }]}>Permissions</Text>
              <Text style={[styles.permissionsSubtitle, { color: theme.text.secondary }]}>
                Select what this role can do
              </Text>

              {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                <View key={category} style={styles.permissionCategory}>
                  <Text style={[styles.categoryTitle, { color: theme.text.primary }]}>
                    {PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || category}
                  </Text>
                  {Array.isArray(categoryPermissions) && categoryPermissions.map((perm) => (
                    <TouchableOpacity
                      key={perm.id}
                      style={[
                        styles.permissionItem,
                        { 
                          backgroundColor: formData.selectedPermissions.includes(perm.code)
                            ? theme.accent.primary + '20'
                            : theme.background.secondary,
                          borderColor: formData.selectedPermissions.includes(perm.code)
                            ? theme.accent.primary
                            : theme.border.light,
                        }
                      ]}
                      onPress={() => {
                        if (!editingRole?.isSystemRole) {
                          togglePermission(perm.code);
                        }
                      }}
                      disabled={editingRole?.isSystemRole}
                    >
                      <View style={styles.permissionInfo}>
                        <Text style={[styles.permissionName, { color: theme.text.primary }]}>
                          {perm.name}
                        </Text>
                        {perm.description && (
                          <Text style={[styles.permissionDescription, { color: theme.text.secondary }]}>
                            {perm.description}
                          </Text>
                        )}
                      </View>
                      {formData.selectedPermissions.includes(perm.code) && (
                        <View style={[styles.checkIcon, { backgroundColor: theme.accent.primary }]}>
                          <Check size={16} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  roleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  rolePermissionsCount: {
    fontSize: 12,
  },
  systemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  roleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    padding: 8,
  },
  viewButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  permissionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  permissionsSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  permissionCategory: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

