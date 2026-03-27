// Premium/Subscription System Types

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  features: string[]; // Feature IDs included in this plan
  maxBusinesses: number; // -1 for unlimited
  maxUsers: number; // -1 for unlimited
  maxStorageMb: number; // -1 for unlimited
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'past_due';
  startDate: string;
  endDate?: string;
  trialEndDate?: string;
  cancelledAt?: string;
  autoRenew: boolean;
  discountPercentage: number;
  discountCode?: string;
  pricePaid: number;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export interface PremiumTrial {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  convertedToSubscriptionId?: string;
  grantedBy?: string; // Super Admin ID
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDiscount {
  id: string;
  userId: string;
  discountCode: string;
  discountPercentage: number;
  discountAmount?: number;
  applicablePlans: string[]; // Plan IDs, empty = all plans
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  grantedBy?: string; // Super Admin ID
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  discountPercentage?: number;
  discountAmount?: number;
  discountType: 'percentage' | 'fixed';
  applicablePlans: string[]; // Plan IDs, empty = all plans
  maxUses?: number;
  usedCount: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumContextType {
  hasActivePremium: boolean;
  currentPlan: SubscriptionPlan | null;
  subscription: UserSubscription | null;
  trial: PremiumTrial | null;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
  grantTrial: (userId: string, planId: string, days: number, notes?: string) => Promise<void>;
  grantDiscount: (userId: string, discountPercentage: number, applicablePlans?: string[], notes?: string) => Promise<void>;
  checkFeatureAccess: (featureId: string) => boolean;
}

