import { Stack } from 'expo-router';
import { 
  Plus, 
  Repeat,
  Edit2,
  Trash2,
  X,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
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
import type { RecurringInvoice } from '@/types/payments';
import type { DocumentItem, Currency } from '@/types/business';

export default function RecurringInvoicesScreen() {
  const { business, recurringInvoices, addRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice, addDocument } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState<{ description: string; quantity: string; price: string }[]>([
    { description: '', quantity: '1', price: '' }
  ]);
  const [taxRate, setTaxRate] = useState('');

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const calculateTotals = () => {
    const validItems = items.filter(item => item.description && item.price);
    const subtotal = validItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      return sum + (qty * price);
    }, 0);
    const tax = taxRate ? (subtotal * parseFloat(taxRate) / 100) : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const calculateNextDueDate = (lastDate: string, freq: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string => {
    const date = new Date(lastDate);
    switch (freq) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!customerName) {
      RNAlert.alert('Missing Fields', 'Please enter customer name');
      return;
    }

    const validItems = items.filter(item => item.description && item.price);
    if (validItems.length === 0) {
      RNAlert.alert('Missing Items', 'Please add at least one item');
      return;
    }

    const { subtotal, tax, total } = calculateTotals();
    const documentItems: DocumentItem[] = validItems.map((item, idx) => ({
      id: `item-${idx}`,
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.price) || 0,
      total: (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0),
    }));

    const nextDue = startDate ? calculateNextDueDate(startDate, frequency) : new Date().toISOString().split('T')[0];

    try {
      if (editingId) {
        await updateRecurringInvoice(editingId, {
          customerName,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          items: documentItems,
          subtotal,
          tax: tax > 0 ? tax : undefined,
          total,
          currency: business?.currency || 'USD',
          frequency,
          startDate,
          endDate: endDate || undefined,
          nextDueDate: nextDue,
          isActive: true,
        });
      } else {
        await addRecurringInvoice({
          customerName,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          items: documentItems,
          subtotal,
          tax: tax > 0 ? tax : undefined,
          total,
          currency: business?.currency || 'USD',
          frequency,
          startDate: startDate || new Date().toISOString().split('T')[0],
          endDate: endDate || undefined,
          nextDueDate: nextDue,
          isActive: true,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Recurring invoice updated' : 'Recurring invoice created');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save recurring invoice');
    }
  };

  const handleGenerateInvoice = async (recurring: RecurringInvoice) => {
    try {
      // Generate invoice from recurring template
      const documentItems: DocumentItem[] = recurring.items.map((item, idx) => ({
        id: `item-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));
      
      await addDocument({
        type: 'invoice',
        customerName: recurring.customerName,
        customerEmail: recurring.customerEmail,
        customerPhone: recurring.customerPhone,
        items: documentItems,
        subtotal: recurring.subtotal,
        tax: recurring.tax,
        total: recurring.total,
        currency: recurring.currency,
        date: new Date().toISOString().split('T')[0],
        dueDate: recurring.nextDueDate,
        status: 'draft',
      });

      // Update next due date
      const nextDue = calculateNextDueDate(recurring.nextDueDate, recurring.frequency);
      await updateRecurringInvoice(recurring.id, { nextDueDate: nextDue });

      RNAlert.alert('Success', 'Invoice generated successfully');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to generate invoice');
    }
  };

  const handleEdit = (invoice: RecurringInvoice) => {
    setEditingId(invoice.id);
    setCustomerName(invoice.customerName);
    setCustomerEmail(invoice.customerEmail || '');
    setCustomerPhone(invoice.customerPhone || '');
    setFrequency(invoice.frequency);
    setStartDate(invoice.startDate);
    setEndDate(invoice.endDate || '');
    setItems(invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity.toString(),
      price: item.unitPrice.toString(),
    })));
    setTaxRate(invoice.tax ? ((invoice.tax / invoice.subtotal) * 100).toString() : '');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Recurring Invoice',
      'Are you sure you want to delete this recurring invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringInvoice(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete recurring invoice');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setFrequency('monthly');
    setStartDate('');
    setEndDate('');
    setItems([{ description: '', quantity: '1', price: '' }]);
    setTaxRate('');
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', price: '' }]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const activeInvoices = useMemo(() => 
    recurringInvoices.filter(r => r.isActive),
    [recurringInvoices]
  );

  const { subtotal, tax, total } = calculateTotals();

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Recurring Invoices', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Recurring Invoices</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => {
            const today = new Date();
            setStartDate(today.toISOString().split('T')[0]);
            setShowModal(true);
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {recurringInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Repeat size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No recurring invoices yet
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Your First Recurring Invoice</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recurringInvoices.map(invoice => (
            <View
              key={invoice.id}
              style={[styles.invoiceCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={[styles.customerName, { color: theme.text.primary }]}>
                    {invoice.customerName}
                  </Text>
                  <Text style={[styles.invoiceDetails, { color: theme.text.secondary }]}>
                    {invoice.frequency.charAt(0).toUpperCase() + invoice.frequency.slice(1)} • {formatCurrency(invoice.total)}
                  </Text>
                </View>
                <View style={styles.invoiceActions}>
                  {invoice.isActive && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleGenerateInvoice(invoice)}
                    >
                      <CheckCircle size={18} color={theme.accent.success} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(invoice)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(invoice.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.invoiceDetailsRow}>
                <View style={styles.detailItem}>
                  <Calendar size={14} color={theme.text.tertiary} />
                  <Text style={[styles.detailText, { color: theme.text.secondary }]}>
                    Next: {new Date(invoice.nextDueDate).toLocaleDateString()}
                  </Text>
                </View>
                {invoice.isActive ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.statusText, { color: '#065F46' }]}>Active</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.statusText, { color: '#991B1B' }]}>Inactive</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Recurring Invoice' : 'Create Recurring Invoice'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Customer Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Customer Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  placeholder="customer@example.com"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Frequency *</Text>
                <View style={styles.frequencyOptions}>
                  {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(freq => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyOption,
                        {
                          backgroundColor: frequency === freq ? theme.accent.primary : theme.background.secondary,
                        }
                      ]}
                      onPress={() => setFrequency(freq)}
                    >
                      <Text style={[
                        styles.frequencyOptionText,
                        { color: frequency === freq ? '#FFF' : theme.text.primary }
                      ]}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Start Date *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>End Date (Optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Items *</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemInput, styles.itemDescription, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={item.description}
                      onChangeText={(value) => updateItem(index, 'description', value)}
                      placeholder="Item description"
                      placeholderTextColor={theme.text.tertiary}
                    />
                    <TextInput
                      style={[styles.itemInput, styles.itemQuantity, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={item.quantity}
                      onChangeText={(value) => updateItem(index, 'quantity', value)}
                      placeholder="Qty"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[styles.itemInput, styles.itemPrice, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={item.price}
                      onChangeText={(value) => updateItem(index, 'price', value)}
                      placeholder="Price"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                    {items.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() => removeItem(index)}
                      >
                        <X size={18} color={theme.accent.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.addItemButton, { backgroundColor: theme.background.secondary }]}
                  onPress={addItem}
                >
                  <Plus size={16} color={theme.accent.primary} />
                  <Text style={[styles.addItemText, { color: theme.accent.primary }]}>Add Item</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Tax Rate (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={taxRate}
                  onChangeText={setTaxRate}
                  placeholder="0"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.totalsCard, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.text.secondary }]}>Subtotal:</Text>
                  <Text style={[styles.totalValue, { color: theme.text.primary }]}>{formatCurrency(subtotal)}</Text>
                </View>
                {tax > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: theme.text.secondary }]}>Tax:</Text>
                    <Text style={[styles.totalValue, { color: theme.text.primary }]}>{formatCurrency(tax)}</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.text.primary, fontWeight: '700' as const }]}>Total:</Text>
                  <Text style={[styles.totalValue, { color: theme.accent.primary, fontWeight: '700' as const }]}>{formatCurrency(total)}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
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
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  invoiceDetails: {
    fontSize: 14,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  invoiceDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
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
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  itemInput: {
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  itemDescription: {
    flex: 2,
  },
  itemQuantity: {
    width: 60,
  },
  itemPrice: {
    flex: 1,
  },
  removeItemButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  totalsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

