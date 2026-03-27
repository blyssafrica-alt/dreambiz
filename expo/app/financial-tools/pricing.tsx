import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFeatures } from '@/contexts/FeatureContext';
import FeatureAccessGuard from '@/components/FeatureAccessGuard';
import { ArrowLeft, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react-native';

export default function PricingCalculatorScreen() {
  const { theme } = useTheme();
  const { business, products } = useBusiness();
  const { isFeatureVisible, isLoading: featuresLoading } = useFeatures();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const toolVisible = isFeatureVisible('pricing-calculator') || isFeatureVisible('financial-tools');
  
  const [costPrice, setCostPrice] = useState('');
  const [desiredMargin, setDesiredMargin] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-fill from products if available
  useEffect(() => {
    if (products && products.length > 0 && !costPrice) {
      const firstProduct = products[0];
      if (firstProduct.costPrice != null) {
        setCostPrice(String(firstProduct.costPrice));
      }
    }
  }, [products]);

  const calculateFromMargin = () => {
    const cost = parseFloat(costPrice) || 0;
    const margin = parseFloat(desiredMargin) || 0;

    if (!cost || !margin || margin >= 100) {
      setResult({ error: 'Please enter valid cost price and margin (less than 100%)' });
      return;
    }

    const sellingPrice = cost / (1 - margin / 100);
    const markup = ((sellingPrice - cost) / cost) * 100;
    const profit = sellingPrice - cost;

    setResult({
      costPrice: cost,
      sellingPrice,
      profit,
      margin,
      markup,
      method: 'margin',
    });
  };

  const calculateFromMarkup = () => {
    const cost = parseFloat(costPrice) || 0;
    const markup = parseFloat(markupPercentage) || 0;

    if (!cost || !markup) {
      setResult({ error: 'Please enter valid cost price and markup percentage' });
      return;
    }

    const sellingPrice = cost * (1 + markup / 100);
    const profit = sellingPrice - cost;
    const margin = (profit / sellingPrice) * 100;

    setResult({
      costPrice: cost,
      sellingPrice,
      profit,
      margin,
      markup,
      method: 'markup',
    });
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FeatureAccessGuard 
        featureId="pricing-calculator" 
        showUpgradeModal={true}
      >
        <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Pricing Calculator</Text>
              <Text style={styles.headerSubtitle}>Find optimal selling price</Text>
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
              <DollarSign size={24} color={theme.accent.success} />
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                Calculate the right selling price based on your cost and desired profit margin or markup.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Cost Price ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  What it costs you to produce/buy the product
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
                  value={costPrice}
                  onChangeText={setCostPrice}
                />
              </View>

              <View style={styles.sectionDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
                <Text style={[styles.dividerText, { color: theme.text.tertiary }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Desired Profit Margin (%)
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Percentage of selling price that is profit (e.g., 30%)
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.card,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  placeholder="30"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  value={desiredMargin}
                  onChangeText={setDesiredMargin}
                />
                <TouchableOpacity
                  style={[styles.calculateButton, { backgroundColor: theme.accent.success }]}
                  onPress={calculateFromMargin}
                >
                  <Text style={styles.calculateButtonText}>Calculate from Margin</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
                <Text style={[styles.dividerText, { color: theme.text.tertiary }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Markup Percentage (%)
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Percentage added to cost price (e.g., 50% markup)
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.card,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  placeholder="50"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  value={markupPercentage}
                  onChangeText={setMarkupPercentage}
                />
                <TouchableOpacity
                  style={[styles.calculateButton, { backgroundColor: theme.accent.success }]}
                  onPress={calculateFromMarkup}
                >
                  <Text style={styles.calculateButtonText}>Calculate from Markup</Text>
                </TouchableOpacity>
              </View>
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
                      Recommended Price
                    </Text>
                  </View>
                  
                  <View style={[styles.priceDisplay, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.priceLabel, { color: '#065F46' }]}>Selling Price</Text>
                    <Text style={[styles.priceValue, { color: '#065F46' }]}>
                      {formatCurrency(result.sellingPrice)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Cost Price</Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {formatCurrency(result.costPrice)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Profit Per Unit</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      {formatCurrency(result.profit)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Profit Margin</Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {result.margin.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Markup</Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {result.markup.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={[styles.tipsCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <TrendingUp size={20} color="#3B82F6" />
                  <Text style={[styles.tipsTitle, { color: '#1E40AF' }]}>💡 Pricing Tips</Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Compare with competitor prices
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Consider market demand and positioning
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Review prices regularly, especially in high inflation
                  </Text>
                </View>
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
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
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
    marginBottom: 12,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
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
  priceDisplay: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '900',
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

