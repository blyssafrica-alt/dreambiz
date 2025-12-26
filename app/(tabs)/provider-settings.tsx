// Provider Settings Screen - Allows users to switch between backend providers
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useProvider } from '@/contexts/ProviderContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Database, AlertCircle } from 'lucide-react-native';
import type { ProviderType } from '@/lib/providers';

export default function ProviderSettingsScreen() {
  const { theme } = useTheme();
  const { currentProvider, availableProviders, switchProvider, isInitialized } = useProvider();
  const { isAuthenticated, signOut } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchProvider = async (providerType: ProviderType) => {
    if (providerType === currentProvider) {
      return;
    }

    if (isAuthenticated) {
      Alert.alert(
        'Sign Out Required',
        'You need to sign out before switching providers. Do you want to sign out now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out & Switch',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsSwitching(true);
                await signOut();
                await switchProvider(providerType);
                Alert.alert('Success', `Switched to ${providerType} provider`);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to switch provider');
              } finally {
                setIsSwitching(false);
              }
            },
          },
        ]
      );
    } else {
      try {
        setIsSwitching(true);
        await switchProvider(providerType);
        Alert.alert('Success', `Switched to ${providerType} provider`);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to switch provider');
      } finally {
        setIsSwitching(false);
      }
    }
  };

  const getProviderInfo = (type: ProviderType) => {
    switch (type) {
      case 'supabase':
        return {
          name: 'Supabase',
          description: 'PostgreSQL database with real-time subscriptions',
          icon: Database,
        };
      case 'firebase':
        return {
          name: 'Firebase',
          description: 'Google\'s backend-as-a-service platform',
          icon: Database,
        };
      case 'hybrid':
        return {
          name: 'Hybrid',
          description: 'Use both Supabase and Firebase together',
          icon: Database,
        };
      default:
        return { name: type, description: '', icon: Database };
    }
  };

  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
          Initializing providers...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Backend Provider</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Choose your backend service provider
        </Text>
      </View>

      <View style={styles.providersList}>
        {availableProviders.map((providerType) => {
          const info = getProviderInfo(providerType);
          const isActive = providerType === currentProvider;
          const Icon = info.icon;

          return (
            <TouchableOpacity
              key={providerType}
              style={[
                styles.providerCard,
                {
                  backgroundColor: theme.background.card,
                  borderColor: isActive ? theme.accent.primary : theme.border.light,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
              onPress={() => handleSwitchProvider(providerType)}
              disabled={isSwitching}
            >
              <View style={styles.providerHeader}>
                <Icon size={24} color={isActive ? theme.accent.primary : theme.text.secondary} />
                <Text style={[styles.providerName, { color: theme.text.primary }]}>
                  {info.name}
                </Text>
                {isActive && (
                  <CheckCircle size={20} color={theme.accent.primary} style={styles.checkIcon} />
                )}
              </View>
              <Text style={[styles.providerDescription, { color: theme.text.secondary }]}>
                {info.description}
              </Text>
              {isSwitching && providerType !== currentProvider && (
                <ActivityIndicator
                  size="small"
                  color={theme.accent.primary}
                  style={styles.switchingIndicator}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.infoBox, { backgroundColor: theme.surface.info }]}>
        <AlertCircle size={20} color={theme.accent.info} />
        <Text style={[styles.infoText, { color: theme.text.secondary }]}>
          {isAuthenticated
            ? 'You must sign out before switching providers.'
            : 'Your data will remain accessible after switching providers.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  providersList: {
    gap: 12,
  },
  providerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  providerDescription: {
    fontSize: 14,
    marginLeft: 36,
  },
  switchingIndicator: {
    marginTop: 8,
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

