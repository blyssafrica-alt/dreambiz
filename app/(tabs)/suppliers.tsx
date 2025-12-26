import { Stack } from 'expo-router';
import { 
  Plus, 
  Truck,
  Edit2,
  Trash2,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  Eye,
  FileText,
  DollarSign,
  TrendingUp,
  Clock
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
import type { Supplier } from '@/types/business';

export default function SuppliersScreen() {
  const { business, suppliers, documents, addSupplier, updateSupplier, deleteSupplier } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDetail, setShowSupplierDetail] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery) ||
      s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  // Supplier analytics
  const supplierAnalytics = useMemo(() => {
    if (!selectedSupplier) return null;

    // Find purchase orders and supplier agreements for this supplier
    const supplierDocs = documents.filter(doc =>
      (doc.type === 'purchase_order' || doc.type === 'supplier_agreement') &&
      (doc.customerName.toLowerCase() === selectedSupplier.name.toLowerCase() ||
       (selectedSupplier.email && doc.customerEmail?.toLowerCase() === selectedSupplier.email.toLowerCase()) ||
       (selectedSupplier.phone && doc.customerPhone === selectedSupplier.phone))
    );

    // Calculate total spend
    const totalSpend = supplierDocs.reduce((sum, doc) => sum + doc.total, 0);

    // Order history
    const orderHistory = supplierDocs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Average order value
    const avgOrderValue = supplierDocs.length > 0 
      ? totalSpend / supplierDocs.length 
      : 0;

    // Last order date
    const lastOrder = supplierDocs.length > 0
      ? supplierDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : null;

    // On-time delivery rate (would need delivery tracking, for now use paid status as proxy)
    const paidOrders = supplierDocs.filter(d => d.status === 'paid');
    const deliveryRate = supplierDocs.length > 0 
      ? (paidOrders.length / supplierDocs.length) * 100 
      : 0;

    return {
      totalSpend,
      orderHistory,
      avgOrderValue,
      totalOrders: supplierDocs.length,
      lastOrder,
      deliveryRate,
      paidOrders: paidOrders.length,
    };
  }, [selectedSupplier, documents]);

  const handleSave = async () => {
    if (!name) {
      RNAlert.alert('Missing Fields', 'Please enter supplier name');
      return;
    }

    try {
      if (editingId) {
        await updateSupplier(editingId, {
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          contactPerson: contactPerson || undefined,
          paymentTerms: paymentTerms || undefined,
          notes: notes || undefined,
        });
      } else {
        await addSupplier({
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          contactPerson: contactPerson || undefined,
          paymentTerms: paymentTerms || undefined,
          notes: notes || undefined,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Supplier updated' : 'Supplier added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setName(supplier.name);
    setEmail(supplier.email || '');
    setPhone(supplier.phone || '');
    setAddress(supplier.address || '');
    setContactPerson(supplier.contactPerson || '');
    setPaymentTerms(supplier.paymentTerms || '');
    setNotes(supplier.notes || '');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Supplier',
      'Are you sure you want to delete this supplier?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete supplier');
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
    setContactPerson('');
    setPaymentTerms('');
    setNotes('');
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
      <Stack.Screen options={{ title: 'Suppliers', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Suppliers</Text>
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
            placeholder="Search suppliers..."
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
        {filteredSuppliers.length === 0 ? (
          <View style={styles.emptyState}>
            <Truck size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              {suppliers.length === 0 ? 'No suppliers yet' : 'No suppliers match your search'}
            </Text>
            {suppliers.length === 0 && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
                onPress={() => setShowModal(true)}
              >
                <Text style={styles.emptyButtonText}>Add Your First Supplier</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredSuppliers.map(supplier => (
            <View
              key={supplier.id}
              style={[styles.supplierCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.supplierHeader}>
                <View style={styles.supplierInfo}>
                  <Text style={[styles.supplierName, { color: theme.text.primary }]}>
                    {supplier.name}
                  </Text>
                  {supplier.totalPurchases > 0 && (
                    <Text style={[styles.supplierTotal, { color: theme.accent.primary }]}>
                      Total: {formatCurrency(supplier.totalPurchases)}
                    </Text>
                  )}
                </View>
                <View style={styles.supplierActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(supplier)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(supplier.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.supplierDetails}>
                {supplier.contactPerson && (
                  <View style={styles.contactRow}>
                    <User size={16} color={theme.text.tertiary} />
                    <Text style={[styles.contactText, { color: theme.text.secondary }]}>
                      {supplier.contactPerson}
                    </Text>
                  </View>
                )}
                {supplier.phone && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleCall(supplier.phone!)}
                  >
                    <Phone size={16} color={theme.accent.primary} />
                    <Text style={[styles.contactText, { color: theme.accent.primary }]}>
                      {supplier.phone}
                    </Text>
                  </TouchableOpacity>
                )}
                {supplier.email && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleEmail(supplier.email!)}
                  >
                    <Mail size={16} color={theme.accent.primary} />
                    <Text style={[styles.contactText, { color: theme.accent.primary }]}>
                      {supplier.email}
                    </Text>
                  </TouchableOpacity>
                )}
                {supplier.address && (
                  <View style={styles.contactRow}>
                    <MapPin size={16} color={theme.text.tertiary} />
                    <Text style={[styles.contactText, { color: theme.text.secondary }]}>
                      {supplier.address}
                    </Text>
                  </View>
                )}
                {supplier.paymentTerms && (
                  <View style={[styles.paymentTerms, { backgroundColor: theme.background.secondary }]}>
                    <Text style={[styles.paymentTermsLabel, { color: theme.text.tertiary }]}>Payment Terms:</Text>
                    <Text style={[styles.paymentTermsValue, { color: theme.text.primary }]}>
                      {supplier.paymentTerms}
                    </Text>
                  </View>
                )}
                {supplier.notes && (
                  <Text style={[styles.supplierNotes, { color: theme.text.secondary }]}>
                    {supplier.notes}
                  </Text>
                )}
                {supplier.lastPurchaseDate && (
                  <Text style={[styles.lastPurchase, { color: theme.text.tertiary }]}>
                    Last purchase: {new Date(supplier.lastPurchaseDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Supplier Detail Modal */}
      <Modal visible={showSupplierDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {selectedSupplier?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowSupplierDetail(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {supplierAnalytics && (
                <>
                  {/* Supplier Stats */}
                  <View style={[styles.statsCard, { backgroundColor: theme.background.secondary }]}>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <DollarSign size={20} color={theme.accent.primary} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {formatCurrency(supplierAnalytics.totalSpend)}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Spend</Text>
                      </View>
                      <View style={styles.statItem}>
                        <FileText size={20} color={theme.accent.info} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {supplierAnalytics.totalOrders}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Orders</Text>
                      </View>
                      <View style={styles.statItem}>
                        <TrendingUp size={20} color={theme.accent.success} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {formatCurrency(supplierAnalytics.avgOrderValue)}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Avg Order</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Clock size={20} color={theme.accent.info} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {supplierAnalytics.deliveryRate.toFixed(0)}%
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Delivery Rate</Text>
                      </View>
                    </View>
                  </View>

                  {/* Order History */}
                  {supplierAnalytics.orderHistory.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Order History</Text>
                      {supplierAnalytics.orderHistory.map((doc) => (
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
                            <Text style={[styles.historyAmount, { color: theme.accent.primary }]}>
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
                {editingId ? 'Edit Supplier' : 'Add Supplier'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Supplier Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter supplier name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Contact Person</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={contactPerson}
                  onChangeText={setContactPerson}
                  placeholder="Enter contact person name"
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
                <Text style={[styles.label, { color: theme.text.primary }]}>Payment Terms</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={paymentTerms}
                  onChangeText={setPaymentTerms}
                  placeholder="e.g., Net 30, COD, etc."
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this supplier"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
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
  supplierCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  supplierTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  supplierActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  supplierDetails: {
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
  paymentTerms: {
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  paymentTermsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  paymentTermsValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  supplierNotes: {
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
});

