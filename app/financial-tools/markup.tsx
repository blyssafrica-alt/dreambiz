import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { ArrowLeft, Percent, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react-native';

export default function MarkupCalculatorScreen() {
  const { theme } = useTheme();
  const { business, products } = useBusiness();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [markupPercent, setMarkupPercent] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const calculateFromPrice = () => {
    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(sellingPrice) || 0;

    if (!cost || !selling || selling <= cost) {
      setResult({ error: 'Selling price must be higher than cost price' });
      return;
    }

    const markup = ((selling - cost) / cost) * 100;
    const profit = selling - cost;
    const margin = (profit / selling) * 100;

    setResult({
      costPrice: cost,
      sellingPrice: selling,
      markup,
      profit,
      margin,
      method: 'price',
    });
  };

  const calculateFromMarkup = () => {
    const cost = parseFloat(costPrice) || 0;
    const markup = parseFloat(markupPercent) || 0;

    if (!cost || !markup) {
      setResult({ error: 'Please enter cost price and markup percentage' });
      return;
    }

    const selling = cost * (1 + markup / 100);
    const profit = selling - cost;
    const margin = (profit / selling) * 100;

    setResult({
      costPrice: cost,
      sellingPrice: selling,
      markup,
      profit,
      margin,
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
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#EC4899', '#DB2777']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Markup Calculator</Text>
              <Text style={styles.headerSubtitle}>Calculate markup percentages</Text>
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
              <Percent size={24} color={theme.accent.danger} />
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                Markup is the percentage added to cost price. Calculate markup from price or set markup to find selling price.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Cost Price ({business?.currency || 'USD'})
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
                  Selling Price ({business?.currency || 'USD'})
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
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                />
                <TouchableOpacity
                  style={[styles.calculateButton, { backgroundColor: theme.accent.danger }]}
                  onPress={calculateFromPrice}
                >
                  <Text style={styles.calculateButtonText}>Calculate Markup</Text>
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
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.card,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  placeholder="50"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                  value={markupPercent}
                  onChangeText={setMarkupPercent}
                />
                <TouchableOpacity
                  style={[styles.calculateButton, { backgroundColor: theme.accent.danger }]}
                  onPress={calculateFromMarkup}
                >
                  <Text style={styles.calculateButtonText}>Calculate Selling Price</Text>
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
                    <CheckCircle size={24} color="#EC4899" />
                    <Text style={[styles.resultTitle, { color: theme.text.primary }]}>
                      Markup Analysis
                    </Text>
                  </View>
                  
                  <View style={[styles.markupDisplay, { backgroundColor: '#FCE7F3' }]}>
                    <Text style={[styles.markupLabel, { color: '#9F1239' }]}>Markup</Text>
                    <Text style={[styles.markupValue, { color: '#9F1239' }]}>
                      {result.markup.toFixed(1)}%
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
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Selling Price</Text>
                    <Text style={[styles.metricValue, { color: theme.accent.danger }]}>
                      {formatCurrency(result.sellingPrice)}
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
                </View>

                <View style={[styles.tipsCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <TrendingUp size={20} color="#3B82F6" />
                  <Text style={[styles.tipsTitle, { color: '#1E40AF' }]}>💡 Markup vs Margin</Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Markup: Percentage added to cost ({(result.markup || 0).toFixed(1)}%)
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Margin: Percentage of selling price that is profit ({(result.margin || 0).toFixed(1)}%)
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • A 50% markup = 33.3% margin
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
    backgroundColor: '#FCE7F3',
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
  markupDisplay: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  markupLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  markupValue: {
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

