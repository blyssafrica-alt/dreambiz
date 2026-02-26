/**
 * Promotion Engine - Public API
 * Clean architecture: promotions layered on plans, never modify plans.
 */

export {
  createPromotion,
  getPromotion,
  getPromotionManualTargets,
  listPromotions,
  updatePromotion,
  resolvePromotionTargets,
} from './promotion.service';

export {
  checkEligibility,
  applyPromotionToSubscription,
  createSubscriptionWithPromotion,
  getRedemptionCount,
  hasUsedFreeTrial,
} from './subscription-promotion.service';

export { calculatePromotionalPrice } from './price-calculator';
export type { PriceCalculationInput, PriceCalculationResult } from './price-calculator';
