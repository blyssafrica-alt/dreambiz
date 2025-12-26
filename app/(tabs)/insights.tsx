import { Stack } from 'expo-router';
import { 
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  DollarSign,
  Package,
  Users,
  Calendar
} from 'lucide-react-native';
import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export default function InsightsScreen() {
  const { business, transactions, products, customers, budgets } = useBusiness();
  const { theme } = useTheme();

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const insights = useMemo(() => {
    const result: Insight[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate metrics
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });
    const monthSales = monthTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const monthProfit = monthSales - monthExpenses;
    const profitMargin = monthSales > 0 ? (monthProfit / monthSales) * 100 : 0;

    // Previous month for comparison
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
    });
    const prevMonthSales = prevMonthTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const salesGrowth = prevMonthSales > 0 ? ((monthSales - prevMonthSales) / prevMonthSales) * 100 : 0;

    // Low stock products
    const lowStockProducts = products.filter(p => p.isActive && p.quantity <= 10 && p.quantity > 0);
    if (lowStockProducts.length > 0) {
      result.push({
        id: 'low-stock',
        type: 'warning',
        title: `${lowStockProducts.length} Product${lowStockProducts.length > 1 ? 's' : ''} Running Low`,
        description: `Consider restocking: ${lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}${lowStockProducts.length > 3 ? '...' : ''}`,
        action: 'View Products',
        priority: 'high',
      });
    }

    // Out of stock products
    const outOfStockProducts = products.filter(p => p.isActive && p.quantity === 0);
    if (outOfStockProducts.length > 0) {
      result.push({
        id: 'out-of-stock',
        type: 'warning',
        title: `${outOfStockProducts.length} Product${outOfStockProducts.length > 1 ? 's' : ''} Out of Stock`,
        description: `These products need immediate restocking`,
        action: 'Restock Now',
        priority: 'high',
      });
    }

    // Sales growth insights
    if (salesGrowth > 20) {
      result.push({
        id: 'sales-growth',
        type: 'success',
        title: 'Strong Sales Growth',
        description: `Your sales increased by ${salesGrowth.toFixed(1)}% compared to last month. Keep up the momentum!`,
        priority: 'medium',
      });
    } else if (salesGrowth < -10) {
      result.push({
        id: 'sales-decline',
        type: 'warning',
        title: 'Sales Decline Detected',
        description: `Sales decreased by ${Math.abs(salesGrowth).toFixed(1)}% compared to last month. Consider reviewing your marketing strategy.`,
        action: 'Review Strategy',
        priority: 'high',
      });
    }

    // Profit margin insights
    if (profitMargin < 10 && monthSales > 0) {
      result.push({
        id: 'low-margin',
        type: 'warning',
        title: 'Low Profit Margin',
        description: `Your profit margin is ${profitMargin.toFixed(1)}%. Consider reviewing your pricing or reducing costs.`,
        action: 'Review Pricing',
        priority: 'high',
      });
    } else if (profitMargin > 30) {
      result.push({
        id: 'high-margin',
        type: 'success',
        title: 'Excellent Profit Margin',
        description: `Your profit margin of ${profitMargin.toFixed(1)}% is excellent!`,
        priority: 'low',
      });
    }

    // Budget insights
    const activeBudgets = budgets.filter(b => {
      const endDate = new Date(b.endDate);
      return endDate >= now;
    });
    activeBudgets.forEach(budget => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.date >= budget.startDate && t.date <= budget.endDate)
        .reduce((sum, t) => sum + t.amount, 0);
      const percentage = (spent / budget.totalBudget) * 100;
      
      if (percentage > 90) {
        result.push({
          id: `budget-${budget.id}`,
          type: 'warning',
          title: `Budget Alert: ${budget.name}`,
          description: `You've spent ${percentage.toFixed(1)}% of your budget. ${percentage >= 100 ? 'Budget exceeded!' : 'Approaching limit.'}`,
          action: 'View Budget',
          priority: percentage >= 100 ? 'high' : 'medium',
        });
      }
    });

    // Customer insights
    if (customers.length > 0) {
      const customersWithPurchases = customers.filter(c => c.totalPurchases > 0);
      const avgPurchaseValue = customersWithPurchases.length > 0
        ? customersWithPurchases.reduce((sum, c) => sum + c.totalPurchases, 0) / customersWithPurchases.length
        : 0;
      
      if (avgPurchaseValue > 0) {
        result.push({
          id: 'customer-value',
          type: 'info',
          title: 'Customer Value Analysis',
          description: `Average customer lifetime value: ${formatCurrency(avgPurchaseValue)}. Focus on retaining high-value customers.`,
          priority: 'medium',
        });
      }
    }

    // Expense category insights
    const expenseCategories = new Map<string, number>();
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const current = expenseCategories.get(t.category) || 0;
        expenseCategories.set(t.category, current + t.amount);
      });
    
    const topExpenseCategory = Array.from(expenseCategories.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topExpenseCategory && topExpenseCategory[1] > monthExpenses * 0.4) {
      result.push({
        id: 'expense-category',
        type: 'info',
        title: 'Top Expense Category',
        description: `${topExpenseCategory[0]} accounts for ${((topExpenseCategory[1] / monthExpenses) * 100).toFixed(1)}% of your expenses. Review if this is expected.`,
        priority: 'low',
      });
    }

    // Opportunity: Increase prices
    if (profitMargin > 0 && profitMargin < 15 && monthSales > 0) {
      result.push({
        id: 'price-increase',
        type: 'opportunity',
        title: 'Pricing Opportunity',
        description: `A 10% price increase could boost your profit margin to ${((monthProfit * 1.1) / (monthSales * 1.1) * 100).toFixed(1)}%`,
        action: 'Review Pricing',
        priority: 'medium',
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [transactions, products, budgets, customers, formatCurrency]);

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb size={20} color="#F59E0B" />;
      case 'warning':
        return <AlertTriangle size={20} color="#EF4444" />;
      case 'success':
        return <TrendingUp size={20} color="#10B981" />;
      case 'info':
        return <Target size={20} color="#3B82F6" />;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return '#F59E0B';
      case 'warning':
        return '#EF4444';
      case 'success':
        return '#10B981';
      case 'info':
        return '#3B82F6';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'AI Insights', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <View style={styles.headerContent}>
          <Sparkles size={28} color={theme.accent.primary} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>AI Insights</Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
              Smart recommendations for your business
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {insights.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              No Insights Yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              As you use the app, we&apos;ll generate personalized insights and recommendations for your business.
            </Text>
          </View>
        ) : (
          insights.map(insight => {
            const color = getInsightColor(insight.type);
            
            return (
              <View
                key={insight.id}
                style={[
                  styles.insightCard,
                  { backgroundColor: theme.background.card },
                  { borderLeftWidth: 4, borderLeftColor: color },
                ]}
              >
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: color + '20' }]}>
                    {getInsightIcon(insight.type)}
                  </View>
                  <View style={styles.insightContent}>
                    <View style={styles.insightTitleRow}>
                      <Text style={[styles.insightTitle, { color: theme.text.primary }]}>
                        {insight.title}
                      </Text>
                      <View style={[styles.priorityBadge, { backgroundColor: theme.background.secondary }]}>
                        <Text style={[styles.priorityText, { color: theme.text.tertiary }]}>
                          {insight.priority}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.insightDescription, { color: theme.text.secondary }]}>
                      {insight.description}
                    </Text>
                    {insight.action && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: color + '20' }]}
                      >
                        <Text style={[styles.actionButtonText, { color }]}>
                          {insight.action}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

