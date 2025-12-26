import { Stack } from 'expo-router';
import { Calculator as CalcIcon, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import type { ViabilityResult } from '@/types/business';

export default function CalculatorScreen() {
  const { business } = useBusiness();
  const [capital, setCapital] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [expectedSales, setExpectedSales] = useState('');
  const [inflationRate, setInflationRate] = useState('');
  const [result, setResult] = useState<ViabilityResult | null>(null);

  const calculateScenario = (salesVolume: number, cap: number, expenses: number, price: number, cost: number) => {
    const monthlyRevenue = salesVolume * price;
    const monthlyCosts = salesVolume * cost;
    const monthlyProfit = monthlyRevenue - monthlyCosts - expenses;
    const monthsToRecover = monthlyProfit > 0 ? Math.ceil(cap / monthlyProfit) : Infinity;
    const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
    
    let verdict: 'viable' | 'risky' | 'not-viable' = 'viable';
    if (monthlyProfit <= 0) {
      verdict = 'not-viable';
    } else if (profitMargin < 20 || monthsToRecover > 12) {
      verdict = 'risky';
    }
    
    return { salesVolume, monthlyProfit, monthsToRecover, verdict };
  };

  const calculate = () => {
    const cap = parseFloat(capital) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const price = parseFloat(pricePerUnit) || 0;
    const cost = parseFloat(costPerUnit) || 0;
    const sales = parseFloat(expectedSales) || 0;
    const inflation = parseFloat(inflationRate) || 0;

    if (price <= cost) {
      setResult({
        breakEvenUnits: 0,
        breakEvenRevenue: 0,
        monthlyProfit: 0,
        monthsToRecoverCapital: 0,
        verdict: 'not-viable',
        warnings: ['Price must be higher than cost per unit'],
        profitMargin: 0,
      });
      return;
    }

    const profitPerUnit = price - cost;
    const breakEvenUnits = Math.ceil(expenses / profitPerUnit);
    const breakEvenRevenue = breakEvenUnits * price;
    const monthlyRevenue = sales * price;
    const monthlyCosts = sales * cost;
    const monthlyProfit = monthlyRevenue - monthlyCosts - expenses;
    const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const monthsToRecover = monthlyProfit > 0 ? Math.ceil(cap / monthlyProfit) : Infinity;

    const warnings: string[] = [];
    let verdict: 'viable' | 'risky' | 'not-viable' = 'viable';

    if (monthlyProfit <= 0) {
      verdict = 'not-viable';
      warnings.push('Not profitable at current sales volume');
    } else if (profitMargin < 20) {
      verdict = 'risky';
      warnings.push('Profit margin below 20% - very tight');
    } else if (sales < breakEvenUnits) {
      verdict = 'risky';
      warnings.push(`You need ${breakEvenUnits} sales to break even`);
    } else if (monthsToRecover > 12) {
      verdict = 'risky';
      warnings.push('Capital recovery will take over a year');
    }
    
    if (inflation > 10) {
      warnings.push(`High inflation (${inflation}%) - review prices regularly`);
    }

    // Calculate scenarios
    const optimisticSales = Math.round(sales * 1.2);
    const pessimisticSales = Math.round(sales * 0.8);
    
    const scenarios = {
      optimistic: calculateScenario(optimisticSales, cap, expenses, price, cost),
      realistic: calculateScenario(sales, cap, expenses, price, cost),
      pessimistic: calculateScenario(pessimisticSales, cap, expenses, price, cost),
    };

    setResult({
      breakEvenUnits,
      breakEvenRevenue,
      monthlyProfit,
      monthsToRecoverCapital: monthsToRecover,
      verdict,
      warnings,
      profitMargin,
      scenarios,
    });
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'viable':
        return { bg: '#D1FAE5', border: '#10B981', text: '#065F46' };
      case 'risky':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
      case 'not-viable':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' };
      default:
        return { bg: '#E2E8F0', border: '#94A3B8', text: '#475569' };
    }
  };

  const getVerdictIcon = (verdict: string) => {
    const colors = getVerdictColor(verdict);
    switch (verdict) {
      case 'viable':
        return <CheckCircle size={32} color={colors.text} />;
      case 'risky':
        return <AlertCircle size={32} color={colors.text} />;
      case 'not-viable':
        return <AlertTriangle size={32} color={colors.text} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Viability Calculator' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <CalcIcon size={40} color="#0066CC" />
          <Text style={styles.title}>Business Viability Check</Text>
          <Text style={styles.subtitle}>
            Calculate if your business model is profitable
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Starting Capital ({business?.currency})</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={capital}
              onChangeText={setCapital}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Fixed Expenses ({business?.currency})</Text>
            <Text style={styles.hint}>Rent, salaries, utilities, etc.</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={monthlyExpenses}
              onChangeText={setMonthlyExpenses}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price Per Unit ({business?.currency})</Text>
            <Text style={styles.hint}>What you sell one item for</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={pricePerUnit}
              onChangeText={setPricePerUnit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cost Per Unit ({business?.currency})</Text>
            <Text style={styles.hint}>What it costs you to make/buy one item</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={costPerUnit}
              onChangeText={setCostPerUnit}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expected Sales Per Month (units)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="number-pad"
              value={expectedSales}
              onChangeText={setExpectedSales}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Annual Inflation Rate (%)</Text>
            <Text style={styles.hint}>Optional - helps adjust projections</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="decimal-pad"
              value={inflationRate}
              onChangeText={setInflationRate}
            />
          </View>

          <TouchableOpacity style={styles.calculateButton} onPress={calculate}>
            <Text style={styles.calculateButtonText}>Calculate Viability</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.results}>
            <View style={[
              styles.verdictCard,
              { backgroundColor: getVerdictColor(result.verdict).bg, borderColor: getVerdictColor(result.verdict).border }
            ]}>
              <View style={styles.verdictHeader}>
                {getVerdictIcon(result.verdict)}
                <Text style={[styles.verdictText, { color: getVerdictColor(result.verdict).text }]}>
                  {result.verdict === 'viable' && 'Business is Viable ✓'}
                  {result.verdict === 'risky' && 'Business is Risky ⚠'}
                  {result.verdict === 'not-viable' && 'Not Viable Yet ✗'}
                </Text>
              </View>
            </View>

            <View style={styles.metricsCard}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Break-Even Point</Text>
                <Text style={styles.metricValue}>
                  {result.breakEvenUnits} units
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Break-Even Revenue</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(result.breakEvenRevenue)}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Monthly Profit</Text>
                <Text style={[
                  styles.metricValue,
                  result.monthlyProfit >= 0 ? styles.profitPositive : styles.profitNegative
                ]}>
                  {formatCurrency(result.monthlyProfit)}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Profit Margin</Text>
                <Text style={styles.metricValue}>
                  {result.profitMargin.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Capital Recovery</Text>
                <Text style={styles.metricValue}>
                  {result.monthsToRecoverCapital === Infinity
                    ? 'Never'
                    : `${result.monthsToRecoverCapital} months`}
                </Text>
              </View>
            </View>

            {result.warnings.length > 0 && (
              <View style={styles.warningsCard}>
                <Text style={styles.warningsTitle}>⚠ Warnings</Text>
                {result.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningText}>
                    • {warning}
                  </Text>
                ))}
              </View>
            )}

            {result.scenarios && (
              <View style={styles.scenariosCard}>
                <Text style={styles.scenariosTitle}>📊 Scenario Planning</Text>
                <Text style={styles.scenariosSubtitle}>See how different sales volumes affect your business</Text>
                
                <View style={styles.scenarioRow}>
                  <View style={[styles.scenarioCard, { borderColor: '#10B981' }]}>
                    <Text style={[styles.scenarioLabel, { color: '#10B981' }]}>Optimistic</Text>
                    <Text style={styles.scenarioSales}>{result.scenarios.optimistic.salesVolume} units/mo</Text>
                    <Text style={[styles.scenarioProfit, { color: result.scenarios.optimistic.monthlyProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                      {formatCurrency(result.scenarios.optimistic.monthlyProfit)}
                    </Text>
                    <Text style={styles.scenarioRecovery}>
                      {result.scenarios.optimistic.monthsToRecover === Infinity ? 'Never' : `${result.scenarios.optimistic.monthsToRecover}mo`}
                    </Text>
                  </View>
                  
                  <View style={[styles.scenarioCard, { borderColor: '#3B82F6' }]}>
                    <Text style={[styles.scenarioLabel, { color: '#3B82F6' }]}>Realistic</Text>
                    <Text style={styles.scenarioSales}>{result.scenarios.realistic.salesVolume} units/mo</Text>
                    <Text style={[styles.scenarioProfit, { color: result.scenarios.realistic.monthlyProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                      {formatCurrency(result.scenarios.realistic.monthlyProfit)}
                    </Text>
                    <Text style={styles.scenarioRecovery}>
                      {result.scenarios.realistic.monthsToRecover === Infinity ? 'Never' : `${result.scenarios.realistic.monthsToRecover}mo`}
                    </Text>
                  </View>
                  
                  <View style={[styles.scenarioCard, { borderColor: '#F59E0B' }]}>
                    <Text style={[styles.scenarioLabel, { color: '#F59E0B' }]}>Pessimistic</Text>
                    <Text style={styles.scenarioSales}>{result.scenarios.pessimistic.salesVolume} units/mo</Text>
                    <Text style={[styles.scenarioProfit, { color: result.scenarios.pessimistic.monthlyProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                      {formatCurrency(result.scenarios.pessimistic.monthlyProfit)}
                    </Text>
                    <Text style={styles.scenarioRecovery}>
                      {result.scenarios.pessimistic.monthsToRecover === Infinity ? 'Never' : `${result.scenarios.pessimistic.monthsToRecover}mo`}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.scenariosNote}>
                  💡 Optimistic: +20% sales | Pessimistic: -20% sales
                </Text>
              </View>
            )}

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Tips</Text>
              {result.verdict === 'not-viable' && (
                <>
                  <Text style={styles.tipText}>• Increase your prices</Text>
                  <Text style={styles.tipText}>• Reduce your costs</Text>
                  <Text style={styles.tipText}>• Find ways to increase sales</Text>
                </>
              )}
              {result.verdict === 'risky' && (
                <>
                  <Text style={styles.tipText}>• Test your assumptions carefully</Text>
                  <Text style={styles.tipText}>• Have emergency funds ready</Text>
                  <Text style={styles.tipText}>• Start small and grow gradually</Text>
                </>
              )}
              {result.verdict === 'viable' && (
                <>
                  <Text style={styles.tipText}>• Keep tracking your numbers</Text>
                  <Text style={styles.tipText}>• Save profits for growth</Text>
                  <Text style={styles.tipText}>• Look for efficiency improvements</Text>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#334155',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  calculateButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  results: {
    gap: 16,
  },
  verdictCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  verdictHeader: {
    alignItems: 'center',
    gap: 12,
  },
  verdictText: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  metricsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFF',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 15,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  profitPositive: {
    color: '#10B981',
  },
  profitNegative: {
    color: '#EF4444',
  },
  warningsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 6,
    lineHeight: 20,
  },
  tipsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0066CC',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 6,
    lineHeight: 20,
  },
  scenariosCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scenariosTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  scenariosSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  scenarioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scenarioCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    alignItems: 'center',
  },
  scenarioLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  scenarioSales: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  scenarioProfit: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  scenarioRecovery: {
    fontSize: 11,
    color: '#94A3B8',
  },
  scenariosNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
});
