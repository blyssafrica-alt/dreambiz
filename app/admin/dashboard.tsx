import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BarChart, TrendingUp, Package, Megaphone, FileText, AlertCircle, BookOpen } from 'lucide-react-native';
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

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Load all stats in parallel
      const [usersResult, businessesResult, productsResult, adsResult, purchasesResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('business_profiles').select('id', { count: 'exact' }),
        supabase.from('platform_products').select('id', { count: 'exact' }),
        supabase.from('advertisements').select('id', { count: 'exact' }),
        supabase.from('product_purchases').select('total_price, payment_status'),
      ]);

      const totalUsers = usersResult.count || 0;
      const totalBusinesses = businessesResult.count || 0;
      const totalProducts = productsResult.count || 0;
      const totalAds = adsResult.count || 0;

      // Calculate revenue from completed purchases
      const completedPurchases = purchasesResult.data?.filter(p => p.payment_status === 'completed') || [];
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + parseFloat(p.total_price || '0'), 0);

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

  const StatCard = ({ icon: Icon, title, value, color, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: theme.background.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[`${color}20`, `${color}10`]}
        style={styles.iconContainer}
      >
        <Icon size={24} color={color} />
      </LinearGradient>
      <Text style={[styles.statValue, { color: theme.text.primary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.text.secondary }]}>{title}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background.primary }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Admin Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Platform Overview
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon={BarChart}
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          color="#0066CC"
          onPress={() => router.push('/admin/users' as any)}
        />
        <StatCard
          icon={TrendingUp}
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          color="#10B981"
        />
        <StatCard
          icon={Package}
          title="Products"
          value={stats.totalProducts.toLocaleString()}
          color="#F59E0B"
          onPress={() => router.push('/admin/products' as any)}
        />
        <StatCard
          icon={Megaphone}
          title="Advertisements"
          value={stats.totalAds.toLocaleString()}
          color="#EC4899"
          onPress={() => router.push('/admin/ads' as any)}
        />
        <StatCard
          icon={FileText}
          title="Businesses"
          value={stats.totalBusinesses.toLocaleString()}
          color="#8B5CF6"
        />
        <StatCard
          icon={TrendingUp}
          title="Revenue"
          value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="#10B981"
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/features' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Features</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Enable/disable features and set visibility rules
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/products' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Products</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Create and manage platform products
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/ads' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Advertisements</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Create global and targeted ads
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/templates' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Templates</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Configure document templates
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/alerts' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Alert Rules</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Configure mistake prevention alerts
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/books' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Books</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Add and manage DreamBig books
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/users' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Manage Users</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                View and manage all users
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background.card }]}
          onPress={() => router.push('/admin/premium' as any)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionLeft}>
              <Text style={[styles.actionText, { color: theme.text.primary }]}>Premium Management</Text>
              <Text style={[styles.actionSubtext, { color: theme.text.secondary }]}>
                Manage subscriptions, trials, and discounts
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.text.tertiary }]}>→</Text>
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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLeft: {
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 13,
  },
  actionArrow: {
    fontSize: 20,
    marginLeft: 12,
  },
});

