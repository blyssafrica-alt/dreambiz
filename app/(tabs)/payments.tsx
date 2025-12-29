import { Stack } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { CreditCard, DollarSign, TrendingUp, Calendar, Filter, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function PaymentsScreen() {
  const { theme } = useTheme();
  const { documents = [] } = useBusiness();
  const router = useRouter();
  
  // Animation setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate payment statistics
  const totalPaid = documents
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + d.total, 0);

  const totalPending = documents
    .filter(d => d.status === 'sent' || d.status === 'draft')
    .reduce((sum, d) => sum + d.total, 0);

  const totalOverdue = documents
    .filter(d => {
      if (!d.dueDate || d.status === 'paid') return false;
      return new Date(d.dueDate) < new Date();
    })
    .reduce((sum, d) => sum + d.total, 0);

  const invoices = documents.filter(d => d.type === 'invoice');
  const receipts = documents.filter(d => d.type === 'receipt');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Payments"
          subtitle="Track and manage all payments"
          icon={DollarSign}
          iconGradient={['#10B981', '#059669']}
          rightAction={
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => router.push('/payments/add' as any)}
            >
              <Plus size={20} color="#FFF" />
            </TouchableOpacity>
          }
        />

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#10B98120' }]}>
                  <TrendingUp size={24} color="#10B981" />
                </View>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>
                  ${totalPaid.toFixed(2)}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Paid</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Calendar size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>
                  ${totalPending.toFixed(2)}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Pending</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#EF444420' }]}>
                  <CreditCard size={24} color="#EF4444" />
                </View>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>
                  ${totalOverdue.toFixed(2)}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Overdue</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Actions</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push('/payments/add' as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.accent.primary + '20' }]}>
                    <Plus size={24} color={theme.accent.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text.primary }]}>Record Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push('/payments/pending' as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Calendar size={24} color="#F59E0B" />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text.primary }]}>Pending Payments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push('/payments/overdue' as any)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: '#EF444420' }]}>
                    <CreditCard size={24} color="#EF4444" />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text.primary }]}>Overdue</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Payments */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Recent Payments</Text>
              {invoices.length === 0 && receipts.length === 0 ? (
                <View style={styles.emptyState}>
                  <CreditCard size={48} color={theme.text.tertiary} />
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No payments yet</Text>
                  <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                    Record your first payment to get started
                  </Text>
                </View>
              ) : (
                <View style={styles.paymentsList}>
                  {[...invoices, ...receipts]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((doc) => (
                      <TouchableOpacity
                        key={doc.id}
                        style={[styles.paymentCard, { backgroundColor: theme.background.card }]}
                        onPress={() => router.push(`/document/${doc.id}` as any)}
                      >
                        <View style={styles.paymentHeader}>
                          <View style={styles.paymentInfo}>
                            <Text style={[styles.paymentTitle, { color: theme.text.primary }]}>
                              {doc.documentNumber}
                            </Text>
                            <Text style={[styles.paymentCustomer, { color: theme.text.secondary }]}>
                              {doc.customerName}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.paymentStatus,
                              {
                                backgroundColor:
                                  doc.status === 'paid'
                                    ? '#10B98120'
                                    : doc.status === 'sent'
                                    ? '#F59E0B20'
                                    : '#64748B20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.paymentStatusText,
                                {
                                  color:
                                    doc.status === 'paid'
                                      ? '#10B981'
                                      : doc.status === 'sent'
                                      ? '#F59E0B'
                                      : '#64748B',
                                },
                              ]}
                            >
                              {doc.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.paymentFooter}>
                          <Text style={[styles.paymentDate, { color: theme.text.tertiary }]}>
                            {new Date(doc.date).toLocaleDateString()}
                          </Text>
                          <Text style={[styles.paymentAmount, { color: theme.text.primary }]}>
                            {doc.currency} {doc.total.toFixed(2)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  quickActionCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  paymentsList: {
    gap: 12,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
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
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentCustomer: {
    fontSize: 14,
  },
  paymentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paymentDate: {
    fontSize: 13,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

