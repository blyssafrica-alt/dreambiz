import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { PERMISSION_CATEGORIES, type PermissionCode } from '@/types/employee-permissions';
import { useFeatures } from '@/contexts/FeatureContext';
import { useAuth } from '@/contexts/AuthContext';
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
  Shield,
  HelpCircle,
  FileText,
  BookOpen,
  Camera,
  Store,
  Megaphone,
  Layers
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
  disabled?: boolean;
}

export default function MoreScreen() {
  const { theme } = useTheme();
  const {
    business,
    isEmployee,
    employeePermissions,
    employeePermissionsLoading,
    currentEmployee,
    refreshEmployeePermissions,
  } = useBusiness();
  const { isSuperAdmin, isAdmin, isModerator } = useAuth();
  const { isFeatureVisible, shouldShowAsTab } = useFeatures();
  const router = useRouter();
  const showPOSTab = shouldShowAsTab('pos');
  const hasPermission = (required: PermissionCode | PermissionCode[]) => {
    if (!isEmployee) return true;
    if (employeePermissionsLoading) return true;
    const requiredList = Array.isArray(required) ? required : [required];
    return requiredList.some(permission => employeePermissions.includes(permission));
  };

  const formatPermissionLabel = (code: PermissionCode) => {
    const [category, action] = code.split(':');
    const categoryLabel = (PERMISSION_CATEGORIES as any)[category] || category;
    const actionLabel = action ? action.replace(/_/g, ' ') : 'access';
    return `${categoryLabel} • ${actionLabel}`;
  };

  useEffect(() => {
    if (isEmployee) {
      refreshEmployeePermissions();
    }
  }, [isEmployee, refreshEmployeePermissions]);

  const menuSections: MenuSection[] = [
    {
      title: 'Business Tools',
      items: [
        {
          id: 'my-ads',
          title: 'My Ads',
          description: 'View and track your ad submissions',
          icon: Megaphone,
          route: '/my-ads',
          color: '#0EA5E9',
          gradient: ['#0EA5E9', '#0284C7'],
          visible: true,
        },
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
          disabled: isEmployee && !hasPermission(['products:view', 'products:create', 'products:edit', 'products:delete', 'products:manage_stock']),
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
          disabled: isEmployee && !hasPermission(['customers:view', 'customers:create', 'customers:edit', 'customers:delete']),
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
          disabled: isEmployee,
        },
      ],
    },
    {
      title: 'Admin',
      items: [
        {
          id: 'admin-dashboard',
          title: 'Admin Dashboard',
          description: 'Approve ads and manage platform',
          icon: Shield,
          route: '/admin/dashboard',
          color: '#0F172A',
          gradient: ['#0F172A', '#334155'],
          visible: isSuperAdmin || isAdmin || isModerator,
        },
        {
          id: 'admin-ad-settings',
          title: 'Ad Settings',
          description: 'Packages, campaigns, ad sets, ads',
          icon: Settings,
          route: '/admin/ad-settings',
          color: '#1F2937',
          gradient: ['#1F2937', '#111827'],
          visible: isSuperAdmin || isAdmin || isModerator,
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
          disabled: isEmployee && !hasPermission(['finances:view', 'finances:view_reports', 'finances:manage_transactions']),
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
          disabled: isEmployee && !hasPermission(['finances:view', 'finances:view_reports', 'finances:manage_transactions']),
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
          disabled: isEmployee && !hasPermission(['finances:view', 'finances:view_reports', 'finances:manage_transactions']),
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
          disabled: isEmployee && !hasPermission(['finances:view', 'finances:view_reports', 'finances:manage_transactions']),
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
          disabled: isEmployee && !hasPermission(['finances:view', 'finances:view_reports', 'finances:manage_transactions']),
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
          disabled: isEmployee,
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
          disabled: isEmployee && !hasPermission(['employees:view', 'employees:manage']),
        },
        {
          id: 'pos',
          title: 'Point of Sale',
          description: 'POS system for retail',
          icon: ShoppingCart,
          route: '/(tabs)/pos',
          color: '#F59E0B',
          gradient: ['#F59E0B', '#D97706'],
          // Show in More when enabled but not already a main tab
          visible: isFeatureVisible('pos') && !showPOSTab,
          disabled: isEmployee && !hasPermission(['pos:view', 'pos:process_sales', 'pos:void_sales', 'pos:apply_discounts', 'pos:view_reports']),
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
          disabled: isEmployee,
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
          disabled: isEmployee && !hasPermission(['finances:view', 'finances:view_reports']),
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
          disabled: isEmployee,
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
          disabled: isEmployee,
        },
      ],
    },
    {
      title: 'DreamBig Resources',
      items: [
        {
          id: 'store',
          title: 'Store',
          description: 'Browse DreamBig products & resources',
          icon: Store,
          route: '/(tabs)/store',
          color: '#8B5CF6',
          gradient: ['#8B5CF6', '#7C3AED'],
          visible: true,
        },
        {
          id: 'books',
          title: 'DreamBig Books',
          description: 'Business guides & resources',
          icon: BookOpen,
          route: '/books',
          color: '#3B82F6',
          gradient: ['#3B82F6', '#2563EB'],
          visible: true,
        },
        {
          id: 'my-library',
          title: 'My Library',
          description: 'Your purchased books',
          icon: BookOpen,
          route: '/my-library',
          color: '#10B981',
          gradient: ['#10B981', '#059669'],
          visible: true,
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
          disabled: isEmployee,
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
            {isEmployee
              ? `Tools for ${business?.name || 'your assigned business'}`
              : 'All your business tools in one place'}
          </Text>
        </View>

        {isEmployee && (
          <View style={[styles.employeeCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.employeeRow}>
              <Building2 size={18} color={theme.accent.primary} />
              <Text style={[styles.employeeLabel, { color: theme.text.secondary }]}>
                Assigned business
              </Text>
            </View>
            <Text style={[styles.employeeValue, { color: theme.text.primary }]} numberOfLines={1}>
              {business?.name || 'Assigned by owner'}
            </Text>
            <View style={[styles.employeeRow, { marginTop: 10 }]}>
              <UserCircle size={18} color={theme.accent.primary} />
              <Text style={[styles.employeeLabel, { color: theme.text.secondary }]}>
                Role
              </Text>
            </View>
            <Text style={[styles.employeeValue, { color: theme.text.primary }]} numberOfLines={1}>
              {currentEmployee?.roleName || 'Employee'}
            </Text>
            <View style={[styles.employeeRow, { marginTop: 10 }]}>
              <Shield size={18} color={theme.accent.primary} />
              <Text style={[styles.employeeLabel, { color: theme.text.secondary }]}>
                Permissions
              </Text>
            </View>
            {employeePermissionsLoading ? (
              <Text style={[styles.employeeEmpty, { color: theme.text.tertiary }]}>
                Loading permissions...
              </Text>
            ) : employeePermissions.length > 0 ? (
              <View style={styles.permissionChips}>
                {employeePermissions.slice(0, 6).map(permission => (
                  <View
                    key={permission}
                    style={[styles.permissionChip, { backgroundColor: theme.surface.info }]}
                  >
                    <Text style={[styles.permissionChipText, { color: theme.accent.info }]}>
                      {formatPermissionLabel(permission)}
                    </Text>
                  </View>
                ))}
                {employeePermissions.length > 6 && (
                  <View style={[styles.permissionChip, { backgroundColor: theme.background.secondary }]}>
                    <Text style={[styles.permissionChipText, { color: theme.text.secondary }]}>
                      +{employeePermissions.length - 6} more
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={[styles.employeeEmpty, { color: theme.text.tertiary }]}>
                No permissions assigned yet.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.employeeSettingsLink, { borderColor: theme.border.light }]}
              onPress={() => router.push('/(tabs)/settings' as any)}
            >
              <Settings size={16} color={theme.text.secondary} />
              <Text style={[styles.employeeSettingsText, { color: theme.text.secondary }]}>
                Manage profile & settings
              </Text>
              <ChevronRight size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

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
                const badgeText = item.badge || (item.disabled && isEmployee ? 'Restricted' : undefined);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      { backgroundColor: theme.background.card },
                      item.disabled ? { opacity: 0.55 } : null,
                    ]}
                    onPress={() => {
                      if (item.disabled) {
                        RNAlert.alert(
                          'Access restricted',
                          'Ask your business owner to grant access to this feature.'
                        );
                        return;
                      }
                      handlePress(item.route);
                    }}
                    activeOpacity={0.7}
                    disabled={item.disabled}
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
                        {badgeText && (
                          <View style={[styles.badge, { backgroundColor: item.color + '20' }]}>
                            <Text style={[styles.badgeText, { color: item.color }]}>
                              {badgeText}
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
        {isEmployee && !menuSections.some(section => section.items.some(item => item.visible && !item.disabled)) && (
          <View style={[styles.emptyState, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              No tools assigned yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
              Ask your business owner to assign roles and permissions for your tasks.
            </Text>
          </View>
        )}
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
    paddingBottom: Platform.OS === 'ios' ? 120 : 110,
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
  employeeCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  employeeValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
  },
  permissionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  permissionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  permissionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  employeeEmpty: {
    marginTop: 8,
    fontSize: 12,
  },
  employeeSettingsLink: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeSettingsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});

