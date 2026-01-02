import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BarChart, TrendingUp, Package, Megaphone, FileText, AlertCircle, BookOpen, Users, Building2, DollarSign, ArrowRight, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBusinesses: 0,
    totalProducts: 0,
    totalAds: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Load all stats in parallel
      // Note: For users count, we need to check if user is super admin
      // If not super admin, the RLS policy will only return their own profile
      const [usersResult, businessesResult, productsResult, adsResult, purchasesResult, bookPurchasesResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('business_profiles').select('id', { count: 'exact' }),
        supabase.from('platform_products').select('id', { count: 'exact' }),
        supabase.from('advertisements').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('product_purchases').select('total_price, payment_status'),
        supabase.from('book_purchases').select('total_price, payment_status'),
      ]);
      
      // Also load subscription payments in parallel
      const { data: subscriptionPayments } = await supabase
        .from('subscription_payments')
        .select('amount, verification_status')
        .eq('verification_status', 'approved');
      
      // Log the users result for debugging
      if (usersResult.error) {
        console.error('Error loading users count:', usersResult.error);
      } else {
        console.log('Users count result:', usersResult.count, 'users found');
      }

      const totalUsers = usersResult.count || 0;
      const totalBusinesses = businessesResult.count || 0;
      const totalProducts = productsResult.count || 0;
      const totalAds = adsResult.count || 0;

      // Calculate revenue from completed product purchases
      const completedProductPurchases = purchasesResult.data?.filter(p => p.payment_status === 'completed') || [];
      const productRevenue = completedProductPurchases.reduce((sum, p) => sum + parseFloat(String(p.total_price || '0')), 0);
      
      // Calculate revenue from completed book purchases
      const completedBookPurchases = bookPurchasesResult.data?.filter(p => p.payment_status === 'completed') || [];
      const bookRevenue = completedBookPurchases.reduce((sum, p) => sum + parseFloat(String(p.total_price || '0')), 0);
      
      // Include subscription payments revenue
      const subscriptionRevenue = subscriptionPayments?.reduce((sum, p) => sum + parseFloat(String(p.amount || '0')), 0) || 0;
      const totalRevenue = productRevenue + bookRevenue + subscriptionRevenue;

      // Active users (users who logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: activeUsersCount } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      setStats({
        totalUsers,
        activeUsers: activeUsersCount || 0,
        totalBusinesses,
        totalProducts,
        totalAds,
        totalRevenue,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, gradient, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.statCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={gradient || [`${color}15`, `${color}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCardGradient}
      >
        <View style={styles.statCardContent}>
          <View style={styles.statCardHeader}>
            <LinearGradient
              colors={[color, `${color}DD`]}
              style={styles.iconContainer}
            >
              <Icon size={22} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          </View>
          <View style={styles.statCardBody}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>{value}</Text>
            <Text style={[styles.statTitle, { color: theme.text.secondary }]}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background.primary }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.accent.primary}
          colors={[theme.accent.primary]}
        />
      }
    >
      {/* Header with Gradient */}
      <LinearGradient
        colors={[`${theme.accent.primary}15`, 'transparent']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text.primary }]}>Admin Dashboard</Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              Platform Overview
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          color="#0066CC"
          gradient={['#0066CC15', '#0066CC05']}
          onPress={() => router.push('/admin/users' as any)}
        />
        <StatCard
          icon={TrendingUp}
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          color="#10B981"
          gradient={['#10B98115', '#10B98105']}
        />
        <StatCard
          icon={Package}
          title="Products"
          value={stats.totalProducts.toLocaleString()}
          color="#F59E0B"
          gradient={['#F59E0B15', '#F59E0B05']}
          onPress={() => router.push('/admin/products' as any)}
        />
        <StatCard
          icon={Megaphone}
          title="Advertisements"
          value={stats.totalAds.toLocaleString()}
          color="#EC4899"
          gradient={['#EC489915', '#EC489905']}
          onPress={() => router.push('/admin/ads' as any)}
        />
        <StatCard
          icon={Building2}
          title="Businesses"
          value={stats.totalBusinesses.toLocaleString()}
          color="#8B5CF6"
          gradient={['#8B5CF615', '#8B5CF605']}
        />
        <StatCard
          icon={DollarSign}
          title="Revenue"
          value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="#10B981"
          gradient={['#10B98115', '#10B98105']}
        />
      </View>

      {/* Quick Actions Section */}
      <View style={styles.quickActions}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Actions</Text>
          <View style={[styles.sectionUnderline, { backgroundColor: theme.accent.primary }]} />
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card, borderLeftWidth: 3, borderLeftColor: theme.accent.primary }]}
          onPress={() => router.push('/admin/features' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Features</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Enable/disable features and set visibility rules
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/product-categories' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Product Categories</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Create and manage product categories
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/products' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Products</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Create and manage platform products
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/ads' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Advertisements</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Create global and targeted ads
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/templates' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Templates</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Configure document templates
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/alerts' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Alert Rules</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Configure mistake prevention alerts
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/books' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Books</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Add and manage DreamBig books
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/help-content' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Help Content</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Edit FAQs, support options, and tips
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/payment-verification' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Payment Verification</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Verify payments and approve access
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/users' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Users</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                View and manage all users
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/premium' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Premium Management</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Manage subscriptions, trials, and discounts
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/payment-methods' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Payment Methods</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Manage payment methods and options
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/monitoring' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Monitoring & Analytics</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                View errors, analytics, and performance metrics
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/integrations' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Integration Settings</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Configure API keys and webhook URLs
              </Text>
            </View>
            <View style={[styles.actionArrowContainer, { backgroundColor: `${theme.accent.primary}15` }]}>
              <ArrowRight size={18} color={theme.accent.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerGradient: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 18,
    borderRadius: 20,
  },
  statCardContent: {
    gap: 12,
  },
  statCardHeader: {
    alignSelf: 'flex-start',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardBody: {
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionUnderline: {
    height: 3,
    width: 50,
    borderRadius: 2,
  },
  actionButton: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionLeft: {
    flex: 1,
    gap: 4,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionSubtext: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  actionArrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


