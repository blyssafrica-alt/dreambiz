import { Stack, useRouter } from 'expo-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { ArrowLeft, Building2, Wallet, TrendingUp, TrendingDown, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function BalanceSheetScreen() {
  const { theme } = useTheme();
  const { business, transactions, documents } = useBusiness();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    calculateBalanceSheet();
  }, [asOfDate, transactions, documents, business]);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const calculateBalanceSheet = async () => {
    setLoading(true);
    try {
      if (!transactions || transactions.length === 0) {
        setBalanceSheetData({
          assets: { current: 0, fixed: 0, total: 0 },
          liabilities: { current: 0, longTerm: 0, total: 0 },
          equity: { capital: 0, retainedEarnings: 0, total: 0 },
          balances: true,
        });
        setLoading(false);
        return;
      }

      const filteredTransactions = transactions.filter(t => t.date <= asOfDate);

      // ASSETS
      // Current Assets
      const cash = business?.capital || 0;
      const sales = filteredTransactions.filter(t => t.type === 'sale');
      const totalRevenue = sales.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const expenses = filteredTransactions.filter(t => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const netIncome = totalRevenue - totalExpenses;
      const cashBalance = cash + netIncome;

      // Accounts Receivable (unpaid invoices)
      const unpaidInvoices = documents?.filter(d => 
        d.type === 'invoice' && 
        d.status !== 'paid' && 
        d.date <= asOfDate
      ) || [];
      const accountsReceivable = unpaidInvoices.reduce((sum, d) => sum + parseFloat(d.total.toString()), 0);

      // Inventory (if products exist)
      // This would need product data - for now, estimate from cost of goods
      const inventory = 0; // Would calculate from products table

      const currentAssets = cashBalance + accountsReceivable + inventory;

      // Fixed Assets (capital purchases)
      const fixedAssets = expenses
        .filter(t => ['Capital Purchase', 'Equipment', 'Property'].includes(t.category || ''))
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      const totalAssets = currentAssets + fixedAssets;

      // LIABILITIES
      // Current Liabilities
      // Accounts Payable (unpaid supplier invoices - would need supplier data)
      const accountsPayable = 0; // Would calculate from supplier invoices

      // Short-term loans (would need loan data)
      const shortTermLoans = 0;

      const currentLiabilities = accountsPayable + shortTermLoans;

      // Long-term Liabilities
      const longTermLoans = 0; // Would calculate from loan data

      const totalLiabilities = currentLiabilities + longTermLoans;

      // EQUITY
      const capital = business?.capital || 0;
      const retainedEarnings = netIncome; // Simplified - would track retained earnings separately
      const totalEquity = capital + retainedEarnings;

      // Check if balance sheet balances
      const balances = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

      setBalanceSheetData({
        assets: {
          current: {
            cash: cashBalance,
            accountsReceivable,
            inventory,
            total: currentAssets,
          },
          fixed: fixedAssets,
          total: totalAssets,
        },
        liabilities: {
          current: {
            accountsPayable,
            shortTermLoans,
            total: currentLiabilities,
          },
          longTerm: longTermLoans,
          total: totalLiabilities,
        },
        equity: {
          capital,
          retainedEarnings,
          total: totalEquity,
        },
        balances,
      });
    } catch (error) {
      console.error('Error calculating balance sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Balance Sheet</Text>
              <Text style={styles.headerSubtitle}>
                Statement of Financial Position
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
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                  Calculating balance sheet...
                </Text>
              </View>
            ) : balanceSheetData ? (
              <>
                {/* Balance Check */}
                {balanceSheetData.balances ? (
                  <View style={[styles.balanceCheck, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
                    <FileText size={20} color="#10B981" />
                    <Text style={[styles.balanceCheckText, { color: '#065F46' }]}>
                      ✓ Balance Sheet Balances
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.balanceCheck, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                    <FileText size={20} color="#EF4444" />
                    <Text style={[styles.balanceCheckText, { color: '#991B1B' }]}>
                      ⚠ Balance Sheet does not balance
                    </Text>
                  </View>
                )}

                {/* ASSETS */}
                <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.sectionHeader}>
                    <TrendingUp size={20} color="#10B981" />
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>ASSETS</Text>
                  </View>

                  <Text style={[styles.subsectionTitle, { color: theme.text.secondary }]}>
                    Current Assets
                  </Text>
                  
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Cash</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.assets.current.cash)}
                    </Text>
                  </View>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Accounts Receivable</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.assets.current.accountsReceivable)}
                    </Text>
                  </View>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Inventory</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.assets.current.inventory)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary, fontWeight: '700' }]}>
                      Total Current Assets
                    </Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary, fontWeight: '700' }]}>
                      {formatCurrency(balanceSheetData.assets.current.total)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={[styles.subsectionTitle, { color: theme.text.secondary }]}>
                    Fixed Assets
                  </Text>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Property, Plant & Equipment</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.assets.fixed)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary, fontWeight: '900' }]}>
                      TOTAL ASSETS
                    </Text>
                    <Text style={[styles.itemValue, { color: '#10B981', fontWeight: '900', fontSize: 18 }]}>
                      {formatCurrency(balanceSheetData.assets.total)}
                    </Text>
                  </View>
                </View>

                {/* LIABILITIES */}
                <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.sectionHeader}>
                    <TrendingDown size={20} color="#EF4444" />
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>LIABILITIES</Text>
                  </View>

                  <Text style={[styles.subsectionTitle, { color: theme.text.secondary }]}>
                    Current Liabilities
                  </Text>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Accounts Payable</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.liabilities.current.accountsPayable)}
                    </Text>
                  </View>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Short-term Loans</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.liabilities.current.shortTermLoans)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary, fontWeight: '700' }]}>
                      Total Current Liabilities
                    </Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary, fontWeight: '700' }]}>
                      {formatCurrency(balanceSheetData.liabilities.current.total)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={[styles.subsectionTitle, { color: theme.text.secondary }]}>
                    Long-term Liabilities
                  </Text>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Long-term Loans</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.liabilities.longTerm)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary, fontWeight: '900' }]}>
                      TOTAL LIABILITIES
                    </Text>
                    <Text style={[styles.itemValue, { color: '#EF4444', fontWeight: '900', fontSize: 18 }]}>
                      {formatCurrency(balanceSheetData.liabilities.total)}
                    </Text>
                  </View>
                </View>

                {/* EQUITY */}
                <View style={[styles.sectionCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.sectionHeader}>
                    <Building2 size={20} color="#3B82F6" />
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>EQUITY</Text>
                  </View>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Capital</Text>
                    <Text style={[styles.itemValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.equity.capital)}
                    </Text>
                  </View>

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary }]}>Retained Earnings</Text>
                    <Text style={[styles.itemValue, {
                      color: balanceSheetData.equity.retainedEarnings >= 0 ? '#10B981' : '#EF4444',
                    }]}>
                      {formatCurrency(balanceSheetData.equity.retainedEarnings)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemRow}>
                    <Text style={[styles.itemLabel, { color: theme.text.primary, fontWeight: '900' }]}>
                      TOTAL EQUITY
                    </Text>
                    <Text style={[styles.itemValue, { color: '#3B82F6', fontWeight: '900', fontSize: 18 }]}>
                      {formatCurrency(balanceSheetData.equity.total)}
                    </Text>
                  </View>
                </View>

                {/* Balance Check */}
                <View style={[styles.balanceEquation, { backgroundColor: theme.background.card }]}>
                  <Text style={[styles.equationTitle, { color: theme.text.primary }]}>
                    Accounting Equation
                  </Text>
                  <Text style={[styles.equationText, { color: theme.text.secondary }]}>
                    Assets = Liabilities + Equity
                  </Text>
                  <View style={styles.equationRow}>
                    <Text style={[styles.equationValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.assets.total)}
                    </Text>
                    <Text style={[styles.equationOperator, { color: theme.text.secondary }]}> = </Text>
                    <Text style={[styles.equationValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.liabilities.total)}
                    </Text>
                    <Text style={[styles.equationOperator, { color: theme.text.secondary }]}> + </Text>
                    <Text style={[styles.equationValue, { color: theme.text.primary }]}>
                      {formatCurrency(balanceSheetData.equity.total)}
                    </Text>
                  </View>
                  <Text style={[styles.equationResult, {
                    color: balanceSheetData.balances ? '#10B981' : '#EF4444',
                  }]}>
                    {balanceSheetData.balances ? '✓ Balanced' : '⚠ Not Balanced'}
                  </Text>
                </View>
              </>
            ) : null}
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  balanceCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
    gap: 12,
  },
  balanceCheckText: {
    fontSize: 16,
    fontWeight: '700',
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 14,
    flex: 1,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  balanceEquation: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  equationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  equationText: {
    fontSize: 14,
    marginBottom: 16,
  },
  equationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  equationValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  equationOperator: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  equationResult: {
    fontSize: 16,
    fontWeight: '700',
  },
});

