import { Stack } from 'expo-router';
import { 
  CreditCard,
  Building2,
  Mail,
  MessageSquare,
  Cloud,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink
} from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

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
    status: 'not_available',
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
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>(['email']);

  const handleConnect = (integration: Integration) => {
    if (integration.status === 'not_available') {
      RNAlert.alert('Not Available', 'This integration is not yet available');
      return;
    }

    if (integration.setupUrl) {
      RNAlert.alert(
        'Setup Required',
        `To connect ${integration.name}, you'll need to set up an account and configure API keys. Would you like to visit their website?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Visit Website',
            onPress: () => Linking.openURL(integration.setupUrl!),
          },
        ]
      );
    } else {
      setConnectedIntegrations([...connectedIntegrations, integration.id]);
      RNAlert.alert('Connected', `${integration.name} has been connected successfully`);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    RNAlert.alert(
      'Disconnect',
      'Are you sure you want to disconnect this integration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setConnectedIntegrations(connectedIntegrations.filter(id => id !== integrationId));
            RNAlert.alert('Disconnected', 'Integration has been disconnected');
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
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Integrations', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Integrations</Text>
        <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
          Connect external services to enhance your business management
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
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
                        {integration.status === 'not_available' && (
                          <View style={[styles.statusBadge, { backgroundColor: theme.text.tertiary + '20' }]}>
                            <XCircle size={12} color={theme.text.tertiary} />
                            <Text style={[styles.statusText, { color: theme.text.tertiary }]}>
                              Coming Soon
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
                        disabled={integration.status === 'not_available'}
                      >
                        <Text style={styles.connectButtonText}>Connect</Text>
                        {integration.setupUrl && (
                          <ExternalLink size={14} color="#FFF" />
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
    </View>
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
    padding: 16,
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
});

