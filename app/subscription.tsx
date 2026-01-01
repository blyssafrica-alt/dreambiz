import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check, Crown, Building2, Users, HardDrive, Zap } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan } from '@/types/premium';
import PageHeader from '@/components/PageHeader';

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currentPlan, refreshPremiumStatus } = usePremium();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
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
    } catch (error: any) {
      console.error('Failed to load plans:', error);
      RNAlert.alert('Error', 'Failed to load subscription plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user?.id) {
      RNAlert.alert('Error', 'You must be logged in to upgrade');
      return;
    }

    // Check if already on this plan
    if (currentPlan?.id === plan.id) {
      RNAlert.alert('Already Subscribed', 'You are already on this plan.');
      return;
    }

    // Check if trying to downgrade
    if (currentPlan && currentPlan.displayOrder > plan.displayOrder) {
      RNAlert.alert(
        'Downgrade',
        'You are trying to downgrade. Please contact support to change your plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setUpgradingPlanId(plan.id);

      // Check for user discounts
      const { data: userDiscount } = await supabase
        .from('user_discounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .or(`applicable_plans.is.null,applicable_plans.cs.{${plan.id}}`)
        .gt('valid_until', new Date().toISOString())
        .order('discount_percentage', { ascending: false })
        .limit(1)
        .single();

      let discountPercentage = 0;
      let discountCode = null;
      if (userDiscount) {
        discountPercentage = parseFloat(userDiscount.discount_percentage);
        discountCode = userDiscount.discount_code;
      }

      // Calculate final price
      const finalPrice = plan.price * (1 - discountPercentage / 100);

      // For now, create subscription with pending payment status
      // In production, you would integrate with a payment gateway here
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'active', // In production, set to 'pending' until payment is confirmed
          start_date: new Date().toISOString(),
          end_date: plan.billingPeriod === 'lifetime' 
            ? null 
            : new Date(Date.now() + (plan.billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: plan.billingPeriod !== 'lifetime',
          discount_percentage: discountPercentage,
          discount_code: discountCode,
          price_paid: finalPrice,
          payment_method: 'manual', // In production, use actual payment method
          payment_status: 'completed', // In production, set to 'pending' until payment confirmed
        })
        .select()
        .single();

      if (subError) {
        // If subscription already exists, update it
        if (subError.code === '23505' || subError.message.includes('duplicate')) {
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
              plan_id: plan.id,
              status: 'active',
              start_date: new Date().toISOString(),
              end_date: plan.billingPeriod === 'lifetime' 
                ? null 
                : new Date(Date.now() + (plan.billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
              auto_renew: plan.billingPeriod !== 'lifetime',
              discount_percentage: discountPercentage,
              discount_code: discountCode,
              price_paid: finalPrice,
              payment_status: 'completed',
            })
            .eq('user_id', user.id)
            .eq('status', 'active');

          if (updateError) throw updateError;
        } else {
          throw subError;
        }
      }

      // Refresh premium status
      await refreshPremiumStatus();

      RNAlert.alert(
        'Upgrade Successful! 🎉',
        `You have successfully upgraded to ${plan.name} plan. You can now create up to ${plan.maxBusinesses === -1 ? 'unlimited' : plan.maxBusinesses} businesses.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Upgrade error:', error);
      RNAlert.alert(
        'Upgrade Failed',
        error.message || 'Failed to upgrade. Please try again or contact support.'
      );
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    if (plan.price === 0) return 'Free';
    const symbol = plan.currency === 'USD' ? '$' : plan.currency;
    const period = plan.billingPeriod === 'monthly' ? '/mo' : plan.billingPeriod === 'yearly' ? '/yr' : '';
    return `${symbol}${plan.price.toFixed(2)}${period}`;
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return '#6B7280';
      case 'starter':
        return '#3B82F6';
      case 'professional':
        return '#8B5CF6';
      case 'enterprise':
        return '#F59E0B';
      default:
        return theme.accent.primary;
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentPlan?.id === plan.id;
    const isUpgrading = upgradingPlanId === plan.id;
    const planColor = getPlanColor(plan.name);

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          {
            backgroundColor: theme.background.card,
            borderColor: isCurrentPlan ? planColor : theme.border.light,
            borderWidth: isCurrentPlan ? 2 : 1,
          },
        ]}
      >
        {isCurrentPlan && (
          <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
            <Check size={14} color="#FFF" />
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: planColor + '20' }]}>
            <Crown size={24} color={planColor} />
          </View>
          <View style={styles.planTitleSection}>
            <Text style={[styles.planName, { color: theme.text.primary }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: planColor }]}>{formatPrice(plan)}</Text>
          </View>
        </View>

        {plan.description && (
          <Text style={[styles.planDescription, { color: theme.text.secondary }]}>
            {plan.description}
          </Text>
        )}

        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <Building2 size={16} color={theme.text.secondary} />
            <Text style={[styles.featureText, { color: theme.text.primary }]}>
              {plan.maxBusinesses === -1 ? 'Unlimited' : plan.maxBusinesses} Businesses
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Users size={16} color={theme.text.secondary} />
            <Text style={[styles.featureText, { color: theme.text.primary }]}>
              {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users
            </Text>
          </View>
          <View style={styles.featureRow}>
            <HardDrive size={16} color={theme.text.secondary} />
            <Text style={[styles.featureText, { color: theme.text.primary }]}>
              {plan.maxStorageMb === -1 ? 'Unlimited' : `${plan.maxStorageMb} MB`} Storage
            </Text>
          </View>
          {plan.features && plan.features.length > 0 && (
            <View style={styles.featureRow}>
              <Zap size={16} color={theme.text.secondary} />
              <Text style={[styles.featureText, { color: theme.text.primary }]}>
                {plan.features.length === 1 && plan.features[0] === '*' 
                  ? 'All Features' 
                  : `${plan.features.length} Premium Features`}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.upgradeButton,
            {
              backgroundColor: isCurrentPlan ? theme.background.secondary : planColor,
              opacity: isUpgrading ? 0.6 : 1,
            },
          ]}
          onPress={() => handleUpgrade(plan)}
          disabled={isCurrentPlan || isUpgrading}
        >
          {isUpgrading ? (
            <ActivityIndicator color="#FFF" />
          ) : isCurrentPlan ? (
            <Text style={styles.upgradeButtonText}>Current Plan</Text>
          ) : (
            <Text style={styles.upgradeButtonText}>
              {currentPlan ? 'Upgrade' : 'Subscribe'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Subscription Plans"
          subtitle="Choose the plan that's right for your business"
          icon={Crown}
          iconGradient={['#F59E0B', '#D97706']}
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
          }
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {currentPlan && (
              <View style={[styles.currentPlanBanner, { backgroundColor: theme.accent.primary + '20' }]}>
                <Text style={[styles.currentPlanText, { color: theme.accent.primary }]}>
                  Current Plan: {currentPlan.name}
                </Text>
              </View>
            )}

            {plans.map((plan) => renderPlanCard(plan))}

            <View style={[styles.infoBox, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.infoTitle, { color: theme.text.primary }]}>
                Need Help Choosing?
              </Text>
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                All plans include core features. Higher plans offer more businesses, users, and storage. 
                You can upgrade or downgrade at any time.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  currentPlanBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planTitleSection: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  upgradeButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

