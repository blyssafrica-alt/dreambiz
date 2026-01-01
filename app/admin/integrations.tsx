import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Save, Settings, Eye, EyeOff, CheckCircle, XCircle, TestTube } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

// Type declarations for browser APIs in React Native
declare global {
  function btoa(data: string): string;
}

interface IntegrationConfig {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  config: Record<string, any>;
}

// Define required fields for each integration
const integrationFields: Record<string, Array<{ key: string; label: string; type: 'text' | 'password' | 'number' | 'email'; placeholder: string; required?: boolean }>> = {
  stripe: [
    { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_test_...', required: true },
    { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_test_...', required: true },
  ],
  paypal: [
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter PayPal Client ID', required: true },
    { key: 'secret', label: 'Client Secret', type: 'password', placeholder: 'Enter PayPal Secret', required: true },
    { key: 'mode', label: 'Mode', type: 'text', placeholder: 'sandbox or live', required: true },
  ],
  ecocash: [
    { key: 'merchantCode', label: 'Merchant Code', type: 'text', placeholder: 'Enter merchant code', required: true },
    { key: 'merchantPin', label: 'Merchant PIN', type: 'password', placeholder: 'Enter merchant PIN', required: true },
  ],
  quickbooks: [
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter QuickBooks Client ID', required: true },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'OAuth Access Token', required: false },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'OAuth Refresh Token', required: false },
  ],
  xero: [
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Xero Client ID', required: true },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'OAuth Access Token', required: false },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'OAuth Refresh Token', required: false },
  ],
  email: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com', required: true },
    { key: 'smtpPort', label: 'SMTP Port', type: 'number', placeholder: '587', required: true },
    { key: 'username', label: 'Email Address', type: 'email', placeholder: 'your-email@example.com', required: true },
    { key: 'password', label: 'Email Password', type: 'password', placeholder: 'Enter email password', required: true },
    { key: 'fromEmail', label: 'From Email', type: 'email', placeholder: 'noreply@yourbusiness.com', required: true },
    { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'Your Business Name', required: false },
  ],
  sms: [
    { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true },
    { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Enter Twilio Auth Token', required: true },
    { key: 'phoneNumber', label: 'Twilio Phone Number', type: 'text', placeholder: '+1234567890', required: true },
  ],
  whatsapp: [
    { key: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter WhatsApp API Key', required: true },
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: 'Enter Phone Number ID', required: true },
    { key: 'businessAccountId', label: 'Business Account ID', type: 'text', placeholder: 'Enter Business Account ID', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
  ],
  'google-drive': [
    { key: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'Enter Google OAuth Client ID', required: true },
    { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', placeholder: 'Enter Client Secret', required: true },
    { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'OAuth Refresh Token', required: false },
  ],
  dropbox: [
    { key: 'appKey', label: 'App Key', type: 'text', placeholder: 'Enter Dropbox App Key', required: true },
    { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'Enter App Secret', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'OAuth Access Token', required: false },
  ],
  bank: [
    { key: 'accountNumber', label: 'Account Number', type: 'text', placeholder: 'Enter bank account number', required: true },
    { key: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'Enter bank name', required: true },
    { key: 'routingNumber', label: 'Routing Number', type: 'text', placeholder: 'Enter routing number', required: false },
  ],
};

export default function IntegrationsConfigScreen() {
  const { theme } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
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
          isActive: row.is_active || false,
          config: row.config || {},
        })));
      } else {
        const defaultIntegrations: IntegrationConfig[] = [
          { id: 'stripe', name: 'Stripe', category: 'payment', isActive: false, config: {} },
          { id: 'paypal', name: 'PayPal', category: 'payment', isActive: false, config: {} },
          { id: 'ecocash', name: 'EcoCash', category: 'payment', isActive: false, config: {} },
          { id: 'quickbooks', name: 'QuickBooks', category: 'accounting', isActive: false, config: {} },
          { id: 'xero', name: 'Xero', category: 'accounting', isActive: false, config: {} },
          { id: 'email', name: 'Email Service', category: 'communication', isActive: false, config: {} },
          { id: 'sms', name: 'SMS Service (Twilio)', category: 'communication', isActive: false, config: {} },
          { id: 'whatsapp', name: 'WhatsApp Business', category: 'communication', isActive: false, config: {} },
          { id: 'google-drive', name: 'Google Drive', category: 'storage', isActive: false, config: {} },
          { id: 'dropbox', name: 'Dropbox', category: 'storage', isActive: false, config: {} },
          { id: 'bank', name: 'Bank Account', category: 'bank', isActive: false, config: {} },
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

  const testConnection = async (integration: IntegrationConfig) => {
    try {
      setTesting(integration.id);
      
      // Test based on integration type
      switch (integration.id) {
        case 'stripe':
          await testStripe(integration.config);
          break;
        case 'paypal':
          await testPayPal(integration.config);
          break;
        case 'sms':
          await testTwilio(integration.config);
          break;
        case 'email':
          await testEmail(integration.config);
          break;
        case 'whatsapp':
          await testWhatsApp(integration.config);
          break;
        case 'google-drive':
          await testGoogleDrive(integration.config);
          break;
        case 'dropbox':
          await testDropbox(integration.config);
          break;
        default:
          Alert.alert('Info', 'Test connection not available for this integration type');
      }
    } catch (error: any) {
      Alert.alert('Test Failed', error.message || 'Connection test failed. Please check your configuration.');
    } finally {
      setTesting(null);
    }
  };

  const testStripe = async (config: Record<string, any>) => {
    if (!config.publishableKey || !config.secretKey) {
      throw new Error('Please enter both Publishable Key and Secret Key');
    }
    
    // Test Stripe API connection
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const error = await response.json() as any;
      const errorMessage = (error && typeof error === 'object' && 'error' in error && error.error && typeof error.error === 'object' && 'message' in error.error) 
        ? String(error.error.message) 
        : 'Invalid Stripe credentials';
      throw new Error(errorMessage);
    }

    Alert.alert('Success', 'Stripe connection test successful!');
  };

  const testPayPal = async (config: Record<string, any>) => {
    if (!config.clientId || !config.secret) {
      throw new Error('Please enter both Client ID and Secret');
    }

    const mode = config.mode || 'sandbox';
    const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    
    // Base64 encode credentials for Basic Auth
    const credentials = `${config.clientId}:${config.secret}`;
    let base64Credentials: string;
    try {
      if (typeof btoa !== 'undefined') {
        base64Credentials = btoa(credentials);
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        let i = 0;
        while (i < credentials.length) {
          const a = credentials.charCodeAt(i++);
          const b = i < credentials.length ? credentials.charCodeAt(i++) : 0;
          const c = i < credentials.length ? credentials.charCodeAt(i++) : 0;
          const bitmap = (a << 16) | (b << 8) | c;
          result += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63) +
            (i - 2 < credentials.length ? chars.charAt((bitmap >> 6) & 63) : '=') +
            (i - 1 < credentials.length ? chars.charAt(bitmap & 63) : '=');
        }
        base64Credentials = result;
      }
    } catch (e) {
      throw new Error('Failed to encode credentials');
    }
    
    // Test PayPal OAuth
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as any;
      const errorMessage = (error && typeof error === 'object')
        ? (('error_description' in error && error.error_description) ? String(error.error_description) : 
           ('error' in error && error.error) ? String(error.error) : 'Invalid PayPal credentials')
        : 'Invalid PayPal credentials';
      throw new Error(errorMessage);
    }

    Alert.alert('Success', 'PayPal connection test successful!');
  };

  const testTwilio = async (config: Record<string, any>) => {
    if (!config.accountSid || !config.authToken || !config.phoneNumber) {
      throw new Error('Please enter Account SID, Auth Token, and Phone Number');
    }

    // Base64 encode for Basic Auth
    const credentials = `${config.accountSid}:${config.authToken}`;
    let base64Credentials: string;
    try {
      // Try browser btoa first
      if (typeof btoa !== 'undefined') {
        base64Credentials = btoa(credentials);
      } else {
        // Fallback: manual base64 encoding
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        let i = 0;
        while (i < credentials.length) {
          const a = credentials.charCodeAt(i++);
          const b = i < credentials.length ? credentials.charCodeAt(i++) : 0;
          const c = i < credentials.length ? credentials.charCodeAt(i++) : 0;
          const bitmap = (a << 16) | (b << 8) | c;
          result += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63) +
            (i - 2 < credentials.length ? chars.charAt((bitmap >> 6) & 63) : '=') +
            (i - 1 < credentials.length ? chars.charAt(bitmap & 63) : '=');
        }
        base64Credentials = result;
      }
    } catch (e) {
      throw new Error('Failed to encode credentials');
    }

    // Test Twilio API connection
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as any;
      const errorMessage = (error && typeof error === 'object' && 'message' in error && error.message) 
        ? String(error.message) 
        : 'Invalid Twilio credentials';
      throw new Error(errorMessage);
    }

    Alert.alert('Success', 'Twilio connection test successful!');
  };

  const testEmail = async (config: Record<string, any>) => {
    if (!config.smtpHost || !config.smtpPort || !config.username || !config.password) {
      throw new Error('Please enter all required SMTP settings');
    }

    // Email testing would require a backend service
    // For now, just validate the format
    const port = parseInt(config.smtpPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('Invalid SMTP port number');
    }

    Alert.alert('Success', 'Email configuration validated! Note: Actual email sending requires backend service.');
  };

  const testWhatsApp = async (config: Record<string, any>) => {
    if (!config.apiKey || !config.phoneNumberId || !config.businessAccountId || !config.accessToken) {
      throw new Error('Please enter all required WhatsApp Business API credentials');
    }

    // Test WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid WhatsApp Business API credentials');
    }

    Alert.alert('Success', 'WhatsApp Business API connection test successful!');
  };

  const testGoogleDrive = async (config: Record<string, any>) => {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Please enter OAuth Client ID and Secret');
    }

    Alert.alert('Info', 'Google Drive requires OAuth flow. Please complete OAuth authentication to test.');
  };

  const testDropbox = async (config: Record<string, any>) => {
    if (!config.appKey || !config.appSecret) {
      throw new Error('Please enter App Key and App Secret');
    }

    Alert.alert('Info', 'Dropbox requires OAuth flow. Please complete OAuth authentication to test.');
  };

  const updateIntegration = (id: string, updates: Partial<IntegrationConfig>) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id ? { ...integration, ...updates } : integration
    ));
  };

  const updateConfigField = (id: string, key: string, value: any) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === id 
        ? { ...integration, config: { ...integration.config, [key]: value } }
        : integration
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
      case 'bank': return 'Banking';
      default: return category;
    }
  };

  const getFieldsForIntegration = (id: string) => {
    return integrationFields[id] || [];
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
        subtitle="Configure API keys and test connections"
        icon={Settings}
        iconGradient={['#8B5CF6', '#7C3AED']}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {integrations.map((integration) => {
          const fields = getFieldsForIntegration(integration.id);
          
          return (
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

              {fields.length > 0 ? (
                fields.map((field) => (
                  <View key={field.key} style={styles.formSection}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>
                      {field.label} {field.required && <Text style={{ color: theme.accent.danger }}>*</Text>}
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, { color: theme.text.primary, borderColor: theme.border.medium }]}
                        value={integration.config[field.key] || ''}
                        onChangeText={(text) => updateConfigField(integration.id, field.key, text)}
                        placeholder={field.placeholder}
                        placeholderTextColor={theme.text.tertiary}
                        secureTextEntry={field.type === 'password' && !showSecrets[`${integration.id}_${field.key}`]}
                        keyboardType={field.type === 'number' ? 'numeric' : field.type === 'email' ? 'email-address' : 'default'}
                        autoCapitalize="none"
                      />
                      {field.type === 'password' && (
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => toggleSecretVisibility(`${integration.id}_${field.key}`)}
                        >
                          {showSecrets[`${integration.id}_${field.key}`] ? (
                            <EyeOff size={18} color={theme.text.secondary} />
                          ) : (
                            <Eye size={18} color={theme.text.secondary} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.formSection}>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>
                    No configuration required for this integration
                  </Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                {['stripe', 'paypal', 'sms', 'email', 'whatsapp', 'google-drive', 'dropbox'].includes(integration.id) && (
                  <TouchableOpacity
                    style={[styles.testButton, { backgroundColor: theme.background.secondary, borderColor: theme.border.medium }]}
                    onPress={() => testConnection(integration)}
                    disabled={testing === integration.id}
                  >
                    {testing === integration.id ? (
                      <ActivityIndicator size="small" color={theme.accent.primary} />
                    ) : (
                      <>
                        <TestTube size={16} color={theme.accent.primary} />
                        <Text style={[styles.testButtonText, { color: theme.accent.primary }]}>Test</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
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
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    flex: 1,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
