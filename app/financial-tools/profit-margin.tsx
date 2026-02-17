import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react-native';

export default function ProfitMarginAnalyzerScreen() {
  const { theme } = useTheme();
  const { business, transactions, products } = useBusiness();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [revenue, setRevenue] = useState('');
  const [costOfGoodsSold, setCostOfGoodsSold] = useState('');
  const [operatingExpenses, setOperatingExpenses] = useState('');
  const [result, setResult] = useState<any>(null);

  // Auto-fill from transactions
  useEffect(() => {
    if (transactions && transactions.length > 0 && !revenue) {
      const totalRevenue = transactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      if (totalRevenue > 0) {
        setRevenue(totalRevenue.toFixed(2));
      }

      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      if (totalExpenses > 0) {
        setOperatingExpenses(totalExpenses.toFixed(2));
      }
    }
  }, [transactions]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const calculate = () => {
    const rev = parseFloat(revenue) || 0;
    const cogs = parseFloat(costOfGoodsSold) || 0;
    const opEx = parseFloat(operatingExpenses) || 0;

    if (!rev) {
      setResult({ error: 'Please enter revenue' });
      return;
    }

    const grossProfit = rev - cogs;
    const grossMargin = rev > 0 ? (grossProfit / rev) * 100 : 0;
    const operatingProfit = grossProfit - opEx;
    const operatingMargin = rev > 0 ? (operatingProfit / rev) * 100 : 0;
    const netProfit = operatingProfit;
    const netMargin = rev > 0 ? (netProfit / rev) * 100 : 0;

    // Analyze margins
    let grossStatus = 'good';
    let operatingStatus = 'good';
    let netStatus = 'good';

    if (grossMargin < 20) grossStatus = 'low';
    else if (grossMargin < 40) grossStatus = 'medium';
    
    if (operatingMargin < 5) operatingStatus = 'low';
    else if (operatingMargin < 15) operatingStatus = 'medium';
    
    if (netMargin < 0) netStatus = 'loss';
    else if (netMargin < 5) netStatus = 'low';
    else if (netMargin < 15) netStatus = 'medium';

    setResult({
      revenue: rev,
      costOfGoodsSold: cogs,
      operatingExpenses: opEx,
      grossProfit,
      grossMargin,
      operatingProfit,
      operatingMargin,
      netProfit,
      netMargin,
      grossStatus,
      operatingStatus,
      netStatus,
    });
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'low': return '#EF4444';
      case 'loss': return '#DC2626';
      default: return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good': return 'Excellent';
      case 'medium': return 'Fair';
      case 'low': return 'Low';
      case 'loss': return 'Loss';
      default: return 'Unknown';
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Profit Margin Analyzer</Text>
              <Text style={styles.headerSubtitle}>Analyze your profit margins</Text>
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
            <View style={styles.infoCard}>
              <TrendingUp size={24} color={theme.accent.warning} />
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                Analyze your gross, operating, and net profit margins to understand your business profitability.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Total Revenue ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Total sales income
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.card,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  value={revenue}
                  onChangeText={setRevenue}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Cost of Goods Sold ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Direct costs to produce goods/services
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.card,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  value={costOfGoodsSold}
                  onChangeText={setCostOfGoodsSold}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Operating Expenses ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Rent, salaries, utilities, marketing, etc.
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.card,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  value={operatingExpenses}
                  onChangeText={setOperatingExpenses}
                />
              </View>

              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: theme.accent.warning }]}
                onPress={calculate}
              >
                <Text style={styles.calculateButtonText}>Analyze Margins</Text>
              </TouchableOpacity>
            </View>

            {result?.error && (
              <View style={[styles.errorCard, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <AlertCircle size={20} color="#EF4444" />
                <Text style={[styles.errorText, { color: '#991B1B' }]}>{result.error}</Text>
              </View>
            )}

            {result && !result.error && (
              <View style={styles.results}>
                {/* Gross Margin */}
                <View style={[styles.marginCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.marginHeader}>
                    <BarChart3 size={20} color={getStatusColor(result.grossStatus)} />
                    <Text style={[styles.marginTitle, { color: theme.text.primary }]}>
                      Gross Profit Margin
                    </Text>
                  </View>
                  <View style={[styles.marginBadge, { backgroundColor: getStatusColor(result.grossStatus) + '20' }]}>
                    <Text style={[styles.marginBadgeText, { color: getStatusColor(result.grossStatus) }]}>
                      {getStatusText(result.grossStatus)}
                    </Text>
                  </View>
                  <Text style={[styles.marginValue, { color: getStatusColor(result.grossStatus) }]}>
                    {result.grossMargin.toFixed(1)}%
                  </Text>
                  <View style={styles.divider} />
                  <View style={styles.marginDetails}>
                    <Text style={[styles.marginDetailLabel, { color: theme.text.secondary }]}>Gross Profit</Text>
                    <Text style={[styles.marginDetailValue, { color: theme.text.primary }]}>
                      {formatCurrency(result.grossProfit)}
                    </Text>
                  </View>
                </View>

                {/* Operating Margin */}
                <View style={[styles.marginCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.marginHeader}>
                    <TrendingUp size={20} color={getStatusColor(result.operatingStatus)} />
                    <Text style={[styles.marginTitle, { color: theme.text.primary }]}>
                      Operating Profit Margin
                    </Text>
                  </View>
                  <View style={[styles.marginBadge, { backgroundColor: getStatusColor(result.operatingStatus) + '20' }]}>
                    <Text style={[styles.marginBadgeText, { color: getStatusColor(result.operatingStatus) }]}>
                      {getStatusText(result.operatingStatus)}
                    </Text>
                  </View>
                  <Text style={[styles.marginValue, { color: getStatusColor(result.operatingStatus) }]}>
                    {result.operatingMargin.toFixed(1)}%
                  </Text>
                  <View style={styles.divider} />
                  <View style={styles.marginDetails}>
                    <Text style={[styles.marginDetailLabel, { color: theme.text.secondary }]}>Operating Profit</Text>
                    <Text style={[styles.marginDetailValue, { color: theme.text.primary }]}>
                      {formatCurrency(result.operatingProfit)}
                    </Text>
                  </View>
                </View>

                {/* Net Margin */}
                <View style={[styles.marginCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.marginHeader}>
                    <CheckCircle size={20} color={getStatusColor(result.netStatus)} />
                    <Text style={[styles.marginTitle, { color: theme.text.primary }]}>
                      Net Profit Margin
                    </Text>
                  </View>
                  <View style={[styles.marginBadge, { backgroundColor: getStatusColor(result.netStatus) + '20' }]}>
                    <Text style={[styles.marginBadgeText, { color: getStatusColor(result.netStatus) }]}>
                      {getStatusText(result.netStatus)}
                    </Text>
                  </View>
                  <Text style={[styles.marginValue, { color: getStatusColor(result.netStatus) }]}>
                    {result.netMargin.toFixed(1)}%
                  </Text>
                  <View style={styles.divider} />
                  <View style={styles.marginDetails}>
                    <Text style={[styles.marginDetailLabel, { color: theme.text.secondary }]}>Net Profit</Text>
                    <Text style={[styles.marginDetailValue, { color: result.netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                      {formatCurrency(result.netProfit)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.tipsCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <Text style={[styles.tipsTitle, { color: '#1E40AF' }]}>💡 Margin Benchmarks</Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Gross Margin: 40%+ (excellent), 20-40% (good), {'<'}20% (low)
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Operating Margin: 15%+ (excellent), 5-15% (good), {'<'}5% (low)
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Net Margin: 15%+ (excellent), 5-15% (good), {'<'}5% (low)
                  </Text>
                </View>
              </View>
            )}
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
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  calculateButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  errorCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  results: {
    gap: 16,
  },
  marginCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  marginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  marginTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  marginBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  marginBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  marginValue: {
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  marginDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marginDetailLabel: {
    fontSize: 14,
  },
  marginDetailValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
});

