/**
 * Promotion Engine Types
 * Promotions are layered on top of subscription plans. Plans are never modified.
 */

export type PromotionType = 'free_trial' | 'percentage_discount' | 'fixed_discount';
export type PromotionTargetGroup = 'manual' | 'recent_signups' | 'inactive';

export interface SubscriptionPromotion {
  id: string;
  name: string;
  description: string | null;
  type: PromotionType;
  targetGroup: PromotionTargetGroup;

  trialDays: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  currency: string;

  recentDaysDefinition: number;
  inactiveDaysDefinition: number;

  durationInDays: number;
  startDate: string;
  endDate: string;
  maxRedemptions: number | null;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionInput {
  name: string;
  description?: string | null;
  type: PromotionType;
  targetGroup: PromotionTargetGroup;

  trialDays?: number | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  currency?: string;

  recentDaysDefinition?: number;
  inactiveDaysDefinition?: number;

  durationInDays: number;
  startDate: string;
  endDate: string;
  maxRedemptions?: number | null;
  isActive?: boolean;

  /** For target_group=manual: supplier profile IDs to target */
  manualTargetIds?: string[];
}

export interface PromotionEligibility {
  eligible: boolean;
  reason?: string;
  effectivePrice?: number;
  trialEndsAt?: string;
  discountEndsAt?: string;
}

export interface AppliedPromotionResult {
  subscriptionId: string;
  status: 'trial' | 'active';
  basePrice: number;
  finalPrice: number;
  trialEndsAt: string | null;
  discountEndsAt: string | null;
  promotionId: string;
}
