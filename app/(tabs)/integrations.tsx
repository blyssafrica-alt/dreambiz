import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { 
  CreditCard,
  Building2,
  Mail,
  MessageSquare,
  Cloud,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  Plug
} from 'lucide-react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
  Linking,
  Animated,
  ActivityIndicator,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'payment' | 'bank' | 'communication' | 'storage' | 'accounting';
  status: 'available' | 'connected' | 'not_available';
  setupUrl?: string;
}

const integrations: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept online payments via credit cards',
    icon: CreditCard,
    category: 'payment',
    status: 'available',
    setupUrl: 'https://stripe.com',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Accept PayPal payments',
    icon: CreditCard,
    category: 'payment',
    status: 'available',
    setupUrl: 'https://paypal.com',
  },
  {
    id: 'ecocash',
    name: 'EcoCash',
    description: 'Mobile money payments (Zimbabwe)',
    icon: CreditCard,
    category: 'payment',
    status: 'available',
  },
  {
    id: 'bank',
    name: 'Bank Account',
    description: 'Connect your bank account for automatic transaction import',
    icon: Building2,
    category: 'bank',
    status: 'available',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync with QuickBooks accounting software',
    icon: Settings,
    category: 'accounting',
    status: 'available',
    setupUrl: 'https://quickbooks.intuit.com',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Sync with Xero accounting software',
    icon: Settings,
    category: 'accounting',
    status: 'available',
    setupUrl: 'https://xero.com',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Send invoices and receipts via email',
    icon: Mail,
    category: 'communication',
    status: 'connected',
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Send payment reminders via SMS',
    icon: MessageSquare,
    category: 'communication',
    status: 'available',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send invoices and reminders via WhatsApp',
    icon: MessageSquare,
    category: 'communication',
    status: 'available',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Backup documents to Google Drive',
    icon: Cloud,
    category: 'storage',
    status: 'available',
    setupUrl: 'https://drive.google.com',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Backup documents to Dropbox',
    icon: Cloud,
    category: 'storage',
    status: 'available',
    setupUrl: 'https://dropbox.com',
  },
];

