import { Stack, useRouter } from 'expo-router';
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
  ArrowRight,
  BarChart3,
  Wallet,
  Building2,
  Lock,
} from 'lucide-react-native';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';

export default function FinancialToolsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isFeatureVisible, isLoading, features } = useFeatures();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState<string | null>(null);
  const [upgradeFeatureId, setUpgradeFeatureId] = useState<string | null>(null);

  // Check if parent feature is visible (for backward compatibility)
  const parentFeatureVisible = isFeatureVisible('financial-tools');

  const hasAccessToTool = (featureId: string) => {
    const toolVisible = isFeatureVisible(featureId);
    if (!toolVisible && parentFeatureVisible) {
      const toolFeature = features.find(f => f.featureId === featureId);
      return !toolFeature;
    }
    return toolVisible;
  };
  
  const handleToolPress = (item: { featureId: string; title: string; route: string }) => {
    if (hasAccessToTool(item.featureId)) {
      router.push(item.route as any);
    } else {
      setUpgradeFeatureName(item.title);
      setUpgradeFeatureId(item.featureId);
      setUpgradeModalVisible(true);
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text.secondary }}>Loading Financial Tools...</Text>
      </View>
    );
  }

  const calculators = [
    {
      id: 'break-even',
      featureId: 'break-even-calculator',
      title: 'Break-Even Calculator',
      description: 'Calculate when your business will break even',
      icon: Target,
      route: '/financial-tools/break-even',
      gradient: ['#3B82F6', '#2563EB'],
      color: '#3B82F6',
    },
    {
      id: 'pricing',
      featureId: 'pricing-calculator',
      title: 'Pricing Calculator',
      description: 'Determine optimal product pricing',
      icon: DollarSign,
      route: '/financial-tools/pricing',
      gradient: ['#10B981', '#059669'],
      color: '#10B981',
    },
    {
      id: 'profit-margin',
      featureId: 'profit-margin-analyzer',
      title: 'Profit Margin Analyzer',
      description: 'Analyze your profit margins',
      icon: TrendingUp,
      route: '/financial-tools/profit-margin',
      gradient: ['#F59E0B', '#D97706'],
      color: '#F59E0B',
    },
    {
      id: 'markup',
      featureId: 'markup-calculator',
      title: 'Business Markup Calculator',
      description: 'Calculate markup percentages',
      icon: Percent,
      route: '/financial-tools/markup',
      gradient: ['#EC4899', '#DB2777'],
      color: '#EC4899',
    },
    {
      id: 'roi',
      featureId: 'roi-calculator',
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
      featureId: 'pl-statement',
      title: 'Profit & Loss Statement',
      description: 'Monthly and yearly P&L reports',
      icon: BarChart3,
      route: '/financial-tools/pl-statement',
      gradient: ['#6366F1', '#4F46E5'],
      color: '#6366F1',
    },
    {
      id: 'cashflow',
      featureId: 'cashflow-statement',
      title: 'Cash Flow Statement',
      description: 'Track cash inflows and outflows',
      icon: Wallet,
      route: '/financial-tools/cashflow-statement',
      gradient: ['#14B8A6', '#0D9488'],
      color: '#14B8A6',
    },
    {
      id: 'balance-sheet',
      featureId: 'balance-sheet',
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
              const locked = !hasAccessToTool(calc.featureId);
              return (
                <TouchableOpacity
                  key={calc.id}
                  style={[
                    styles.toolCard,
                    { backgroundColor: theme.background.card },
                    locked && styles.toolCardLocked,
                  ]}
                  onPress={() => handleToolPress(calc)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={calc.gradient}
                    style={[styles.iconContainer, locked && styles.iconContainerLocked]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={24} color="#FFF" strokeWidth={2.5} />
                    {locked && (
                      <View style={styles.lockBadge}>
                        <Lock size={14} color="#FFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </LinearGradient>
                  <View style={styles.toolContent}>
                    <Text style={[styles.toolTitle, { color: theme.text.primary }, locked && { color: theme.text.secondary }]}>
                      {calc.title}
                    </Text>
                    <Text style={[styles.toolDescription, { color: theme.text.secondary }]}>
                      {calc.description}
                    </Text>
                  </View>
                  {locked ? (
                    <Lock size={20} color={theme.text.tertiary} />
                  ) : (
                    <ArrowRight size={20} color={theme.text.tertiary} />
                  )}
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
              const locked = !hasAccessToTool(stmt.featureId);
              return (
                <TouchableOpacity
                  key={stmt.id}
                  style={[
                    styles.toolCard,
                    { backgroundColor: theme.background.card },
                    locked && styles.toolCardLocked,
                  ]}
                  onPress={() => handleToolPress(stmt)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={stmt.gradient}
                    style={[styles.iconContainer, locked && styles.iconContainerLocked]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon size={24} color="#FFF" strokeWidth={2.5} />
                    {locked && (
                      <View style={styles.lockBadge}>
                        <Lock size={14} color="#FFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </LinearGradient>
                  <View style={styles.toolContent}>
                    <Text style={[styles.toolTitle, { color: theme.text.primary }, locked && { color: theme.text.secondary }]}>
                      {stmt.title}
                    </Text>
                    <Text style={[styles.toolDescription, { color: theme.text.secondary }]}>
                      {stmt.description}
                    </Text>
                  </View>
                  {locked ? (
                    <Lock size={20} color={theme.text.tertiary} />
                  ) : (
                    <ArrowRight size={20} color={theme.text.tertiary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <PremiumUpgradeModal
          visible={upgradeModalVisible}
          onClose={() => {
            setUpgradeModalVisible(false);
            setUpgradeFeatureName(null);
            setUpgradeFeatureId(null);
          }}
          title="Upgrade to unlock"
          message={upgradeFeatureName ? `Unlock "${upgradeFeatureName}" and more with a premium plan.` : 'Unlock this feature and more with a premium plan.'}
          feature={upgradeFeatureName || undefined}
          featureId={upgradeFeatureId || undefined}
        />
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
  toolCardLocked: {
    opacity: 0.92,
  },
  iconContainerLocked: {
    opacity: 0.9,
  },
  lockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyState: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

