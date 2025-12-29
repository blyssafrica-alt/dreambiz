import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Gift, Percent, Users, Calendar, X, Save, Crown, Edit, Trash2, Plus } from 'lucide-react-native';
import type { SubscriptionPlan, PremiumTrial, UserDiscount } from '@/types/premium';
import UserSelector from '@/components/UserSelector';

export default function PremiumManagementScreen() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const action = params.action as string;
  const userId = params.userId as string;

  const [activeTab, setActiveTab] = useState<'trials' | 'discounts' | 'plans'>('trials');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [trials, setTrials] = useState<PremiumTrial[]>([]);
  const [discounts, setDiscounts] = useState<UserDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trial Modal State
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState({
    userId: userId || '',
    planId: '',
    days: '14',
    notes: '',
  });

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    userId: userId || '',
    discountPercentage: '10',
    applicablePlans: [] as string[],
    notes: '',
  });

  // Bulk Actions State
  const [showBulkTrialModal, setShowBulkTrialModal] = useState(false);
  const [bulkTrialForm, setBulkTrialForm] = useState({
    planId: '',
    days: '14',
    notes: 'Bulk trial grant',
  });

  // Plan Management State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    billingPeriod: 'monthly' as 'monthly' | 'yearly' | 'lifetime',
    maxBusinesses: '1',
    maxUsers: '1',
    maxStorageMb: '100',
    isActive: true,
    displayOrder: '0',
  });

  useEffect(() => {
    loadData();
    if (action === 'grant_trial' && userId) {
      setShowTrialModal(true);
      setTrialForm(prev => ({ ...prev, userId }));
    } else if (action === 'grant_discount' && userId) {
      setShowDiscountModal(true);
      setDiscountForm(prev => ({ ...prev, userId }));
    }
  }, [action, userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadPlans(), loadTrials(), loadDiscounts()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setPlans(
          data.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            currency: row.currency,
            billingPeriod: row.billing_period,
            features: row.features || [],
            maxBusinesses: row.max_businesses,
            maxUsers: row.max_users,
            maxStorageMb: row.max_storage,
            isActive: row.is_active,
            displayOrder: row.display_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const loadTrials = async () => {
    try {
      const { data, error } = await supabase
        .from('premium_trials')
        .select('*, users:user_id(email, name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setTrials(
          data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            planId: row.plan_id,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
            convertedToSubscriptionId: row.converted_to_subscription_id,
            grantedBy: row.granted_by,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load trials:', error);
    }
  };

  const loadDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_discounts')
        .select('*, users:user_id(email, name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setDiscounts(
          data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            discountCode: row.discount_code,
            discountPercentage: parseFloat(row.discount_percentage),
            discountAmount: row.discount_amount ? parseFloat(row.discount_amount) : undefined,
            applicablePlans: row.applicable_plans || [],
            maxUses: row.max_uses,
            usedCount: row.used_count,
            validFrom: row.valid_from,
            validUntil: row.valid_until,
            isActive: row.is_active,
            grantedBy: row.granted_by,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load discounts:', error);
    }
  };

  const handleGrantTrial = async () => {
    if (!trialForm.userId || !trialForm.planId || !trialForm.days) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const days = parseInt(trialForm.days);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { error } = await supabase.from('premium_trials').insert({
        user_id: trialForm.userId,
        plan_id: trialForm.planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        granted_by: currentUser?.id,
        notes: trialForm.notes || null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Trial granted successfully');
      setShowTrialModal(false);
      setTrialForm({ userId: '', planId: '', days: '14', notes: '' });
      loadTrials();
    } catch (error) {
      console.error('Failed to grant trial:', error);
      Alert.alert('Error', 'Failed to grant trial');
    }
  };

  const handleGrantDiscount = async () => {
    if (!discountForm.userId || !discountForm.discountPercentage) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const discountCode = `USER_${discountForm.userId.substring(0, 8).toUpperCase()}_${Date.now()}`;

      const { error } = await supabase.from('user_discounts').insert({
        user_id: discountForm.userId,
        discount_code: discountCode,
        discount_percentage: parseFloat(discountForm.discountPercentage),
        applicable_plans: discountForm.applicablePlans.length > 0 ? discountForm.applicablePlans : null,
        max_uses: 1,
        valid_from: new Date().toISOString(),
        is_active: true,
        granted_by: currentUser?.id,
        notes: discountForm.notes || null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Discount granted successfully');
      setShowDiscountModal(false);
      setDiscountForm({ userId: '', discountPercentage: '10', applicablePlans: [], notes: '' });
      loadDiscounts();
    } catch (error) {
      console.error('Failed to grant discount:', error);
      Alert.alert('Error', 'Failed to grant discount');
    }
  };

  const handleBulkGrantTrial = async () => {
    if (!bulkTrialForm.planId || !bulkTrialForm.days) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Get all free users
      const { data: freeUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('subscription_status', 'free')
        .limit(100);

      if (usersError) throw usersError;

      if (!freeUsers || freeUsers.length === 0) {
        Alert.alert('Info', 'No free users found');
        return;
      }

      const days = parseInt(bulkTrialForm.days);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const trials = freeUsers.map(user => ({
        user_id: user.id,
        plan_id: bulkTrialForm.planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        granted_by: currentUser?.id,
        notes: bulkTrialForm.notes || null,
      }));

      const { error } = await supabase.from('premium_trials').insert(trials);

      if (error) throw error;

      Alert.alert('Success', `Trial granted to ${freeUsers.length} users`);
      setShowBulkTrialModal(false);
      setBulkTrialForm({ planId: '', days: '14', notes: 'Bulk trial grant' });
      loadTrials();
    } catch (error) {
      console.error('Failed to grant bulk trial:', error);
      Alert.alert('Error', 'Failed to grant bulk trial');
    }
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.price) {
      Alert.alert('Error', 'Please fill in name and price');
      return;
    }

    try {
      const planData: any = {
        name: planForm.name,
        description: planForm.description || null,
        price: parseFloat(planForm.price),
        currency: planForm.currency,
        billing_period: planForm.billingPeriod,
        max_businesses: planForm.maxBusinesses === '-1' ? -1 : parseInt(planForm.maxBusinesses),
        max_users: planForm.maxUsers === '-1' ? -1 : parseInt(planForm.maxUsers),
        max_storage: planForm.maxStorageMb === '-1' ? -1 : parseInt(planForm.maxStorageMb),
        is_active: planForm.isActive,
        display_order: parseInt(planForm.displayOrder),
        features: [],
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        Alert.alert('Success', 'Plan updated successfully');
      } else {
        const { error } = await supabase.from('subscription_plans').insert(planData);

        if (error) throw error;
        Alert.alert('Success', 'Plan created successfully');
      }

      setShowPlanModal(false);
      loadPlans();
    } catch (error) {
      console.error('Failed to save plan:', error);
      Alert.alert('Error', 'Failed to save plan');
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
          Premium Management
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trials' && styles.activeTab]}
          onPress={() => setActiveTab('trials')}
        >
          <Gift size={18} color={activeTab === 'trials' ? theme.accent.primary : theme.text.secondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'trials' ? theme.accent.primary : theme.text.secondary },
            ]}
          >
            Trials ({trials.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discounts' && styles.activeTab]}
          onPress={() => setActiveTab('discounts')}
        >
          <Percent size={18} color={activeTab === 'discounts' ? theme.accent.primary : theme.text.secondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'discounts' ? theme.accent.primary : theme.text.secondary },
            ]}
          >
            Discounts ({discounts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
          onPress={() => setActiveTab('plans')}
        >
          <Crown size={18} color={activeTab === 'plans' ? theme.accent.primary : theme.text.secondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'plans' ? theme.accent.primary : theme.text.secondary },
            ]}
          >
            Plans ({plans.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'trials' && (
          <>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.accent.primary }]}
                onPress={() => setShowTrialModal(true)}
              >
                <Gift size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Grant Trial</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.accent.info }]}
                onPress={() => setShowBulkTrialModal(true)}
              >
                <Users size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Bulk Grant</Text>
              </TouchableOpacity>
            </View>

            {trials.length === 0 ? (
              <View style={styles.emptyState}>
                <Gift size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No trials yet</Text>
              </View>
            ) : (
              trials.map((trial) => (
                <View
                  key={trial.id}
                  style={[styles.card, { backgroundColor: theme.background.card }]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                      {plans.find(p => p.id === trial.planId)?.name || 'Unknown Plan'}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            trial.status === 'active' ? '#10B98120' : '#64748B20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: trial.status === 'active' ? '#10B981' : '#64748B',
                          },
                        ]}
                      >
                        {trial.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <Calendar size={14} color={theme.text.tertiary} />
                    <Text style={[styles.cardText, { color: theme.text.secondary }]}>
                      {new Date(trial.startDate).toLocaleDateString()} -{' '}
                      {new Date(trial.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {trial.notes && (
                    <Text style={[styles.cardNotes, { color: theme.text.tertiary }]}>
                      {trial.notes}
                    </Text>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'discounts' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowDiscountModal(true)}
            >
              <Percent size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Grant Discount</Text>
            </TouchableOpacity>

            {discounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Percent size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No discounts yet</Text>
              </View>
            ) : (
              discounts.map((discount) => (
                <View
                  key={discount.id}
                  style={[styles.card, { backgroundColor: theme.background.card }]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                      {discount.discountCode}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: discount.isActive ? '#10B98120' : '#64748B20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: discount.isActive ? '#10B981' : '#64748B',
                          },
                        ]}
                      >
                        {discount.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardText, { color: theme.text.primary }]}>
                    {discount.discountPercentage}% off
                  </Text>
                  <Text style={[styles.cardText, { color: theme.text.secondary }]}>
                    Used: {discount.usedCount} / {discount.maxUses}
                  </Text>
                  {discount.notes && (
                    <Text style={[styles.cardNotes, { color: theme.text.tertiary }]}>
                      {discount.notes}
                    </Text>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'plans' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => {
                setEditingPlan(null);
                setPlanForm({
                  name: '',
                  description: '',
                  price: '',
                  currency: 'USD',
                  billingPeriod: 'monthly',
                  maxBusinesses: '1',
                  maxUsers: '1',
                  maxStorageMb: '100',
                  isActive: true,
                  displayOrder: '0',
                });
                setShowPlanModal(true);
              }}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Create Plan</Text>
            </TouchableOpacity>

            {plans.map((plan) => (
              <View key={plan.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                      {plan.name}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: plan.isActive ? '#10B98120' : '#64748B20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: plan.isActive ? '#10B981' : '#64748B' },
                        ]}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.cardActionButton, { backgroundColor: theme.surface.info }]}
                      onPress={() => {
                        setEditingPlan(plan);
                        setPlanForm({
                          name: plan.name,
                          description: plan.description || '',
                          price: plan.price.toString(),
                          currency: plan.currency,
                          billingPeriod: plan.billingPeriod,
                          maxBusinesses: plan.maxBusinesses === -1 ? '-1' : plan.maxBusinesses.toString(),
                          maxUsers: plan.maxUsers === -1 ? '-1' : plan.maxUsers.toString(),
                          maxStorageMb: plan.maxStorageMb === -1 ? '-1' : plan.maxStorageMb.toString(),
                          isActive: plan.isActive,
                          displayOrder: plan.displayOrder.toString(),
                        });
                        setShowPlanModal(true);
                      }}
                    >
                      <Edit size={16} color={theme.accent.info} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.cardText, { color: theme.text.secondary }]}>
                  {plan.description}
                </Text>
                <Text style={[styles.cardPrice, { color: theme.text.primary }]}>
                  {plan.currency} {plan.price.toFixed(2)} / {plan.billingPeriod}
                </Text>
                <Text style={[styles.cardText, { color: theme.text.secondary }]}>
                  Features: {plan.features.length} | Max Businesses: {plan.maxBusinesses === -1 ? 'Unlimited' : plan.maxBusinesses} | Max Users: {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Grant Trial Modal */}
      <Modal visible={showTrialModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Grant Trial</Text>
              <TouchableOpacity onPress={() => setShowTrialModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text.secondary }]}>Select User *</Text>
            <UserSelector
              selectedUserId={trialForm.userId}
              onSelectUser={(userId) => setTrialForm({ ...trialForm, userId })}
            />

            <Text style={[styles.label, { color: theme.text.secondary }]}>Select Plan</Text>
            <ScrollView style={styles.plansList}>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    {
                      backgroundColor:
                        trialForm.planId === plan.id ? theme.accent.primary + '20' : theme.background.secondary,
                    },
                  ]}
                  onPress={() => setTrialForm({ ...trialForm, planId: plan.id })}
                >
                  <Text style={[styles.planOptionText, { color: theme.text.primary }]}>
                    {plan.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Days (e.g., 14)"
              placeholderTextColor={theme.text.tertiary}
              value={trialForm.days}
              onChangeText={(text) => setTrialForm({ ...trialForm, days: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Notes (optional)"
              placeholderTextColor={theme.text.tertiary}
              value={trialForm.notes}
              onChangeText={(text) => setTrialForm({ ...trialForm, notes: text })}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
              onPress={handleGrantTrial}
            >
              <Save size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Grant Trial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grant Discount Modal */}
      <Modal visible={showDiscountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Grant Discount</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text.secondary }]}>Select User *</Text>
            <UserSelector
              selectedUserId={discountForm.userId}
              onSelectUser={(userId) => setDiscountForm({ ...discountForm, userId })}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Discount Percentage (e.g., 10)"
              placeholderTextColor={theme.text.tertiary}
              value={discountForm.discountPercentage}
              onChangeText={(text) => setDiscountForm({ ...discountForm, discountPercentage: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Notes (optional)"
              placeholderTextColor={theme.text.tertiary}
              value={discountForm.notes}
              onChangeText={(text) => setDiscountForm({ ...discountForm, notes: text })}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
              onPress={handleGrantDiscount}
            >
              <Save size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Grant Discount</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bulk Grant Trial Modal */}
      <Modal visible={showBulkTrialModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Bulk Grant Trial</Text>
              <TouchableOpacity onPress={() => setShowBulkTrialModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text.secondary }]}>Select Plan</Text>
            <ScrollView style={styles.plansList}>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    {
                      backgroundColor:
                        bulkTrialForm.planId === plan.id ? theme.accent.primary + '20' : theme.background.secondary,
                    },
                  ]}
                  onPress={() => setBulkTrialForm({ ...bulkTrialForm, planId: plan.id })}
                >
                  <Text style={[styles.planOptionText, { color: theme.text.primary }]}>
                    {plan.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Days (e.g., 14)"
              placeholderTextColor={theme.text.tertiary}
              value={bulkTrialForm.days}
              onChangeText={(text) => setBulkTrialForm({ ...bulkTrialForm, days: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Notes (optional)"
              placeholderTextColor={theme.text.tertiary}
              value={bulkTrialForm.notes}
              onChangeText={(text) => setBulkTrialForm({ ...bulkTrialForm, notes: text })}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
              onPress={handleBulkGrantTrial}
            >
              <Users size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Grant to All Free Users</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Plan Management Modal */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingPlan ? 'Edit Plan' : 'Create Plan'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Plan name"
                placeholderTextColor={theme.text.tertiary}
                value={planForm.name}
                onChangeText={(text) => setPlanForm({ ...planForm, name: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Plan description"
                placeholderTextColor={theme.text.tertiary}
                value={planForm.description}
                onChangeText={(text) => setPlanForm({ ...planForm, description: text })}
                multiline
                numberOfLines={3}
              />

              <View style={styles.priceRow}>
                <View style={styles.priceInputContainer}>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Price *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    value={planForm.price}
                    onChangeText={(text) => setPlanForm({ ...planForm, price: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.currencyInputContainer}>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Currency</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="USD"
                    placeholderTextColor={theme.text.tertiary}
                    value={planForm.currency}
                    onChangeText={(text) => setPlanForm({ ...planForm, currency: text })}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Billing Period</Text>
              <View style={styles.typeButtons}>
                {(['monthly', 'yearly', 'lifetime'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor:
                          planForm.billingPeriod === period ? theme.accent.primary : theme.background.secondary,
                      },
                    ]}
                    onPress={() => setPlanForm({ ...planForm, billingPeriod: period })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: planForm.billingPeriod === period ? '#FFF' : theme.text.primary },
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Max Businesses (-1 for unlimited)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="1"
                placeholderTextColor={theme.text.tertiary}
                value={planForm.maxBusinesses}
                onChangeText={(text) => setPlanForm({ ...planForm, maxBusinesses: text })}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Max Users (-1 for unlimited)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="1"
                placeholderTextColor={theme.text.tertiary}
                value={planForm.maxUsers}
                onChangeText={(text) => setPlanForm({ ...planForm, maxUsers: text })}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Max Storage (MB, -1 for unlimited)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="100"
                placeholderTextColor={theme.text.tertiary}
                value={planForm.maxStorageMb}
                onChangeText={(text) => setPlanForm({ ...planForm, maxStorageMb: text })}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Display Order</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                value={planForm.displayOrder}
                onChangeText={(text) => setPlanForm({ ...planForm, displayOrder: text })}
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setShowPlanModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSavePlan}
              >
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>{editingPlan ? 'Update Plan' : 'Create Plan'}</Text>
              </TouchableOpacity>
            </View>
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
  tabs: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#F0F9FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardText: {
    fontSize: 14,
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  cardNotes: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  plansList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  planOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  planOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 500,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputContainer: {
    flex: 2,
  },
  currencyInputContainer: {
    flex: 1,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
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
});

