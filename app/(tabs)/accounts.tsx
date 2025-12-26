import { Stack } from 'expo-router';
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  FileText
} from 'lucide-react-native';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { AccountsReceivable, AccountsPayable } from '@/types/payments';

export default function AccountsScreen() {
  const { business, documents } = useBusiness();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // Calculate Accounts Receivable (money owed to us)
  const accountsReceivable = useMemo(() => {
    const invoices = documents.filter(d => d.type === 'invoice' && d.status !== 'cancelled');
    
    return invoices.map(doc => {
      const isPaid = doc.status === 'paid';
      const paidAmount = isPaid ? doc.total : 0;
      const outstandingAmount = doc.total - paidAmount;
      
      let daysOverdue = 0;
      if (!isPaid && doc.dueDate) {
        const due = new Date(doc.dueDate);
        const today = new Date();
        daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      const status: 'current' | 'overdue' | 'paid' = isPaid ? 'paid' : (daysOverdue > 0 ? 'overdue' : 'current');
      
      return {
        documentId: doc.id,
        documentNumber: doc.documentNumber,
        customerName: doc.customerName,
        totalAmount: doc.total,
        paidAmount,
        outstandingAmount,
        currency: doc.currency,
        dueDate: doc.dueDate,
        daysOverdue,
        status,
      } as AccountsReceivable;
    }).filter(ar => ar.outstandingAmount > 0 || ar.status === 'overdue');
  }, [documents]);

  // Calculate Accounts Payable (money we owe)
  const accountsPayable = useMemo(() => {
    const purchaseOrders = documents.filter(d => 
      (d.type === 'purchase_order' || d.type === 'supplier_agreement') && 
      d.status !== 'cancelled'
    );
    
    return purchaseOrders.map(doc => {
      const isPaid = doc.status === 'paid';
      const paidAmount = isPaid ? doc.total : 0;
      const outstandingAmount = doc.total - paidAmount;
      
      let daysOverdue = 0;
      if (!isPaid && doc.dueDate) {
        const due = new Date(doc.dueDate);
        const today = new Date();
        daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      const status: 'current' | 'overdue' | 'paid' = isPaid ? 'paid' : (daysOverdue > 0 ? 'overdue' : 'current');
      
      return {
        documentId: doc.id,
        documentNumber: doc.documentNumber,
        supplierName: doc.customerName, // Using customerName field for supplier name
        totalAmount: doc.total,
        paidAmount,
        outstandingAmount,
        currency: doc.currency,
        dueDate: doc.dueDate,
        daysOverdue,
        status,
      } as AccountsPayable;
    }).filter(ap => ap.outstandingAmount > 0 || ap.status === 'overdue');
  }, [documents]);

  const receivableTotal = useMemo(() => 
    accountsReceivable.reduce((sum, ar) => sum + ar.outstandingAmount, 0),
    [accountsReceivable]
  );

  const payableTotal = useMemo(() => 
    accountsPayable.reduce((sum, ap) => sum + ap.outstandingAmount, 0),
    [accountsPayable]
  );

  const overdueReceivable = useMemo(() => 
    accountsReceivable.filter(ar => ar.status === 'overdue').reduce((sum, ar) => sum + ar.outstandingAmount, 0),
    [accountsReceivable]
  );

  const overduePayable = useMemo(() => 
    accountsPayable.filter(ap => ap.status === 'overdue').reduce((sum, ap) => sum + ap.outstandingAmount, 0),
    [accountsPayable]
  );

  const renderReceivableItem = (ar: AccountsReceivable) => (
    <View key={ar.documentId} style={[styles.itemCard, { backgroundColor: theme.background.card }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemLeft}>
          <Text style={[styles.itemNumber, { color: theme.text.primary }]}>
            {ar.documentNumber}
          </Text>
          <Text style={[styles.itemName, { color: theme.text.secondary }]}>
            {ar.customerName}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ar.status === 'paid' ? '#D1FAE5' : ar.status === 'overdue' ? '#FEE2E2' : '#DBEAFE' }]}>
          <Text style={[styles.statusText, { color: ar.status === 'paid' ? '#065F46' : ar.status === 'overdue' ? '#991B1B' : '#1E40AF' }]}>
            {ar.status === 'paid' ? 'Paid' : ar.status === 'overdue' ? 'Overdue' : 'Current'}
          </Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Total:</Text>
          <Text style={[styles.detailValue, { color: theme.text.primary }]}>
            {formatCurrency(ar.totalAmount)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Outstanding:</Text>
          <Text style={[styles.detailValue, { color: theme.accent.primary }]}>
            {formatCurrency(ar.outstandingAmount)}
          </Text>
        </View>
        {ar.dueDate && (
          <View style={styles.detailRow}>
            <Clock size={14} color={theme.text.tertiary} />
            <Text style={[styles.detailLabel, { color: theme.text.tertiary, marginLeft: 4 }]}>
              Due: {new Date(ar.dueDate).toLocaleDateString()}
              {ar.daysOverdue > 0 && ` (${ar.daysOverdue} days overdue)`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPayableItem = (ap: AccountsPayable) => (
    <View key={ap.documentId} style={[styles.itemCard, { backgroundColor: theme.background.card }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemLeft}>
          <Text style={[styles.itemNumber, { color: theme.text.primary }]}>
            {ap.documentNumber}
          </Text>
          <Text style={[styles.itemName, { color: theme.text.secondary }]}>
            {ap.supplierName}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ap.status === 'paid' ? '#D1FAE5' : ap.status === 'overdue' ? '#FEE2E2' : '#DBEAFE' }]}>
          <Text style={[styles.statusText, { color: ap.status === 'paid' ? '#065F46' : ap.status === 'overdue' ? '#991B1B' : '#1E40AF' }]}>
            {ap.status === 'paid' ? 'Paid' : ap.status === 'overdue' ? 'Overdue' : 'Current'}
          </Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Total:</Text>
          <Text style={[styles.detailValue, { color: theme.text.primary }]}>
            {formatCurrency(ap.totalAmount)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Outstanding:</Text>
          <Text style={[styles.detailValue, { color: theme.accent.danger }]}>
            {formatCurrency(ap.outstandingAmount)}
          </Text>
        </View>
        {ap.dueDate && (
          <View style={styles.detailRow}>
            <Clock size={14} color={theme.text.tertiary} />
            <Text style={[styles.detailLabel, { color: theme.text.tertiary, marginLeft: 4 }]}>
              Due: {new Date(ap.dueDate).toLocaleDateString()}
              {ap.daysOverdue > 0 && ` (${ap.daysOverdue} days overdue)`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Accounts', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Accounts</Text>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receivable' && styles.tabActive, { backgroundColor: activeTab === 'receivable' ? theme.accent.primary : 'transparent' }]}
          onPress={() => setActiveTab('receivable')}
        >
          <TrendingUp size={18} color={activeTab === 'receivable' ? '#FFF' : theme.text.secondary} />
          <Text style={[styles.tabText, { color: activeTab === 'receivable' ? '#FFF' : theme.text.secondary }]}>
            Receivable
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payable' && styles.tabActive, { backgroundColor: activeTab === 'payable' ? theme.accent.primary : 'transparent' }]}
          onPress={() => setActiveTab('payable')}
        >
          <TrendingDown size={18} color={activeTab === 'payable' ? '#FFF' : theme.text.secondary} />
          <Text style={[styles.tabText, { color: activeTab === 'payable' ? '#FFF' : theme.text.secondary }]}>
            Payable
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === 'receivable' ? (
          <>
            {/* Receivable Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Total Receivable</Text>
                  <Text style={[styles.summaryValue, { color: theme.accent.primary }]}>
                    {formatCurrency(receivableTotal)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Overdue</Text>
                  <Text style={[styles.summaryValue, { color: theme.accent.danger }]}>
                    {formatCurrency(overdueReceivable)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Receivable List */}
            {accountsReceivable.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                  No outstanding receivables
                </Text>
              </View>
            ) : (
              accountsReceivable.map(renderReceivableItem)
            )}
          </>
        ) : (
          <>
            {/* Payable Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Total Payable</Text>
                  <Text style={[styles.summaryValue, { color: theme.accent.danger }]}>
                    {formatCurrency(payableTotal)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Overdue</Text>
                  <Text style={[styles.summaryValue, { color: theme.accent.danger }]}>
                    {formatCurrency(overduePayable)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payable List */}
            {accountsPayable.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                  No outstanding payables
                </Text>
              </View>
            ) : (
              accountsPayable.map(renderPayableItem)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    // backgroundColor handled inline
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemLeft: {
    flex: 1,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
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
});

