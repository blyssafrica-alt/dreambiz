import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Crown, X } from 'lucide-react-native';
import type { FeatureConfig } from '@/types/super-admin';

export default function FeaturesManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { refreshFeatures } = useFeatures();
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsSaving] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<Array<{ id: string; name: string }>>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureConfig | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const loadFeatures = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('feature_config')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      if (data) {
        setFeatures(data.map((row: any) => ({
          id: row.id,
          featureId: row.feature_id,
          name: row.name,
          description: row.description,
          category: row.category,
          visibility: row.visibility || {},
          access: row.access || {},
          enabled: row.enabled,
          enabledByDefault: row.enabled_by_default,
          canBeDisabled: row.can_be_disabled,
          isPremium: row.is_premium || false,
          premiumPlanIds: row.premium_plan_ids || [],
          updatedBy: row.updated_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
    loadSubscriptionPlans();
  }, [loadFeatures]);

  const loadSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
    }
  };

  const handleOpenPremiumModal = (feature: FeatureConfig) => {
    setSelectedFeature(feature);
    setSelectedPlanIds(feature.premiumPlanIds || []);
    setShowPremiumModal(true);
  };

  const handleSavePremiumSettings = async () => {
    if (!selectedFeature) return;

    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isPremium = selectedPlanIds.length > 0;

      const { error } = await supabase
        .from('feature_config')
        .update({
          is_premium: isPremium,
          premium_plan_ids: isPremium ? selectedPlanIds : [],
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('feature_id', selectedFeature.featureId);

      if (error) throw error;

      // Update local state
      setFeatures(prev =>
        prev.map(f =>
          f.featureId === selectedFeature.featureId
            ? { ...f, isPremium, premiumPlanIds: selectedPlanIds }
            : f
        )
      );

      await refreshFeatures();
      setShowPremiumModal(false);
      setSelectedFeature(null);
      Alert.alert('Success', 'Premium settings updated successfully');
    } catch (error: any) {
      console.error('Failed to update premium settings:', error);
      Alert.alert('Error', `Failed to update premium settings: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeature = async (featureId: string, enabled: boolean) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feature_config')
        .update({ 
          enabled,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('feature_id', featureId);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.featureId === featureId ? { ...f, enabled } : f
      ));

      // CRITICAL: Refresh the FeatureContext so all users see the changes immediately
      await refreshFeatures();

      // Show success feedback
      Alert.alert(
        'Success', 
        `${featureId} has been ${enabled ? 'enabled' : 'disabled'}. Changes are now live for all users.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to toggle feature:', error);
      Alert.alert(
        'Error',
        `Failed to ${enabled ? 'enable' : 'disable'} feature: ${error?.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Feature Management
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.description, { color: theme.text.secondary }]}>
          Enable or disable features globally. Changes affect all users.
        </Text>

        {features.map((feature) => (
          <View
            key={feature.id}
            style={[styles.featureCard, { backgroundColor: theme.background.card }]}
          >
            <View style={styles.featureHeader}>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureName, { color: theme.text.primary }]}>
                  {feature.name}
                </Text>
                {feature.description && (
                  <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                    {feature.description}
                  </Text>
                )}
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                    <Text style={[styles.badgeText, { color: theme.accent.info }]}>
                      {feature.category}
                    </Text>
                  </View>
                  {feature.visibility.showAsTab && (
                    <View style={[styles.badge, { backgroundColor: theme.surface.success }]}>
                      <Text style={[styles.badgeText, { color: theme.accent.success }]}>
                        Tab
                      </Text>
                    </View>
                  )}
                  {feature.isPremium && (
                    <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                      <Crown size={12} color="#F59E0B" />
                      <Text style={[styles.badgeText, { color: '#F59E0B' }]}>
                        Premium
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={feature.enabled}
                  onValueChange={(enabled) => toggleFeature(feature.featureId, enabled)}
                  disabled={!feature.canBeDisabled}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            {feature.isPremium && feature.premiumPlanIds && feature.premiumPlanIds.length > 0 && (
              <View style={styles.accessInfo}>
                <Text style={[styles.accessLabel, { color: theme.text.secondary }]}>
                  Available in Plans:
                </Text>
                <View style={styles.plansList}>
                  {feature.premiumPlanIds.map((planId) => {
                    const plan = subscriptionPlans.find((p) => p.id === planId);
                    return (
                      <View
                        key={planId}
                        style={[styles.planTag, { backgroundColor: theme.surface.info }]}
                      >
                        <Text style={[styles.planTagText, { color: theme.accent.info }]}>
                          {plan?.name || planId}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.premiumButton, { backgroundColor: theme.background.secondary }]}
              onPress={() => handleOpenPremiumModal(feature)}
            >
              <Crown size={16} color={feature.isPremium ? '#F59E0B' : theme.text.secondary} />
              <Text
                style={[
                  styles.premiumButtonText,
                  { color: feature.isPremium ? '#F59E0B' : theme.text.secondary },
                ]}
              >
                {feature.isPremium ? 'Edit Premium Settings' : 'Make Premium'}
              </Text>
            </TouchableOpacity>

            {feature.access.requiresBook && feature.access.requiresBook.length > 0 && (
              <View style={styles.accessInfo}>
                <Text style={[styles.accessLabel, { color: theme.text.secondary }]}>
                  Requires Book:
                </Text>
                <Text style={[styles.accessValue, { color: theme.text.primary }]}>
                  {feature.access.requiresBook.join(', ')}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Premium Settings Modal */}
      <Modal visible={showPremiumModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Premium Settings
              </Text>
              <TouchableOpacity onPress={() => setShowPremiumModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedFeature && (
              <>
                <Text style={[styles.modalSubtitle, { color: theme.text.secondary }]}>
                  {selectedFeature.name}
                </Text>
                <Text style={[styles.label, { color: theme.text.secondary }]}>
                  Select which subscription plans include this feature:
                </Text>
                <ScrollView style={styles.plansSelector} nestedScrollEnabled>
                  {subscriptionPlans.map((plan) => {
                    const isSelected = selectedPlanIds.includes(plan.id);
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planOption,
                          {
                            backgroundColor: isSelected
                              ? `${theme.accent.primary}20`
                              : theme.background.secondary,
                            borderColor: isSelected ? theme.accent.primary : theme.border.light,
                          },
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedPlanIds(selectedPlanIds.filter((id) => id !== plan.id));
                          } else {
                            setSelectedPlanIds([...selectedPlanIds, plan.id]);
                          }
                        }}
                      >
                        <Text style={[styles.planOptionText, { color: theme.text.primary }]}>
                          {plan.name}
                        </Text>
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: isSelected ? theme.accent.primary : 'transparent',
                              borderColor: isSelected ? theme.accent.primary : theme.border.medium,
                            },
                          ]}
                        >
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => setShowPremiumModal(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                    onPress={handleSavePremiumSettings}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  featureCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featureInfo: {
    flex: 1,
    marginRight: 16,
  },
  featureName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accessInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  accessLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  accessValue: {
    fontSize: 14,
  },
  switchContainer: {
    marginLeft: 16,
  },
  plansList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  planTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  premiumButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    minHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  plansSelector: {
    maxHeight: 300,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  planOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