export default function IntegrationsScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin, user } = useAuth();
  const router = useRouter();
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>(['email']);
  const [loading, setLoading] = useState(true);
  
  // Animation setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadIntegrationStatus = async () => {
    try {
      setLoading(true);
      // Load integration status from database
      const { data, error } = await supabase
        .from('integration_configs')
        .select('id, is_active')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading integrations:', error);
        // Default to email being connected
        setConnectedIntegrations(['email']);
        return;
      }

      if (data && data.length > 0) {
        const activeIds = data.map(row => row.id);
        // Email is always available by default
        setConnectedIntegrations([...activeIds, 'email'].filter((v, i, a) => a.indexOf(v) === i));
      } else {
        // Default to email being connected
        setConnectedIntegrations(['email']);
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
      setConnectedIntegrations(['email']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    loadIntegrationStatus();
  }, []);

  // Refresh integration status when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadIntegrationStatus();
    }, [])
  );

  const handleConnect = async (integration: Integration) => {
    if (integration.status === 'not_available') {
      RNAlert.alert('Not Available', 'This integration is not yet available');
      return;
    }

    // Email is always available, no setup needed
    if (integration.id === 'email') {
      setConnectedIntegrations([...connectedIntegrations, integration.id]);
      RNAlert.alert('Connected', `${integration.name} has been connected successfully`);
      return;
    }

    // For integrations that need API keys, check if configured
    try {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('id, is_active, api_key')
        .eq('id', integration.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        throw error;
      }

      // If integration exists in config but no API key, need to configure
      if (data && !data.api_key && integration.setupUrl) {
        RNAlert.alert(
          'Configuration Required',
          `To connect ${integration.name}, you need to configure API keys first. ${isSuperAdmin ? 'Would you like to configure it now?' : 'Please contact your administrator to configure this integration.'}`,
          [
            { text: 'Cancel', style: 'cancel' },
            ...(isSuperAdmin ? [{
              text: 'Configure',
              onPress: () => router.push('/admin/integrations' as any),
            }] : []),
            ...(integration.setupUrl ? [{
              text: 'Visit Website',
              onPress: () => Linking.openURL(integration.setupUrl!),
            }] : []),
          ]
        );
        return;
      }

      // If integration is configured, activate it
      if (data && data.api_key) {
        const { error: updateError } = await supabase
          .from('integration_configs')
          .upsert({
            id: integration.id,
            name: integration.name,
            category: integration.category,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (updateError) throw updateError;

        setConnectedIntegrations([...connectedIntegrations, integration.id]);
        RNAlert.alert('Connected', `${integration.name} has been connected successfully`);
      } else if (integration.setupUrl) {
        // No config exists, offer to set up
        RNAlert.alert(
          'Setup Required',
          `To connect ${integration.name}, you'll need to set up an account and configure API keys. ${isSuperAdmin ? 'Would you like to configure it now?' : 'Please contact your administrator.'}`,
          [
            { text: 'Cancel', style: 'cancel' },
            ...(isSuperAdmin ? [{
              text: 'Configure',
              onPress: () => router.push('/admin/integrations' as any),
            }] : []),
            {
              text: 'Visit Website',
              onPress: () => Linking.openURL(integration.setupUrl!),
            },
          ]
        );
      } else {
        // Simple integration that doesn't need API keys
        const { error: insertError } = await supabase
          .from('integration_configs')
          .upsert({
            id: integration.id,
            name: integration.name,
            category: integration.category,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (insertError) throw insertError;

        setConnectedIntegrations([...connectedIntegrations, integration.id]);
        RNAlert.alert('Connected', `${integration.name} has been connected successfully`);
      }
    } catch (error: any) {
      console.error('Failed to connect integration:', error);
      RNAlert.alert('Error', error.message || 'Failed to connect integration. Please try again.');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    // Email cannot be disconnected (it's always available)
    if (integrationId === 'email') {
      RNAlert.alert('Cannot Disconnect', 'Email integration is always available and cannot be disconnected.');
      return;
    }

    RNAlert.alert(
      'Disconnect',
      'Are you sure you want to disconnect this integration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update database to set is_active to false
              const { error } = await supabase
                .from('integration_configs')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', integrationId);

              if (error) throw error;

              setConnectedIntegrations(connectedIntegrations.filter(id => id !== integrationId));
              RNAlert.alert('Disconnected', 'Integration has been disconnected');
            } catch (error: any) {
              console.error('Failed to disconnect integration:', error);
              RNAlert.alert('Error', error.message || 'Failed to disconnect integration. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (category: Integration['category']) => {
    switch (category) {
      case 'payment':
        return 'Payment Gateways';
      case 'bank':
        return 'Banking';
      case 'communication':
        return 'Communication';
      case 'storage':
        return 'Cloud Storage';
      case 'accounting':
        return 'Accounting Software';
    }
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<Integration['category'], Integration[]>);

  const isConnected = (id: string) => connectedIntegrations.includes(id);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Integrations"
          subtitle="Connect your favorite tools and services"
          icon={Plug}
          iconGradient={['#8B5CF6', '#7C3AED']}
        />

        {isSuperAdmin && (
          <View style={styles.adminBanner}>
            <View style={styles.adminBannerContent}>
              <Settings size={18} color="#8B5CF6" />
              <Text style={styles.adminBannerText}>
                Configure API keys and webhook URLs
              </Text>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push('/admin/integrations' as any)}
              >
                <Text style={styles.adminButtonText}>Configure</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          flex: 1,
        }}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
        {Object.entries(groupedIntegrations).map(([category, items]) => (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              {getCategoryLabel(category as Integration['category'])}
            </Text>
            {items.map(integration => {
              const Icon = integration.icon;
              const connected = isConnected(integration.id);
              
              return (
                <View
                  key={integration.id}
                  style={[styles.integrationCard, { backgroundColor: theme.background.card }]}
                >
                  <View style={styles.integrationHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.background.secondary }]}>
                      <Icon size={24} color={theme.accent.primary} />
                    </View>
                    <View style={styles.integrationInfo}>
                      <View style={styles.integrationTitleRow}>
                        <Text style={[styles.integrationName, { color: theme.text.primary }]}>
                          {integration.name}
                        </Text>
                        {connected && (
                          <View style={[styles.statusBadge, { backgroundColor: theme.accent.success + '20' }]}>
                            <CheckCircle size={12} color={theme.accent.success} />
                            <Text style={[styles.statusText, { color: theme.accent.success }]}>
                              Connected
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.integrationDescription, { color: theme.text.secondary }]}>
                        {integration.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.integrationActions}>
                    {connected ? (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                        onPress={() => handleDisconnect(integration.id)}
                      >
                        <Text style={[styles.actionButtonText, { color: theme.accent.danger }]}>
                          Disconnect
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.connectButton, { backgroundColor: theme.accent.primary }]}
                        onPress={() => handleConnect(integration)}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Text style={styles.connectButtonText}>Connect</Text>
                            {integration.setupUrl && (
                              <ExternalLink size={14} color="#FFF" />
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
          </ScrollView>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  integrationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  integrationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  integrationDescription: {
    fontSize: 13,
  },
  integrationActions: {
    marginTop: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  adminBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#8B5CF620',
    borderWidth: 1,
    borderColor: '#8B5CF640',
  },
  adminBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  adminButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  adminButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

