import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, User, Mail, Calendar, Gift, Percent, Trash2, Crown } from 'lucide-react-native';

interface UserData {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
  is_super_admin: boolean;
  role?: 'user' | 'moderator' | 'admin' | 'super_admin';
  subscription_status?: string;
  subscription_plan_id?: string;
  subscription_end_date?: string;
  subscription_plan_name?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_period: string;
}

export default function UsersManagementScreen() {
  const { theme } = useTheme();
  const { user: currentUser, isSuperAdmin, isAdmin, isModerator } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<'free' | 'trial' | 'active'>('active');
  const [trialDays, setTrialDays] = useState('14');

  useEffect(() => {
    loadUsers();
    loadSubscriptionPlans();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          u =>
            u.email?.toLowerCase().includes(query) ||
            u.name?.toLowerCase().includes(query) ||
            u.subscription_status?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      if (!usersData) {
        setUsers([]);
        setFilteredUsers([]);
        return;
      }

      // Load active subscriptions for all users
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          end_date,
          plan_id,
          subscription_plans (
            id,
            name
          )
        `)
        .in('status', ['active', 'trial'])
        .or('end_date.is.null,end_date.gt.' + new Date().toISOString());

      if (subscriptionsError) {
        console.error('Failed to load subscriptions:', subscriptionsError);
        // Continue without subscription data
      }

      // Map subscriptions by user_id
      const subscriptionsMap = new Map();
      if (subscriptionsData) {
        subscriptionsData.forEach((sub: any) => {
          if (!subscriptionsMap.has(sub.user_id)) {
            subscriptionsMap.set(sub.user_id, {
              status: sub.status,
              end_date: sub.end_date,
              plan_name: sub.subscription_plans?.name || 'Premium',
              plan_id: sub.subscription_plans?.id || sub.plan_id,
            });
          }
        });
      }

      // Enrich users with subscription data
      const enrichedUsers = usersData.map((user: any) => {
        const subscription = subscriptionsMap.get(user.id);
        
        if (subscription) {
          return {
            ...user,
            subscription_status: subscription.status === 'active' ? 'premium' : subscription.status,
            subscription_plan_name: subscription.plan_name,
            subscription_plan_id: subscription.plan_id,
            subscription_end_date: subscription.end_date,
          };
        } else {
          return {
            ...user,
            subscription_status: 'free',
            subscription_plan_name: undefined,
            subscription_plan_id: undefined,
            subscription_end_date: undefined,
          };
        }
      });

      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price, currency, billing_period')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
    }
  };

  const handleGrantTrial = (userId: string) => {
    router.push(`/admin/premium?action=grant_trial&userId=${userId}` as any);
  };

  const handleGrantDiscount = (userId: string) => {
    router.push(`/admin/premium?action=grant_discount&userId=${userId}` as any);
  };

  const handleOpenPlanModal = (user: UserData) => {
    setSelectedUser(user);
    const status = user.subscription_status === 'trial'
      ? 'trial'
      : user.subscription_status === 'premium'
        ? 'active'
        : 'free';
    setPlanStatus(status);
    setSelectedPlanId(user.subscription_plan_id || subscriptionPlans[0]?.id || null);
    setTrialDays('14');
    setShowPlanModal(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser) return;

    try {
      const now = new Date().toISOString();

      if (planStatus === 'free') {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled', cancelled_at: now })
          .eq('user_id', selectedUser.id)
          .in('status', ['active', 'trial']);

        const { error: userError } = await supabase
          .from('users')
          .update({
            subscription_status: 'free',
            subscription_plan_id: null,
            subscription_end_date: null,
          })
          .eq('id', selectedUser.id);

        if (userError) throw userError;
      } else {
        if (!selectedPlanId) {
          Alert.alert('Select Plan', 'Please select a subscription plan.');
          return;
        }

        const trialDuration = Math.max(1, parseInt(trialDays || '14', 10));
        const trialEndDate = new Date(Date.now() + trialDuration * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled', cancelled_at: now })
          .eq('user_id', selectedUser.id)
          .in('status', ['active', 'trial']);

        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: selectedUser.id,
            plan_id: selectedPlanId,
            status: planStatus === 'trial' ? 'trial' : 'active',
            start_date: now,
            end_date: planStatus === 'trial' ? trialEndDate : null,
            trial_end_date: planStatus === 'trial' ? trialEndDate : null,
            auto_renew: planStatus !== 'trial',
          });

        if (subscriptionError) throw subscriptionError;

        const { error: userError } = await supabase
          .from('users')
          .update({
            subscription_status: planStatus === 'trial' ? 'trial' : 'premium',
            subscription_plan_id: selectedPlanId,
            subscription_end_date: planStatus === 'trial' ? trialEndDate : null,
          })
          .eq('id', selectedUser.id);

        if (userError) throw userError;
      }

      setShowPlanModal(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Success', 'Subscription updated successfully');
    } catch (error) {
      console.error('Failed to update subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const handleDeleteUser = (userId: string, userEmail: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userEmail}? This action cannot be undone and will delete all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('users').delete().eq('id', userId);

              if (error) throw error;

              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              console.error('Failed to delete user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const canManageRoles = isSuperAdmin || isAdmin || isModerator;

  const getEffectiveRole = (user: UserData) =>
    user.role || (user.is_super_admin ? 'super_admin' : 'user');

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return '#F59E0B';
      case 'admin':
        return '#8B5CF6';
      case 'moderator':
        return '#3B82F6';
      default:
        return '#64748B';
    }
  };

  const getAssignableRoles = (targetRole: string) => {
    if (isSuperAdmin) return ['user', 'moderator', 'admin', 'super_admin'];
    if (isAdmin) return ['user', 'moderator'];
    if (isModerator && targetRole === 'user') return ['user', 'moderator'];
    return [];
  };

  const handleOpenRoleModal = (user: UserData) => {
    if (!canManageRoles) return;
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleUpdateRole = async (user: UserData, role: string) => {
    if (!canManageRoles) return;
    if (currentUser?.id === user.id && !isSuperAdmin) {
      Alert.alert('Not Allowed', 'Only super admins can change their own role.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role,
          is_super_admin: role === 'super_admin',
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', `Role updated to ${role.replace('_', ' ')}`);
      setShowRoleModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const getSubscriptionBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'premium':
        return '#10B981';
      case 'trial':
        return '#3B82F6';
      case 'expired':
        return '#EF4444';
      case 'free':
        return '#64748B';
      default:
        return '#64748B';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          User Management
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.background.secondary }]}>
          <Search size={20} color={theme.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search users..."
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>
              {users.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Users</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>
              {users.filter(u => u.subscription_status === 'premium').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Premium</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.statValue, { color: theme.text.primary }]}>
              {users.filter(u => u.subscription_status === 'trial').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Trial</Text>
          </View>
        </View>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <User size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {searchQuery ? 'No users found' : 'No users yet'}
            </Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View
              key={user.id}
              style={[styles.userCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.userHeader}>
                <View style={[styles.userAvatar, { backgroundColor: theme.accent.primary + '20' }]}>
                  <User size={24} color={theme.accent.primary} />
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={[styles.userName, { color: theme.text.primary }]}>
                      {user.name || user.email}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: getRoleBadgeColor(getEffectiveRole(user)) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getRoleBadgeColor(getEffectiveRole(user)) }]}>
                        {getEffectiveRole(user).replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    {user.subscription_status && user.subscription_status !== 'free' && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: getSubscriptionBadgeColor(user.subscription_status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: getSubscriptionBadgeColor(user.subscription_status) },
                          ]}
                        >
                          {user.subscription_status === 'premium' 
                            ? (user.subscription_plan_name || 'PREMIUM').toUpperCase()
                            : user.subscription_status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {(!user.subscription_status || user.subscription_status === 'free') && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: getSubscriptionBadgeColor('free') + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: getSubscriptionBadgeColor('free') },
                          ]}
                        >
                          FREE
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userMeta}>
                    <Mail size={14} color={theme.text.tertiary} />
                    <Text style={[styles.userEmail, { color: theme.text.secondary }]}>
                      {user.email}
                    </Text>
                  </View>
                  <View style={styles.userMeta}>
                    <Calendar size={14} color={theme.text.tertiary} />
                    <Text style={[styles.userDate, { color: theme.text.tertiary }]}>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              {(canManageRoles || !user.is_super_admin) && (
                <View style={styles.userActions}>
                  {canManageRoles && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                      onPress={() => handleOpenRoleModal(user)}
                    >
                      <Text style={[styles.actionButtonText, { color: theme.text.primary }]}>
                        Change Role
                      </Text>
                    </TouchableOpacity>
                  )}
                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                      onPress={() => handleOpenPlanModal(user)}
                    >
                      <Crown size={16} color={theme.accent.info} />
                      <Text style={[styles.actionButtonText, { color: theme.accent.info }]}>
                        Change Plan
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!user.is_super_admin && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                        onPress={() => handleGrantTrial(user.id)}
                      >
                        <Gift size={16} color={theme.accent.info} />
                        <Text style={[styles.actionButtonText, { color: theme.accent.info }]}>
                          Grant Trial
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.surface.success }]}
                        onPress={() => handleGrantDiscount(user.id)}
                      >
                        <Percent size={16} color={theme.accent.success} />
                        <Text style={[styles.actionButtonText, { color: theme.accent.success }]}>
                          Grant Discount
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                        onPress={() => handleDeleteUser(user.id, user.email)}
                      >
                        <Trash2 size={16} color={theme.accent.danger} />
                        <Text style={[styles.actionButtonText, { color: theme.accent.danger }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
      {showRoleModal && selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Change Role</Text>
            <Text style={[styles.modalSubtitle, { color: theme.text.secondary }]}>
              {selectedUser.email}
            </Text>
            {getAssignableRoles(getEffectiveRole(selectedUser)).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleOption, { borderColor: theme.border.light }]}
                onPress={() => handleUpdateRole(selectedUser, role)}
              >
                <Text style={[styles.roleOptionText, { color: theme.text.primary }]}>
                  {role.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
              onPress={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}
            >
              <Text style={[styles.cancelText, { color: theme.text.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {showPlanModal && selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Change Subscription</Text>
            <Text style={[styles.modalSubtitle, { color: theme.text.secondary }]}>
              {selectedUser.email}
            </Text>

            <View style={styles.planStatusRow}>
              {(['free', 'trial', 'active'] as const).map(status => {
                const isSelected = planStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isSelected ? theme.accent.primary : theme.background.secondary,
                        borderColor: isSelected ? theme.accent.primary : theme.border.light,
                      },
                    ]}
                    onPress={() => setPlanStatus(status)}
                  >
                    <Text style={[styles.statusPillText, { color: isSelected ? '#FFF' : theme.text.primary }]}>
                      {status === 'active' ? 'Premium' : status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {planStatus !== 'free' && (
              <View style={styles.planList}>
                {subscriptionPlans.map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planOption,
                        {
                          borderColor: isSelected ? theme.accent.primary : theme.border.light,
                          backgroundColor: isSelected ? `${theme.accent.primary}10` : theme.background.secondary,
                        },
                      ]}
                      onPress={() => setSelectedPlanId(plan.id)}
                    >
                      <View>
                        <Text style={[styles.planName, { color: theme.text.primary }]}>{plan.name}</Text>
                        <Text style={[styles.planPrice, { color: theme.text.tertiary }]}>
                          {plan.currency} {plan.price} / {plan.billing_period}
                        </Text>
                      </View>
                      {isSelected && <Crown size={18} color={theme.accent.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {planStatus === 'trial' && (
              <View style={styles.trialInputRow}>
                <Text style={[styles.trialLabel, { color: theme.text.secondary }]}>Trial days</Text>
                <TextInput
                  style={[styles.trialInput, { borderColor: theme.border.light, color: theme.text.primary }]}
                  value={trialDays}
                  onChangeText={setTrialDays}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
              onPress={handleUpdateSubscription}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
              onPress={() => {
                setShowPlanModal(false);
                setSelectedUser(null);
              }}
            >
              <Text style={[styles.cancelText, { color: theme.text.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  userDate: {
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  roleOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  planStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  planList: {
    gap: 8,
    marginBottom: 12,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  trialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trialLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  trialInput: {
    width: 80,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

