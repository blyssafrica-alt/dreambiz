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
  const [billingType, setBillingType] = useState<BillingType>('cpc');
  const [billingRate, setBillingRate] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ad_billing_settings')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) {
        setBillingType((data.billing_type as BillingType) || 'cpc');
        setBillingRate(data.billing_rate !== null && data.billing_rate !== undefined ? String(data.billing_rate) : '');
        setCurrency(data.currency || 'USD');
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
      const parsedRate = parseFloat(billingRate);
      const { error } = await supabase
        .from('ad_billing_settings')
        .upsert({
          billing_type: billingType,
          billing_rate: Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 0,
          currency: currency || 'USD',
          updated_at: new Date().toISOString(),
        })
        .select();
      if (error) throw error;
      Alert.alert('Saved', 'Admin settings updated.');
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
            Default billing model and rate for new ads.
          </Text>

          <Text style={[styles.label, { color: theme.text.secondary }]}>Billing Model</Text>
          <View style={styles.typeButtons}>
            {(['cpc', 'cpe', 'cpa'] as BillingType[]).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, { backgroundColor: billingType === type ? theme.accent.primary : theme.background.secondary }]}
                onPress={() => setBillingType(type)}
              >
                <Text style={[styles.typeButtonText, { color: billingType === type ? '#FFF' : theme.text.primary }]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.text.secondary }]}>Rate</Text>
          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.rowInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="0.00"
              placeholderTextColor={theme.text.tertiary}
              value={billingRate}
              onChangeText={(text) => setBillingRate(text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.rowInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="USD"
              placeholderTextColor={theme.text.tertiary}
              value={currency}
              onChangeText={(text) => setCurrency(text.toUpperCase().slice(0, 3))}
            />
          </View>

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
  typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  typeButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  typeButtonText: { fontSize: 13, fontWeight: '600' },
  rowInputs: { flexDirection: 'row', gap: 8 },
  rowInput: { flex: 1 },
  input: { padding: 12, borderRadius: 10, fontSize: 14 },
  saveButton: { marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13 },
});

