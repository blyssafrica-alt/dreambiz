import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react-native';

type BillingType = 'cpc' | 'cpe' | 'cpa';

export default function AdminSettingsScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [billingSettings, setBillingSettings] = useState<{
    cpc: { rate: string; currency: string };
    cpe: { rate: string; currency: string };
    cpa: { rate: string; currency: string };
  }>({
    cpc: { rate: '', currency: 'USD' },
    cpe: { rate: '', currency: 'USD' },
    cpa: { rate: '', currency: 'USD' },
  });

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ad_billing_settings')
        .select('*')
        .order('billing_type');
      
      if (!error && data) {
        const settings: typeof billingSettings = {
          cpc: { rate: '', currency: 'USD' },
          cpe: { rate: '', currency: 'USD' },
          cpa: { rate: '', currency: 'USD' },
        };
        
        data.forEach((item: any) => {
          const type = item.billing_type as BillingType;
          if (settings[type]) {
            settings[type] = {
              rate: item.billing_rate !== null && item.billing_rate !== undefined ? String(item.billing_rate) : '',
              currency: item.currency || 'USD',
            };
          }
        });
        
        setBillingSettings(settings);
      }
    } catch (error) {
      console.warn('Failed to load billing defaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Upsert all three billing types
      const settingsToSave = (['cpc', 'cpe', 'cpa'] as BillingType[]).map(type => {
        const parsedRate = parseFloat(billingSettings[type].rate);
        return {
          billing_type: type,
          billing_rate: Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 0,
          currency: billingSettings[type].currency || 'USD',
          updated_at: new Date().toISOString(),
        };
      });
      
      const { error } = await supabase
        .from('ad_billing_settings')
        .upsert(settingsToSave, { onConflict: 'billing_type' })
        .select();
      
      if (error) throw error;
      Alert.alert('Saved', 'Billing defaults updated for all types.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Access Denied</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>Super admin access required.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, justifyContent: 'center', alignItems: 'center' }]}>
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Admin Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
          <View style={styles.cardHeader}>
            <SettingsIcon size={20} color={theme.accent.primary} />
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Ad Billing Defaults</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: theme.text.secondary }]}>
            Default billing rates for each billing model. These will be used when creating new ads.
          </Text>

          {(['cpc', 'cpe', 'cpa'] as BillingType[]).map(type => (
            <View key={type} style={styles.billingTypeSection}>
              <View style={styles.billingTypeHeader}>
                <Text style={[styles.billingTypeLabel, { color: theme.text.primary }]}>
                  {type.toUpperCase()} (Cost Per {type === 'cpc' ? 'Click' : type === 'cpe' ? 'Engagement' : 'Acquisition'})
                </Text>
              </View>
              <View style={styles.rowInputs}>
                <View style={styles.rateInputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Rate</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    value={billingSettings[type].rate}
                    onChangeText={(text) => {
                      setBillingSettings(prev => ({
                        ...prev,
                        [type]: { ...prev[type], rate: text.replace(/[^0-9.]/g, '') }
                      }));
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.currencyInputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Currency</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="USD"
                    placeholderTextColor={theme.text.tertiary}
                    value={billingSettings[type].currency}
                    onChangeText={(text) => {
                      setBillingSettings(prev => ({
                        ...prev,
                        [type]: { ...prev[type], currency: text.toUpperCase().slice(0, 3) }
                      }));
                    }}
                    maxLength={3}
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Settings'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  billingTypeSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  billingTypeHeader: { marginBottom: 8 },
  billingTypeLabel: { fontSize: 14, fontWeight: '700' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  rateInputContainer: { flex: 2 },
  currencyInputContainer: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { padding: 12, borderRadius: 10, fontSize: 14 },
  saveButton: { marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13 },
});

