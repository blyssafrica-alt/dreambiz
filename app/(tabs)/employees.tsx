import { Stack } from 'expo-router';
import { 
  Plus, 
  Users,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  X
} from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Employee } from '@/types/business';

export default function EmployeesScreen() {
  const { business, employees, addEmployee, updateEmployee, deleteEmployee } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [position, setPosition] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salary, setSalary] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const handleSave = async () => {
    if (!name) {
      RNAlert.alert('Missing Fields', 'Please enter employee name');
      return;
    }

    try {
      if (editingId) {
        await updateEmployee(editingId, {
          name,
          email: email || undefined,
          phone: phone || undefined,
          role: role || undefined,
          position: position || undefined,
          hireDate: hireDate || undefined,
          salary: salary ? parseFloat(salary) : undefined,
          currency: business?.currency || 'USD',
          isActive,
          notes: notes || undefined,
        });
      } else {
        await addEmployee({
          name,
          email: email || undefined,
          phone: phone || undefined,
          role: role || undefined,
          position: position || undefined,
          hireDate: hireDate || undefined,
          salary: salary ? parseFloat(salary) : undefined,
          currency: business?.currency || 'USD',
          isActive,
          notes: notes || undefined,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Employee updated' : 'Employee added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setName(employee.name);
    setEmail(employee.email || '');
    setPhone(employee.phone || '');
    setRole(employee.role || '');
    setPosition(employee.position || '');
    setHireDate(employee.hireDate || '');
    setSalary(employee.salary?.toString() || '');
    setIsActive(employee.isActive);
    setNotes(employee.notes || '');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Employee',
      'Are you sure you want to delete this employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployee(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('');
    setPosition('');
    setHireDate('');
    setSalary('');
    setIsActive(true);
    setNotes('');
  };

  const activeEmployees = employees.filter(e => e.isActive);
  const inactiveEmployees = employees.filter(e => !e.isActive);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Employees', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Employees</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
            {activeEmployees.length} active, {inactiveEmployees.length} inactive
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {employees.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No employees yet
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Employee</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeEmployees.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>Active Employees</Text>
                {activeEmployees.map(employee => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    theme={theme}
                    formatCurrency={formatCurrency}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
            {inactiveEmployees.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text.secondary, marginTop: 16 }]}>Inactive Employees</Text>
                {inactiveEmployees.map(employee => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    theme={theme}
                    formatCurrency={formatCurrency}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Employee' : 'Add Employee'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter employee name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Role</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={role}
                    onChangeText={setRole}
                    placeholder="e.g., Manager"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Position</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={position}
                    onChangeText={setPosition}
                    placeholder="e.g., Sales Manager"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Hire Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={hireDate}
                    onChangeText={setHireDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Salary</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={salary}
                    onChangeText={setSalary}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this employee"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[styles.switchRow, { backgroundColor: theme.background.secondary }]}
                  onPress={() => setIsActive(!isActive)}
                >
                  <Text style={[styles.label, { color: theme.text.primary }]}>Active</Text>
                  <View style={[styles.switch, { backgroundColor: isActive ? theme.accent.primary : theme.text.tertiary }]}>
                    <View style={[styles.switchThumb, { backgroundColor: '#fff', transform: [{ translateX: isActive ? 20 : 0 }] }]} />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmployeeCard({ employee, theme, formatCurrency, onEdit, onDelete }: any) {
  return (
    <View
      style={[
        styles.employeeCard,
        { backgroundColor: theme.background.card },
        !employee.isActive && { opacity: 0.6 }
      ]}
    >
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={[styles.employeeName, { color: theme.text.primary }]}>
            {employee.name}
          </Text>
          {(employee.role || employee.position) && (
            <Text style={[styles.employeeRole, { color: theme.text.tertiary }]}>
              {[employee.position, employee.role].filter(Boolean).join(' • ')}
            </Text>
          )}
        </View>
        <View style={styles.employeeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(employee)}
          >
            <Edit2 size={18} color={theme.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(employee.id)}
          >
            <Trash2 size={18} color={theme.accent.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        {employee.email && (
          <View style={styles.detailRow}>
            <Mail size={16} color={theme.text.tertiary} />
            <Text style={[styles.detailText, { color: theme.text.secondary }]}>{employee.email}</Text>
          </View>
        )}
        {employee.phone && (
          <View style={styles.detailRow}>
            <Phone size={16} color={theme.text.tertiary} />
            <Text style={[styles.detailText, { color: theme.text.secondary }]}>{employee.phone}</Text>
          </View>
        )}
        {employee.salary && (
          <View style={styles.detailRow}>
            <DollarSign size={16} color={theme.text.tertiary} />
            <Text style={[styles.detailText, { color: theme.text.secondary }]}>
              {formatCurrency(employee.salary)} {employee.currency && `(${employee.currency})`}
            </Text>
          </View>
        )}
        {employee.hireDate && (
          <View style={styles.detailRow}>
            <Briefcase size={16} color={theme.text.tertiary} />
            <Text style={[styles.detailText, { color: theme.text.secondary }]}>
              Hired: {new Date(employee.hireDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        {employee.notes && (
          <Text style={[styles.employeeNotes, { color: theme.text.secondary }]}>
            {employee.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  employeeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 14,
  },
  employeeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  employeeDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  employeeNotes: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // Styled via backgroundColor
  },
  saveButton: {
    // Styled via backgroundColor
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

