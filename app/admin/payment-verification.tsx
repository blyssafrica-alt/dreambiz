import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, X, Eye, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import type { Payment } from '@/types/payments';

export default function PaymentVerificationScreen() {
  const { theme } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (!isSuperAdmin) {
      Alert.alert('Access Denied', 'Only super admins can access this page');
      router.back();
      return;
    }
    loadPayments();
  }, [filter, isSuperAdmin]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('verification_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setPayments(data.map((row: any) => ({
          id: row.id,
          documentId: row.document_id,
          amount: Number(row.amount),
          currency: row.currency as any,
          paymentDate: row.payment_date,
          paymentMethod: row.payment_method as any,
          reference: row.reference || undefined,
          notes: row.notes || undefined,
          proofOfPaymentUrl: row.proof_of_payment_url || undefined,
          verificationStatus: row.verification_status || 'pending',
          verifiedBy: row.verified_by || undefined,
          verifiedAt: row.verified_at || undefined,
          verificationNotes: row.verification_notes || undefined,
          createdAt: row.created_at,
        })));
      }
    } catch (error: any) {
      console.error('Failed to load payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (payment: Payment, status: 'approved' | 'rejected') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          verification_status: status,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes || null,
        })
        .eq('id', payment.id);

      if (error) throw error;

      // If approved, update document status
      if (status === 'approved') {
        const { data: document } = await supabase
          .from('documents')
          .select('*')
          .eq('id', payment.documentId)
          .single();

        if (document) {
          const totalPaid = await getDocumentPaidAmount(payment.documentId);
          if (totalPaid >= document.total) {
            await supabase
              .from('documents')
              .update({ status: 'paid' })
              .eq('id', payment.documentId);
          }
        }
      }

      setShowModal(false);
      setSelectedPayment(null);
      setVerificationNotes('');
      await loadPayments();
      Alert.alert('Success', `Payment ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify payment');
    }
  };

  const getDocumentPaidAmount = async (documentId: string): Promise<number> => {
    const { data } = await supabase
      .from('payments')
      .select('amount')
      .eq('document_id', documentId)
      .eq('verification_status', 'approved');

    if (!data) return 0;
    return data.reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const openPaymentModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setVerificationNotes(payment.verificationNotes || '');
    setShowModal(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      default:
        return Clock;
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.verificationStatus === filter;
  });

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Payment Verification', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Payment Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.background.card }]}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === filterOption ? theme.accent.primary : theme.background.secondary,
                borderColor: filter === filterOption ? theme.accent.primary : theme.border.light,
              }
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterTabText,
              { color: filter === filterOption ? '#FFF' : theme.text.primary }
            ]}>
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
            {filterOption !== 'all' && (
              <View style={[styles.badge, { backgroundColor: filter === filterOption ? '#FFF' : theme.accent.primary }]}>
                <Text style={[styles.badgeText, { color: filter === filterOption ? theme.accent.primary : '#FFF' }]}>
                  {payments.filter(p => p.verificationStatus === filterOption).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : filteredPayments.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            No {filter === 'all' ? '' : filter} payments found
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {filteredPayments.map((payment) => {
            const StatusIcon = getStatusIcon(payment.verificationStatus);
            const statusColor = getStatusColor(payment.verificationStatus);

            return (
              <TouchableOpacity
                key={payment.id}
                style={[styles.paymentCard, { backgroundColor: theme.background.card }]}
                onPress={() => openPaymentModal(payment)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, { color: theme.text.primary }]}>
                      {payment.currency} {payment.amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.paymentMethod, { color: theme.text.secondary }]}>
                      {payment.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <Text style={[styles.paymentDate, { color: theme.text.tertiary }]}>
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <StatusIcon size={20} color={statusColor} />
                  </View>
                </View>
                {payment.reference && (
                  <Text style={[styles.paymentReference, { color: theme.text.secondary }]}>
                    Ref: {payment.reference}
                  </Text>
                )}
                {payment.proofOfPaymentUrl && (
                  <View style={styles.proofIndicator}>
                    <Eye size={16} color={theme.accent.primary} />
                    <Text style={[styles.proofText, { color: theme.accent.primary }]}>
                      Proof attached
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Payment Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            {selectedPayment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Payment Details</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <X size={24} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Amount</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedPayment.currency} {selectedPayment.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Method</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedPayment.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {new Date(selectedPayment.paymentDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedPayment.reference && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Reference</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedPayment.reference}
                      </Text>
                    </View>
                  )}
                  {selectedPayment.notes && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Notes</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedPayment.notes}
                      </Text>
                    </View>
                  )}

                  {selectedPayment.proofOfPaymentUrl && (
                    <View style={styles.proofSection}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Proof of Payment</Text>
                      <Image
                        source={{ uri: selectedPayment.proofOfPaymentUrl }}
                        style={styles.proofImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Verification Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={verificationNotes}
                      onChangeText={setVerificationNotes}
                      placeholder="Add notes about verification..."
                      placeholderTextColor={theme.text.tertiary}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.rejectButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleVerify(selectedPayment, 'rejected')}
                  >
                    <X size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleVerify(selectedPayment, 'approved')}
                  >
                    <Check size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentReference: {
    fontSize: 12,
    marginTop: 8,
  },
  proofIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  proofText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    maxHeight: 500,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  proofSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  proofImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  inputGroup: {
    marginTop: 20,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

