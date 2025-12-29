import { Stack, router } from 'expo-router';
import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PendingPaymentsScreen() {
  const { theme } = useTheme();
  const { documents = [] } = useBusiness();

  const safeDocuments = Array.isArray(documents) ? documents : [];
  
  const pendingPayments = useMemo(() => {
    return safeDocuments
      .filter(d => {
        if (d?.type !== 'invoice') return false;
        if (d?.status === 'paid' || d?.status === 'cancelled') return false;
        return true;
      })
      .map(doc => {
        const outstanding = (doc.total || 0) - (doc.paidAmount || 0);
        return {
          ...doc,
          outstandingAmount: outstanding,
        };
      })
      .filter(doc => doc.outstandingAmount > 0)
      .sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return dateA - dateB;
      });
  }, [safeDocuments]);

  const totalPending = pendingPayments.reduce((sum, doc) => sum + doc.outstandingAmount, 0);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Pending Payments', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Pending Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
          <View style={styles.summaryContent}>
            <Calendar size={24} color="#F59E0B" />
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Total Pending</Text>
              <Text style={[styles.summaryAmount, { color: theme.text.primary }]}>
                {formatCurrency(totalPending, pendingPayments[0]?.currency || 'USD')}
              </Text>
            </View>
          </View>
          <Text style={[styles.summaryCount, { color: theme.text.secondary }]}>
            {pendingPayments.length} invoice{pendingPayments.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Pending Payments List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Pending Invoices ({pendingPayments.length})
          </Text>
          {pendingPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No pending payments</Text>
              <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                All invoices are paid or cancelled
              </Text>
            </View>
          ) : (
            pendingPayments.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.paymentCard, { backgroundColor: theme.background.card }]}
                onPress={() => router.push(`/document/${doc.id}` as any)}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentTitle, { color: theme.text.primary }]}>
                      {doc.number || doc.id}
                    </Text>
                    <Text style={[styles.paymentCustomer, { color: theme.text.secondary }]}>
                      {doc.customerName || 'Unknown Customer'}
                    </Text>
                    <Text style={[styles.paymentDate, { color: theme.text.tertiary }]}>
                      Due: {formatDate(doc.dueDate)}
                    </Text>
                  </View>
                  <View style={styles.paymentAmount}>
                    <Text style={[styles.amountText, { color: theme.accent.primary }]}>
                      {formatCurrency(doc.outstandingAmount, doc.currency || 'USD')}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={[styles.statusText, { color: '#F59E0B' }]}>PENDING</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryCount: {
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
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
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

