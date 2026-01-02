import { Stack, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
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

interface SubscriptionPayment {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name?: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  reference?: string;
  notes?: string;
  proof_of_payment_url?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  created_at: string;
}

interface BookPurchase {
  id: string;
  book_id: string;
  book_title?: string;
  user_id: string;
  user_email?: string;
  business_id: string;
  unit_price: number;
  total_price: number;
  currency: string;
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_reference?: string;
  payment_notes?: string;
  proof_of_payment_url?: string;
  access_granted: boolean;
  access_granted_at?: string;
  created_at: string;
  updated_at: string;
}

export default function PaymentVerificationScreen() {
  const { theme } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]);
  const [bookPurchases, setBookPurchases] = useState<BookPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedSubPayment, setSelectedSubPayment] = useState<SubscriptionPayment | null>(null);
  const [selectedBookPurchase, setSelectedBookPurchase] = useState<BookPurchase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'refunded'>('pending');
  const [viewMode, setViewMode] = useState<'documents' | 'subscriptions' | 'books'>('documents');
  const [subViewMode, setSubViewMode] = useState<'books' | 'subscriptions'>('books');

  const loadSubscriptionPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading subscription payments with filter:', filter);
      console.log('Current user:', user?.id, 'isSuperAdmin:', isSuperAdmin);
      
      let query = supabase
        .from('subscription_payments')
        .select('*, subscription_plans(name)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('verification_status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Subscription payments query error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('Subscription payments loaded:', data?.length || 0, 'payments');

      if (data) {
        const mappedPayments = data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          plan_id: row.plan_id,
          plan_name: row.subscription_plans?.name || 'Unknown Plan',
          amount: Number(row.amount),
          currency: row.currency,
          payment_method: row.payment_method,
          payment_date: row.payment_date,
          reference: row.reference || undefined,
          notes: row.notes || undefined,
          proof_of_payment_url: row.proof_of_payment_url || undefined,
          verification_status: row.verification_status || 'pending',
          verified_by: row.verified_by || undefined,
          verified_at: row.verified_at || undefined,
          verification_notes: row.verification_notes || undefined,
          created_at: row.created_at,
        }));
        
        console.log('Mapped subscription payments:', mappedPayments.length);
        setSubscriptionPayments(mappedPayments);
      } else {
        console.log('No subscription payments data returned');
        setSubscriptionPayments([]);
      }
    } catch (error: any) {
      console.error('Failed to load subscription payments:', error);
      const errorMessage = error?.message || 'Failed to load subscription payments';
      const errorDetails = error?.code ? ` (Code: ${error.code})` : '';
      Alert.alert('Error', `${errorMessage}${errorDetails}\n\nPlease check:\n1. RLS policies are set correctly\n2. is_super_admin() function exists\n3. You have super admin access`);
      setSubscriptionPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const loadPayments = useCallback(async () => {
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
  }, [filter]);

  const loadBookPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading book purchases with filter:', filter);
      
      let query = supabase
        .from('book_purchases')
        .select(`
          *,
          books(title),
          users(email)
        `)
        .order('created_at', { ascending: false });

      // Map filter to payment_status for book purchases
      if (filter !== 'all') {
        if (filter === 'pending') {
          query = query.eq('payment_status', 'pending');
        } else if (filter === 'approved' || filter === 'completed') {
          query = query.eq('payment_status', 'completed');
        } else if (filter === 'rejected' || filter === 'failed') {
          query = query.in('payment_status', ['failed', 'refunded']);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Book purchases query error:', error);
        throw error;
      }

      console.log('Book purchases loaded:', data?.length || 0, 'purchases');

      if (data) {
        const mappedPurchases = data.map((row: any) => ({
          id: row.id,
          book_id: row.book_id,
          book_title: row.books?.title || 'Unknown Book',
          user_id: row.user_id,
          user_email: row.users?.email || undefined,
          business_id: row.business_id,
          unit_price: Number(row.unit_price),
          total_price: Number(row.total_price),
          currency: row.currency,
          payment_method: row.payment_method || undefined,
          payment_status: row.payment_status || 'pending',
          payment_reference: row.payment_reference || undefined,
          payment_notes: row.payment_notes || undefined,
          proof_of_payment_url: row.proof_of_payment_url || undefined,
          access_granted: row.access_granted || false,
          access_granted_at: row.access_granted_at || undefined,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
        
        setBookPurchases(mappedPurchases);
      } else {
        setBookPurchases([]);
      }
    } catch (error: any) {
      console.error('Failed to load book purchases:', error);
      Alert.alert('Error', 'Failed to load book purchases');
      setBookPurchases([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isSuperAdmin) {
      Alert.alert('Access Denied', 'Only super admins can access this page');
      router.back();
      return;
    }
    
    // Load all types of payments when component mounts or filter changes
    // This ensures data is available when switching tabs
    loadPayments();
    loadSubscriptionPayments();
    loadBookPurchases();
  }, [filter, isSuperAdmin, loadPayments, loadSubscriptionPayments, loadBookPurchases]);

  // Reload when viewMode changes
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    if (viewMode === 'documents') {
      loadPayments();
    } else if (viewMode === 'subscriptions') {
      loadSubscriptionPayments();
    } else if (viewMode === 'books') {
      loadBookPurchases();
    }
  }, [viewMode, isSuperAdmin, loadPayments, loadSubscriptionPayments, loadBookPurchases]);

  const handleVerifySubscription = async (payment: SubscriptionPayment, status: 'approved' | 'rejected') => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('subscription_payments')
        .update({
          verification_status: status,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes || null,
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      if (status === 'approved') {
        const endDate = new Date();
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('billing_period')
          .eq('id', payment.plan_id)
          .single();

        if (planData?.billing_period === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (planData?.billing_period === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (planData?.billing_period === 'lifetime') {
          endDate.setFullYear(endDate.getFullYear() + 100);
        }

        const { data: subscriptionData, error: subError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: payment.user_id,
            plan_id: payment.plan_id,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: planData?.billing_period === 'lifetime' ? null : endDate.toISOString(),
            auto_renew: false,
            price_paid: payment.amount,
            payment_method: payment.payment_method,
            payment_status: 'completed',
          })
          .select()
          .single();

        if (subError) throw subError;

        await supabase
          .from('subscription_payments')
          .update({ subscription_id: subscriptionData.id })
          .eq('id', payment.id);
      }

      setShowModal(false);
      setSelectedSubPayment(null);
      setVerificationNotes('');
      await loadSubscriptionPayments();
      Alert.alert('Success', `Subscription payment ${status === 'approved' ? 'approved and subscription activated' : 'rejected'} successfully`);
    } catch (error: any) {
      console.error('Failed to verify subscription payment:', error);
      Alert.alert('Error', error.message || 'Failed to verify subscription payment');
    }
  };

  const handleVerifyBookPurchase = async (purchase: BookPurchase, status: 'completed' | 'failed' | 'refunded') => {
    if (!user) return;

    try {
      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString(),
      };

      // If completing the purchase, grant access
      if (status === 'completed') {
        updateData.access_granted = true;
        updateData.access_granted_at = new Date().toISOString();
      }

      if (verificationNotes) {
        updateData.payment_notes = verificationNotes;
      }

      const { error: updateError } = await supabase
        .from('book_purchases')
        .update(updateData)
        .eq('id', purchase.id);

      if (updateError) throw updateError;

      // The trigger will update book sales stats automatically when payment_status = 'completed'

      setShowModal(false);
      setSelectedBookPurchase(null);
      setVerificationNotes('');
      await loadBookPurchases();
      Alert.alert('Success', `Book purchase ${status === 'completed' ? 'approved and access granted' : status === 'failed' ? 'marked as failed' : 'refunded'} successfully`);
    } catch (error: any) {
      console.error('Failed to verify book purchase:', error);
      Alert.alert('Error', error.message || 'Failed to verify book purchase');
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
    setSelectedSubPayment(null);
    setSelectedBookPurchase(null);
    setVerificationNotes(payment.verificationNotes || '');
    setShowModal(true);
  };

  const openSubPaymentModal = (payment: SubscriptionPayment) => {
    setSelectedSubPayment(payment);
    setSelectedPayment(null);
    setSelectedBookPurchase(null);
    setVerificationNotes(payment.verification_notes || '');
    setShowModal(true);
  };

  const openBookPurchaseModal = (purchase: BookPurchase) => {
    setSelectedBookPurchase(purchase);
    setSelectedPayment(null);
    setSelectedSubPayment(null);
    setVerificationNotes(purchase.payment_notes || '');
    setShowModal(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return '#10B981';
      case 'rejected':
      case 'failed':
      case 'refunded':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return CheckCircle;
      case 'rejected':
      case 'failed':
      case 'refunded':
        return XCircle;
      default:
        return Clock;
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.verificationStatus === filter;
  });

  const filteredSubPayments = subscriptionPayments.filter(p => {
    if (filter === 'all') return true;
    return p.verification_status === filter;
  });

  const filteredBookPurchases = bookPurchases.filter(p => {
    if (filter === 'all') return true;
    // Map filter to payment_status for book purchases
    if (filter === 'pending') return p.payment_status === 'pending';
    if (filter === 'approved' || filter === 'completed') return p.payment_status === 'completed';
    if (filter === 'rejected' || filter === 'failed') return p.payment_status === 'failed';
    if (filter === 'refunded') return p.payment_status === 'refunded';
    return false;
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

      {/* View Mode Toggle - Simplified */}
      <View style={[styles.viewModeContainer, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity
          style={[
            styles.viewModeTab,
            {
              backgroundColor: viewMode === 'documents' ? theme.accent.primary : theme.background.secondary,
            },
          ]}
          onPress={() => setViewMode('documents')}
        >
          <Text
            style={[
              styles.viewModeTabText,
              { color: viewMode === 'documents' ? '#FFF' : theme.text.primary },
            ]}
          >
            Customer Payments
          </Text>
          <Text
            style={[
              styles.viewModeTabSubtext,
              { color: viewMode === 'documents' ? 'rgba(255,255,255,0.8)' : theme.text.tertiary },
            ]}
          >
            Invoice/Receipt payments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeTab,
            {
              backgroundColor: viewMode === 'books' ? theme.accent.primary : theme.background.secondary,
            },
          ]}
          onPress={() => {
            // When selecting platform payments, default to books
            if (viewMode === 'documents') {
              setViewMode('books');
              setSubViewMode('books');
            }
          }}
        >
          <Text
            style={[
              styles.viewModeTabText,
              { color: (viewMode === 'books' || viewMode === 'subscriptions') ? '#FFF' : theme.text.primary },
            ]}
          >
            Platform Payments
          </Text>
          <Text
            style={[
              styles.viewModeTabSubtext,
              { color: (viewMode === 'books' || viewMode === 'subscriptions') ? 'rgba(255,255,255,0.8)' : theme.text.tertiary },
            ]}
            >
            Books & Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-category selector for Platform Payments */}
      {(viewMode === 'books' || viewMode === 'subscriptions') && (
        <View style={[styles.subModeContainer, { backgroundColor: theme.background.secondary }]}>
          <TouchableOpacity
            style={[
              styles.subModeTab,
              {
                backgroundColor: subViewMode === 'books' ? theme.accent.primary : 'transparent',
                borderBottomColor: subViewMode === 'books' ? theme.accent.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setSubViewMode('books');
              setViewMode('books');
            }}
          >
            <Text
              style={[
                styles.subModeTabText,
                { color: subViewMode === 'books' ? '#FFF' : theme.text.secondary },
              ]}
            >
              Books
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subModeTab,
              {
                backgroundColor: subViewMode === 'subscriptions' ? theme.accent.primary : 'transparent',
                borderBottomColor: subViewMode === 'subscriptions' ? theme.accent.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setSubViewMode('subscriptions');
              setViewMode('subscriptions');
            }}
          >
            <Text
              style={[
                styles.subModeTabText,
                { color: subViewMode === 'subscriptions' ? '#FFF' : theme.text.secondary },
              ]}
            >
              Subscriptions
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: theme.background.card }]}>
        {(viewMode === 'books' 
          ? ['all', 'pending', 'completed', 'failed', 'refunded'] as const
          : ['all', 'pending', 'approved', 'rejected'] as const
        ).map((filterOption) => (
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
                  {viewMode === 'documents'
                    ? payments.filter(p => p.verificationStatus === filterOption).length
                    : viewMode === 'subscriptions'
                    ? subscriptionPayments.filter(p => p.verification_status === filterOption).length
                    : bookPurchases.filter(p => {
                        if (filterOption === 'pending') return p.payment_status === 'pending';
                        if (filterOption === 'completed') return p.payment_status === 'completed';
                        if (filterOption === 'failed') return p.payment_status === 'failed';
                        if (filterOption === 'refunded') return p.payment_status === 'refunded';
                        return false;
                      }).length}
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
      ) : viewMode === 'documents' && filteredPayments.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            No {filter === 'all' ? '' : filter} payments found
          </Text>
        </View>
      ) : viewMode === 'subscriptions' && filteredSubPayments.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            No {filter === 'all' ? '' : filter} subscription payments found
          </Text>
        </View>
      ) : viewMode === 'books' && filteredBookPurchases.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            No {filter === 'all' ? '' : filter} book purchases found
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {viewMode === 'documents' ? filteredPayments.map((payment) => {
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
          }) : viewMode === 'subscriptions' ? filteredSubPayments.map((payment) => {
            const StatusIcon = getStatusIcon(payment.verification_status);
            const statusColor = getStatusColor(payment.verification_status);

            return (
              <TouchableOpacity
                key={payment.id}
                style={[styles.paymentCard, { backgroundColor: theme.background.card }]}
                onPress={() => openSubPaymentModal(payment)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, { color: theme.text.primary }]}>
                      {payment.currency} {payment.amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.paymentMethod, { color: theme.accent.primary }]}>
                      {payment.plan_name}
                    </Text>
                    <Text style={[styles.paymentMethod, { color: theme.text.secondary }]}>
                      {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <Text style={[styles.paymentDate, { color: theme.text.tertiary }]}>
                      {new Date(payment.payment_date).toLocaleDateString()}
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
                {payment.proof_of_payment_url && (
                  <View style={styles.proofIndicator}>
                    <Eye size={16} color={theme.accent.primary} />
                    <Text style={[styles.proofText, { color: theme.accent.primary }]}>
                      Proof attached
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }) : filteredBookPurchases.map((purchase) => {
            const StatusIcon = getStatusIcon(purchase.payment_status);
            const statusColor = getStatusColor(purchase.payment_status);

            return (
              <TouchableOpacity
                key={purchase.id}
                style={[styles.paymentCard, { backgroundColor: theme.background.card }]}
                onPress={() => openBookPurchaseModal(purchase)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, { color: theme.text.primary }]}>
                      {purchase.currency} {purchase.total_price.toFixed(2)}
                    </Text>
                    <Text style={[styles.paymentMethod, { color: theme.accent.primary }]}>
                      {purchase.book_title}
                    </Text>
                    {purchase.payment_method && (
                      <Text style={[styles.paymentMethod, { color: theme.text.secondary }]}>
                        {purchase.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    )}
                    <Text style={[styles.paymentDate, { color: theme.text.tertiary }]}>
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <StatusIcon size={20} color={statusColor} />
                  </View>
                </View>
                {purchase.payment_reference && (
                  <Text style={[styles.paymentReference, { color: theme.text.secondary }]}>
                    Ref: {purchase.payment_reference}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  {purchase.proof_of_payment_url && (
                    <View style={styles.proofIndicator}>
                      <Eye size={16} color={theme.accent.primary} />
                      <Text style={[styles.proofText, { color: theme.accent.primary }]}>
                        Proof attached
                      </Text>
                    </View>
                  )}
                  {purchase.access_granted && (
                    <View style={styles.proofIndicator}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={[styles.proofText, { color: '#10B981' }]}>
                        Access granted
                      </Text>
                    </View>
                  )}
                </View>
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
            {selectedSubPayment ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Subscription Payment Details</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <X size={24} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Plan</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedSubPayment.plan_name}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Amount</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedSubPayment.currency} {selectedSubPayment.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Method</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedSubPayment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {new Date(selectedSubPayment.payment_date).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedSubPayment.reference && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Reference</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedSubPayment.reference}
                      </Text>
                    </View>
                  )}
                  {selectedSubPayment.notes && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Notes</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedSubPayment.notes}
                      </Text>
                    </View>
                  )}

                  {selectedSubPayment.proof_of_payment_url && (
                    <View style={styles.proofSection}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Proof of Payment</Text>
                      <Image
                        source={{ uri: selectedSubPayment.proof_of_payment_url }}
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
                    onPress={() => handleVerifySubscription(selectedSubPayment, 'rejected')}
                  >
                    <X size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleVerifySubscription(selectedSubPayment, 'approved')}
                  >
                    <Check size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Approve & Activate</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : selectedBookPurchase ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Book Purchase Details</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <X size={24} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Book</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedBookPurchase.book_title}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Amount</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {selectedBookPurchase.currency} {selectedBookPurchase.total_price.toFixed(2)}
                    </Text>
                  </View>
                  {selectedBookPurchase.payment_method && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Method</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedBookPurchase.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Status</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(selectedBookPurchase.payment_status) }]}>
                      {selectedBookPurchase.payment_status.charAt(0).toUpperCase() + selectedBookPurchase.payment_status.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                      {new Date(selectedBookPurchase.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedBookPurchase.user_email && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>User</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedBookPurchase.user_email}
                      </Text>
                    </View>
                  )}
                  {selectedBookPurchase.payment_reference && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Reference</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedBookPurchase.payment_reference}
                      </Text>
                    </View>
                  )}
                  {selectedBookPurchase.payment_notes && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Notes</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {selectedBookPurchase.payment_notes}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Access Granted</Text>
                    <Text style={[styles.detailValue, { color: selectedBookPurchase.access_granted ? '#10B981' : '#F59E0B' }]}>
                      {selectedBookPurchase.access_granted ? 'Yes' : 'No'}
                    </Text>
                  </View>

                  {selectedBookPurchase.proof_of_payment_url && (
                    <View style={styles.proofSection}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Proof of Payment</Text>
                      <Image
                        source={{ uri: selectedBookPurchase.proof_of_payment_url }}
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
                  {selectedBookPurchase.payment_status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.rejectButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleVerifyBookPurchase(selectedBookPurchase, 'failed')}
                      >
                        <X size={20} color="#FFF" />
                        <Text style={styles.buttonText}>Mark Failed</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.approveButton, { backgroundColor: '#10B981' }]}
                        onPress={() => handleVerifyBookPurchase(selectedBookPurchase, 'completed')}
                      >
                        <Check size={20} color="#FFF" />
                        <Text style={styles.buttonText}>Approve & Grant Access</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedBookPurchase.payment_status === 'completed' && (
                    <TouchableOpacity
                      style={[styles.rejectButton, { backgroundColor: '#F59E0B', flex: 1 }]}
                      onPress={() => handleVerifyBookPurchase(selectedBookPurchase, 'refunded')}
                    >
                      <X size={20} color="#FFF" />
                      <Text style={styles.buttonText}>Mark as Refunded</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : selectedPayment && (
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
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  viewModeTab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewModeTabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  viewModeTabSubtext: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  subModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  subModeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderBottomWidth: 2,
    marginBottom: -1,
  },
  subModeTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
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
