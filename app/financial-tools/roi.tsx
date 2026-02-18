import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { ArrowLeft, Calculator, AlertCircle, CheckCircle, TrendingUp, Target } from 'lucide-react-native';

export default function ROICalculatorScreen() {
  const { theme } = useTheme();
  const { business } = useBusiness();
  const { isFeatureVisible, isLoading: featuresLoading } = useFeatures();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const toolVisible = isFeatureVisible('roi-calculator') || isFeatureVisible('financial-tools');
  
  useEffect(() => {
    if (!featuresLoading && !toolVisible) {
      router.back();
    }
  }, [toolVisible, featuresLoading, router]);
  
  const [initialInvestment, setInitialInvestment] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [timeUnit, setTimeUnit] = useState<'days' | 'months' | 'years'>('years');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const calculate = () => {
    const investment = parseFloat(initialInvestment) || 0;
    const final = parseFloat(finalValue) || 0;
    const time = parseFloat(timePeriod) || 0;

    if (!investment || !final) {
      setResult({ error: 'Please enter initial investment and final value' });
      return;
    }

    if (investment <= 0) {
      setResult({ error: 'Initial investment must be greater than 0' });
      return;
    }

    const netProfit = final - investment;
    const roi = (netProfit / investment) * 100;
    
    // Calculate annualized ROI if time period is provided
    let annualizedROI = null;
    if (time > 0) {
      let years = time;
      if (timeUnit === 'days') years = time / 365;
      else if (timeUnit === 'months') years = time / 12;
      
      if (years > 0) {
        annualizedROI = (Math.pow(final / investment, 1 / years) - 1) * 100;
      }
    }

    // Calculate payback period (simplified)
    const monthlyReturn = time > 0 && timeUnit === 'months' 
      ? netProfit / time 
      : time > 0 && timeUnit === 'years'
      ? netProfit / (time * 12)
      : null;

    setResult({
      initialInvestment: investment,
      finalValue: final,
      netProfit,
      roi,
      annualizedROI,
      timePeriod: time,
      timeUnit,
      monthlyReturn,
    });
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getROIStatus = (roi: number) => {
    if (roi >= 20) return { status: 'excellent', color: '#10B981', text: 'Excellent' };
    if (roi >= 10) return { status: 'good', color: '#3B82F6', text: 'Good' };
    if (roi >= 0) return { status: 'fair', color: '#F59E0B', text: 'Fair' };
    return { status: 'loss', color: '#EF4444', text: 'Loss' };
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>ROI Calculator</Text>
              <Text style={styles.headerSubtitle}>Calculate return on investment</Text>
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
              <Calculator size={24} color={theme.accent.info} />
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                ROI measures the profitability of an investment. Calculate your return on investment percentage.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Initial Investment ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Amount you invested initially
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
                  value={initialInvestment}
                  onChangeText={setInitialInvestment}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Final Value ({business?.currency || 'USD'})
                </Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Current value or amount received
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
                  value={finalValue}
                  onChangeText={setFinalValue}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Time Period (Optional)
                </Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={[styles.timeInput, {
                      backgroundColor: theme.background.card,
                      borderColor: theme.border.light,
                      color: theme.text.primary,
                    }]}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="number-pad"
                    value={timePeriod}
                    onChangeText={setTimePeriod}
                  />
                  <View style={styles.timeUnitButtons}>
                    {(['days', 'months', 'years'] as const).map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.timeUnitButton,
                          {
                            backgroundColor: timeUnit === unit ? theme.accent.info : theme.background.secondary,
                          },
                        ]}
                        onPress={() => setTimeUnit(unit)}
                      >
                        <Text
                          style={[
                            styles.timeUnitText,
                            { color: timeUnit === unit ? '#FFF' : theme.text.secondary },
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: theme.accent.info }]}
                onPress={calculate}
              >
                <Text style={styles.calculateButtonText}>Calculate ROI</Text>
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
                    <Target size={24} color={getROIStatus(result.roi).color} />
                    <Text style={[styles.resultTitle, { color: theme.text.primary }]}>
                      Return on Investment
                    </Text>
                  </View>
                  
                  <View style={[styles.roiDisplay, { backgroundColor: getROIStatus(result.roi).color + '20' }]}>
                    <Text style={[styles.roiLabel, { color: getROIStatus(result.roi).color }]}>ROI</Text>
                    <Text style={[styles.roiValue, { color: getROIStatus(result.roi).color }]}>
                      {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(1)}%
                    </Text>
                    <View style={[styles.roiBadge, { backgroundColor: getROIStatus(result.roi).color }]}>
                      <Text style={styles.roiBadgeText}>{getROIStatus(result.roi).text}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Initial Investment</Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {formatCurrency(result.initialInvestment)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Final Value</Text>
                    <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                      {formatCurrency(result.finalValue)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Net Profit/Loss</Text>
                    <Text style={[styles.metricValue, { color: result.netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                      {formatCurrency(result.netProfit)}
                    </Text>
                  </View>

                  {result.annualizedROI !== null && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.metricRow}>
                        <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Annualized ROI</Text>
                        <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                          {result.annualizedROI >= 0 ? '+' : ''}{result.annualizedROI.toFixed(1)}%
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={[styles.tipsCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                  <TrendingUp size={20} color="#3B82F6" />
                  <Text style={[styles.tipsTitle, { color: '#1E40AF' }]}>💡 ROI Benchmarks</Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • 20%+ ROI: Excellent investment
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • 10-20% ROI: Good investment
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • 0-10% ROI: Fair, consider alternatives
                  </Text>
                  <Text style={[styles.tipText, { color: '#1E3A8A' }]}>
                    • Negative ROI: Loss, review investment
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
    backgroundColor: '#EDE9FE',
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
  timeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  timeUnitButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  timeUnitButton: {
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeUnitText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  roiDisplay: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  roiLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roiValue: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 12,
  },
  roiBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roiBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
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

