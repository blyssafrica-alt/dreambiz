import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Building2, Mail, Calendar, MapPin, DollarSign, Phone, User, TrendingUp, FileText, Users, Package, CreditCard, AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

interface BusinessData {
  id: string;
  name: string;
  type: string;
  stage: string;
  location: string;
  capital: number;
  currency: string;
  owner: string;
  phone?: string;
  email?: string;
  address?: string;
  dream_big_book?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

interface BusinessStats {
  totalDocuments: number;
  totalCustomers: number;
  totalProducts: number;
  totalTransactions: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { switchBusiness, business: currentBusiness } = useBusiness();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, [id]);

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      
      // Load business profile
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (businessError) throw businessError;
      if (!businessData) throw new Error('Business not found');

      // Load user information
      let userEmail = '';
      let userName = '';
      if (businessData.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', businessData.user_id)
          .single();
        
        if (userData) {
          userEmail = userData.email || '';
          userName = userData.name || '';
        }
      }

      const businessWithUser: BusinessData = {
        ...businessData,
        user_email: userEmail,
        user_name: userName,
      };

      setBusiness(businessWithUser);

      // Load business statistics
      await loadBusinessStats(businessData.id);
    } catch (error: any) {
      console.error('Failed to load business:', error);
      Alert.alert('Error', error.message || 'Failed to load business details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadBusinessStats = async (businessId: string) => {
    try {
      // Load statistics in parallel
      const [documentsResult, customersResult, productsResult, transactionsResult] = await Promise.all([
        supabase.from('documents').select('id, total_amount, type').eq('business_id', businessId),
        supabase.from('customers').select('id').eq('business_id', businessId),
        supabase.from('products').select('id').eq('business_id', businessId),
        supabase.from('transactions').select('id, amount, type').eq('business_id', businessId),
      ]);

      const documents = documentsResult.data || [];
      const customers = customersResult.data || [];
      const products = productsResult.data || [];
      const transactions = transactionsResult.data || [];

      // Calculate revenue (income transactions + invoice payments)
      const revenueTransactions = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const invoiceRevenue = documents
        .filter(d => d.type === 'invoice' && d.total_amount)
        .reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0);
      const totalRevenue = revenueTransactions + invoiceRevenue;

      // Calculate expenses (expense transactions)
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

      const netProfit = totalRevenue - totalExpenses;

      setStats({
        totalDocuments: documents.length,
        totalCustomers: customers.length,
        totalProducts: products.length,
        totalTransactions: transactions.length,
        totalRevenue,
        totalExpenses,
        netProfit,
      });
    } catch (error) {
      console.error('Failed to load business stats:', error);
      // Set default stats on error
      setStats({
        totalDocuments: 0,
        totalCustomers: 0,
        totalProducts: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
      });
    }
  };

  const handleSwitchBusiness = async () => {
    if (!business) return;

    if (currentBusiness?.id === business.id) {
      Alert.alert('Already Active', 'This business is already your active business');
      return;
    }

    Alert.alert(
      'Switch Business',
      `Are you sure you want to switch to "${business.name}"? This will change your active business context.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              setIsSwitching(true);
              await switchBusiness(business.id);
              Alert.alert('Success', 'Business switched successfully', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to switch business');
            } finally {
              setIsSwitching(false);
            }
          },
        },
      ]
    );
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      retail: 'Retail Shop',
      services: 'Services',
      restaurant: 'Restaurant/Food',
      salon: 'Salon/Beauty',
      agriculture: 'Agriculture',
      construction: 'Construction',
      transport: 'Transport',
      manufacturing: 'Manufacturing',
      other: 'Other',
    };
    return types[type] || type;
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      idea: 'Idea Stage',
      running: 'Running',
      growing: 'Growing',
      startup: 'Startup',
      growth: 'Growth',
      mature: 'Mature',
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      idea: theme.accent.warning,
      running: theme.accent.success,
      growing: theme.accent.info,
      startup: theme.accent.warning,
      growth: theme.accent.info,
      mature: theme.accent.primary,
    };
    return colors[stage] || theme.text.secondary;
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading business details...</Text>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background.primary }]}>
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Business not found</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCurrentBusiness = currentBusiness?.id === business.id;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <PageHeader
        title="Business Details"
        subtitle={business.name}
        icon={Building2}
        iconGradient={['#8B5CF6', '#7C3AED']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadBusinessData();
            }}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
      >
        {/* Business Header Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.background.card }]}>
          <View style={[styles.businessIcon, { backgroundColor: theme.accent.primary + '20' }]}>
            <Building2 size={32} color={theme.accent.primary} />
          </View>
          <View style={styles.businessHeaderInfo}>
            <Text style={[styles.businessName, { color: theme.text.primary }]}>{business.name}</Text>
            <View style={styles.businessMetaRow}>
              <View style={[styles.stageBadge, { backgroundColor: getStageColor(business.stage) + '20' }]}>
                <Text style={[styles.stageText, { color: getStageColor(business.stage) }]}>
                  {getStageLabel(business.stage)}
                </Text>
              </View>
              <Text style={[styles.businessType, { color: theme.text.secondary }]}>
                {getTypeLabel(business.type)}
              </Text>
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
              <FileText size={20} color={theme.accent.info} />
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{stats.totalDocuments}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Documents</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
              <Users size={20} color={theme.accent.success} />
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{stats.totalCustomers}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Customers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
              <Package size={20} color={theme.accent.warning} />
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{stats.totalProducts}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Products</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
              <CreditCard size={20} color={theme.accent.primary} />
              <Text style={[styles.statValue, { color: theme.text.primary }]}>{stats.totalTransactions}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Transactions</Text>
            </View>
          </View>
        )}

        {/* Financial Summary */}
        {stats && (
          <View style={[styles.financialCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Financial Summary</Text>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.text.secondary }]}>Total Revenue:</Text>
              <Text style={[styles.financialValue, { color: theme.accent.success }]}>
                {formatCurrency(stats.totalRevenue, business.currency)}
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.text.secondary }]}>Total Expenses:</Text>
              <Text style={[styles.financialValue, { color: theme.accent.danger }]}>
                {formatCurrency(stats.totalExpenses, business.currency)}
              </Text>
            </View>
            <View style={[styles.financialRow, styles.financialRowLast]}>
              <Text style={[styles.financialLabel, { color: theme.text.primary, fontWeight: '700' }]}>Net Profit:</Text>
              <Text style={[styles.financialValue, { 
                color: stats.netProfit >= 0 ? theme.accent.success : theme.accent.danger,
                fontWeight: '700',
              }]}>
                {formatCurrency(stats.netProfit, business.currency)}
              </Text>
            </View>
          </View>
        )}

        {/* Business Information */}
        <View style={[styles.infoCard, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Business Information</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={18} color={theme.text.tertiary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Owner</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.owner}</Text>
            </View>
          </View>

          {business.user_email && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Mail size={18} color={theme.text.tertiary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>User Email</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.user_email}</Text>
              </View>
            </View>
          )}

          {business.user_name && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <User size={18} color={theme.text.tertiary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>User Name</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.user_name}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MapPin size={18} color={theme.text.tertiary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.location}</Text>
            </View>
          </View>

          {business.address && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MapPin size={18} color={theme.text.tertiary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.address}</Text>
              </View>
            </View>
          )}

          {business.phone && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Phone size={18} color={theme.text.tertiary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.phone}</Text>
              </View>
            </View>
          )}

          {business.email && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Mail size={18} color={theme.text.tertiary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Business Email</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>{business.email}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <DollarSign size={18} color={theme.text.tertiary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Capital</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                {formatCurrency(business.capital, business.currency)}
              </Text>
            </View>
          </View>

          {business.dream_big_book && business.dream_big_book !== 'none' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <FileText size={18} color={theme.text.tertiary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Dream Big Book</Text>
                <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                  {business.dream_big_book.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={18} color={theme.text.tertiary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Created</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                {new Date(business.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={18} color={theme.text.tertiary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: theme.text.secondary }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: theme.text.primary }]}>
                {new Date(business.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.switchButton,
            {
              backgroundColor: isCurrentBusiness ? theme.background.secondary : theme.accent.primary,
              opacity: isSwitching ? 0.6 : 1,
            },
          ]}
          onPress={handleSwitchBusiness}
          disabled={isCurrentBusiness || isSwitching}
        >
          {isSwitching ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : isCurrentBusiness ? (
            <>
              <CheckCircle size={20} color={theme.text.secondary} />
              <Text style={[styles.switchButtonText, { color: theme.text.secondary }]}>
                Currently Active Business
              </Text>
            </>
          ) : (
            <>
              <TrendingUp size={20} color="#FFF" />
              <Text style={styles.switchButtonText}>Switch to This Business</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  headerCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  businessIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessHeaderInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  businessMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessType: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  financialCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  financialRowLast: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  financialLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  switchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

