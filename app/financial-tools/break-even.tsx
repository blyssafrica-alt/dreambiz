import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { ArrowLeft, Target, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react-native';

export default function BreakEvenCalculatorScreen() {
  const { theme } = useTheme();
  const { business, transactions } = useBusiness();
  const { isFeatureVisible, isLoading: featuresLoading } = useFeatures();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Check if this specific tool is visible
  const toolVisible = isFeatureVisible('break-even-calculator') || isFeatureVisible('financial-tools');
  
  useEffect(() => {
    if (!featuresLoading && !toolVisible) {
      router.back();
    }
  }, [toolVisible, featuresLoading, router]);
  
  const [fixedCosts, setFixedCosts] = useState('');
  const [variableCostPerUnit, setVariableCostPerUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [result, setResult] = useState<any>(null);

  // Auto-fill from transactions if available
  useEffect(() => {
    if (transactions && transactions.length > 0 && !fixedCosts) {
      const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      if (monthlyExpenses > 0) {
        setFixedCosts(monthlyExpenses.toFixed(2));
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
    const fixed = parseFloat(fixedCosts) || 0;
    const variable = parseFloat(variableCostPerUnit) || 0;
    const price = parseFloat(pricePerUnit) || 0;

    if (!fixed || !price) {
      setResult({ error: 'Please enter fixed costs and price per unit' });
      return;
    }

    if (price <= variable) {
      setResult({ error: 'Price must be higher than variable cost per unit' });
      return;
    }

    const contributionMargin = price - variable;
    const breakEvenUnits = Math.ceil(fixed / contributionMargin);
    const breakEvenRevenue = breakEvenUnits * price;
    const contributionMarginRatio = (contributionMargin / price) * 100;

    setResult({
      breakEvenUnits,
      breakEvenRevenue,
      contributionMargin,
      contributionMarginRatio,
      fixedCosts: fixed,
      variableCosts: variable,
      pricePerUnit: price,
    });
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Break-Even Calculator</Text>
              <Text style={styles.headerSubtitle}>Find your break-even point</Text>
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
              <Target size={24} color={theme.accent.primary} />
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                Break-even is when your revenue equals your total costs. Use this to know how many units you need to sell.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Fixed Costs ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Rent, salaries, utilities (costs that don't change with sales)
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
                  value={fixedCosts}
                  onChangeText={setFixedCosts}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Variable Cost Per Unit ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Cost to produce/buy one unit (materials, labor per unit)
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
                  value={variableCostPerUnit}
                  onChangeText={setVariableCostPerUnit}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Price Per Unit ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Selling price for one unit
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
                  value={pricePerUnit}
                  onChangeText={setPricePerUnit}
                />
              </View>

              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: theme.accent.primary }]}
                onPress={calculate}
              >
                <Text style={styles.calculateButtonText}>Calculate Break-Even</Text>
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
                <View style={[styles.resultCard, { backgroundColor: theme.background.card }]}>
                  <View style={styles.resultHeader}>
                    <CheckCircle size={24} color="#10B981" />
                    <Text style={[styles.resultTitle, { color: theme.text.primary }]}>
                      Break-Even Point
                    </Text>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>
                      Units to Break Even
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {result.breakEvenUnits.toLocaleString()} units
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>
                      Revenue to Break Even
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.accent.primary }]}>
                      {formatCurrency(result.breakEvenRevenue)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>
                      Contribution Margin Per Unit
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {formatCurrency(result.contributionMargin)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>
                      Contribution Margin Ratio
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {result.contributionMarginRatio.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={[styles.tipsCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <TrendingUp size={20} color="#3B82F6" />
                  <Text style={[styles.tipsTitle, { color: '#1E40AF' }]}>💡 Tips</Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • You need to sell {result.breakEvenUnits} units to cover all costs
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Every unit sold after break-even contributes {formatCurrency(result.contributionMargin)} to profit
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Lower fixed costs or increase price to reduce break-even point
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
    backgroundColor: '#EFF6FF',
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
  resultCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
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

