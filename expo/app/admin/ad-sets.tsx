import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Save, X, Trash2, Edit } from 'lucide-react-native';
import type { AdCampaign, AdSet } from '@/types/super-admin';

export default function AdSetsScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [adSetStats, setAdSetStats] = useState<Record<string, { clicks: number; conversions: number }>>({});
  const [adSetTargeting, setAdSetTargeting] = useState<Record<string, string>>({});
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdSet, setEditingAdSet] = useState<AdSet | null>(null);
  const [formData, setFormData] = useState({
    campaignId: '',
    name: '',
    status: 'draft' as AdSet['status'],
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'USD',
    billingType: 'cpc' as 'cpc' | 'cpe' | 'cpa',
    billingRate: '',
    pacingEnabled: false,
    dailyBudget: '',
    attributionClickDays: '7',
    attributionViewDays: '1',
    optimizationGoal: 'impressions' as 'impressions' | 'clicks' | 'conversions',
    learningEventThreshold: '50',
  });

  useEffect(() => {
    loadCampaigns();
    loadAdSets();
  }, []);

  const buildTargetingSummary = (targeting: any) => {
    if (!targeting) return '';
    const parts: string[] = [];
    if (Array.isArray(targeting.targetGenders) && targeting.targetGenders.length > 0) {
      parts.push(`Gender: ${targeting.targetGenders.map((g: string) => g.replace(/_/g, ' ')).join(', ')}`);
    }
    if (targeting.targetAgeMin !== undefined || targeting.targetAgeMax !== undefined) {
      const min = targeting.targetAgeMin;
      const max = targeting.targetAgeMax;
      if (min !== undefined && max !== undefined) {
        parts.push(`Age: ${min}-${max}`);
      } else if (min !== undefined) {
        parts.push(`Age: ${min}+`);
      } else if (max !== undefined) {
        parts.push(`Age: <=${max}`);
      }
    }
    if (Array.isArray(targeting.targetInterests) && targeting.targetInterests.length > 0) {
      const interests = targeting.targetInterests.slice(0, 3).join(', ');
      const suffix = targeting.targetInterests.length > 3
        ? ` +${targeting.targetInterests.length - 3}`
        : '';
      parts.push(`Interests: ${interests}${suffix}`);
    }
    if (parts.length > 0 && targeting.requireAdConsent !== false) {
      parts.push('Consent required');
    }
    return parts.join(' • ');
  };

  const loadCampaigns = async () => {
    const { data } = await supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false });
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
    })));
  };

  const loadAdSets = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [{ data, error }, { data: dailySpendData }] = await Promise.all([
        supabase
          .from('ad_sets')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('ad_set_daily_spend')
          .select('ad_set_id, spend_amount')
          .eq('spend_date', today),
      ]);
      if (error) throw error;
      const dailySpendMap: Record<string, number> = {};
      (dailySpendData || []).forEach((row: any) => {
        if (row.ad_set_id) {
          dailySpendMap[row.ad_set_id] = row.spend_amount !== null && row.spend_amount !== undefined ? parseFloat(row.spend_amount) : 0;
        }
      });
      const mappedAdSets = (data || []).map((row: any) => ({
        id: row.id,
        campaignId: row.campaign_id || undefined,
        name: row.name,
        status: row.status,
        startDate: row.start_date || undefined,
        endDate: row.end_date || undefined,
        budget: row.budget !== null && row.budget !== undefined ? parseFloat(row.budget) : undefined,
        spendActual: row.spend_actual !== null && row.spend_actual !== undefined ? parseFloat(row.spend_actual) : undefined,
        spendActualToday: dailySpendMap[row.id] ?? 0,
        currency: row.currency || 'USD',
        billingType: row.billing_type || 'cpc',
        billingRate: row.billing_rate !== null && row.billing_rate !== undefined ? parseFloat(row.billing_rate) : undefined,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        pacingEnabled: row.pacing_enabled || false,
        dailyBudget: row.daily_budget !== null && row.daily_budget !== undefined ? parseFloat(row.daily_budget) : undefined,
        attributionClickDays: row.attribution_click_days ?? undefined,
        attributionViewDays: row.attribution_view_days ?? undefined,
        optimizationGoal: row.optimization_goal || 'impressions',
        learningEventThreshold: row.learning_event_threshold ?? 50,
      }));

      setAdSets(mappedAdSets);

      const adSetIds = mappedAdSets.map(item => item.id);
      if (adSetIds.length > 0) {
        const { data: adsData } = await supabase
          .from('advertisements')
          .select('ad_set_id, clicks_count, conversions_count, targeting')
          .in('ad_set_id', adSetIds);

        const statsMap: Record<string, { clicks: number; conversions: number }> = {};
        const targetingMap: Record<string, string[]> = {};
        (adsData || []).forEach((row: any) => {
          if (!row.ad_set_id) return;
          if (!statsMap[row.ad_set_id]) {
            statsMap[row.ad_set_id] = { clicks: 0, conversions: 0 };
          }
          statsMap[row.ad_set_id].clicks += row.clicks_count || 0;
          statsMap[row.ad_set_id].conversions += row.conversions_count || 0;

          const summary = buildTargetingSummary(row.targeting);
          if (summary) {
            if (!targetingMap[row.ad_set_id]) {
              targetingMap[row.ad_set_id] = [];
            }
            if (!targetingMap[row.ad_set_id].includes(summary)) {
              targetingMap[row.ad_set_id].push(summary);
            }
          }
        });

        setAdSetStats(statsMap);
        const targetingSummary: Record<string, string> = {};
        Object.entries(targetingMap).forEach(([adSetId, summaries]) => {
          const visible = summaries.slice(0, 2);
          const suffix = summaries.length > 2 ? ` +${summaries.length - 2}` : '';
          targetingSummary[adSetId] = visible.join(' | ') + suffix;
        });
        setAdSetTargeting(targetingSummary);
      } else {
        setAdSetStats({});
        setAdSetTargeting({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load ad sets.');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (adSet?: AdSet) => {
    if (adSet) {
      setEditingAdSet(adSet);
      setFormData({
        campaignId: adSet.campaignId || '',
        name: adSet.name,
        status: adSet.status,
        startDate: adSet.startDate ? adSet.startDate.split('T')[0] : '',
        endDate: adSet.endDate ? adSet.endDate.split('T')[0] : '',
        budget: adSet.budget !== undefined ? String(adSet.budget) : '',
        currency: adSet.currency || 'USD',
        billingType: adSet.billingType || 'cpc',
        billingRate: adSet.billingRate !== undefined ? String(adSet.billingRate) : '',
        pacingEnabled: adSet.pacingEnabled || false,
        dailyBudget: adSet.dailyBudget !== undefined ? String(adSet.dailyBudget) : '',
        attributionClickDays: adSet.attributionClickDays !== undefined ? String(adSet.attributionClickDays) : '7',
        attributionViewDays: adSet.attributionViewDays !== undefined ? String(adSet.attributionViewDays) : '1',
        optimizationGoal: adSet.optimizationGoal || 'impressions',
        learningEventThreshold: adSet.learningEventThreshold !== undefined ? String(adSet.learningEventThreshold) : '50',
      });
    } else {
      setEditingAdSet(null);
      setFormData({
        campaignId: '',
        name: '',
        status: 'draft',
        startDate: '',
        endDate: '',
        budget: '',
        currency: 'USD',
        billingType: 'cpc',
        billingRate: '',
        pacingEnabled: false,
        dailyBudget: '',
        attributionClickDays: '7',
        attributionViewDays: '1',
        optimizationGoal: 'impressions',
        learningEventThreshold: '50',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter an ad set name.');
      return;
    }
    try {
      const payload = {
        campaign_id: formData.campaignId || null,
        name: formData.name,
        status: formData.status,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        currency: formData.currency || 'USD',
        billing_type: formData.billingType,
        billing_rate: formData.billingRate ? parseFloat(formData.billingRate) : 0,
        pacing_enabled: formData.pacingEnabled,
        daily_budget: formData.dailyBudget ? parseFloat(formData.dailyBudget) : null,
        attribution_click_days: formData.attributionClickDays ? parseInt(formData.attributionClickDays, 10) : 7,
        attribution_view_days: formData.attributionViewDays ? parseInt(formData.attributionViewDays, 10) : 1,
        optimization_goal: formData.optimizationGoal || 'impressions',
        learning_event_threshold: formData.learningEventThreshold ? parseInt(formData.learningEventThreshold, 10) : 50,
      };
      if (editingAdSet) {
        const { error } = await supabase.from('ad_sets').update(payload).eq('id', editingAdSet.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ad_sets').insert(payload);
        if (error) throw error;
      }
      setShowModal(false);
      loadAdSets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save ad set.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Ad Set', 'Are you sure you want to delete this ad set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('ad_sets').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', error.message || 'Failed to delete ad set.');
          } else {
            loadAdSets();
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ad Sets</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {adSets.length === 0 ? (
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>No ad sets yet.</Text>
        ) : (
          adSets.map(adSet => (
            <View key={adSet.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{adSet.name}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.text.secondary }]}>Status: {adSet.status}</Text>
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Goal: {(adSet.optimizationGoal || 'impressions').toUpperCase()}
              </Text>
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Learning: {adSet.learningEventThreshold ?? 50} events
              </Text>
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Budget: {adSet.currency || 'USD'} {adSet.budget?.toFixed(2) ?? '—'}
              </Text>
              {(() => {
                const stats = adSetStats[adSet.id] || { clicks: 0, conversions: 0 };
                const goal = adSet.optimizationGoal || 'impressions';
                const threshold = adSet.learningEventThreshold ?? 50;
                const events = goal === 'conversions' ? stats.conversions : stats.clicks;
                const isLearning = goal !== 'impressions' && events < threshold;
                const progress = threshold > 0 ? Math.min(events / threshold, 1) : 1;

                if (!isLearning) return null;

                return (
                  <View style={styles.learningRow}>
                    <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                      <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                      Learning: {events}/{threshold} events
                    </Text>
                  </View>
                );
              })()}
              {adSet.pacingEnabled && (
                <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                  Today: {adSet.currency || 'USD'} {adSet.spendActualToday?.toFixed(2) ?? '0.00'} / {adSet.dailyBudget?.toFixed(2) ?? '—'}
                </Text>
              )}
              <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                Billing: {(adSet.billingType || 'cpc').toUpperCase()} @ {adSet.currency || 'USD'} {adSet.billingRate?.toFixed(4) ?? '—'}
              </Text>
              {adSetTargeting[adSet.id] ? (
                <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                  Targeting: {adSetTargeting[adSet.id]}
                </Text>
              ) : null}
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openModal(adSet)}>
                  <Edit size={18} color={theme.accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(adSet.id)}>
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
                {editingAdSet ? 'Edit Ad Set' : 'Create Ad Set'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Campaign</Text>
              {campaigns.length === 0 ? (
                <Text style={[styles.helperText, { color: theme.text.tertiary }]}>No campaigns yet.</Text>
              ) : (
                <View style={styles.typeButtons}>
                  {campaigns.map(campaign => (
                    <TouchableOpacity
                      key={campaign.id}
                      style={[styles.typeButton, { backgroundColor: formData.campaignId === campaign.id ? theme.accent.primary : theme.background.secondary }]}
                      onPress={() => setFormData({ ...formData, campaignId: campaign.id })}
                    >
                      <Text style={[styles.typeButtonText, { color: formData.campaignId === campaign.id ? '#FFF' : theme.text.primary }]}>
                        {campaign.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Status</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.status}
                onChangeText={(text) => setFormData({ ...formData, status: text as AdSet['status'] })}
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
              <Text style={[styles.label, { color: theme.text.secondary }]}>Billing Type</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.billingType}
                onChangeText={(text) => setFormData({ ...formData, billingType: text as any })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Billing Rate</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.billingRate}
                onChangeText={(text) => setFormData({ ...formData, billingRate: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Enable daily pacing</Text>
                <Switch value={formData.pacingEnabled} onValueChange={(value) => setFormData({ ...formData, pacingEnabled: value })} />
              </View>

              {formData.pacingEnabled && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Daily Budget</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={formData.dailyBudget}
                    onChangeText={(text) => setFormData({ ...formData, dailyBudget: text.replace(/[^0-9.]/g, '') })}
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Attribution (Click days)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.attributionClickDays}
                onChangeText={(text) => setFormData({ ...formData, attributionClickDays: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Attribution (View days)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.attributionViewDays}
                onChangeText={(text) => setFormData({ ...formData, attributionViewDays: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Optimization Goal</Text>
              <View style={styles.typeButtons}>
                {(['impressions', 'clicks', 'conversions'] as const).map(goal => (
                  <TouchableOpacity
                    key={goal}
                    style={[styles.typeButton, { backgroundColor: formData.optimizationGoal === goal ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, optimizationGoal: goal })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.optimizationGoal === goal ? '#FFF' : theme.text.primary }]}>
                      {goal.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Learning threshold (events)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.learningEventThreshold}
                onChangeText={(text) => setFormData({ ...formData, learningEventThreshold: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
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
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  typeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  typeButtonText: { fontSize: 12, fontWeight: '600' },
  helperText: { fontSize: 12, marginBottom: 6 },
  learningRow: { width: '100%', gap: 6, marginTop: 8 },
  learningBar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  learningFill: { height: 6, borderRadius: 999 },
  learningText: { fontSize: 11 },
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

