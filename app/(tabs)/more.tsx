import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { 
  Calculator, 
  Package, 
  Users, 
  Truck, 
  BarChart3, 
  Target, 
  TrendingUp, 
  FolderKanban, 
  UserCircle, 
  Percent, 
  Receipt, 
  Repeat, 
  ShoppingCart, 
  Calendar, 
  Link as LinkIcon, 
  Sparkles, 
  Building2,
  ChevronRight,
  Settings,
  HelpCircle,
  FileText,
  BookOpen,
  Camera,
  Zap
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<any>;
  route: string;
  color: string;
  gradient: [string, string];
  badge?: string;
  visible: boolean;
}

export default function MoreScreen() {
  const { theme } = useTheme();
  const { business } = useBusiness();
  const { isFeatureVisible, shouldShowAsTab } = useFeatures();
  const router = useRouter();

  const menuSections: MenuSection[] = [
    {
      title: 'Business Tools',
      items: [
        {
          id: 'calculator',
          title: 'Viability Calculator',
          description: 'Break-even analysis & risk scoring',
          icon: Calculator,
          route: '/(tabs)/calculator',
          color: '#3B82F6',
          gradient: ['#3B82F6', '#2563EB'],
          visible: true,
        },
        {
          id: 'products',
          title: 'Products',
          description: 'Manage your product catalog',
          icon: Package,
          route: '/(tabs)/products',
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'],
          visible: isFeatureVisible('products'),
        },
        {
          id: 'customers',
          title: 'Customers',
          description: 'Customer management',
          icon: Users,
          route: '/(tabs)/customers',
          color: '#10B981',
          gradient: ['#10B981', '#059669'],
          visible: isFeatureVisible('customers'),
        },
        {
          id: 'suppliers',
          title: 'Suppliers',
          description: 'Supplier management',
          icon: Truck,
          route: '/(tabs)/suppliers',
          color: '#8B5CF6',
          gradient: ['#8B5CF6', '#7C3AED'],
          visible: isFeatureVisible('suppliers'),
        },
      ],
    },
    {
      title: 'Financial Planning',
      items: [
        {
          id: 'budgets',
          title: 'Budgets',
          description: 'Budget planning & tracking',
          icon: Target,
          route: '/(tabs)/budgets',
          color: '#EC4899',
          gradient: ['#EC4899', '#DB2777'],
          visible: isFeatureVisible('budgets'),
        },
        {
          id: 'cashflow',
          title: 'Cashflow',
          description: 'Cashflow projections',
          icon: TrendingUp,
          route: '/(tabs)/cashflow',
          color: '#10B981',
          gradient: ['#10B981', '#059669'],
          visible: isFeatureVisible('cashflow'),
        },
        {
          id: 'tax',
          title: 'Tax Management',
          description: 'Tax rates & calculations',
          icon: Percent,
          route: '/(tabs)/tax',
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'],
          visible: isFeatureVisible('tax'),
        },
        {
          id: 'accounts',
          title: 'Accounts',
          description: 'Receivables & payables',
          icon: Receipt,
          route: '/(tabs)/accounts',
          color: '#3B82F6',
          gradient: ['#3B82F6', '#2563EB'],
          visible: isFeatureVisible('accounts'),
        },
        {
          id: 'recurring-invoices',
          title: 'Recurring Invoices',
          description: 'Automated recurring billing',
          icon: Repeat,
          route: '/(tabs)/recurring-invoices',
          color: '#8B5CF6',
          gradient: ['#8B5CF6', '#7C3AED'],
          visible: isFeatureVisible('recurring-invoices'),
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          id: 'projects',
          title: 'Projects',
          description: 'Project tracking & management',
          icon: FolderKanban,
          route: '/(tabs)/projects',
          color: '#EC4899',
          gradient: ['#EC4899', '#DB2777'],
          visible: isFeatureVisible('projects'),
        },
        {
          id: 'employees',
          title: 'Employees',
          description: 'Employee management',
          icon: UserCircle,
          route: '/(tabs)/employees',
          color: '#10B981',
          gradient: ['#10B981', '#059669'],
          visible: isFeatureVisible('employees'),
        },
        {
          id: 'pos',
          title: 'Point of Sale',
          description: 'POS system for retail',
          icon: ShoppingCart,
          route: '/(tabs)/pos',
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'],
          visible: business?.type === 'retail',
        },
        {
          id: 'appointments',
          title: 'Appointments',
          description: 'Appointment scheduling',
          icon: Calendar,
          route: '/(tabs)/appointments',
          color: '#3B82F6',
          gradient: ['#3B82F6', '#2563EB'],
          visible: business?.type === 'services' || business?.type === 'salon',
        },
      ],
    },
    {
      title: 'Analytics & Reports',
      items: [
        {
          id: 'reports',
          title: 'Reports',
          description: 'P&L, analytics & insights',
          icon: BarChart3,
          route: '/(tabs)/reports',
          color: '#8B5CF6',
          gradient: ['#8B5CF6', '#7C3AED'],
          visible: isFeatureVisible('reports'),
        },
        {
          id: 'insights',
          title: 'Insights',
          description: 'Smart business insights',
          icon: Sparkles,
          route: '/(tabs)/insights',
          color: '#EC4899',
          gradient: ['#EC4899', '#DB2777'],
          visible: isFeatureVisible('insights'),
        },
        {
          id: 'businesses',
          title: 'Businesses',
          description: 'Multi-business management',
          icon: Building2,
          route: '/(tabs)/businesses',
          color: '#10B981',
          gradient: ['#10B981', '#059669'],
          visible: isFeatureVisible('businesses'),
        },
      ],
    },
    {
      title: 'Quick Actions',
      items: [
        {
          id: 'receipt-scan',
          title: 'Scan Receipt',
          description: 'Quick receipt entry',
          icon: Camera,
          route: '/receipt-scan',
          color: '#3B82F6',
          gradient: ['#3B82F6', '#2563EB'],
          visible: true,
        },
        {
          id: 'business-plan',
          title: 'Business Plan',
          description: 'Generate business plan',
          icon: FileText,
          route: '/business-plan',
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'],
          visible: true,
        },
        {
          id: 'help',
          title: 'Help & Support',
          description: 'Get help and support',
          icon: HelpCircle,
          route: '/help',
          color: '#10B981',
          gradient: ['#10B981', '#059669'],
          visible: true,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'settings',
          title: 'Settings',
          description: 'App settings & preferences',
          icon: Settings,
          route: '/(tabs)/settings',
          color: '#64748B',
          gradient: ['#64748B', '#475569'],
          visible: true,
        },
        {
          id: 'integrations',
          title: 'Integrations',
          description: 'Connect external services',
          icon: LinkIcon,
          route: '/(tabs)/integrations',
          color: '#8B5CF6',
          gradient: ['#8B5CF6', '#7C3AED'],
          visible: isFeatureVisible('integrations'),
        },
      ],
    },
  ];

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
            More
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
            All your business tools in one place
          </Text>
        </View>

        {menuSections.map((section, sectionIndex) => {
          const visibleItems = section.items.filter(item => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <View key={sectionIndex} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                {section.title}
              </Text>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, { backgroundColor: theme.background.card }]}
                    onPress={() => handlePress(item.route)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={item.gradient}
                      style={styles.iconContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon size={24} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <View style={styles.menuContent}>
                      <View style={styles.menuHeader}>
                        <Text style={[styles.menuTitle, { color: theme.text.primary }]}>
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View style={[styles.badge, { backgroundColor: item.color + '20' }]}>
                            <Text style={[styles.badgeText, { color: item.color }]}>
                              {item.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.description && (
                        <Text style={[styles.menuDescription, { color: theme.text.secondary }]}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={20} color={theme.text.tertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  menuDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

