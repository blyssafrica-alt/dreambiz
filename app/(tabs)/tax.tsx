import { Stack } from 'expo-router';
import { 
  Plus, 
  Percent,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  AlertCircle,
  Bell,
  Calendar
} from 'lucide-react-native';
import { useState, useMemo } from 'react';
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
import type { TaxRate } from '@/types/business';

export default function TaxScreen() {
  const { business, taxRates, addTaxRate, updateTaxRate, deleteTaxRate } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'VAT' | 'sales_tax' | 'income_tax' | 'custom'>('VAT');
  const [rate, setRate] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [appliesTo, setAppliesTo] = useState<'all' | 'products' | 'services' | 'custom'>('all');

  const handleSave = async () => {
    if (!name || !rate) {
      RNAlert.alert('Missing Fields', 'Please fill in name and rate');
      return;
    }

    const rateValue = parseFloat(rate);
    if (rateValue < 0 || rateValue > 100) {
      RNAlert.alert('Invalid Rate', 'Tax rate must be between 0 and 100');
      return;
    }

    try {
      if (editingId) {
        await updateTaxRate(editingId, {
          name,
          type,
          rate: rateValue,
          isDefault,
          isActive,
          appliesTo,
        });
      } else {
        await addTaxRate({
          name,
          type,
          rate: rateValue,
          isDefault,
          isActive,
          appliesTo,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Tax rate updated' : 'Tax rate added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save tax rate');
    }
  };

  const handleEdit = (taxRate: TaxRate) => {
    setEditingId(taxRate.id);
    setName(taxRate.name);
    setType(taxRate.type);
    setRate(taxRate.rate.toString());
    setIsDefault(taxRate.isDefault);
    setIsActive(taxRate.isActive);
    setAppliesTo(taxRate.appliesTo || 'all');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Tax Rate',
      'Are you sure you want to delete this tax rate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaxRate(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete tax rate');
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
    setType('VAT');
    setRate('');
    setIsDefault(false);
    setIsActive(true);
    setAppliesTo('all');
  };

  const activeRates = taxRates.filter(t => t.isActive);
  const defaultRate = taxRates.find(t => t.isDefault && t.isActive);

  // Tax reminders - upcoming tax deadlines
  const taxReminders = useMemo(() => {
    const reminders = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Monthly tax reminder (15th of each month)
    const monthlyDeadline = new Date(currentYear, currentMonth, 15);
    if (monthlyDeadline > now && monthlyDeadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      reminders.push({
        id: 'monthly',
        type: 'warning',
        title: 'Monthly Tax Filing Due Soon',
        message: `Monthly tax filing is due on ${monthlyDeadline.toLocaleDateString()}`,
        deadline: monthlyDeadline.toISOString(),
      });
    }
    
    // Quarterly reminder (end of quarter)
    const quarterEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0);
    if (quarterEnd > now && quarterEnd.getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000) {
      reminders.push({
        id: 'quarterly',
        type: 'info',
        title: 'Quarterly Tax Filing Due Soon',
        message: `Quarterly tax filing is due on ${quarterEnd.toLocaleDateString()}`,
        deadline: quarterEnd.toISOString(),
      });
    }
    
    // Yearly reminder (end of year)
    const yearEnd = new Date(currentYear, 11, 31);
    if (yearEnd > now && yearEnd.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
      reminders.push({
        id: 'yearly',
        type: 'info',
        title: 'Annual Tax Filing Due Soon',
        message: `Annual tax filing is due on ${yearEnd.toLocaleDateString()}`,
        deadline: yearEnd.toISOString(),
      });
    }
    
    return reminders;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Tax Management', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Tax Management</Text>
          {defaultRate && (
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
              Default: {defaultRate.name} ({defaultRate.rate}%)
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Tax Reminders */}
        {taxReminders.length > 0 && (
          <View style={[styles.remindersCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.remindersHeader}>
              <Bell size={20} color={theme.accent.warning} />
              <Text style={[styles.remindersTitle, { color: theme.text.primary }]}>Tax Reminders</Text>
            </View>
            {taxReminders.map(reminder => (
              <View key={reminder.id} style={[styles.reminderItem, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.reminderContent}>
                  <Text style={[styles.reminderTitle, { color: theme.text.primary }]}>
                    {reminder.title}
                  </Text>
                  <Text style={[styles.reminderMessage, { color: theme.text.secondary }]}>
                    {reminder.message}
                  </Text>
                  <View style={styles.reminderDate}>
                    <Calendar size={14} color={theme.text.tertiary} />
                    <Text style={[styles.reminderDateText, { color: theme.text.tertiary }]}>
                      {new Date(reminder.deadline).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        {taxRates.length === 0 ? (
          <View style={styles.emptyState}>
            <Percent size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No tax rates configured
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Tax Rate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          taxRates.map(taxRate => (
            <View
              key={taxRate.id}
              style={[
                styles.taxCard,
                { backgroundColor: theme.background.card },
                !taxRate.isActive && { opacity: 0.6 }
              ]}
            >
              <View style={styles.taxHeader}>
                <View style={styles.taxInfo}>
                  <View style={styles.taxNameRow}>
                    <Text style={[styles.taxName, { color: theme.text.primary }]}>
                      {taxRate.name}
                    </Text>
                    {taxRate.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: theme.accent.primary }]}>
                        <CheckCircle size={12} color="#fff" />
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                    {!taxRate.isActive && (
                      <View style={[styles.inactiveBadge, { backgroundColor: theme.surface.danger }]}>
                        <Text style={[styles.inactiveText, { color: theme.accent.danger }]}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.taxType, { color: theme.text.tertiary }]}>
                    {taxRate.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.taxActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(taxRate)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(taxRate.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.taxDetails}>
                <View style={styles.rateDisplay}>
                  <Text style={[styles.rateValue, { color: theme.accent.primary }]}>
                    {taxRate.rate}%
                  </Text>
                  <Text style={[styles.rateLabel, { color: theme.text.tertiary }]}>Tax Rate</Text>
                </View>
                <View style={styles.appliesTo}>
                  <Text style={[styles.appliesToLabel, { color: theme.text.tertiary }]}>Applies to:</Text>
                  <Text style={[styles.appliesToValue, { color: theme.text.secondary }]}>
                    {taxRate.appliesTo ? taxRate.appliesTo.charAt(0).toUpperCase() + taxRate.appliesTo.slice(1) : 'All'}
                  </Text>
                </View>
              </View>
            </View>
          ))
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
                {editingId ? 'Edit Tax Rate' : 'Add Tax Rate'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Tax Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Standard VAT"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Tax Type *</Text>
                <View style={styles.typeOptions}>
                  {(['VAT', 'sales_tax', 'income_tax', 'custom'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor: type === t ? theme.accent.primary : theme.background.secondary,
                        }
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        { color: type === t ? '#fff' : theme.text.primary }
                      ]}>
                        {t.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Tax Rate (%) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={rate}
                  onChangeText={setRate}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Enter percentage (e.g., 15 for 15%)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Applies To</Text>
                <View style={styles.appliesToOptions}>
                  {(['all', 'products', 'services', 'custom'] as const).map(a => (
                    <TouchableOpacity
                      key={a}
                      style={[
                        styles.appliesToOption,
                        {
                          backgroundColor: appliesTo === a ? theme.accent.primary : theme.background.secondary,
                        }
                      ]}
                      onPress={() => setAppliesTo(a)}
                    >
                      <Text style={[
                        styles.appliesToOptionText,
                        { color: appliesTo === a ? '#fff' : theme.text.primary }
                      ]}>
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[styles.switchRow, { backgroundColor: theme.background.secondary }]}
                  onPress={() => setIsDefault(!isDefault)}
                >
                  <View>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Set as Default</Text>
                    <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                      This will be used automatically in invoices
                    </Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: isDefault ? theme.accent.primary : theme.text.tertiary }]}>
                    <View style={[styles.switchThumb, { backgroundColor: '#fff', transform: [{ translateX: isDefault ? 20 : 0 }] }]} />
                  </View>
                </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  taxCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taxInfo: {
    flex: 1,
  },
  taxNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  taxName: {
    fontSize: 18,
    fontWeight: '600',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  defaultText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taxType: {
    fontSize: 12,
  },
  taxActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  taxDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateDisplay: {
    alignItems: 'center',
  },
  rateValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  rateLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  appliesTo: {
    alignItems: 'flex-end',
  },
  appliesToLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  appliesToValue: {
    fontSize: 14,
    fontWeight: '500',
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
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appliesToOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appliesToOption: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  appliesToOptionText: {
    fontSize: 12,
    fontWeight: '600',
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
  remindersCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  remindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  remindersTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  reminderItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderContent: {
    gap: 4,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderMessage: {
    fontSize: 13,
    marginBottom: 8,
  },
  reminderDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderDateText: {
    fontSize: 12,
  },
});

