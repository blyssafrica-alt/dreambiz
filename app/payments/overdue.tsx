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
import { ArrowLeft, AlertTriangle, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OverduePaymentsScreen() {
  const { theme } = useTheme();
  const { documents = [] } = useBusiness();

  const safeDocuments = Array.isArray(documents) ? documents : [];
  
  const overduePayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return safeDocuments
      .filter(d => {
        if (d?.type !== 'invoice') return false;
        if (d?.status === 'paid' || d?.status === 'cancelled') return false;
        if (!d?.dueDate) return false;
        return new Date(d.dueDate) < today;
      })
      .map(doc => {
        const outstanding = (doc.total || 0) - (doc.paidAmount || 0);
        const dueDate = new Date(doc.dueDate!);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...doc,
          outstandingAmount: outstanding,
          daysOverdue,
        };
      })
      .filter(doc => doc.outstandingAmount > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [safeDocuments]);

  const totalOverdue = overduePayments.reduce((sum, doc) => sum + doc.outstandingAmount, 0);

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
      <Stack.Screen options={{ title: 'Overdue Payments', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Overdue Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: '#EF444420', borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
          <View style={styles.summaryContent}>
            <AlertTriangle size={24} color="#EF4444" />
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Total Overdue</Text>
              <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
                {formatCurrency(totalOverdue, overduePayments[0]?.currency || 'USD')}
              </Text>
            </View>
          </View>
          <Text style={[styles.summaryCount, { color: theme.text.secondary }]}>
            {overduePayments.length} invoice{overduePayments.length !== 1 ? 's' : ''} overdue
          </Text>
        </View>

        {/* Overdue Payments List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Overdue Invoices ({overduePayments.length})
          </Text>
          {overduePayments.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertTriangle size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No overdue payments</Text>
              <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                All invoices are up to date
              </Text>
            </View>
          ) : (
            overduePayments.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.paymentCard, { backgroundColor: theme.background.card, borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}
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
                    <View style={styles.paymentMeta}>
                      <Text style={[styles.paymentDate, { color: '#EF4444' }]}>
                        Due: {formatDate(doc.dueDate)}
                      </Text>
                      <Text style={[styles.daysOverdue, { color: '#EF4444' }]}>
                        {doc.daysOverdue} day{doc.daysOverdue !== 1 ? 's' : ''} overdue
                      </Text>
                    </View>
                  </View>
                  <View style={styles.paymentAmount}>
                    <Text style={[styles.amountText, { color: '#EF4444' }]}>
                      {formatCurrency(doc.outstandingAmount, doc.currency || 'USD')}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}>
                      <Text style={[styles.statusText, { color: '#EF4444' }]}>OVERDUE</Text>
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
  paymentMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysOverdue: {
    fontSize: 12,
    fontWeight: '600',
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

