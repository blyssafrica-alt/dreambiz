import { router } from 'expo-router';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity,
  BarChart3,
  Search,
  HelpCircle,
  Camera
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Alert } from '@/types/business';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { LineChart, PieChart, BarChart } from '@/components/Charts';
import GlobalSearch from '@/components/GlobalSearch';

export default function DashboardScreen() {
  const { business, getDashboardMetrics, transactions, documents } = useBusiness();
  const { theme } = useTheme();
  const metrics = getDashboardMetrics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [showSearch, setShowSearch] = useState(false);

  // Calculate business health score (0-100)
  const healthScore = useMemo(() => {
    let score = 100;
    
    // Deduct points for negative cash position
    if (metrics.cashPosition < 0) score -= 30;
    else if (metrics.cashPosition < (business?.capital || 0) * 0.3) score -= 15;
    
    // Deduct points for expenses exceeding sales
    if (metrics.monthExpenses > metrics.monthSales && metrics.monthSales > 0) score -= 25;
    
    // Deduct points for low profit margin
    const profitMargin = metrics.monthSales > 0 
      ? ((metrics.monthSales - metrics.monthExpenses) / metrics.monthSales) * 100 
      : 0;
    if (profitMargin < 10 && profitMargin > 0) score -= 20;
    else if (profitMargin < 20 && profitMargin > 0) score -= 10;
    
    // Deduct points for no sales
    if (metrics.monthSales === 0 && transactions.length > 0) score -= 20;
    
    // Add bonus for good profit margin
    if (profitMargin > 30) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }, [metrics, business, transactions.length]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return theme.accent.success;
    if (score >= 60) return theme.accent.warning;
    return theme.accent.danger;
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const formatCurrency = useCallback((amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }, [business?.currency]);

  // Recent activity (last 5 transactions and documents)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recentActivity = useMemo(() => {
    const recentTransactions = transactions
      .slice(0, 5)
      .map(t => ({
        type: 'transaction' as const,
        id: t.id,
        title: t.description,
        subtitle: `${t.type === 'sale' ? 'Sale' : 'Expense'} • ${formatCurrency(t.amount)}`,
        date: t.date,
        icon: t.type === 'sale' ? 'arrow-up' : 'arrow-down',
        color: t.type === 'sale' ? theme.accent.success : theme.accent.danger,
      }));

    const recentDocuments = documents
      .slice(0, 3)
      .map(d => ({
        type: 'document' as const,
        id: d.id,
        title: `${d.documentNumber} - ${d.customerName}`,
        subtitle: `${d.type} • ${formatCurrency(d.total)}`,
        date: d.date,
        icon: 'file-text',
        color: theme.accent.primary,
      }));

    return [...recentTransactions, ...recentDocuments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions, documents, theme, formatCurrency]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    // Sales trend (last 30 days)
    const salesData = last30Days.map(date => {
      return transactions
        .filter(t => t.type === 'sale' && t.date === date)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    // Expense breakdown by category
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthExpenses = transactions.filter(t => 
      t.type === 'expense' && t.date >= monthStart
    );
    
    const expenseByCategory = new Map<string, number>();
    monthExpenses.forEach(t => {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) || 0) + t.amount);
    });

    const expenseChartData = Array.from(expenseByCategory.entries())
      .map(([category, amount]) => ({
        label: category,
        value: amount,
        color: getCategoryColor(category),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Monthly profit/loss comparison (last 3 months)
    const monthlyProfitData = Array.from({ length: 3 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
      const monthStart = monthDate.toISOString();
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString();
      
      const monthSales = transactions
        .filter(t => t.type === 'sale' && t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthExpenses = transactions
        .filter(t => t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        label: monthDate.toLocaleDateString('en-ZW', { month: 'short' }),
        value: monthSales - monthExpenses,
        color: (monthSales - monthExpenses) >= 0 ? '#10B981' : '#EF4444',
      };
    });

    return {
      salesTrend: salesData,
      salesLabels: last30Days.map(d => {
        const date = new Date(d);
        return date.getDate().toString();
      }),
      expenseBreakdown: expenseChartData,
      monthlyProfit: monthlyProfitData,
    };
  }, [transactions]);

  const getCategoryColor = (category: string): string => {
    const colors = [
      '#0066CC', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
      '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#A855F7',
    ];
    const index = category.charCodeAt(0) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const renderAlert = (alert: Alert) => {
    const colors = {
      danger: { bg: theme.surface.danger, border: theme.accent.danger, text: theme.accent.danger },
      warning: { bg: theme.surface.warning, border: theme.accent.warning, text: theme.accent.warning },
      info: { bg: theme.surface.info, border: theme.accent.info, text: theme.accent.info },
    };

    const color = colors[alert.type];

    return (
      <View key={alert.id} style={[styles.alert, { backgroundColor: color.bg, borderColor: color.border }]}>
        <AlertCircle size={20} color={color.text} />
        <View style={styles.alertContent}>
          <Text style={[styles.alertText, { color: color.text }]}>{alert.message}</Text>
          {alert.action && (
            <Text style={[styles.alertAction, { color: color.text }]}>{alert.action}</Text>
          )}
          {alert.bookReference && (
            <Text style={[styles.alertBookRef, { color: color.text }]}>
              📖 {alert.bookReference.chapterTitle} (Ch. {alert.bookReference.chapter})
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <LinearGradient
        colors={theme.gradient.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.businessName}>{business?.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.quickAddButton, { backgroundColor: theme.background.card }]} 
              onPress={() => router.push('/help' as any)}
            >
              <HelpCircle size={20} color={theme.accent.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickAddButton, { backgroundColor: theme.background.card }]} 
              onPress={() => setShowSearch(true)}
            >
              <Search size={20} color={theme.accent.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickAddButton, { backgroundColor: theme.background.card }]} 
              onPress={() => router.push('/(tabs)/finances' as any)}
            >
              <Plus size={20} color={theme.accent.primary} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <View style={styles.todaySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Today</Text>
              <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                <Sparkles size={12} color={theme.accent.info} />
                <Text style={[styles.badgeText, { color: theme.accent.info }]}>Live</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.metricIconContainer, { backgroundColor: theme.surface.success }]}>
                  <ArrowUpRight size={18} color={theme.accent.success} strokeWidth={2.5} />
                </View>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Sales</Text>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(metrics.todaySales)}</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.metricIconContainer, { backgroundColor: theme.surface.danger }]}>
                  <ArrowDownRight size={18} color={theme.accent.danger} strokeWidth={2.5} />
                </View>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Expenses</Text>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(metrics.todayExpenses)}</Text>
              </View>
            </View>

            <LinearGradient
              colors={metrics.todayProfit >= 0 ? [theme.accent.success, theme.accent.success] : [theme.accent.danger, theme.accent.danger] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profitCard}
            >
              <View style={styles.profitContent}>
                <View style={styles.profitHeader}>
                  <Text style={styles.profitLabel}>Today&apos;s Profit</Text>
                  <View style={styles.profitIconBg}>
                    {metrics.todayProfit >= 0 ? (
                      <TrendingUp size={20} color="#FFF" strokeWidth={2.5} />
                    ) : (
                      <TrendingDown size={20} color="#FFF" strokeWidth={2.5} />
                    )}
                  </View>
                </View>
                <Text style={styles.profitValue}>
                  {formatCurrency(metrics.todayProfit)}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Business Health Score */}
          <View style={[styles.healthCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.healthHeader}>
              <Text style={[styles.healthTitle, { color: theme.text.primary }]}>Business Health</Text>
              <View style={[styles.healthBadge, { backgroundColor: `${getHealthColor(healthScore)}20` }]}>
                <Text style={[styles.healthBadgeText, { color: getHealthColor(healthScore) }]}>
                  {getHealthLabel(healthScore)}
                </Text>
              </View>
            </View>
            <View style={styles.healthScoreContainer}>
              <View style={[styles.healthScoreCircle, { borderColor: getHealthColor(healthScore) }]}>
                <Text style={[styles.healthScoreValue, { color: getHealthColor(healthScore) }]}>
                  {healthScore}
                </Text>
                <Text style={[styles.healthScoreLabel, { color: theme.text.tertiary }]}>/ 100</Text>
              </View>
              <View style={styles.healthIndicators}>
                <View style={styles.healthIndicator}>
                  <View style={[
                    styles.healthIndicatorBar,
                    { 
                      backgroundColor: metrics.monthProfit >= 0 ? theme.accent.success : theme.accent.danger,
                      width: `${Math.min(100, Math.abs(metrics.monthProfit) / Math.max(metrics.monthSales || 1, 1) * 100)}%`
                    }
                  ]} />
                  <Text style={[styles.healthIndicatorLabel, { color: theme.text.secondary }]}>
                    Profitability
                  </Text>
                </View>
                <View style={styles.healthIndicator}>
                  <View style={[
                    styles.healthIndicatorBar,
                    { 
                      backgroundColor: metrics.cashPosition >= 0 ? theme.accent.success : theme.accent.danger,
                      width: `${Math.min(100, Math.max(0, (metrics.cashPosition / Math.max(business?.capital || 1, 1)) * 100))}%`
                    }
                  ]} />
                  <Text style={[styles.healthIndicatorLabel, { color: theme.text.secondary }]}>
                    Cash Position
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.monthSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>This Month</Text>
              <Activity size={16} color={theme.text.tertiary} />
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Sales</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{formatCurrency(metrics.monthSales)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Expenses</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{formatCurrency(metrics.monthExpenses)}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border.light }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabelBold, { color: theme.text.primary }]}>Net Profit</Text>
                <Text style={[
                  styles.summaryValueBold,
                  { color: metrics.monthProfit >= 0 ? theme.accent.success : theme.accent.danger }
                ]}>
                  {formatCurrency(metrics.monthProfit)}
                </Text>
              </View>
            </View>

            <View style={[styles.cashCard, { backgroundColor: theme.background.card }]}>
              <LinearGradient
                colors={theme.gradient.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cashGradient}
              >
                <View style={[styles.cashIconBg, { backgroundColor: theme.background.card }]}>
                  <DollarSign size={20} color={theme.accent.primary} strokeWidth={2.5} />
                </View>
              </LinearGradient>
              <View style={styles.cashContent}>
                <Text style={[styles.cashLabel, { color: theme.text.secondary }]}>Cash Position</Text>
                <Text style={[styles.cashValue, { color: theme.accent.primary }]}>{formatCurrency(metrics.cashPosition)}</Text>
              </View>
            </View>
          </View>

          {metrics.alerts.length > 0 && (
            <View style={styles.alertsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Alerts</Text>
              {metrics.alerts.map(renderAlert)}
            </View>
          )}

          {/* Charts Section */}
          <View style={styles.chartsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Visual Analytics</Text>
            
            {/* Sales Trend Chart */}
            {chartData.salesTrend.some(v => v > 0) && (
              <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
                <View style={styles.chartHeader}>
                  <BarChart3 size={20} color={theme.accent.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Sales Trend (Last 30 Days)</Text>
                </View>
                <LineChart
                  data={chartData.salesTrend}
                  labels={chartData.salesLabels}
                  color={theme.accent.success}
                  height={180}
                />
              </View>
            )}

            {/* Expense Breakdown Pie Chart */}
            {chartData.expenseBreakdown.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
                <View style={styles.chartHeader}>
                  <BarChart3 size={20} color={theme.accent.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Expense Breakdown</Text>
                </View>
                <PieChart
                  data={chartData.expenseBreakdown}
                  size={220}
                  showLabels={true}
                  showLegend={true}
                />
              </View>
            )}

            {/* Monthly Profit/Loss Bar Chart */}
            {chartData.monthlyProfit.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
                <View style={styles.chartHeader}>
                  <BarChart3 size={20} color={theme.accent.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Monthly Profit/Loss</Text>
                </View>
                <BarChart
                  data={chartData.monthlyProfit}
                  height={180}
                  showValues={true}
                />
              </View>
            )}
          </View>

          {metrics.topCategories.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Top Categories</Text>
              {metrics.topCategories.map((cat, index) => (
                <View key={index} style={[styles.categoryItem, { backgroundColor: theme.background.card }]}>
                  <View style={[styles.categoryRank, { backgroundColor: theme.accent.primary }]}>
                    <Text style={styles.categoryRankText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                  <Text style={[styles.categoryAmount, { color: theme.accent.primary }]}>{formatCurrency(cat.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/finances' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradient.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Plus size={20} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Add Transaction</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButtonSecondary, { 
                backgroundColor: theme.background.card, 
                borderColor: theme.border.medium 
              }]}
              onPress={() => router.push('/(tabs)/documents' as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonSecondaryText, { color: theme.accent.primary }]}>Create Document</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButtonSecondary, { 
                backgroundColor: theme.background.card, 
                borderColor: theme.border.medium 
              }]}
              onPress={() => router.push('/receipt-scan' as any)}
              activeOpacity={0.8}
            >
              <Camera size={18} color={theme.accent.primary} />
              <Text style={[styles.actionButtonSecondaryText, { color: theme.accent.primary }]}>Scan Receipt</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <GlobalSearch visible={showSearch} onClose={() => setShowSearch(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  businessName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFF',
    marginTop: 4,
  },
  quickAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  todaySection: {
    marginTop: -20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  profitCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  profitContent: {
    position: 'relative',
  },
  profitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profitLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600' as const,
  },
  profitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profitValue: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  monthSection: {
    marginBottom: 24,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  summaryValueBold: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  cashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cashGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashContent: {
    flex: 1,
  },
  cashLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  cashValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  alertsSection: {
    marginBottom: 24,
  },
  alert: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  alertBookRef: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
    opacity: 0.9,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  categoryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRankText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  actionButtonSecondary: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonSecondaryText: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  chartsSection: {
    marginBottom: 24,
  },
  chartCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  healthCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  healthScoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
  },
  healthScoreValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  healthScoreLabel: {
    fontSize: 14,
    marginTop: -4,
  },
  healthIndicators: {
    flex: 1,
    gap: 12,
  },
  healthIndicator: {
    gap: 6,
  },
  healthIndicatorBar: {
    height: 6,
    borderRadius: 3,
  },
  healthIndicatorLabel: {
    fontSize: 12,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickActionCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  recentActivitySection: {
    marginBottom: 24,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
  },
  activityDate: {
    fontSize: 11,
  },
});
