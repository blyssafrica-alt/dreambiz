import { Stack, useRouter } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFeatures } from '@/contexts/FeatureContext';
import FeatureAccessGuard from '@/components/FeatureAccessGuard';
import { ArrowLeft, BarChart3, Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react-native';
import LineChart from '@/components/Charts/LineChart';

export default function PLStatementScreen() {
  const { theme } = useTheme();
  const { business, transactions } = useBusiness();
  const { isFeatureVisible, isLoading: featuresLoading } = useFeatures();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const toolVisible = isFeatureVisible('pl-statement') || isFeatureVisible('financial-tools');
  
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'monthly') {
      start = new Date(selectedYear, selectedMonth, 1);
      end = new Date(selectedYear, selectedMonth + 1, 0);
    } else {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    }

    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const plData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        revenue: 0,
        expenses: 0,
        grossProfit: 0,
        netProfit: 0,
        revenueByCategory: {},
        expensesByCategory: {},
        monthlyData: [],
      };
    }

    const { start, end } = getDateRange();
    const filtered = transactions.filter(t => t.date >= start && t.date <= end);

    // Revenue
    const sales = filtered.filter(t => t.type === 'sale');
    const revenue = sales.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Expenses
    const expenses = filtered.filter(t => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Revenue by category
    const revenueByCategory: Record<string, number> = {};
    sales.forEach(t => {
      const cat = t.category || 'Other';
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + parseFloat(t.amount.toString());
    });

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = t.category || 'Other';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + parseFloat(t.amount.toString());
    });

    // Monthly data for chart (if yearly)
    const monthlyData = period === 'yearly' ? Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(selectedYear, i, 1).toISOString().split('T')[0];
      const monthEnd = new Date(selectedYear, i + 1, 0).toISOString().split('T')[0];
      const monthTransactions = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
      const monthRevenue = monthTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      return {
        month: i,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      };
    }) : [];

    const grossProfit = revenue;
    const netProfit = revenue - totalExpenses;

    return {
      revenue,
      expenses: totalExpenses,
      grossProfit,
      netProfit,
      revenueByCategory,
      expensesByCategory,
      monthlyData,
    };
  }, [transactions, period, selectedMonth, selectedYear]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FeatureAccessGuard 
        featureId="pl-statement" 
        showUpgradeModal={true}
      >
        <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Profit & Loss Statement</Text>
              <Text style={styles.headerSubtitle}>
                {period === 'monthly' 
                  ? `${monthNames[selectedMonth]} ${selectedYear}`
                  : `Year ${selectedYear}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowPeriodModal(true)}>
              <Calendar size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 120 : 110 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: period === 'monthly' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => setPeriod('monthly')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: period === 'monthly' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: period === 'yearly' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => setPeriod('yearly')}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: period === 'yearly' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  Yearly
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.summaryLabel, { color: '#065F46' }]}>Total Revenue</Text>
                <Text style={[styles.summaryValue, { color: '#065F46' }]}>
                  {formatCurrency(plData.revenue)}
                </Text>
                <TrendingUp size={20} color="#10B981" />
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.summaryLabel, { color: '#991B1B' }]}>Total Expenses</Text>
                <Text style={[styles.summaryValue, { color: '#991B1B' }]}>
                  {formatCurrency(plData.expenses)}
                </Text>
                <TrendingDown size={20} color="#EF4444" />
              </View>
            </View>

            {/* Net Profit */}
            <View style={[styles.profitCard, { 
              backgroundColor: plData.netProfit >= 0 ? '#D1FAE5' : '#FEE2E2',
              borderColor: plData.netProfit >= 0 ? '#10B981' : '#EF4444',
            }]}>
              <Text style={[styles.profitLabel, { 
                color: plData.netProfit >= 0 ? '#065F46' : '#991B1B',
              }]}>
                {plData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
              </Text>
              <Text style={[styles.profitValue, { 
                color: plData.netProfit >= 0 ? '#065F46' : '#991B1B',
              }]}>
                {formatCurrency(plData.netProfit)}
              </Text>
            </View>

            {/* Revenue Breakdown */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Revenue Breakdown</Text>
              {Object.keys(plData.revenueByCategory).length > 0 ? (
                Object.entries(plData.revenueByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = plData.revenue > 0 ? (amount / plData.revenue) * 100 : 0;
                    return (
                      <View key={category} style={styles.categoryRow}>
                        <View style={styles.categoryInfo}>
                          <Text style={[styles.categoryName, { color: theme.text.primary }]}>
                            {category}
                          </Text>
                          <Text style={[styles.categoryPercentage, { color: theme.text.tertiary }]}>
                            {percentage.toFixed(1)}%
                          </Text>
                        </View>
                        <Text style={[styles.categoryAmount, { color: '#10B981' }]}>
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                    );
                  })
              ) : (
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                  No revenue data for this period
                </Text>
              )}
            </View>

            {/* Expenses Breakdown */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Expenses Breakdown</Text>
              {Object.keys(plData.expensesByCategory).length > 0 ? (
                Object.entries(plData.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = plData.expenses > 0 ? (amount / plData.expenses) * 100 : 0;
                    return (
                      <View key={category} style={styles.categoryRow}>
                        <View style={styles.categoryInfo}>
                          <Text style={[styles.categoryName, { color: theme.text.primary }]}>
                            {category}
                          </Text>
                          <Text style={[styles.categoryPercentage, { color: theme.text.tertiary }]}>
                            {percentage.toFixed(1)}%
                          </Text>
                        </View>
                        <Text style={[styles.categoryAmount, { color: '#EF4444' }]}>
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                    );
                  })
              ) : (
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                  No expense data for this period
                </Text>
              )}
            </View>

            {/* Yearly Chart */}
            {period === 'yearly' && plData.monthlyData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Monthly Trend</Text>
                <LineChart
                  data={plData.monthlyData.map(d => d.profit)}
                  labels={plData.monthlyData.map((_, i) => monthNames[i].substring(0, 3))}
                  height={200}
                  color={plData.netProfit >= 0 ? '#10B981' : '#EF4444'}
                />
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Period Selection Modal */}
        <Modal visible={showPeriodModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Period</Text>
              
              {period === 'monthly' ? (
                <>
                  <Text style={[styles.modalLabel, { color: theme.text.secondary }]}>Month</Text>
                  <ScrollView style={styles.monthList}>
                    {monthNames.map((month, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor: selectedMonth === index ? theme.accent.primary : theme.background.secondary,
                          },
                        ]}
                        onPress={() => {
                          setSelectedMonth(index);
                          setShowPeriodModal(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: selectedMonth === index ? '#FFF' : theme.text.primary },
                          ]}
                        >
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <>
                  <Text style={[styles.modalLabel, { color: theme.text.secondary }]}>Year</Text>
                  <ScrollView style={styles.monthList}>
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor: selectedYear === year ? theme.accent.primary : theme.background.secondary,
                          },
                        ]}
                        onPress={() => {
                          setSelectedYear(year);
                          setShowPeriodModal(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: selectedYear === year ? '#FFF' : theme.text.primary },
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setShowPeriodModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      </FeatureAccessGuard>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  profitCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 24,
  },
  profitLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  profitValue: {
    fontSize: 36,
    fontWeight: '900',
  },
  sectionCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryPercentage: {
    fontSize: 12,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  monthList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

