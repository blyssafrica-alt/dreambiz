/**
 * Subscription promotion application and eligibility logic.
 * Handles business rules: one trial ever, max redemptions, date validity.
 */

import { supabase } from '@/lib/supabase';
import type { SubscriptionPromotion, PromotionEligibility, AppliedPromotionResult } from '@/types/promotion';
import { getPromotion, resolvePromotionTargets } from './promotion.service';
import { calculatePromotionalPrice } from './price-calculator';

const now = () => new Date();

function isPromotionValid(promotion: SubscriptionPromotion): boolean {
  const n = now();
  const start = new Date(promotion.startDate);
  const end = new Date(promotion.endDate);
  if (!promotion.isActive) return false;
  if (n < start || n > end) return false;
  return true;
}

export async function getRedemptionCount(promotionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('subscription_promotion_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('promotion_id', promotionId);
  if (error) throw error;
  return count ?? 0;
}

export async function hasUsedFreeTrial(supplierProfileId: string): Promise<boolean> {
  const { data: redemptions, error } = await supabase
    .from('subscription_promotion_redemptions')
    .select('promotion_id')
    .eq('supplier_profile_id', supplierProfileId);

  if (error) throw error;
  if (!redemptions?.length) return false;

  const promoIds = redemptions.map((r) => r.promotion_id);
  const { data: promotions, error: promErr } = await supabase
    .from('subscription_promotions')
    .select('type')
    .in('id', promoIds)
    .eq('type', 'free_trial');

  if (promErr) throw promErr;
  return (promotions?.length ?? 0) > 0;
}

export async function checkEligibility(
  supplierProfileId: string,
  promotionId: string,
  planId: string
): Promise<PromotionEligibility> {
  const promotion = await getPromotion(promotionId);
  if (!promotion) {
    return { eligible: false, reason: 'Promotion not found' };
  }

  if (!isPromotionValid(promotion)) {
    return { eligible: false, reason: 'Promotion is not active or outside valid date range' };
  }

  const redemptionCount = await getRedemptionCount(promotionId);
  if (promotion.maxRedemptions != null && redemptionCount >= promotion.maxRedemptions) {
    return { eligible: false, reason: 'Promotion has reached maximum redemptions' };
  }

  if (promotion.type === 'free_trial') {
    const usedTrial = await hasUsedFreeTrial(supplierProfileId);
    if (usedTrial) {
      return { eligible: false, reason: 'Supplier has already used a free trial' };
    }
  }

  if (promotion.targetGroup === 'manual') {
    const { data } = await supabase
      .from('subscription_promotion_targets')
      .select('id')
      .eq('promotion_id', promotionId)
      .eq('supplier_profile_id', supplierProfileId)
      .maybeSingle();
    if (!data) {
      return { eligible: false, reason: 'Supplier not in manual target list' };
    }
  } else {
    const targets = await resolvePromotionTargets(promotionId);
    if (!targets.includes(supplierProfileId)) {
      return { eligible: false, reason: 'Supplier does not match target group criteria' };
    }
  }

  const { data: plan } = await supabase
    .from('supplier_subscription_plans')
    .select('price')
    .eq('id', planId)
    .single();

  if (!plan) {
    return { eligible: false, reason: 'Plan not found' };
  }

  const planPrice = Number(plan.price);
  const calc = calculatePromotionalPrice({
    planPrice,
    planCurrency: promotion.currency,
    promotion,
    startDate: now(),
  });

  return {
    eligible: true,
    effectivePrice: calc.finalPrice,
    trialEndsAt: calc.trialEndsAt?.toISOString() ?? undefined,
    discountEndsAt: calc.discountEndsAt?.toISOString() ?? undefined,
  };
}

export async function applyPromotionToSubscription(
  subscriptionId: string,
  promotionId: string
): Promise<AppliedPromotionResult> {
  const { data: sub, error: subErr } = await supabase
    .from('supplier_subscriptions')
    .select('id, supplier_profile_id, plan_id, status')
    .eq('id', subscriptionId)
    .single();

  if (subErr || !sub) {
    throw new Error('Subscription not found');
  }

  const eligibility = await checkEligibility(sub.supplier_profile_id, promotionId, sub.plan_id);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? 'Not eligible for promotion');
  }

  const promotion = await getPromotion(promotionId);
  if (!promotion) throw new Error('Promotion not found');

  const { data: plan } = await supabase
    .from('supplier_subscription_plans')
    .select('price, duration_days')
    .eq('id', sub.plan_id)
    .single();

  if (!plan) throw new Error('Plan not found');

  const planPrice = Number(plan.price);
  const startDate = now();
  const calc = calculatePromotionalPrice({
    planPrice,
    planCurrency: promotion.currency,
    promotion,
    startDate,
  });

  let expiresAt: Date;
  if (calc.status === 'trial' && calc.trialEndsAt) {
    expiresAt = new Date(calc.trialEndsAt);
    expiresAt.setDate(expiresAt.getDate() + (plan.duration_days ?? 30));
  } else {
    expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + (plan.duration_days ?? 30));
  }

  const updatePayload: Record<string, unknown> = {
    promotion_id: promotionId,
    base_price: calc.basePrice,
    final_price: calc.finalPrice,
    trial_ends_at: calc.trialEndsAt?.toISOString() ?? null,
    discount_ends_at: calc.discountEndsAt?.toISOString() ?? null,
    status: calc.status,
    start_date: startDate.toISOString(),
    expires_at: expiresAt.toISOString(),
    updated_at: startDate.toISOString(),
  };

  const { error: updateErr } = await supabase
    .from('supplier_subscriptions')
    .update(updatePayload)
    .eq('id', subscriptionId);

  if (updateErr) throw updateErr;

  await supabase.from('subscription_promotion_redemptions').insert({
    promotion_id: promotionId,
    supplier_profile_id: sub.supplier_profile_id,
    subscription_id: subscriptionId,
  });

  return {
    subscriptionId,
    status: calc.status,
    basePrice: calc.basePrice,
    finalPrice: calc.finalPrice,
    trialEndsAt: calc.trialEndsAt?.toISOString() ?? null,
    discountEndsAt: calc.discountEndsAt?.toISOString() ?? null,
    promotionId,
  };
}

