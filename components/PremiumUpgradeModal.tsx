import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Crown, Check, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan } from '@/types/premium';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

export default function PremiumUpgradeModal({
  visible,
  onClose,
  title = 'Upgrade to Premium',
  message = 'Unlock this feature and more with a premium plan',
  feature,
}: PremiumUpgradeModalProps) {
  const { theme } = useTheme();
  const { currentPlan } = usePremium();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedPlans = data.map((row: any) => ({
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
        }));
        setPlans(mappedPlans);
        if (mappedPlans.length > 0 && !selectedPlan) {
          setSelectedPlan(mappedPlans[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (visible) {
      loadPlans();
    }
  }, [visible, loadPlans]);

  const formatPrice = (plan: SubscriptionPlan) => {
    return `${plan.currency} ${plan.price.toFixed(2)}`;
  };

  const getBillingText = (period: string) => {
    if (period === 'monthly') return '/month';
    if (period === 'yearly') return '/year';
    if (period === 'lifetime') return 'one-time';
    return `/${period}`;
  };

  const getFeatureList = (plan: SubscriptionPlan) => {
    const features: string[] = [];
    
    if (plan.maxBusinesses === -1) {
      features.push('Unlimited businesses');
    } else {
      features.push(`Up to ${plan.maxBusinesses} business${plan.maxBusinesses !== 1 ? 'es' : ''}`);
    }

    if (plan.maxUsers === -1) {
      features.push('Unlimited users');
    } else {
      features.push(`Up to ${plan.maxUsers} user${plan.maxUsers !== 1 ? 's' : ''}`);
    }

    if (plan.maxStorageMb === -1) {
      features.push('Unlimited storage');
    } else {
      const storageMB = plan.maxStorageMb;
      if (storageMB >= 1000) {
        features.push(`${(storageMB / 1000).toFixed(0)} GB storage`);
      } else {
        features.push(`${storageMB} MB storage`);
      }
    }

    features.push('Priority support');
    features.push('All premium features');
    
    return features;
  };

  const handleUpgrade = () => {
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background.card }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Crown size={24} color={theme.accent.primary} />
              <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
                {title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.messageCard, { backgroundColor: theme.surface.warning }]}>
              <Zap size={20} color={theme.accent.warning} />
              <Text style={[styles.messageText, { color: theme.text.primary }]}>
                {message}
              </Text>
            </View>

            {feature && (
              <Text style={[styles.featureText, { color: theme.text.secondary }]}>
                Feature: <Text style={{ fontWeight: '600' }}>{feature}</Text>
              </Text>
            )}

            {currentPlan && (
              <View style={[styles.currentPlanCard, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.currentPlanLabel, { color: theme.text.tertiary }]}>
                  Current Plan
                </Text>
                <Text style={[styles.currentPlanName, { color: theme.text.primary }]}>
                  {currentPlan.name}
                </Text>
              </View>
            )}

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.accent.primary} />
                <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                  Loading plans...
                </Text>
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  No plans available at the moment
                </Text>
              </View>
            ) : (
              <View style={styles.plansContainer}>
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan?.id === plan.id;
                  const features = getFeatureList(plan);
                  
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: theme.background.secondary,
                          borderColor: selectedPlan?.id === plan.id 
                            ? theme.accent.primary 
                            : theme.border.light,
                          borderWidth: selectedPlan?.id === plan.id ? 2 : 1,
                        },
                        isCurrentPlan && styles.currentPlanHighlight,
                      ]}
                      onPress={() => setSelectedPlan(plan)}
                      disabled={isCurrentPlan}
                    >
                      {plan.billingPeriod === 'yearly' && (
                        <View style={[styles.popularBadge, { backgroundColor: theme.accent.success }]}>
                          <Text style={styles.popularText}>Most Popular</Text>
                        </View>
                      )}

                      <Text style={[styles.planName, { color: theme.text.primary }]}>
                        {plan.name}
                      </Text>
                      
                      {plan.description && (
                        <Text style={[styles.planDescription, { color: theme.text.secondary }]}>
                          {plan.description}
                        </Text>
                      )}

                      <View style={styles.priceContainer}>
                        <Text style={[styles.planPrice, { color: theme.accent.primary }]}>
                          {formatPrice(plan)}
                        </Text>
                        <Text style={[styles.billingPeriod, { color: theme.text.tertiary }]}>
                          {getBillingText(plan.billingPeriod)}
                        </Text>
                      </View>

                      <View style={styles.featuresContainer}>
                        {features.map((feature, index) => (
                          <View key={index} style={styles.featureRow}>
                            <Check size={16} color={theme.accent.success} />
                            <Text style={[styles.featureItem, { color: theme.text.primary }]}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {isCurrentPlan && (
                        <View style={[styles.currentBadge, { backgroundColor: theme.surface.info }]}>
                          <Text style={[styles.currentBadgeText, { color: theme.accent.info }]}>
                            Current Plan
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.upgradeButton,
                { backgroundColor: theme.accent.primary },
                (!selectedPlan || selectedPlan?.id === currentPlan?.id) && styles.disabledButton,
              ]}
              onPress={handleUpgrade}
              disabled={!selectedPlan || selectedPlan?.id === currentPlan?.id}
            >
              <Crown size={20} color="#FFF" />
              <Text style={styles.upgradeButtonText}>
                Upgrade Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  featureText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  currentPlanCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  currentPlanHighlight: {
    opacity: 0.6,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  billingPeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureItem: {
    fontSize: 15,
    flex: 1,
  },
  currentBadge: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  currentBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  upgradeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
