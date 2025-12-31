import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Settings, Key, Globe, Lock, Eye, EyeOff } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

interface IntegrationConfig {
  id: string;
  name: string;
  category: string;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  baseUrl?: string;
  isActive: boolean;
  config: Record<string, any>;
}

export default function IntegrationsConfigScreen() {
  const { theme } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/(tabs)' as any);
      return;
    }
    loadIntegrations();
  }, [isSuperAdmin]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      // Load integration configurations from database
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setIntegrations(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          apiKey: row.api_key || '',
          apiSecret: row.api_secret || '',
          webhookUrl: row.webhook_url || '',
          baseUrl: row.base_url || '',
          isActive: row.is_active || false,
          config: row.config || {},
        })));
      } else {
        // Initialize with default integrations if none exist
        const defaultIntegrations: IntegrationConfig[] = [
          { id: 'stripe', name: 'Stripe', category: 'payment', isActive: false, config: {} },
          { id: 'paypal', name: 'PayPal', category: 'payment', isActive: false, config: {} },
          { id: 'ecocash', name: 'EcoCash', category: 'payment', isActive: false, config: {} },
          { id: 'quickbooks', name: 'QuickBooks', category: 'accounting', isActive: false, config: {} },
          { id: 'xero', name: 'Xero', category: 'accounting', isActive: false, config: {} },
          { id: 'email', name: 'Email Service', category: 'communication', isActive: false, config: {} },
          { id: 'sms', name: 'SMS Service', category: 'communication', isActive: false, config: {} },
          { id: 'whatsapp', name: 'WhatsApp Business', category: 'communication', isActive: false, config: {} },
          { id: 'google-drive', name: 'Google Drive', category: 'storage', isActive: false, config: {} },
          { id: 'dropbox', name: 'Dropbox', category: 'storage', isActive: false, config: {} },
        ];
        setIntegrations(defaultIntegrations);
      }
    } catch (error: any) {
      console.error('Failed to load integrations:', error);
      Alert.alert('Error', 'Failed to load integration configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (integration: IntegrationConfig) => {
    try {
      setSaving(integration.id);
      
      const { error } = await supabase
        .from('integration_configs')
        .upsert({
          id: integration.id,
          name: integration.name,
          category: integration.category,
          api_key: integration.apiKey || null,
          api_secret: integration.apiSecret || null,
          webhook_url: integration.webhookUrl || null,
          base_url: integration.baseUrl || null,
          is_active: integration.isActive,
          config: integration.config,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) throw error;

      Alert.alert('Success', `${integration.name} configuration saved successfully`);
      await loadIntegrations();
    } catch (error: any) {
      console.error('Failed to save integration:', error);
      Alert.alert('Error', error.message || 'Failed to save integration configuration');
    } finally {
      setSaving(null);
    }
  };

  const updateIntegration = (id: string, updates: Partial<IntegrationConfig>) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id ? { ...integration, ...updates } : integration
    ));
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'payment': return 'Payment Gateway';
      case 'accounting': return 'Accounting Software';
      case 'communication': return 'Communication';
      case 'storage': return 'Cloud Storage';
      default: return category;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <PageHeader title="Integration Settings" subtitle="Configure API keys and settings" icon={Settings} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="Integration Settings"
        subtitle="Configure API keys and webhook URLs"
        icon={Settings}
        iconGradient={['#8B5CF6', '#7C3AED']}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {integrations.map((integration) => (
          <View key={integration.id} style={[styles.integrationCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.integrationName, { color: theme.text.primary }]}>
                  {integration.name}
                </Text>
                <Text style={[styles.categoryLabel, { color: theme.text.secondary }]}>
                  {getCategoryLabel(integration.category)}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: integration.isActive ? theme.accent.success : theme.background.secondary }
                ]}
                onPress={() => updateIntegration(integration.id, { isActive: !integration.isActive })}
              >
                <Text style={[
                  styles.toggleText,
                  { color: integration.isActive ? '#FFF' : theme.text.secondary }
                ]}>
                  {integration.isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: theme.text.primary }]}>API Key</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { color: theme.text.primary, borderColor: theme.border.medium }]}
                  value={integration.apiKey || ''}
                  onChangeText={(text) => updateIntegration(integration.id, { apiKey: text })}
                  placeholder="Enter API key"
                  placeholderTextColor={theme.text.tertiary}
                  secureTextEntry={!showSecrets[integration.id]}
                />
                {(integration.apiKey || integration.apiSecret) && (
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => toggleSecretVisibility(integration.id)}
                  >
                    {showSecrets[integration.id] ? (
                      <EyeOff size={18} color={theme.text.secondary} />
                    ) : (
                      <Eye size={18} color={theme.text.secondary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {(integration.category === 'payment' || integration.category === 'accounting') && (
              <View style={styles.formSection}>
                <Text style={[styles.label, { color: theme.text.primary }]}>API Secret</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { color: theme.text.primary, borderColor: theme.border.medium }]}
                    value={integration.apiSecret || ''}
                    onChangeText={(text) => updateIntegration(integration.id, { apiSecret: text })}
                    placeholder="Enter API secret"
                    placeholderTextColor={theme.text.tertiary}
                    secureTextEntry={!showSecrets[integration.id]}
                  />
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Base URL</Text>
              <TextInput
                style={[styles.input, { color: theme.text.primary, borderColor: theme.border.medium }]}
                value={integration.baseUrl || ''}
                onChangeText={(text) => updateIntegration(integration.id, { baseUrl: text })}
                placeholder="https://api.example.com"
                placeholderTextColor={theme.text.tertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Webhook URL</Text>
              <TextInput
                style={[styles.input, { color: theme.text.primary, borderColor: theme.border.medium }]}
                value={integration.webhookUrl || ''}
                onChangeText={(text) => updateIntegration(integration.id, { webhookUrl: text })}
                placeholder="https://your-app.com/webhook"
                placeholderTextColor={theme.text.tertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => handleSave(integration)}
              disabled={saving === integration.id}
            >
              {saving === integration.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Save size={18} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Configuration</Text>
                </>
              )}
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  integrationCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  integrationName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 14,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

