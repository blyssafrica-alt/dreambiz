import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Save, X, Trash2, Edit } from 'lucide-react-native';
import type { AdCampaign } from '@/types/super-admin';

export default function AdCampaignsScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    status: 'draft' as AdCampaign['status'],
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'USD',
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const [{ data, error }, { data: adSetsData }, { data: adsData }] = await Promise.all([
        supabase
          .from('ad_campaigns')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('ad_sets')
          .select('id, campaign_id, status'),
        supabase
          .from('advertisements')
          .select('id, campaign_id, status'),
      ]);
      if (error) throw error;

      const adSetCounts: Record<string, number> = {};
      (adSetsData || []).forEach((row: any) => {
        if (!row.campaign_id) return;
        adSetCounts[row.campaign_id] = (adSetCounts[row.campaign_id] || 0) + 1;
      });

      const adCounts: Record<string, number> = {};
      (adsData || []).forEach((row: any) => {
        if (!row.campaign_id) return;
        adCounts[row.campaign_id] = (adCounts[row.campaign_id] || 0) + 1;
      });

      setCampaigns((data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        objective: row.objective || undefined,
        status: row.status,
        startDate: row.start_date || undefined,
        endDate: row.end_date || undefined,
        budget: row.budget !== null && row.budget !== undefined ? parseFloat(row.budget) : undefined,
        spendActual: row.spend_actual !== null && row.spend_actual !== undefined ? parseFloat(row.spend_actual) : undefined,
        currency: row.currency || 'USD',
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        adSetCount: adSetCounts[row.id] || 0,
        adCount: adCounts[row.id] || 0,
      })));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load campaigns.');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (campaign?: AdCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        objective: campaign.objective || '',
        status: campaign.status,
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
        budget: campaign.budget !== undefined ? String(campaign.budget) : '',
        currency: campaign.currency || 'USD',
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        objective: '',
        status: 'draft',
        startDate: '',
        endDate: '',
        budget: '',
        currency: 'USD',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter a campaign name.');
      return;
    }
    try {
      const payload = {
        name: formData.name,
        objective: formData.objective || null,
        status: formData.status,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        currency: formData.currency || 'USD',
      };
      if (editingCampaign) {
        const { error } = await supabase.from('ad_campaigns').update(payload).eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ad_campaigns').insert(payload);
        if (error) throw error;
      }
      setShowModal(false);
      loadCampaigns();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save campaign.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Campaign', 'Are you sure you want to delete this campaign?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('ad_campaigns').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', error.message || 'Failed to delete campaign.');
          } else {
            loadCampaigns();
          }
        },
      },
    ]);
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ad Campaigns</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {campaigns.length === 0 ? (
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>No campaigns yet.</Text>
        ) : (
          campaigns.map(campaign => (
            <View key={campaign.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{campaign.name}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.text.secondary }]}>{campaign.objective || 'No objective'}</Text>
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>Status: {campaign.status}</Text>
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Budget: {campaign.currency || 'USD'} {campaign.budget?.toFixed(2) ?? '—'}
              </Text>
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Spent: {campaign.currency || 'USD'} {campaign.spendActual?.toFixed(2) ?? '—'}
              </Text>
              {campaign.budget !== undefined && campaign.budget > 0 && campaign.spendActual !== undefined && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressBar, { backgroundColor: theme.border.light }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: theme.accent.primary, width: `${Math.min((campaign.spendActual / campaign.budget) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: theme.text.tertiary }]}>
                    {Math.round((campaign.spendActual / campaign.budget) * 100)}% of budget used
                  </Text>
                </View>
              )}
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Ad Sets: {campaign.adSetCount ?? 0} · Ads: {campaign.adCount ?? 0}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openModal(campaign)}>
                  <Edit size={18} color={theme.accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(campaign.id)}>
                  <Trash2 size={18} color={theme.accent.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Objective</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.objective}
                onChangeText={(text) => setFormData({ ...formData, objective: text })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Status</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.status}
                onChangeText={(text) => setFormData({ ...formData, status: text })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Budget</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.budget}
                onChangeText={(text) => setFormData({ ...formData, budget: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Currency</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.currency}
                onChangeText={(text) => setFormData({ ...formData, currency: text.toUpperCase().slice(0, 3) })}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent.primary }]} onPress={handleSave}>
                <Save size={16} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, gap: 12 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 4 },
  cardMeta: { fontSize: 12, marginTop: 4 },
  progressRow: { marginTop: 8, gap: 6 },
  progressBar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 999 },
  progressText: { fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { padding: 12, borderRadius: 10, fontSize: 14 },
  modalFooter: { padding: 16 },
  saveButton: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13 },
});

