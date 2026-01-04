import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Building2, Mail, Calendar, MapPin, DollarSign, Trash2, Eye } from 'lucide-react-native';
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

export default function BusinessesManagementScreen() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'others'>('all');

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    let filtered = businesses;

    // Apply filter type (all, mine, others)
    if (filterType === 'mine') {
      filtered = businesses.filter(b => b.user_id === currentUser?.id);
    } else if (filterType === 'others') {
      filtered = businesses.filter(b => b.user_id !== currentUser?.id);
    }

    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        b =>
          b.name?.toLowerCase().includes(query) ||
          b.owner?.toLowerCase().includes(query) ||
          b.location?.toLowerCase().includes(query) ||
          b.type?.toLowerCase().includes(query) ||
          b.user_email?.toLowerCase().includes(query) ||
          b.user_name?.toLowerCase().includes(query)
      );
    }

    setFilteredBusinesses(filtered);
  }, [searchQuery, businesses, filterType, currentUser?.id]);

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      
      // Load all businesses (super admin should be able to see all)
      const { data: businessesData, error: businessesError } = await supabase
        .from('business_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (businessesError) {
        console.error('Error loading businesses:', businessesError);
        throw businessesError;
      }

      if (businessesData) {
        // Load user information for each business
        const userIds = [...new Set(businessesData.map(b => b.user_id).filter(Boolean))] as string[];
        let userMap: Record<string, { email: string; name?: string }> = {};
        
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, email, name')
            .in('id', userIds);
          
          if (usersData) {
            usersData.forEach(user => {
              userMap[user.id] = {
                email: user.email,
                name: user.name,
              };
            });
          }
        }

        const businessesWithUsers = businessesData.map((b: any) => ({
          ...b,
          user_email: userMap[b.user_id]?.email,
          user_name: userMap[b.user_id]?.name,
        }));

        setBusinesses(businessesWithUsers);
        setFilteredBusinesses(businessesWithUsers);
      }
    } catch (error: any) {
      console.error('Failed to load businesses:', error);
      Alert.alert('Error', error.message || 'Failed to load businesses');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteBusiness = (businessId: string, businessName: string) => {
    Alert.alert(
      'Delete Business',
      `Are you sure you want to delete "${businessName}"? This action cannot be undone and will delete all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('business_profiles').delete().eq('id', businessId);

              if (error) throw error;

              Alert.alert('Success', 'Business deleted successfully');
              loadBusinesses();
            } catch (error: any) {
              console.error('Failed to delete business:', error);
              Alert.alert('Error', error.message || 'Failed to delete business');
            }
          },
        },
      ]
    );
  };

  const handleViewBusiness = (businessId: string) => {
    router.push(`/admin/business/${businessId}`);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      retail: 'Retail',
      services: 'Services',
      restaurant: 'Restaurant',
      salon: 'Salon',
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

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${Math.abs(amount).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading businesses...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <PageHeader
        title="Business Management"
        subtitle="View and manage all businesses"
        icon={Building2}
        iconGradient={['#8B5CF6', '#7C3AED']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
        <Search size={20} color={theme.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder="Search businesses by name, owner, location..."
          placeholderTextColor={theme.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filterType === 'all' ? theme.accent.primary : theme.background.secondary,
            },
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: filterType === 'all' ? '#FFF' : theme.text.secondary },
            ]}
          >
            All ({businesses.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filterType === 'mine' ? theme.accent.primary : theme.background.secondary,
            },
          ]}
          onPress={() => setFilterType('mine')}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: filterType === 'mine' ? '#FFF' : theme.text.secondary },
            ]}
          >
            My Businesses ({businesses.filter(b => b.user_id === currentUser?.id).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filterType === 'others' ? theme.accent.primary : theme.background.secondary,
            },
          ]}
          onPress={() => setFilterType('others')}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: filterType === 'others' ? '#FFF' : theme.text.secondary },
            ]}
          >
            Others ({businesses.filter(b => b.user_id !== currentUser?.id).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadBusinesses();
            }}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>{businesses.length}</Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Businesses</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>
              {businesses.filter(b => b.stage === 'running').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Running</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>
              {businesses.filter(b => b.currency === 'USD').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>USD</Text>
          </View>
        </View>

        {filteredBusinesses.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {searchQuery ? 'No businesses found' : 'No businesses yet'}
            </Text>
          </View>
        ) : (
          filteredBusinesses.map((business) => (
            <View key={business.id} style={[styles.businessCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.businessHeader}>
                <View style={[styles.businessIcon, { backgroundColor: theme.accent.primary + '20' }]}>
                  <Building2 size={24} color={theme.accent.primary} />
                </View>
                <View style={styles.businessInfo}>
                  <Text style={[styles.businessName, { color: theme.text.primary }]}>{business.name}</Text>
                  <Text style={[styles.businessMeta, { color: theme.text.secondary }]}>
                    {getTypeLabel(business.type)} • {getStageLabel(business.stage)}
                  </Text>
                </View>
              </View>

              <View style={styles.businessDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Owner:</Text>
                  <Text style={[styles.detailValue, { color: theme.text.primary }]}>{business.owner}</Text>
                </View>
                {business.user_email && (
                  <View style={styles.detailRow}>
                    <Mail size={14} color={theme.text.tertiary} />
                    <Text style={[styles.detailValue, { color: theme.text.secondary, marginLeft: 6 }]}>
                      {business.user_email}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <MapPin size={14} color={theme.text.tertiary} />
                  <Text style={[styles.detailValue, { color: theme.text.secondary, marginLeft: 6 }]}>
                    {business.location}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <DollarSign size={14} color={theme.text.tertiary} />
                  <Text style={[styles.detailValue, { color: theme.text.primary, marginLeft: 6 }]}>
                    {formatCurrency(business.capital, business.currency)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={14} color={theme.text.tertiary} />
                  <Text style={[styles.detailValue, { color: theme.text.secondary, marginLeft: 6 }]}>
                    Created {new Date(business.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.businessActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                  onPress={() => handleViewBusiness(business.id)}
                >
                  <Eye size={16} color={theme.accent.info} />
                  <Text style={[styles.actionButtonText, { color: theme.accent.info }]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                  onPress={() => handleDeleteBusiness(business.id, business.name)}
                >
                  <Trash2 size={16} color={theme.accent.danger} />
                  <Text style={[styles.actionButtonText, { color: theme.accent.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  businessCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  businessMeta: {
    fontSize: 14,
    fontWeight: '500',
  },
  businessDetails: {
    gap: 8,
    marginBottom: 16,
    paddingLeft: 60,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 60,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  businessActions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 60,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

