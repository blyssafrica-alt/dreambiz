import { Stack, useRouter, Redirect } from 'expo-router';
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  FileText,
  ArrowRight,
  BarChart3,
  Wallet,
  Building2,
} from 'lucide-react-native';

export default function FinancialToolsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isFeatureVisible } = useFeatures();

  // Check if feature is visible
  if (!isFeatureVisible('financial-tools')) {
    return <Redirect href="/(tabs)/more" />;
  }

  const calculators = [
    {
      id: 'break-even',
      title: 'Break-Even Calculator',
      description: 'Calculate when your business will break even',
      icon: Target,
      route: '/financial-tools/break-even',
      gradient: ['#3B82F6', '#2563EB'],
      color: '#3B82F6',
    },
    {
      id: 'pricing',
      title: 'Pricing Calculator',
      description: 'Determine optimal product pricing',
      icon: DollarSign,
      route: '/financial-tools/pricing',
      gradient: ['#10B981', '#059669'],
      color: '#10B981',
    },
    {
      id: 'profit-margin',
      title: 'Profit Margin Analyzer',
      description: 'Analyze your profit margins',
      icon: TrendingUp,
      route: '/financial-tools/profit-margin',
      gradient: ['#F59E0B', '#D97706'],
      color: '#F59E0B',
    },
    {
      id: 'markup',
      title: 'Business Markup Calculator',
      description: 'Calculate markup percentages',
      icon: Percent,
      route: '/financial-tools/markup',
      gradient: ['#EC4899', '#DB2777'],
      color: '#EC4899',
    },
    {
      id: 'roi',
      title: 'Business ROI Calculator',
      description: 'Calculate return on investment',
      icon: Calculator,
      route: '/financial-tools/roi',
      gradient: ['#8B5CF6', '#7C3AED'],
      color: '#8B5CF6',
    },
  ];

  const statements = [
    {
      id: 'pl',
      title: 'Profit & Loss Statement',
      description: 'Monthly and yearly P&L reports',
      icon: BarChart3,
      route: '/financial-tools/pl-statement',
      gradient: ['#6366F1', '#4F46E5'],
      color: '#6366F1',
    },
    {
      id: 'cashflow',
      title: 'Cash Flow Statement',
      description: 'Track cash inflows and outflows',
      icon: Wallet,
      route: '/financial-tools/cashflow-statement',
      gradient: ['#14B8A6', '#0D9488'],
      color: '#14B8A6',
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Statement of financial position',
      icon: Building2,
      route: '/financial-tools/balance-sheet',
      gradient: ['#F97316', '#EA580C'],
      color: '#F97316',
    },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        {/* Header */}
        <LinearGradient
          colors={theme.gradient?.primary as [string, string] || ['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Financial Tools</Text>
              <Text style={styles.headerSubtitle}>
                Calculators & Financial Statements
              </Text>
            </View>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.headerIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Calculator size={28} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 120 : 110 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Calculators Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Calculators</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
              Powerful tools to analyze your business finances
            </Text>

            {calculators.map((calc) => {
              const Icon = calc.icon;
              return (
                <TouchableOpacity
                  key={calc.id}
                  style={[styles.toolCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push(calc.route as any)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={calc.gradient}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={24} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={styles.toolContent}>
                    <Text style={[styles.toolTitle, { color: theme.text.primary }]}>
                      {calc.title}
                    </Text>
                    <Text style={[styles.toolDescription, { color: theme.text.secondary }]}>
                      {calc.description}
                    </Text>
                  </View>
                  <ArrowRight size={20} color={theme.text.tertiary} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Financial Statements Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Financial Statements</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
              Comprehensive reports from your business data
            </Text>

            {statements.map((stmt) => {
              const Icon = stmt.icon;
              return (
                <TouchableOpacity
                  key={stmt.id}
                  style={[styles.toolCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push(stmt.route as any)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={stmt.gradient}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={24} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={styles.toolContent}>
                    <Text style={[styles.toolTitle, { color: theme.text.primary }]}>
                      {stmt.title}
                    </Text>
                    <Text style={[styles.toolDescription, { color: theme.text.secondary }]}>
                      {stmt.description}
                    </Text>
                  </View>
                  <ArrowRight size={20} color={theme.text.tertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 4,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

