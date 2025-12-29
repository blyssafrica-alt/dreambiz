import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { User, Mail, Search, X } from 'lucide-react-native';

interface UserOption {
  id: string;
  email: string;
  name?: string;
}

interface UserSelectorProps {
  selectedUserId?: string;
  onSelectUser: (userId: string, userEmail: string, userName?: string) => void;
  placeholder?: string;
}

export default function UserSelector({ selectedUserId, onSelectUser, placeholder = 'Search users by name or email...' }: UserSelectorProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  useEffect(() => {
    if (selectedUserId) {
      loadSelectedUser();
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setFilteredUsers([]);
    }
  }, [searchQuery]);

  const loadSelectedUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', selectedUserId)
        .single();

      if (data && !error) {
        setSelectedUser({ id: data.id, email: data.email, name: data.name });
      }
    } catch (error) {
      console.error('Failed to load selected user:', error);
    }
  };

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const query = searchQuery.toLowerCase();
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      if (data) {
        const userOptions = data.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
        }));
        setUsers(userOptions);
        setFilteredUsers(userOptions);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: UserOption) => {
    setSelectedUser(user);
    setSearchQuery('');
    setFilteredUsers([]);
    onSelectUser(user.id, user.email, user.name);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setFilteredUsers([]);
    onSelectUser('', '', '');
  };

  return (
    <View style={styles.container}>
      {selectedUser ? (
        <View style={[styles.selectedUserCard, { backgroundColor: theme.background.secondary }]}>
          <View style={styles.selectedUserInfo}>
            <User size={20} color={theme.accent.primary} />
            <View style={styles.selectedUserDetails}>
              <Text style={[styles.selectedUserName, { color: theme.text.primary }]}>
                {selectedUser.name || selectedUser.email}
              </Text>
              {selectedUser.name && (
                <Text style={[styles.selectedUserEmail, { color: theme.text.secondary }]}>
                  {selectedUser.email}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={handleClear}>
            <X size={20} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[styles.searchContainer, { backgroundColor: theme.background.secondary }]}>
            <Search size={20} color={theme.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder={placeholder}
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          {filteredUsers.length > 0 && (
            <View style={[styles.usersList, { backgroundColor: theme.background.card }]}>
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.userOption, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleSelectUser(item)}
                  >
                    <User size={18} color={theme.text.secondary} />
                    <View style={styles.userOptionInfo}>
                      <Text style={[styles.userOptionName, { color: theme.text.primary }]}>
                        {item.name || item.email}
                      </Text>
                      {item.name && (
                        <Text style={[styles.userOptionEmail, { color: theme.text.secondary }]}>
                          {item.email}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                nestedScrollEnabled
                maxToRenderPerBatch={10}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  searchContainer: {
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
  usersList: {
    maxHeight: 200,
    borderRadius: 10,
    marginTop: 8,
    padding: 4,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  userOptionInfo: {
    flex: 1,
  },
  userOptionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userOptionEmail: {
    fontSize: 13,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedUserDetails: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedUserEmail: {
    fontSize: 13,
  },
});