/**
 * Create subscription with promotion applied (for new signups).
 */
export async function createSubscriptionWithPromotion(
  supplierProfileId: string,
  planId: string,
  promotionId: string,
  verifiedBy?: string
): Promise<AppliedPromotionResult> {
  const eligibility = await checkEligibility(supplierProfileId, promotionId, planId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? 'Not eligible for promotion');
  }

  const promotion = await getPromotion(promotionId);
  if (!promotion) throw new Error('Promotion not found');

  const { data: plan, error: planErr } = await supabase
    .from('supplier_subscription_plans')
    .select('price, duration_days')
    .eq('id', planId)
    .single();

  if (planErr || !plan) throw new Error('Plan not found');

  const planPrice = Number(plan.price);
  const startDate = now();
  const calc = calculatePromotionalPrice({
    planPrice,
    planCurrency: promotion.currency,
    promotion,
    startDate,
  });

  let expiresAt: Date;
  if (calc.status === 'trial' && calc.trialEndsAt) {
    expiresAt = new Date(calc.trialEndsAt);
    expiresAt.setDate(expiresAt.getDate() + (plan.duration_days ?? 30));
  } else {
    expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + (plan.duration_days ?? 30));
  }

  const { data: sub, error: insertErr } = await supabase
    .from('supplier_subscriptions')
    .insert({
      supplier_profile_id: supplierProfileId,
      plan_id: planId,
      status: calc.status,
      promotion_id: promotionId,
      base_price: calc.basePrice,
      final_price: calc.finalPrice,
      trial_ends_at: calc.trialEndsAt?.toISOString() ?? null,
      discount_ends_at: calc.discountEndsAt?.toISOString() ?? null,
      start_date: startDate.toISOString(),
      expires_at: expiresAt.toISOString(),
      verified_by: verifiedBy ?? null,
      verified_at: verifiedBy ? startDate.toISOString() : null,
    })
    .select('id')
    .single();

  if (insertErr || !sub) throw insertErr ?? new Error('Failed to create subscription');

  await supabase.from('subscription_promotion_redemptions').insert({
    promotion_id: promotionId,
    supplier_profile_id: supplierProfileId,
    subscription_id: sub.id,
  });

  return {
    subscriptionId: sub.id,
    status: calc.status,
    basePrice: calc.basePrice,
    finalPrice: calc.finalPrice,
    trialEndsAt: calc.trialEndsAt?.toISOString() ?? null,
    discountEndsAt: calc.discountEndsAt?.toISOString() ?? null,
    promotionId,
  };
}
