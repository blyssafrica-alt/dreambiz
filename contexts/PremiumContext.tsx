import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan, UserSubscription, PremiumTrial, PremiumContextType } from '@/types/premium';

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumContextProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasActivePremium, setHasActivePremium] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [trial, setTrial] = useState<PremiumTrial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Check for active subscription
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gt.' + new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (subscriptionData) {
        const sub = subscriptionData as any;
        setSubscription({
          id: sub.id,
          userId: sub.user_id,
          planId: sub.plan_id,
          status: sub.status,
          startDate: sub.start_date,
          endDate: sub.end_date,
          trialEndDate: sub.trial_end_date,
          cancelledAt: sub.cancelled_at,
          autoRenew: sub.auto_renew,
          discountPercentage: parseFloat(sub.discount_percentage),
          discountCode: sub.discount_code,
          pricePaid: parseFloat(sub.price_paid),
          paymentMethod: sub.payment_method,
          paymentStatus: sub.payment_status,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
        });

        if (sub.subscription_plans) {
          const plan = sub.subscription_plans;
          setCurrentPlan({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: parseFloat(plan.price),
            currency: plan.currency,
            billingPeriod: plan.billing_period,
            features: plan.features || [],
            maxBusinesses: plan.max_businesses,
            maxUsers: plan.max_users,
            maxStorageMb: plan.max_storage,
            isActive: plan.is_active,
            displayOrder: plan.display_order,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
          });
        }

        setHasActivePremium(true);
        setIsLoading(false);
        return;
      }

      // Check for active trial
      const { data: trialData } = await supabase
        .from('premium_trials')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (trialData) {
        const tr = trialData as any;
        setTrial({
          id: tr.id,
          userId: tr.user_id,
          planId: tr.plan_id,
          startDate: tr.start_date,
          endDate: tr.end_date,
          status: tr.status,
          convertedToSubscriptionId: tr.converted_to_subscription_id,
          grantedBy: tr.granted_by,
          notes: tr.notes,
          createdAt: tr.created_at,
          updatedAt: tr.updated_at,
        });

        if (tr.subscription_plans) {
          const plan = tr.subscription_plans;
          setCurrentPlan({
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: parseFloat(plan.price),
            currency: plan.currency,
            billingPeriod: plan.billing_period,
            features: plan.features || [],
            maxBusinesses: plan.max_businesses,
            maxUsers: plan.max_users,
            maxStorageMb: plan.max_storage,
            isActive: plan.is_active,
            displayOrder: plan.display_order,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
          });
        }

        setHasActivePremium(true);
        setIsLoading(false);
        return;
      }

      // No active premium
      setHasActivePremium(false);
      setCurrentPlan(null);
      setSubscription(null);
      setTrial(null);
    } catch (error) {
      console.error('Failed to load premium status:', error);
      setHasActivePremium(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const grantTrial = useCallback(async (userId: string, planId: string, days: number, notes?: string) => {
    // This is for Super Admin use - implemented in admin/premium.tsx
    throw new Error('Use admin/premium.tsx for granting trials');
  }, []);

  const grantDiscount = useCallback(async (userId: string, discountPercentage: number, applicablePlans?: string[], notes?: string) => {
    // This is for Super Admin use - implemented in admin/premium.tsx
    throw new Error('Use admin/premium.tsx for granting discounts');
  }, []);

  const checkFeatureAccess = useCallback(
    (featureId: string): boolean => {
      if (!hasActivePremium || !currentPlan) {
        return false;
      }

      // Enterprise plan has all features
      if (currentPlan.features.includes('*')) {
        return true;
      }

      // Check if feature is included in plan
      return currentPlan.features.includes(featureId);
    },
    [hasActivePremium, currentPlan]
  );

  return (
    <PremiumContext.Provider
      value={{
        hasActivePremium,
        currentPlan,
        subscription,
        trial,
        isLoading,
        refreshPremiumStatus,
        grantTrial,
        grantDiscount,
        checkFeatureAccess,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumContextProvider');
  }
  return context;
}

