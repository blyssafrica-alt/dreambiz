/**
 * Pure price calculation logic. No side effects.
 * Promotion discounts are applied on top of plan price.
 */

import type { SubscriptionPromotion } from '@/types/promotion';

export interface PriceCalculationInput {
  planPrice: number;
  planCurrency: string;
  promotion: SubscriptionPromotion;
  startDate: Date;
}

export interface PriceCalculationResult {
  basePrice: number;
  finalPrice: number;
  trialEndsAt: Date | null;
  discountEndsAt: Date | null;
  status: 'trial' | 'active';
}

export function calculatePromotionalPrice(input: PriceCalculationInput): PriceCalculationResult {
  const { planPrice, promotion, startDate } = input;

  if (promotion.type === 'free_trial') {
    const trialDays = promotion.trialDays ?? 0;
    const trialEndsAt = new Date(startDate);
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return {
      basePrice: planPrice,
      finalPrice: 0,
      trialEndsAt,
      discountEndsAt: null,
      status: 'trial',
    };
  }

  if (promotion.type === 'percentage_discount') {
    const percent = promotion.discountPercent ?? 0;
    const discount = (planPrice * percent) / 100;
    const finalPrice = Math.max(0, planPrice - discount);

    const discountEndsAt = new Date(startDate);
    discountEndsAt.setDate(discountEndsAt.getDate() + promotion.durationInDays);

    return {
      basePrice: planPrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      trialEndsAt: null,
      discountEndsAt,
      status: 'active',
    };
  }

  if (promotion.type === 'fixed_discount') {
    const discount = promotion.discountAmount ?? 0;
    const finalPrice = Math.max(0, planPrice - discount);

    const discountEndsAt = new Date(startDate);
    discountEndsAt.setDate(discountEndsAt.getDate() + promotion.durationInDays);

    return {
      basePrice: planPrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      trialEndsAt: null,
      discountEndsAt,
      status: 'active',
    };
  }

  return {
    basePrice: planPrice,
    finalPrice: planPrice,
    trialEndsAt: null,
    discountEndsAt: null,
    status: 'active',
  };
}
