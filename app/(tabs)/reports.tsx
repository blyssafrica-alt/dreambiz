import { Stack } from 'expo-router';
import { 
  Download,
  FileText,
  BarChart3
} from 'lucide-react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
  Share,
  Platform,
  Animated,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LineChart, PieChart } from '@/components/Charts';

type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function ReportsScreen() {
  const { business, transactions, documents } = useBusiness();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [period, setPeriod] = useState<ReportPeriod>('month');

  // Ensure arrays are always valid
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getDateRange = (period: ReportPeriod) => {
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    switch (period) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const getCategoryColor = (category: string, index: number): string => {
    const colors = [
      '#0066CC', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
      '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#A855F7',
    ];
    return colors[index % colors.length];
  };

  const reportData = useMemo(() => {
    const { start, end } = getDateRange(period);
    const filtered = safeTransactions.filter(t => t.date >= start && t.date <= end);

    const sales = filtered.filter(t => t.type === 'sale');
    const expenses = filtered.filter(t => t.type === 'expense');

    const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const profit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    // Category breakdown
    const categorySales = new Map<string, number>();
    const categoryExpenses = new Map<string, number>();

    sales.forEach(t => {
      const current = categorySales.get(t.category) || 0;
      categorySales.set(t.category, current + t.amount);
    });

    expenses.forEach(t => {
      const current = categoryExpenses.get(t.category) || 0;
      categoryExpenses.set(t.category, current + t.amount);
    });

    const topSalesCategories = Array.from(categorySales.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topExpenseCategories = Array.from(categoryExpenses.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Prepare chart data
    const salesChartData = topSalesCategories.map((cat, i) => ({
      label: cat.category,
      value: cat.amount,
      color: getCategoryColor(cat.category, i),
    }));

    const expensesChartData = topExpenseCategories.map((cat, i) => ({
      label: cat.category,
      value: cat.amount,
      color: getCategoryColor(cat.category, i),
    }));

    // Daily trend data
    const days = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    const dailySales = days.map(date => {
      return sales
        .filter(t => t.date === date)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    const dailyExpenses = days.map(date => {
      return expenses
        .filter(t => t.date === date)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    const dailyProfit = dailySales.map((sales, i) => sales - dailyExpenses[i]);

    // Invoice status breakdown
    const invoiceDocs = documents.filter(d => d.type === 'invoice' && d.date >= start && d.date <= end);
    const invoiceStatus = {
      draft: invoiceDocs.filter(d => d.status === 'draft').length,
      sent: invoiceDocs.filter(d => d.status === 'sent').length,
      paid: invoiceDocs.filter(d => d.status === 'paid').length,
      cancelled: invoiceDocs.filter(d => d.status === 'cancelled').length,
    };
    const totalInvoiced = invoiceDocs.reduce((sum, d) => sum + d.total, 0);
    const paidInvoices = invoiceDocs.filter(d => d.status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, d) => sum + d.total, 0);
    const outstanding = totalInvoiced - totalPaid;

    return {
      totalSales,
      totalExpenses,
      profit,
      profitMargin,
      topSalesCategories,
      topExpenseCategories,
      salesChartData,
      expensesChartData,
      dailySales,
      dailyExpenses,
      dailyProfit,
      dailyLabels: days.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric' });
      }),
      invoiceStatus,
      totalInvoiced,
      totalPaid,
      outstanding,
      transactionCount: filtered.length,
    };
  }, [transactions, documents, period]);

  const handleExport = async (type: 'summary' | 'detailed') => {
    const { start, end } = getDateRange(period);

    try {
      const { exportReportToPDF } = await import('@/lib/report-pdf');
      await exportReportToPDF(reportData, transactions, business!, period, start, end, type);
      RNAlert.alert('Success', 'Report PDF exported successfully!');
    } catch (error: any) {
      console.error('Export failed:', error);
      RNAlert.alert('Export Failed', error.message || 'Could not export report as PDF');
    }
  };

  const periods: { label: string; value: ReportPeriod }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Reports"
          subtitle="Business analytics and insights"
          icon={BarChart3}
          iconGradient={['#EC4899', '#DB2777']}
          rightAction={
            <TouchableOpacity
              style={styles.headerExportButton}
              onPress={() => handleExport('summary')}
            >
              <Download size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />

        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.periodSelector, { marginTop: -12, marginHorizontal: 20, paddingTop: 12 }]}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.periodChip,
              {
                backgroundColor: period === p.value ? theme.accent.primary : theme.background.card,
              }
            ]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[
              styles.periodText,
              { color: period === p.value ? '#fff' : theme.text.primary }
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollView}>
        {/* Profit & Loss Summary */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Profit & Loss</Text>
          
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>Total Sales</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>
                {formatCurrency(reportData.totalSales)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>Total Expenses</Text>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                {formatCurrency(reportData.totalExpenses)}
              </Text>
            </View>
          </View>

          <View style={[styles.profitCard, { backgroundColor: reportData.profit >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.profitLabel, { color: theme.text.secondary }]}>Net Profit</Text>
            <Text style={[styles.profitValue, { color: reportData.profit >= 0 ? '#065F46' : '#991B1B' }]}>
              {formatCurrency(reportData.profit)}
            </Text>
            <Text style={[styles.profitMargin, { color: theme.text.tertiary }]}>
              Margin: {reportData.profitMargin.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Charts Section */}
        {(reportData.dailySales.some(v => v > 0) || reportData.dailyExpenses.some(v => v > 0)) && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Daily Trends</Text>
            <LineChart
              data={reportData.dailyProfit}
              labels={reportData.dailyLabels}
              color={reportData.profit >= 0 ? '#10B981' : '#EF4444'}
              height={200}
            />
          </View>
        )}

        {reportData.salesChartData.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Sales by Category</Text>
            <PieChart
              data={reportData.salesChartData}
              size={240}
              showLabels={true}
              showLegend={true}
            />
          </View>
        )}

        {reportData.expensesChartData.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Expenses by Category</Text>
            <PieChart
              data={reportData.expensesChartData}
              size={240}
              showLabels={true}
              showLegend={true}
            />
          </View>
        )}

        {/* Top Categories */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Top Sales Categories</Text>
          {reportData.topSalesCategories.length > 0 ? (
            reportData.topSalesCategories.map((cat, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: theme.background.secondary }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${(cat.amount / reportData.totalSales) * 100}%`,
                          backgroundColor: theme.accent.primary,
                        }
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.categoryAmount, { color: theme.text.primary }]}>
                  {formatCurrency(cat.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No sales data</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Top Expense Categories</Text>
          {reportData.topExpenseCategories.length > 0 ? (
            reportData.topExpenseCategories.map((cat, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: theme.background.secondary }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${(cat.amount / reportData.totalExpenses) * 100}%`,
                          backgroundColor: '#EF4444',
                        }
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.categoryAmount, { color: theme.text.primary }]}>
                  {formatCurrency(cat.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No expense data</Text>
          )}
        </View>

        {/* Balance Sheet */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Balance Sheet</Text>
          <View style={styles.balanceSheetSection}>
            <Text style={[styles.balanceSheetSectionTitle, { color: theme.text.secondary }]}>Assets</Text>
            <View style={styles.balanceSheetRow}>
              <Text style={[styles.balanceSheetLabel, { color: theme.text.tertiary }]}>Cash & Bank</Text>
              <Text style={[styles.balanceSheetValue, { color: theme.text.primary }]}>
                {formatCurrency(reportData.totalSales - reportData.totalExpenses)}
              </Text>
            </View>
            <View style={styles.balanceSheetRow}>
              <Text style={[styles.balanceSheetLabel, { color: theme.text.tertiary }]}>Accounts Receivable</Text>
              <Text style={[styles.balanceSheetValue, { color: theme.text.primary }]}>
                {formatCurrency(reportData.outstanding)}
              </Text>
            </View>
            <View style={[styles.balanceSheetTotal, { borderTopColor: theme.background.secondary }]}>
              <Text style={[styles.balanceSheetTotalLabel, { color: theme.text.primary }]}>Total Assets</Text>
              <Text style={[styles.balanceSheetTotalValue, { color: theme.accent.primary }]}>
                {formatCurrency(reportData.totalSales - reportData.totalExpenses + reportData.outstanding)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceSheetSection}>
            <Text style={[styles.balanceSheetSectionTitle, { color: theme.text.secondary }]}>Liabilities</Text>
            <View style={styles.balanceSheetRow}>
              <Text style={[styles.balanceSheetLabel, { color: theme.text.tertiary }]}>Accounts Payable</Text>
              <Text style={[styles.balanceSheetValue, { color: theme.text.primary }]}>
                {formatCurrency(0)}
              </Text>
            </View>
            <View style={[styles.balanceSheetTotal, { borderTopColor: theme.background.secondary }]}>
              <Text style={[styles.balanceSheetTotalLabel, { color: theme.text.primary }]}>Total Liabilities</Text>
              <Text style={[styles.balanceSheetTotalValue, { color: '#EF4444' }]}>
                {formatCurrency(0)}
              </Text>
            </View>
          </View>
          <View style={[styles.balanceSheetSection, { backgroundColor: theme.background.secondary, padding: 12, borderRadius: 8, marginTop: 12 }]}>
            <View style={styles.balanceSheetRow}>
              <Text style={[styles.balanceSheetTotalLabel, { color: theme.text.primary }]}>Net Worth (Equity)</Text>
              <Text style={[styles.balanceSheetTotalValue, { color: theme.accent.primary, fontSize: 18 }]}>
                {formatCurrency(reportData.totalSales - reportData.totalExpenses + reportData.outstanding)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cashflow Statement */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Cashflow Statement</Text>
          <View style={styles.cashflowSection}>
            <Text style={[styles.cashflowSectionTitle, { color: theme.text.secondary }]}>Operating Activities</Text>
            <View style={styles.cashflowRow}>
              <Text style={[styles.cashflowLabel, { color: theme.text.tertiary }]}>Cash from Sales</Text>
              <Text style={[styles.cashflowValue, { color: '#10B981' }]}>
                +{formatCurrency(reportData.totalPaid)}
              </Text>
            </View>
            <View style={styles.cashflowRow}>
              <Text style={[styles.cashflowLabel, { color: theme.text.tertiary }]}>Cash Paid for Expenses</Text>
              <Text style={[styles.cashflowValue, { color: '#EF4444' }]}>
                -{formatCurrency(reportData.totalExpenses)}
              </Text>
            </View>
            <View style={[styles.cashflowTotal, { borderTopColor: theme.background.secondary }]}>
              <Text style={[styles.cashflowTotalLabel, { color: theme.text.primary }]}>Net Cash from Operations</Text>
              <Text style={[styles.cashflowTotalValue, { color: reportData.profit >= 0 ? '#10B981' : '#EF4444' }]}>
                {formatCurrency(reportData.totalPaid - reportData.totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.cashflowSection}>
            <Text style={[styles.cashflowSectionTitle, { color: theme.text.secondary }]}>Investing Activities</Text>
            <View style={styles.cashflowRow}>
              <Text style={[styles.cashflowLabel, { color: theme.text.tertiary }]}>Capital Expenditures</Text>
              <Text style={[styles.cashflowValue, { color: '#EF4444' }]}>
                -{formatCurrency(0)}
              </Text>
            </View>
            <View style={[styles.cashflowTotal, { borderTopColor: theme.background.secondary }]}>
              <Text style={[styles.cashflowTotalLabel, { color: theme.text.primary }]}>Net Cash from Investing</Text>
              <Text style={[styles.cashflowTotalValue, { color: '#EF4444' }]}>
                {formatCurrency(0)}
              </Text>
            </View>
          </View>
          <View style={[styles.cashflowSection, { backgroundColor: theme.background.secondary, padding: 12, borderRadius: 8, marginTop: 12 }]}>
            <View style={styles.cashflowRow}>
              <Text style={[styles.cashflowTotalLabel, { color: theme.text.primary }]}>Net Change in Cash</Text>
              <Text style={[styles.cashflowTotalValue, { color: reportData.profit >= 0 ? '#10B981' : '#EF4444', fontSize: 18 }]}>
                {formatCurrency(reportData.totalPaid - reportData.totalExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Invoice Status */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Invoice Status</Text>
          <View style={styles.invoiceStats}>
            <View style={styles.invoiceStat}>
              <Text style={[styles.invoiceStatLabel, { color: theme.text.tertiary }]}>Total Invoiced</Text>
              <Text style={[styles.invoiceStatValue, { color: theme.text.primary }]}>
                {formatCurrency(reportData.totalInvoiced)}
              </Text>
            </View>
            <View style={styles.invoiceStat}>
              <Text style={[styles.invoiceStatLabel, { color: theme.text.tertiary }]}>Paid</Text>
              <Text style={[styles.invoiceStatValue, { color: '#10B981' }]}>
                {formatCurrency(reportData.totalPaid)}
              </Text>
            </View>
            <View style={styles.invoiceStat}>
              <Text style={[styles.invoiceStatLabel, { color: theme.text.tertiary }]}>Outstanding</Text>
              <Text style={[styles.invoiceStatValue, { color: '#F59E0B' }]}>
                {formatCurrency(reportData.outstanding)}
              </Text>
            </View>
          </View>
          <View style={styles.statusBreakdown}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Draft: {reportData.invoiceStatus.draft}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Sent: {reportData.invoiceStatus.sent}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Paid: {reportData.invoiceStatus.paid}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Cancelled: {reportData.invoiceStatus.cancelled}
              </Text>
            </View>
          </View>
        </View>

        {/* Export Options */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Export Reports</Text>
          <TouchableOpacity
            style={[styles.exportOption, { backgroundColor: theme.background.secondary }]}
            onPress={() => handleExport('summary')}
          >
            <FileText size={20} color={theme.accent.primary} />
            <View style={styles.exportInfo}>
              <Text style={[styles.exportTitle, { color: theme.text.primary }]}>Summary Report</Text>
              <Text style={[styles.exportDesc, { color: theme.text.tertiary }]}>
                Export financial summary
              </Text>
            </View>
            <Download size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportOption, { backgroundColor: theme.background.secondary }]}
            onPress={() => handleExport('detailed')}
          >
            <FileText size={20} color={theme.accent.primary} />
            <View style={styles.exportInfo}>
              <Text style={[styles.exportTitle, { color: theme.text.primary }]}>Detailed Report</Text>
              <Text style={[styles.exportDesc, { color: theme.text.tertiary }]}>
                Export all transactions (CSV)
              </Text>
            </View>
            <Download size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
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
  headerExportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 60,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  profitCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  profitMargin: {
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  invoiceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  invoiceStat: {
    alignItems: 'center',
  },
  invoiceStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  invoiceStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportDesc: {
    fontSize: 12,
  },
  balanceSheetSection: {
    marginBottom: 16,
  },
  balanceSheetSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceSheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  balanceSheetLabel: {
    fontSize: 14,
  },
  balanceSheetValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceSheetTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 8,
  },
  balanceSheetTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceSheetTotalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  cashflowSection: {
    marginBottom: 16,
  },
  cashflowSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cashflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cashflowLabel: {
    fontSize: 14,
  },
  cashflowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  cashflowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 8,
  },
  cashflowTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  cashflowTotalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});

