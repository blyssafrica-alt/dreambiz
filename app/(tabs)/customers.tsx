import { Stack } from 'expo-router';
import { 
  Plus, 
  Users,
  Edit2,
  Trash2,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  Eye,
  TrendingUp,
  Clock,
  FileText,
  DollarSign
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
  Linking,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Customer } from '@/types/business';

export default function CustomersScreen() {
  const { business, customers, documents, addCustomer, updateCustomer, deleteCustomer } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  // Calculate customer analytics
  const customerAnalytics = useMemo(() => {
    if (!selectedCustomer) return null;

    // Find documents for this customer (match by name, email, or phone)
    const customerDocs = documents.filter(doc =>
      doc.customerName.toLowerCase() === selectedCustomer.name.toLowerCase() ||
      (selectedCustomer.email && doc.customerEmail?.toLowerCase() === selectedCustomer.email.toLowerCase()) ||
      (selectedCustomer.phone && doc.customerPhone === selectedCustomer.phone)
    );

    // Calculate lifetime value
    const lifetimeValue = customerDocs.reduce((sum, doc) => sum + doc.total, 0);

    // Purchase history timeline
    const purchaseHistory = customerDocs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Payment behavior
    const paidInvoices = customerDocs.filter(d => d.type === 'invoice' && d.status === 'paid');
    const totalInvoices = customerDocs.filter(d => d.type === 'invoice');
    const paymentRate = totalInvoices.length > 0 
      ? (paidInvoices.length / totalInvoices.length) * 100 
      : 0;

    // Average order value
    const avgOrderValue = customerDocs.length > 0 
      ? lifetimeValue / customerDocs.length 
      : 0;

    // Last purchase date
    const lastPurchase = customerDocs.length > 0
      ? customerDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : null;

    return {
      lifetimeValue,
      purchaseHistory,
      paymentRate,
      avgOrderValue,
      totalOrders: customerDocs.length,
      lastPurchase,
      paidInvoices: paidInvoices.length,
      totalInvoices: totalInvoices.length,
    };
  }, [selectedCustomer, documents]);

  const handleSave = async () => {
    if (!name) {
      RNAlert.alert('Missing Fields', 'Please enter customer name');
      return;
    }

    try {
      if (editingId) {
        await updateCustomer(editingId, {
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          notes: notes || undefined,
          isTaxExempt,
        });
      } else {
        await addCustomer({
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          notes: notes || undefined,
          isTaxExempt,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Customer updated' : 'Customer added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setName(customer.name);
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setNotes(customer.notes || '');
    setIsTaxExempt(customer.isTaxExempt || false);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete customer');
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
    setAddress('');
    setNotes('');
    setIsTaxExempt(false);
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Customers', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Customers</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.background.secondary }]}>
          <Search size={18} color={theme.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search customers..."
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              {customers.length === 0 ? 'No customers yet' : 'No customers match your search'}
            </Text>
            {customers.length === 0 && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
                onPress={() => setShowModal(true)}
              >
                <Text style={styles.emptyButtonText}>Add Your First Customer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredCustomers.map(customer => (
            <View
              key={customer.id}
              style={[styles.customerCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: theme.text.primary }]}>
                    {customer.name}
                  </Text>
                  {customer.totalPurchases > 0 && (
                    <Text style={[styles.customerTotal, { color: theme.accent.primary }]}>
                      Total: {formatCurrency(customer.totalPurchases)}
                    </Text>
                  )}
                </View>
                <View style={styles.customerActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDetail(true);
                    }}
                  >
                    <Eye size={18} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(customer)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(customer.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.customerDetails}>
                {customer.phone && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleCall(customer.phone!)}
                  >
                    <Phone size={16} color={theme.accent.primary} />
                    <Text style={[styles.contactText, { color: theme.accent.primary }]}>
                      {customer.phone}
                    </Text>
                  </TouchableOpacity>
                )}
                {customer.email && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleEmail(customer.email!)}
                  >
                    <Mail size={16} color={theme.accent.primary} />
                    <Text style={[styles.contactText, { color: theme.accent.primary }]}>
                      {customer.email}
                    </Text>
                  </TouchableOpacity>
                )}
                {customer.address && (
                  <View style={styles.contactRow}>
                    <MapPin size={16} color={theme.text.tertiary} />
                    <Text style={[styles.contactText, { color: theme.text.secondary }]}>
                      {customer.address}
                    </Text>
                  </View>
                )}
                {customer.notes && (
                  <Text style={[styles.customerNotes, { color: theme.text.secondary }]}>
                    {customer.notes}
                  </Text>
                )}
                {customer.lastPurchaseDate && (
                  <Text style={[styles.lastPurchase, { color: theme.text.tertiary }]}>
                    Last purchase: {new Date(customer.lastPurchaseDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Customer Detail Modal */}
      <Modal visible={showCustomerDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {selectedCustomer?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerDetail(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {customerAnalytics && (
                <>
                  {/* Customer Stats */}
                  <View style={[styles.statsCard, { backgroundColor: theme.background.secondary }]}>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <DollarSign size={20} color={theme.accent.success} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {formatCurrency(customerAnalytics.lifetimeValue)}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Lifetime Value</Text>
                      </View>
                      <View style={styles.statItem}>
                        <FileText size={20} color={theme.accent.primary} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {customerAnalytics.totalOrders}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Orders</Text>
                      </View>
                      <View style={styles.statItem}>
                        <TrendingUp size={20} color={theme.accent.success} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {formatCurrency(customerAnalytics.avgOrderValue)}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Avg Order</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Clock size={20} color={theme.accent.info} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {customerAnalytics.paymentRate.toFixed(0)}%
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Payment Rate</Text>
                      </View>
                    </View>
                  </View>

                  {/* Purchase History */}
                  {customerAnalytics.purchaseHistory.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Purchase History</Text>
                      {customerAnalytics.purchaseHistory.map((doc) => (
                        <View key={doc.id} style={[styles.historyItem, { backgroundColor: theme.background.secondary }]}>
                          <View style={styles.historyLeft}>
                            <Text style={[styles.historyDocNumber, { color: theme.text.primary }]}>
                              {doc.documentNumber}
                            </Text>
                            <Text style={[styles.historyDate, { color: theme.text.secondary }]}>
                              {new Date(doc.date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.historyRight}>
                            <Text style={[styles.historyAmount, { color: theme.accent.success }]}>
                              {formatCurrency(doc.total)}
                            </Text>
                            <View style={[styles.historyStatus, { backgroundColor: doc.status === 'paid' ? '#D1FAE5' : '#FEE2E2' }]}>
                              <Text style={[styles.historyStatusText, { color: doc.status === 'paid' ? '#065F46' : '#991B1B' }]}>
                                {doc.status}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                {editingId ? 'Edit Customer' : 'Add Customer'}
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
                  placeholder="Enter customer name"
                  placeholderTextColor={theme.text.tertiary}
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
                <Text style={[styles.label, { color: theme.text.primary }]}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this customer"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[styles.switchRow, { backgroundColor: theme.background.secondary }]}
                  onPress={() => setIsTaxExempt(!isTaxExempt)}
                >
                  <View>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Tax Exempt</Text>
                    <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                      This customer is exempt from tax
                    </Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: isTaxExempt ? theme.accent.primary : theme.text.tertiary }]}>
                    <View style={[styles.switchThumb, { backgroundColor: '#fff', transform: [{ translateX: isTaxExempt ? 20 : 0 }] }]} />
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
  customerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  customerDetails: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
  },
  customerNotes: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  lastPurchase: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '47%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  historyLeft: {
    flex: 1,
  },
  historyDocNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#64748B',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
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
  communicationLog: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  communicationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  communicationDate: {
    fontSize: 12,
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
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});

