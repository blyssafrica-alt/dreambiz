import { Stack } from 'expo-router';
import { 
  Plus, 
  TrendingUp,
  Edit2,
  Trash2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { LineChart, BarChart } from '@/components/Charts';
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
import type { CashflowProjection } from '@/types/business';

export default function CashflowScreen() {
  const { business, cashflowProjections, addCashflowProjection, updateCashflowProjection, deleteCashflowProjection } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [month, setMonth] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [projectedIncome, setProjectedIncome] = useState('');
  const [projectedExpenses, setProjectedExpenses] = useState('');
  const [notes, setNotes] = useState('');

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const calculateClosingBalance = () => {
    const opening = parseFloat(openingBalance) || 0;
    const income = parseFloat(projectedIncome) || 0;
    const expenses = parseFloat(projectedExpenses) || 0;
    return opening + income - expenses;
  };

  const handleSave = async () => {
    if (!month || !openingBalance || !projectedIncome || !projectedExpenses) {
      RNAlert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    const closing = calculateClosingBalance();

    try {
      if (editingId) {
        await updateCashflowProjection(editingId, {
          month,
          openingBalance: parseFloat(openingBalance),
          projectedIncome: parseFloat(projectedIncome),
          projectedExpenses: parseFloat(projectedExpenses),
          closingBalance: closing,
          currency: business?.currency || 'USD',
          notes: notes || undefined,
        });
      } else {
        await addCashflowProjection({
          month,
          openingBalance: parseFloat(openingBalance),
          projectedIncome: parseFloat(projectedIncome),
          projectedExpenses: parseFloat(projectedExpenses),
          closingBalance: closing,
          currency: business?.currency || 'USD',
          notes: notes || undefined,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Projection updated' : 'Projection added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save projection');
    }
  };

  const handleEdit = (projection: CashflowProjection) => {
    setEditingId(projection.id);
    setMonth(projection.month);
    setOpeningBalance(projection.openingBalance.toString());
    setProjectedIncome(projection.projectedIncome.toString());
    setProjectedExpenses(projection.projectedExpenses.toString());
    setNotes(projection.notes || '');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Projection',
      'Are you sure you want to delete this cashflow projection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCashflowProjection(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete projection');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setMonth('');
    setOpeningBalance('');
    setProjectedIncome('');
    setProjectedExpenses('');
    setNotes('');
  };

  const formatMonth = (monthString: string) => {
    const date = new Date(monthString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Prepare chart data from projections
  const chartData = useMemo(() => {
    if (cashflowProjections.length === 0) {
      return {
        labels: [],
        income: [],
        expenses: [],
        netCashflow: [],
        closingBalances: [],
      };
    }

    const sortedProjections = [...cashflowProjections].sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    return {
      labels: sortedProjections.map(p => formatMonth(p.month)),
      income: sortedProjections.map(p => p.projectedIncome),
      expenses: sortedProjections.map(p => p.projectedExpenses),
      netCashflow: sortedProjections.map(p => p.projectedIncome - p.projectedExpenses),
      closingBalances: sortedProjections.map(p => p.closingBalance),
    };
  }, [cashflowProjections]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Cashflow', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Cashflow Projections</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            setMonth(nextMonth.toISOString().split('T')[0].substring(0, 7));
            setShowModal(true);
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Cashflow Charts */}
        {cashflowProjections.length > 0 && (
          <>
            <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.chartHeader}>
                <BarChart3 size={20} color={theme.accent.primary} />
                <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Income vs Expenses</Text>
              </View>
              {chartData.labels.length > 0 && (
                <BarChart
                  data={chartData.income.map((inc, i) => ({
                    label: chartData.labels[i],
                    value: inc,
                    color: theme.accent.success,
                  }))}
                  height={200}
                />
              )}
            </View>

            <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.chartHeader}>
                <TrendingUp size={20} color={theme.accent.primary} />
                <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Net Cashflow Trend</Text>
              </View>
              {chartData.netCashflow.some(v => v !== 0) && (
                <LineChart
                  data={chartData.netCashflow}
                  labels={chartData.labels}
                  color={theme.accent.primary}
                  height={180}
                />
              )}
            </View>

            <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.chartHeader}>
                <TrendingUp size={20} color={theme.accent.info} />
                <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Closing Balance Trend</Text>
              </View>
              {chartData.closingBalances.some(v => v !== 0) && (
                <LineChart
                  data={chartData.closingBalances}
                  labels={chartData.labels}
                  color={theme.accent.info}
                  height={180}
                />
              )}
            </View>
          </>
        )}

        {cashflowProjections.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No cashflow projections yet
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Your First Projection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cashflowProjections.map(projection => {
            const netCashflow = projection.projectedIncome - projection.projectedExpenses;
            const isPositive = netCashflow >= 0;
            
            return (
              <View
                key={projection.id}
                style={[styles.projectionCard, { backgroundColor: theme.background.card }]}
              >
                <View style={styles.projectionHeader}>
                  <View style={styles.projectionInfo}>
                    <Text style={[styles.projectionMonth, { color: theme.text.primary }]}>
                      {formatMonth(projection.month)}
                    </Text>
                  </View>
                  <View style={styles.projectionActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(projection)}
                    >
                      <Edit2 size={18} color={theme.accent.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(projection.id)}
                    >
                      <Trash2 size={18} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cashflowGrid}>
                  <View style={[styles.cashflowItem, { backgroundColor: theme.background.secondary }]}>
                    <Text style={[styles.cashflowLabel, { color: theme.text.tertiary }]}>Opening Balance</Text>
                    <Text style={[styles.cashflowValue, { color: theme.text.primary }]}>
                      {formatCurrency(projection.openingBalance)}
                    </Text>
                  </View>

                  <View style={[styles.cashflowItem, { backgroundColor: '#D1FAE5' }]}>
                    <View style={styles.cashflowItemHeader}>
                      <ArrowUpRight size={16} color="#10B981" />
                      <Text style={[styles.cashflowLabel, { color: '#065F46' }]}>Projected Income</Text>
                    </View>
                    <Text style={[styles.cashflowValue, { color: '#065F46', fontWeight: '700' }]}>
                      {formatCurrency(projection.projectedIncome)}
                    </Text>
                  </View>

                  <View style={[styles.cashflowItem, { backgroundColor: '#FEE2E2' }]}>
                    <View style={styles.cashflowItemHeader}>
                      <ArrowDownRight size={16} color="#EF4444" />
                      <Text style={[styles.cashflowLabel, { color: '#991B1B' }]}>Projected Expenses</Text>
                    </View>
                    <Text style={[styles.cashflowValue, { color: '#991B1B', fontWeight: '700' }]}>
                      {formatCurrency(projection.projectedExpenses)}
                    </Text>
                  </View>

                  <View style={[styles.cashflowItem, { backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.cashflowLabel, { color: isPositive ? '#065F46' : '#991B1B' }]}>
                      Net Cashflow
                    </Text>
                    <Text style={[styles.cashflowValue, { color: isPositive ? '#065F46' : '#991B1B', fontWeight: '700' }]}>
                      {isPositive ? '+' : ''}{formatCurrency(netCashflow)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.closingBalance, { backgroundColor: theme.background.secondary }]}>
                  <Text style={[styles.closingLabel, { color: theme.text.tertiary }]}>Closing Balance</Text>
                  <Text style={[styles.closingValue, { color: theme.text.primary, fontWeight: '700' }]}>
                    {formatCurrency(projection.closingBalance)}
                  </Text>
                </View>

                {projection.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={[styles.notesLabel, { color: theme.text.tertiary }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: theme.text.secondary }]}>
                      {projection.notes}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
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
                {editingId ? 'Edit Projection' : 'Add Projection'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Month *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={month}
                  onChangeText={setMonth}
                  placeholder="YYYY-MM"
                  placeholderTextColor={theme.text.tertiary}
                />
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Format: YYYY-MM (e.g., 2024-01)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Opening Balance *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Projected Income *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={projectedIncome}
                  onChangeText={setProjectedIncome}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Projected Expenses *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={projectedExpenses}
                  onChangeText={setProjectedExpenses}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>

              {openingBalance && projectedIncome && projectedExpenses && (
                <View style={[styles.previewCard, { backgroundColor: theme.background.secondary }]}>
                  <Text style={[styles.previewLabel, { color: theme.text.tertiary }]}>Projected Closing Balance:</Text>
                  <Text style={[styles.previewValue, { color: theme.text.primary, fontWeight: '700' }]}>
                    {formatCurrency(calculateClosingBalance())}
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this projection"
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
  projectionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectionInfo: {
    flex: 1,
  },
  projectionMonth: {
    fontSize: 18,
    fontWeight: '700',
  },
  projectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  cashflowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cashflowItem: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 8,
  },
  cashflowItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cashflowLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  cashflowValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  closingBalance: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  closingValue: {
    fontSize: 20,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
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
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  previewCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 20,
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
  chartCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});

