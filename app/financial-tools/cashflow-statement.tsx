import { Stack, useRouter } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFeatures } from '@/contexts/FeatureContext';
import FeatureAccessGuard from '@/components/FeatureAccessGuard';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import LineChart from '@/components/Charts/LineChart';

export default function CashFlowStatementScreen() {
  const { theme } = useTheme();
  const { business, transactions } = useBusiness();
  const { isFeatureVisible, isLoading: featuresLoading } = useFeatures();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const toolVisible = isFeatureVisible('cashflow-statement') || isFeatureVisible('financial-tools');
  
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  const cashFlowData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        operatingActivities: { inflows: 0, outflows: 0, net: 0 },
        investingActivities: { inflows: 0, outflows: 0, net: 0 },
        financingActivities: { inflows: 0, outflows: 0, net: 0 },
        netCashFlow: 0,
        openingBalance: 0,
        closingBalance: 0,
        monthlyData: [],
      };
    }

    const { start, end } = getDateRange();
    const filtered = transactions.filter(t => t.date >= start && t.date <= end);

    // Operating Activities (Sales and Operating Expenses)
    const sales = filtered.filter(t => t.type === 'sale');
    const operatingInflows = sales.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    const operatingExpenses = filtered.filter(t => 
      t.type === 'expense' && 
      !['Capital Purchase', 'Investment', 'Loan Payment', 'Loan Received'].includes(t.category || '')
    );
    const operatingOutflows = operatingExpenses.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Investing Activities (Capital purchases, investments)
    const investingExpenses = filtered.filter(t => 
      t.type === 'expense' && 
      ['Capital Purchase', 'Investment'].includes(t.category || '')
    );
    const investingOutflows = investingExpenses.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const investingInflows = 0; // Typically no inflows from investing in small business

    // Financing Activities (Loans, capital injections)
    const financingTransactions = filtered.filter(t => 
      ['Loan Payment', 'Loan Received', 'Capital Injection'].includes(t.category || '')
    );
    const financingInflows = financingTransactions
      .filter(t => t.type === 'sale' || t.category === 'Loan Received' || t.category === 'Capital Injection')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const financingOutflows = financingTransactions
      .filter(t => t.type === 'expense' && t.category === 'Loan Payment')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Calculate net cash flows
    const operatingNet = operatingInflows - operatingOutflows;
    const investingNet = investingInflows - investingOutflows;
    const financingNet = financingInflows - financingOutflows;
    const netCashFlow = operatingNet + investingNet + financingNet;

    // Opening balance (previous period's closing)
    const openingBalance = business?.capital || 0;

    // Closing balance
    const closingBalance = openingBalance + netCashFlow;

    // Monthly data for chart
    const monthlyData = period === 'yearly' ? Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(selectedYear, i, 1).toISOString().split('T')[0];
      const monthEnd = new Date(selectedYear, i + 1, 0).toISOString().split('T')[0];
      const monthTransactions = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
      const monthInflows = monthTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const monthOutflows = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      return {
        month: i,
        inflows: monthInflows,
        outflows: monthOutflows,
        net: monthInflows - monthOutflows,
      };
    }) : [];

    return {
      operatingActivities: {
        inflows: operatingInflows,
        outflows: operatingOutflows,
        net: operatingNet,
      },
      investingActivities: {
        inflows: investingInflows,
        outflows: investingOutflows,
        net: investingNet,
      },
      financingActivities: {
        inflows: financingInflows,
        outflows: financingOutflows,
        net: financingNet,
      },
      netCashFlow,
      openingBalance,
      closingBalance,
      monthlyData,
    };
  }, [transactions, period, selectedMonth, selectedYear, business]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FeatureAccessGuard 
        featureId="cashflow-statement" 
        showUpgradeModal={true}
      >
        <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#14B8A6', '#0D9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Cash Flow Statement</Text>
              <Text style={styles.headerSubtitle}>
                Track cash inflows and outflows
              </Text>
            </View>
            <View style={{ width: 24 }} />
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
                    backgroundColor: period === 'monthly' ? theme.accent.success : theme.background.secondary,
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
                    backgroundColor: period === 'yearly' ? theme.accent.success : theme.background.secondary,
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

            {/* Net Cash Flow */}
            <View style={[styles.netCashCard, {
              backgroundColor: cashFlowData.netCashFlow >= 0 ? '#D1FAE5' : '#FEE2E2',
              borderColor: cashFlowData.netCashFlow >= 0 ? '#10B981' : '#EF4444',
            }]}>
              <Text style={[styles.netCashLabel, {
                color: cashFlowData.netCashFlow >= 0 ? '#065F46' : '#991B1B',
              }]}>
                Net Cash Flow
              </Text>
              <Text style={[styles.netCashValue, {
                color: cashFlowData.netCashFlow >= 0 ? '#065F46' : '#991B1B',
              }]}>
                {formatCurrency(cashFlowData.netCashFlow)}
              </Text>
            </View>

            {/* Operating Activities */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#3B82F6" />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Operating Activities
                </Text>
              </View>
              <View style={styles.activityRow}>
                <View style={styles.activityItem}>
                  <ArrowUpRight size={16} color="#10B981" />
                  <Text style={[styles.activityLabel, { color: theme.text.secondary }]}>Cash Inflows</Text>
                  <Text style={[styles.activityValue, { color: '#10B981' }]}>
                    {formatCurrency(cashFlowData.operatingActivities.inflows)}
                  </Text>
                </View>
                <View style={styles.activityItem}>
                  <ArrowDownRight size={16} color="#EF4444" />
                  <Text style={[styles.activityLabel, { color: theme.text.secondary }]}>Cash Outflows</Text>
                  <Text style={[styles.activityValue, { color: '#EF4444' }]}>
                    {formatCurrency(cashFlowData.operatingActivities.outflows)}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.netRow}>
                <Text style={[styles.netLabel, { color: theme.text.primary }]}>Net Operating Cash Flow</Text>
                <Text style={[styles.netValue, {
                  color: cashFlowData.operatingActivities.net >= 0 ? '#10B981' : '#EF4444',
                }]}>
                  {formatCurrency(cashFlowData.operatingActivities.net)}
                </Text>
              </View>
            </View>

            {/* Investing Activities */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.sectionHeader}>
                <Wallet size={20} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Investing Activities
                </Text>
              </View>
              <View style={styles.activityRow}>
                <View style={styles.activityItem}>
                  <ArrowUpRight size={16} color="#10B981" />
                  <Text style={[styles.activityLabel, { color: theme.text.secondary }]}>Cash Inflows</Text>
                  <Text style={[styles.activityValue, { color: '#10B981' }]}>
                    {formatCurrency(cashFlowData.investingActivities.inflows)}
                  </Text>
                </View>
                <View style={styles.activityItem}>
                  <ArrowDownRight size={16} color="#EF4444" />
                  <Text style={[styles.activityLabel, { color: theme.text.secondary }]}>Cash Outflows</Text>
                  <Text style={[styles.activityValue, { color: '#EF4444' }]}>
                    {formatCurrency(cashFlowData.investingActivities.outflows)}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.netRow}>
                <Text style={[styles.netLabel, { color: theme.text.primary }]}>Net Investing Cash Flow</Text>
                <Text style={[styles.netValue, {
                  color: cashFlowData.investingActivities.net >= 0 ? '#10B981' : '#EF4444',
                }]}>
                  {formatCurrency(cashFlowData.investingActivities.net)}
                </Text>
              </View>
            </View>

            {/* Financing Activities */}
            <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.sectionHeader}>
                <TrendingDown size={20} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Financing Activities
                </Text>
              </View>
              <View style={styles.activityRow}>
                <View style={styles.activityItem}>
                  <ArrowUpRight size={16} color="#10B981" />
                  <Text style={[styles.activityLabel, { color: theme.text.secondary }]}>Cash Inflows</Text>
                  <Text style={[styles.activityValue, { color: '#10B981' }]}>
                    {formatCurrency(cashFlowData.financingActivities.inflows)}
                  </Text>
                </View>
                <View style={styles.activityItem}>
                  <ArrowDownRight size={16} color="#EF4444" />
                  <Text style={[styles.activityLabel, { color: theme.text.secondary }]}>Cash Outflows</Text>
                  <Text style={[styles.activityValue, { color: '#EF4444' }]}>
                    {formatCurrency(cashFlowData.financingActivities.outflows)}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.netRow}>
                <Text style={[styles.netLabel, { color: theme.text.primary }]}>Net Financing Cash Flow</Text>
                <Text style={[styles.netValue, {
                  color: cashFlowData.financingActivities.net >= 0 ? '#10B981' : '#EF4444',
                }]}>
                  {formatCurrency(cashFlowData.financingActivities.net)}
                </Text>
              </View>
            </View>

            {/* Cash Balance Summary */}
            <View style={[styles.balanceCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.balanceTitle, { color: theme.text.primary }]}>Cash Balance</Text>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceLabel, { color: theme.text.secondary }]}>Opening Balance</Text>
                <Text style={[styles.balanceValue, { color: theme.text.primary }]}>
                  {formatCurrency(cashFlowData.openingBalance)}
                </Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceLabel, { color: theme.text.secondary }]}>Net Cash Flow</Text>
                <Text style={[styles.balanceValue, {
                  color: cashFlowData.netCashFlow >= 0 ? '#10B981' : '#EF4444',
                }]}>
                  {cashFlowData.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlowData.netCashFlow)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceLabel, { color: theme.text.primary, fontWeight: '700' }]}>
                  Closing Balance
                </Text>
                <Text style={[styles.balanceValue, { color: theme.text.primary, fontWeight: '900' }]}>
                  {formatCurrency(cashFlowData.closingBalance)}
                </Text>
              </View>
            </View>

            {/* Monthly Chart */}
            {(period === 'yearly' && cashFlowData.monthlyData.length > 0) && (
              <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Monthly Cash Flow Trend</Text>
                <LineChart
                  data={cashFlowData.monthlyData.map(d => d.net)}
                  labels={cashFlowData.monthlyData.map((_, i) => monthNames[i])}
                  height={200}
                  color={cashFlowData.netCashFlow >= 0 ? '#10B981' : '#EF4444'}
                />
              </View>
            )}
          </ScrollView>
        </Animated.View>
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
  netCashCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 24,
  },
  netCashLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  netCashValue: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  activityRow: {
    gap: 12,
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityLabel: {
    flex: 1,
    fontSize: 14,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  netValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
});

