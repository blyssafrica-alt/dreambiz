import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, User, Mail, Calendar, Crown, Gift, Percent, Trash2 } from 'lucide-react-native';

interface UserData {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
  is_super_admin: boolean;
  subscription_status?: string;
  subscription_plan_id?: string;
  subscription_end_date?: string;
}

export default function UsersManagementScreen() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantTrial = (userId: string) => {
    router.push(`/admin/premium?action=grant_trial&userId=${userId}` as any);
  };

  const handleGrantDiscount = (userId: string) => {
    router.push(`/admin/premium?action=grant_discount&userId=${userId}` as any);
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

  const getSubscriptionBadgeColor = (status?: string) => {
    switch (status) {
      case 'premium':
        return '#10B981';
      case 'trial':
        return '#3B82F6';
      case 'expired':
        return '#EF4444';
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
                    {user.is_super_admin && (
                      <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                        <Crown size={12} color="#F59E0B" />
                        <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Admin</Text>
                      </View>
                    )}
                    {user.subscription_status && (
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
                          {user.subscription_status}
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

              {!user.is_super_admin && (
                <View style={styles.userActions}>
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
                </View>
              )}
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
});

