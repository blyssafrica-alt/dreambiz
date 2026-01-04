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
  Camera,
  X,
  ChevronRight,
  ChevronDown,
  Bell,
  Folder,
  FileText as FileTextIcon,
  Settings,
  Users as UsersIcon,
  TrendingUp as TrendingUpIcon,
  Receipt,
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Platform,
  Modal,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAds } from '@/contexts/AdContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { Alert as AlertType } from '@/types/business';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { LineChart, PieChart, BarChart } from '@/components/Charts';
import GlobalSearch from '@/components/GlobalSearch';
import { AdCard } from '@/components/AdCard';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function DashboardScreen() {
  const { business, getDashboardMetrics, transactions, documents } = useBusiness();
  const { theme } = useTheme();
  const { getAdsForLocation } = useAds();
  const { t } = useTranslation();
  
  // State declarations
  const [metrics, setMetrics] = useState<any>(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  
  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Computed values
  const dashboardAds = getAdsForLocation('dashboard');

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const m = await getDashboardMetrics();
        setMetrics(m);
      } catch (error) {
        console.error('Failed to load metrics:', error);
        // Set default metrics to prevent null errors
        setMetrics({
          todaySales: 0,
          todayExpenses: 0,
          todayProfit: 0,
          monthSales: 0,
          monthExpenses: 0,
          monthProfit: 0,
          cashPosition: 0,
          topCategories: [],
          alerts: [],
          newCustomers: 0,
          salesTrend: 0,
        });
      }
    };
    loadMetrics();
  }, [getDashboardMetrics, transactions, documents]);

  // Calculate business health score (0-100)
  const healthScore = useMemo(() => {
    if (!metrics) return 50;
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

  // Prepare chart data based on selected period
  const chartData = useMemo(() => {
    const now = new Date();
    let dateRange: string[] = [];
    let labels: string[] = [];

    // Determine date range based on selected period
    switch (chartPeriod) {
      case 'day':
        dateRange = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });
        labels = dateRange.map(d => {
          const date = new Date(d);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        break;
      case 'week':
        dateRange = Array.from({ length: 4 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (3 - i) * 7);
          return date.toISOString().split('T')[0];
        });
        labels = dateRange.map((d, i) => `Week ${i + 1}`);
        break;
      case 'month':
        dateRange = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
          return date.toISOString().split('T')[0];
        });
        labels = dateRange.map(d => {
          const date = new Date(d);
          return date.toLocaleDateString('en-US', { month: 'short' });
        });
        break;
      case 'year':
        dateRange = Array.from({ length: 5 }, (_, i) => {
          const date = new Date(now.getFullYear() - (4 - i), 0, 1);
          return date.toISOString().split('T')[0];
        });
        labels = dateRange.map(d => {
          const date = new Date(d);
          return date.getFullYear().toString();
        });
        break;
    }

    // Calculate revenue, expenses, and profit for each period
    const revenueExpenseProfit = dateRange.map((startDate, index) => {
      let endDate: string;
      if (chartPeriod === 'day') {
        endDate = startDate;
      } else if (chartPeriod === 'week') {
        const date = new Date(startDate);
        date.setDate(date.getDate() + 6);
        endDate = date.toISOString().split('T')[0];
      } else if (chartPeriod === 'month') {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + 1);
        endDate = date.toISOString().split('T')[0];
      } else {
        const date = new Date(startDate);
        date.setFullYear(date.getFullYear() + 1);
        endDate = date.toISOString().split('T')[0];
      }

      const revenue = transactions
        .filter(t => t.type === 'sale' && t.date >= startDate && t.date <= endDate)
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions
        .filter(t => t.type === 'expense' && t.date >= startDate && t.date <= endDate)
        .reduce((sum, t) => sum + t.amount, 0);

      const profit = revenue - expenses;
      const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        label: labels[index],
        revenue,
        expenses,
        profit,
        profitPercent,
      };
    });

    // Sales trend (for compatibility)
    const salesData = revenueExpenseProfit.map(d => d.revenue);

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
      salesLabels: labels,
      expenseBreakdown: expenseChartData,
      monthlyProfit: monthlyProfitData,
      revenueExpenseProfit,
    };
  }, [transactions, chartPeriod]);

  const getCategoryColor = (category: string): string => {
    const colors = [
      '#0066CC', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
      '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#A855F7',
    ];
    const index = category.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const handleAlertPress = (alert: AlertType) => {
    // Smart navigation based on alert type and content
    const message = alert.message.toLowerCase();
    
    if (message.includes('profit') || message.includes('margin') || message.includes('pricing')) {
      // Navigate to finances or pricing calculator
      router.push('/(tabs)/finances' as any);
    } else if (message.includes('expense') || message.includes('spending') || message.includes('cost')) {
      // Navigate to finances to view expenses
      router.push('/(tabs)/finances' as any);
    } else if (message.includes('cash') || message.includes('cashflow') || message.includes('cash position')) {
      // Navigate to cashflow or finances
      router.push('/(tabs)/cashflow' as any);
    } else if (message.includes('invoice') || message.includes('payment') || message.includes('overdue')) {
      // Navigate to documents
      router.push('/(tabs)/documents' as any);
    } else if (message.includes('stock') || message.includes('inventory') || message.includes('product')) {
      // Navigate to products
      router.push('/(tabs)/products' as any);
    } else if (message.includes('sale') || message.includes('revenue')) {
      // Navigate to finances
      router.push('/(tabs)/finances' as any);
    } else {
      // Default: open modal to see full details
      setShowAlertsModal(true);
    }
  };

  const handleBookReferencePress = (bookReference: AlertType['bookReference']) => {
    if (bookReference) {
      // Navigate to book chapter or show book details
      // For now, open modal with book info
      RNAlert.alert(
        'DreamBig Book Reference',
        `Chapter ${bookReference.chapter}: ${bookReference.chapterTitle}\n\nThis chapter in your DreamBig book contains relevant guidance for this alert.`,
        [
          { text: 'OK', style: 'default' },
          { text: 'View Book', onPress: () => {
            // Navigate to books/insights page if available
            router.push('/insights' as any);
          }}
        ]
      );
    }
  };

  // Get active alerts (not dismissed)
  const activeAlerts = useMemo(() => {
    if (!metrics?.alerts) return [];
    return metrics.alerts.filter((alert: AlertType) => !dismissedAlerts.has(alert.id));
  }, [metrics?.alerts, dismissedAlerts]);

  // Get top 2 most critical alerts for compact view
  const topAlerts = useMemo(() => {
    const priorityOrder: Record<string, number> = { danger: 3, warning: 2, info: 1, success: 0 };
    return activeAlerts
      .sort((a, b) => (priorityOrder[b.type] || 0) - (priorityOrder[a.type] || 0))
      .slice(0, 2);
  }, [activeAlerts]);

  const renderAlert = (alert: AlertType, compact: boolean = false) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      danger: { bg: theme.surface.danger, border: theme.accent.danger, text: theme.accent.danger },
      warning: { bg: theme.surface.warning, border: theme.accent.warning, text: theme.accent.warning },
      info: { bg: theme.surface.info, border: theme.accent.info, text: theme.accent.info },
      success: { bg: theme.surface.success, border: theme.accent.success, text: theme.accent.success },
    };

    const color = colors[alert.type] || colors.info;

    if (compact) {
      return (
        <TouchableOpacity
          key={alert.id}
          style={[styles.alertCompact, { backgroundColor: color.bg, borderColor: color.border }]}
          onPress={() => handleAlertPress(alert)}
          activeOpacity={0.7}
        >
          <View style={[styles.alertIconCompact, { backgroundColor: color.border + '20' }]}>
            <AlertCircle size={14} color={color.border} />
          </View>
          <View style={styles.alertContentCompact}>
            <Text style={[styles.alertTextCompact, { color: theme.text.primary }]} numberOfLines={1}>
              {alert.message}
            </Text>
            {alert.action && (
              <Text style={[styles.alertActionCompact, { color: theme.text.secondary }]} numberOfLines={1}>
                {alert.action}
              </Text>
            )}
          </View>
          <ChevronRight size={16} color={theme.text.tertiary} style={{ opacity: 0.5 }} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={alert.id}
        style={[styles.alert, { backgroundColor: color.bg, borderColor: color.border }]}
        onPress={() => handleAlertPress(alert)}
        activeOpacity={0.8}
      >
        <View style={styles.alertHeader}>
          <View style={[styles.alertIconContainer, { backgroundColor: color.border }]}>
            <AlertCircle size={20} color="#FFF" />
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDismissAlert(alert.id);
            }}
            style={styles.alertDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={color.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.alertContent}>
          <Text style={[styles.alertText, { color: color.text }]}>{alert.message}</Text>
          {alert.action && (
            <View style={styles.alertActionContainer}>
              <Text style={[styles.alertAction, { color: color.text }]}>{alert.action}</Text>
            </View>
          )}
          {alert.bookReference && (
            <TouchableOpacity
              style={[styles.bookReferenceButton, { backgroundColor: color.border + '20', borderColor: color.border }]}
              onPress={(e) => {
                e.stopPropagation();
                handleBookReferencePress(alert.bookReference);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.alertBookRef, { color: color.text }]}>
                📖 {alert.bookReference.chapterTitle} (Ch. {alert.bookReference.chapter})
              </Text>
              <ChevronRight size={14} color={color.text} />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.alertFooter, { borderTopColor: color.border + '30' }]}>
          <Text style={[styles.alertTapHint, { color: color.text }]}>
            Tap to take action →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <LinearGradient
          colors={theme.gradient.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AnimatedLogo 
                size={48} 
                showGradient={true}
                rotationSpeed={4000}
                pulseEnabled={true}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={styles.greeting}>{t('auth.welcomeBack')} 👋</Text>
                <Text style={styles.businessName}>{business?.name || 'Your Business'}</Text>
              </View>
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
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 120 : 100 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        }}>
          {metrics && (
            <View style={styles.todaySection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>{t('dashboard.today').toUpperCase()}</Text>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{t('dashboard.today')}&apos;s Overview</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                  <Sparkles size={12} color={theme.accent.info} />
                  <Text style={[styles.badgeText, { color: theme.accent.info }]}>Live</Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <Animated.View style={[styles.metricCard, { 
                  backgroundColor: theme.background.card,
                  transform: [{ scale: scaleAnim }],
                }]}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.metricIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ArrowUpRight size={20} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>{t('dashboard.sales')}</Text>
                  <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(metrics?.todaySales || 0)}</Text>
                </Animated.View>

                <Animated.View style={[styles.metricCard, { 
                  backgroundColor: theme.background.card,
                  transform: [{ scale: scaleAnim }],
                }]}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.metricIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <ArrowDownRight size={20} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>{t('dashboard.expenses')}</Text>
                  <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(metrics?.todayExpenses || 0)}</Text>
                </Animated.View>
              </View>

              <LinearGradient
                colors={(metrics?.todayProfit || 0) >= 0 ? [theme.accent.success, theme.accent.success] : [theme.accent.danger, theme.accent.danger] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profitCard}
              >
                <View style={styles.profitContent}>
                  <View style={styles.profitHeader}>
                    <Text style={styles.profitLabel}>{t('dashboard.today')}&apos;s {t('dashboard.profit')}</Text>
                    <View style={styles.profitIconBg}>
                      {(metrics?.todayProfit || 0) >= 0 ? (
                        <TrendingUp size={20} color="#FFF" strokeWidth={2.5} />
                      ) : (
                        <TrendingDown size={20} color="#FFF" strokeWidth={2.5} />
                      )}
                    </View>
                  </View>
                  <Text style={styles.profitValue}>
                    {formatCurrency(metrics?.todayProfit || 0)}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Business Health Score */}
          {metrics && (
            <Animated.View style={[styles.healthCard, { 
              backgroundColor: theme.background.card,
              transform: [{ scale: scaleAnim }],
            }]}>
              <View style={styles.healthHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>HEALTH SCORE</Text>
                  <Text style={[styles.healthTitle, { color: theme.text.primary }]}>Business Health</Text>
                </View>
                <View style={[styles.healthBadge, { backgroundColor: `${getHealthColor(healthScore)}20` }]}>
                  <Text style={[styles.healthBadgeText, { color: getHealthColor(healthScore) }]}>
                    {getHealthLabel(healthScore)}
                  </Text>
                </View>
              </View>
              <View style={styles.healthScoreContainer}>
                <View style={[styles.healthScoreCircle, { borderColor: getHealthColor(healthScore) }]}>
                  <Text style={[styles.healthScoreValue, { color: getHealthColor(healthScore) }]}>
                    {String(healthScore)}
                  </Text>
                  <Text style={[styles.healthScoreLabel, { color: theme.text.tertiary }]}>/ 100</Text>
                </View>
                <View style={styles.healthIndicators}>
                  <View style={styles.healthIndicator}>
                    <View style={[
                      styles.healthIndicatorBar,
                      { 
                        backgroundColor: (metrics?.monthProfit || 0) >= 0 ? theme.accent.success : theme.accent.danger,
                        width: `${Math.min(100, Math.abs(metrics?.monthProfit || 0) / Math.max(metrics?.monthSales || 1, 1) * 100)}%`
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
                        backgroundColor: (metrics?.cashPosition || 0) >= 0 ? theme.accent.success : theme.accent.danger,
                        width: `${Math.min(100, Math.max(0, ((metrics?.cashPosition || 0) / Math.max(business?.capital || 1, 1)) * 100))}%`
                      }
                    ]} />
                    <Text style={[styles.healthIndicatorLabel, { color: theme.text.secondary }]}>
                      Cash Position
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {metrics && (
            <View style={styles.monthSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>MONTHLY</Text>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>This Month</Text>
                </View>
                <Activity size={16} color={theme.text.tertiary} />
              </View>
              
              <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>{t('dashboard.sales')}</Text>
                  <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{formatCurrency(metrics?.monthSales || 0)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>{t('dashboard.expenses')}</Text>
                  <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{formatCurrency(metrics?.monthExpenses || 0)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: theme.border.light }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelBold, { color: theme.text.primary }]}>Net Profit</Text>
                  <Text style={[
                    styles.summaryValueBold,
                    { color: (metrics?.monthProfit || 0) >= 0 ? theme.accent.success : theme.accent.danger }
                  ]}>
                    {formatCurrency(metrics?.monthProfit || 0)}
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
                  <Text style={[styles.cashValue, { color: theme.accent.primary }]}>{formatCurrency(metrics?.cashPosition || 0)}</Text>
                </View>
              </View>
            </View>
          )}

              {metrics && activeAlerts.length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.alertsHeader}>
                <View style={styles.alertsHeaderLeft}>
                  <View>
                    <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>{t('dashboard.alerts').toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{t('dashboard.alerts')}</Text>
                      {activeAlerts.length > 0 && (
                        <View style={[styles.notificationBadge, { backgroundColor: theme.accent.danger }]}>
                          <Text style={styles.notificationBadgeText}>{activeAlerts.length}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {activeAlerts.length > 2 && (
                  <TouchableOpacity
                    onPress={() => setShowAlertsModal(true)}
                    style={styles.viewAllButton}
                  >
                    <Text style={[styles.viewAllText, { color: theme.accent.primary }]}>View All</Text>
                    <ChevronRight size={14} color={theme.accent.primary} />
                  </TouchableOpacity>
                )}
              </View>
              {topAlerts.slice(0, 2).map(alert => renderAlert(alert, true))}
            </View>
          )}

          {/* Advertisements Section */}
          {dashboardAds.length > 0 && (
            <View style={styles.adsSection}>
              {dashboardAds.slice(0, 2).map((ad) => (
                <AdCard key={ad.id} ad={ad} location="dashboard" />
              ))}
            </View>
          )}

          {/* Document Management Section */}
          <View style={styles.documentManagementSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>DOCUMENTS</Text>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Document Management</Text>
              </View>
              <TouchableOpacity>
                <Text style={[styles.moreButton, { color: theme.text.tertiary }]}>⋯</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.documentManagementGrid}>
              <TouchableOpacity 
                style={[styles.documentManagementCard, { backgroundColor: theme.background.card }]}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/documents',
                    params: { filterType: 'invoice' }
                  } as any);
                }}
              >
                <View style={[styles.documentManagementIcon, { backgroundColor: '#0066CC20' }]}>
                  <FileTextIcon size={24} color="#0066CC" />
                </View>
                <Text style={[styles.documentManagementLabel, { color: theme.text.primary }]}>Invoices</Text>
                <Text style={[styles.documentManagementCount, { color: theme.text.tertiary }]}>
                  {documents.filter(d => d.type === 'invoice').length}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.documentManagementCard, { backgroundColor: theme.background.card }]}
                onPress={() => router.push('/(tabs)/documents' as any)}
              >
                <View style={[styles.documentManagementIcon, { backgroundColor: '#10B98120' }]}>
                  <FileTextIcon size={24} color="#10B981" />
                </View>
                <Text style={[styles.documentManagementLabel, { color: theme.text.primary }]}>All Documents</Text>
                <Text style={[styles.documentManagementCount, { color: theme.text.tertiary }]}>
                  {documents.length}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.documentManagementCard, { backgroundColor: theme.background.card }]}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/documents',
                    params: { filterType: 'receipt' }
                  } as any);
                }}
              >
                <View style={[styles.documentManagementIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Receipt size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.documentManagementLabel, { color: theme.text.primary }]}>Receipts</Text>
                <Text style={[styles.documentManagementCount, { color: theme.text.tertiary }]}>
                  {documents.filter(d => d.type === 'receipt').length}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Growth Section */}
          <View style={styles.growthSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>GROWTH</Text>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Growth</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/customers' as any)}
                style={styles.viewAllButton}
              >
                <Text style={[styles.viewAllText, { color: theme.accent.primary }]}>View All</Text>
                <ChevronRight size={14} color={theme.accent.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.growthContent}>
              <View style={styles.growthStatsRow}>
                <View style={[styles.growthStatCard, { backgroundColor: theme.background.card }]}>
                  <View style={[styles.growthStatIcon, { backgroundColor: '#10B98120' }]}>
                    <UsersIcon size={20} color="#10B981" />
                  </View>
                  <Text style={[styles.growthStatValue, { color: theme.text.primary }]}>
                    {metrics?.newCustomers || 0}
                  </Text>
                  <Text style={[styles.growthStatLabel, { color: theme.text.secondary }]}>New customers</Text>
                  <View style={styles.growthTrend}>
                    <ArrowUpRight size={12} color="#10B981" />
                  </View>
                </View>
                <View style={[styles.growthStatCard, { backgroundColor: theme.background.card }]}>
                  <View style={[styles.growthStatIcon, { backgroundColor: '#0066CC20' }]}>
                    <TrendingUpIcon size={20} color="#0066CC" />
                  </View>
                  <Text style={[styles.growthStatValue, { color: theme.text.primary }]}>
                    {metrics?.salesTrend !== undefined ? `${metrics.salesTrend > 0 ? '+' : ''}${metrics.salesTrend}%` : '0%'}
                  </Text>
                  <Text style={[styles.growthStatLabel, { color: theme.text.secondary }]}>Sales growth</Text>
                  <View style={styles.growthTrend}>
                    {metrics?.salesTrend !== undefined && metrics.salesTrend >= 0 ? (
                      <ArrowUpRight size={12} color="#10B981" />
                    ) : (
                      <ArrowDownRight size={12} color="#EF4444" />
                    )}
                  </View>
                </View>
              </View>
              {chartData.salesTrend.some(v => v > 0) && (
                <View style={[styles.growthChartCard, { backgroundColor: theme.background.card }]}>
                  <Text style={[styles.growthChartTitle, { color: theme.text.primary }]}>Sales trends</Text>
                  <LineChart
                    data={chartData.salesTrend.slice(-12)}
                    labels={chartData.salesLabels.slice(-12)}
                    color={theme.accent.primary}
                    height={120}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Charts Section */}
          <View style={styles.chartsSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>ANALYTICS</Text>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Interactive charts</Text>
              </View>
              <View style={styles.periodSelectorContainer}>
                <TouchableOpacity
                  style={[styles.periodSelector, { backgroundColor: theme.background.secondary }]}
                  onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
                >
                  <Text style={[styles.periodSelectorText, { color: theme.text.primary }]}>
                    {chartPeriod.charAt(0).toUpperCase() + chartPeriod.slice(1)}
                  </Text>
                  <ChevronDown size={16} color={theme.text.secondary} />
                </TouchableOpacity>
                {showPeriodDropdown && (
                  <View style={[styles.periodDropdown, { backgroundColor: theme.background.card }]}>
                    {(['day', 'week', 'month', 'year'] as const).map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={styles.periodOption}
                        onPress={() => {
                          setChartPeriod(period);
                          setShowPeriodDropdown(false);
                        }}
                      >
                        <Text style={[styles.periodOptionText, { 
                          color: chartPeriod === period ? theme.accent.primary : theme.text.primary 
                        }]}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            
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

            {/* Combined Revenue/Expenses/Profit Chart */}
            {chartData.revenueExpenseProfit && chartData.revenueExpenseProfit.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.background.card }]}>
                <View style={styles.chartHeader}>
                  <BarChart3 size={20} color={theme.accent.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Revenue vs Expenses</Text>
                </View>
                {/* Legend */}
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#0066CC' }]} />
                    <Text style={[styles.legendText, { color: theme.text.secondary }]}>
                      Revenue {formatCurrency(chartData.revenueExpenseProfit.reduce((sum, d) => sum + d.revenue, 0))}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: theme.text.secondary }]}>
                      Expenses {formatCurrency(chartData.revenueExpenseProfit.reduce((sum, d) => sum + d.expenses, 0))}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, { color: theme.text.secondary }]}>
                      Profit {chartData.revenueExpenseProfit.length > 0 
                        ? (chartData.revenueExpenseProfit.reduce((sum, d) => sum + d.profitPercent, 0) / chartData.revenueExpenseProfit.length).toFixed(2)
                        : '0.00'}%
                    </Text>
                  </View>
                </View>
                {/* Combined Bar Chart */}
                <View style={styles.combinedChartContainer}>
                  <BarChart
                    data={chartData.revenueExpenseProfit.map(d => ({
                      label: d.label,
                      value: d.revenue,
                      color: '#0066CC',
                    }))}
                    height={200}
                    showValues={false}
                  />
                </View>
              </View>
            )}
          </View>

          {metrics && metrics.topCategories && metrics.topCategories.length > 0 && (
            <View style={styles.categoriesSection}>
              <View>
                <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>{t('dashboard.topCategories').toUpperCase()}</Text>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{t('dashboard.topCategories')}</Text>
              </View>
              {metrics.topCategories.map((cat: any, index: number) => (
                <View key={index} style={[styles.categoryItem, { backgroundColor: theme.background.card }]}>
                  <View style={[styles.categoryRank, { backgroundColor: theme.accent.primary }]}>
                    <Text style={styles.categoryRankText}>{String(index + 1)}</Text>
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
                style={[styles.actionButtonGradient, { pointerEvents: 'none' }]}
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

      {/* Alerts Modal */}
      <Modal
        visible={showAlertsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAlertsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border.light }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>All Alerts</Text>
                <Text style={[styles.modalSubtitle, { color: theme.text.secondary }]}>
                  {activeAlerts.length} active notification{activeAlerts.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlertsModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
              {activeAlerts.length === 0 ? (
                <View style={styles.emptyAlerts}>
                  <Bell size={48} color={theme.text.tertiary} />
                  <Text style={[styles.emptyAlertsText, { color: theme.text.secondary }]}>
                    No active alerts
                  </Text>
                  <Text style={[styles.emptyAlertsSubtext, { color: theme.text.tertiary }]}>
                    Your business is doing great!
                  </Text>
                </View>
              ) : (
                activeAlerts.map(alert => renderAlert(alert, false))
              )}
            </ScrollView>
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
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFF',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  todaySection: {
    marginTop: 0,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 3,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
    letterSpacing: -0.3,
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
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  profitCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
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
    fontSize: 42,
    fontWeight: '900' as const,
    color: '#FFF',
    letterSpacing: -1,
  },
  monthSection: {
    marginBottom: 20,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
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
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
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
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  alertsSection: {
    marginBottom: 20,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  notificationBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  alertCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  alertIconCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContentCompact: {
    flex: 1,
  },
  alertTextCompact: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 16,
    flex: 1,
  },
  alertActionCompact: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
    opacity: 0.7,
  },
  alert: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDismiss: {
    padding: 4,
  },
  alertContent: {
    gap: 8,
  },
  alertText: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  alertActionContainer: {
    marginTop: 4,
  },
  alertAction: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  bookReferenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  alertBookRef: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    flex: 1,
  },
  alertFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  alertTapHint: {
    fontSize: 11,
    fontWeight: '500' as const,
    opacity: 0.7,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    backgroundColor: 'transparent',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalContent: {
    flex: 1,
    maxHeight: '100%',
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyAlerts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyAlertsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptyAlertsSubtext: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.9,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '700' as const,
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButtonGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  actionButtonSecondary: {
    height: 58,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonSecondaryText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  chartsSection: {
    marginBottom: 20,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  healthCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
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
    fontSize: 36,
    fontWeight: '900' as const,
    lineHeight: 40,
    letterSpacing: -1,
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
  adsSection: {
    marginTop: 24,
    marginBottom: 24,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentManagementSection: {
    marginBottom: 20,
  },
  documentManagementGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  documentManagementCard: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  documentManagementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentManagementLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginTop: 4,
  },
  documentManagementCount: {
    fontSize: 11,
    fontWeight: '500' as const,
    textAlign: 'center',
    marginTop: 2,
  },
  growthSection: {
    marginBottom: 20,
  },
  growthContent: {
    gap: 12,
    marginTop: 12,
  },
  growthStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  growthStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  growthStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  growthStatValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 2,
  },
  growthStatLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  growthTrend: {
    marginTop: 4,
  },
  growthChartCard: {
    padding: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  growthChartTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  periodSelectorContainer: {
    position: 'relative',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  periodSelectorText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  periodDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 120,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  periodOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  combinedChartContainer: {
    marginTop: 8,
  },
  moreButton: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
});
