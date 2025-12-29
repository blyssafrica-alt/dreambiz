// Super Admin System Types
import type { DreamBigBook, BusinessType, BusinessStage } from './business';

// ============================================
// FEATURE CONFIGURATION
// ============================================
export type FeatureCategory = 'financial' | 'document' | 'inventory' | 'crm' | 'analytics' | 'admin';
export type FeatureVisibilityType = 'tab' | 'hidden' | 'contextual' | 'workflow';

export interface FeatureVisibility {
  type: FeatureVisibilityType;
  showAsTab: boolean;
  tabIcon?: string;
  tabLabel?: string;
  contextualTriggers?: string[]; // e.g., ['low_stock', 'overdue_invoice']
}

export interface FeatureAccess {
  requiresBook?: DreamBigBook[];
  requiresBusinessType?: BusinessType[];
  requiresFeature?: string[]; // Feature dependencies
  minBusinessStage?: BusinessStage;
}

export interface FeatureConfig {
  id: string;
  featureId: string; // e.g., 'products', 'customers', 'reports'
  name: string;
  description?: string;
  category: FeatureCategory;
  visibility: FeatureVisibility;
  access: FeatureAccess;
  enabled: boolean;
  enabledByDefault: boolean;
  canBeDisabled: boolean;
  isPremium?: boolean;
  premiumPlanIds?: string[];
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PLATFORM PRODUCTS
// ============================================
export type ProductType = 'physical' | 'digital' | 'service' | 'subscription';
export type ProductStatus = 'draft' | 'published' | 'archived';
export type StockStatus = 'in_stock' | 'out_of_stock' | 'on_backorder';

export interface ProductVariation {
  name: string; // e.g., "Size"
  options: string[]; // e.g., ["S", "M", "L"]
  priceModifiers?: Record<string, number>; // e.g., {"S": 0, "M": 5, "L": 10}
}

export interface ProductVisibilityRules {
  visibleToBooks?: DreamBigBook[];
  visibleToBusinessTypes?: BusinessType[];
  requiresFeature?: string;
  minBusinessStage?: BusinessStage;
}

export interface PlatformProduct {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  type: ProductType;
  basePrice: number;
  currency: string;
  salePrice?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  variations: ProductVariation[];
  manageStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  images: string[];
  videoUrl?: string;
  categoryId?: string;
  tags: string[];
  visibilityRules: ProductVisibilityRules;
  status: ProductStatus;
  featured: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number; // 1-5
  reviewText?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPurchase {
  id: string;
  productId: string;
  userId: string;
  businessId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt: string;
  adId?: string; // Which ad led to purchase
  metadata?: Record<string, any>;
  createdAt: string;
}

// ============================================
// ADVERTISEMENTS
// ============================================
export type AdType = 'banner' | 'card' | 'modal' | 'inline' | 'video';
export type AdStatus = 'draft' | 'active' | 'paused' | 'archived';
export type AdFrequency = 'once_per_session' | 'once_per_day' | 'always';
export type AdScope = 'global' | 'targeted';
export type CtaAction = 'open_product' | 'open_book' | 'open_feature' | 'external_url';

export interface AdTargeting {
  scope: AdScope;
  targetBooks?: DreamBigBook[];
  targetBusinessTypes?: BusinessType[];
  targetBusinessStages?: BusinessStage[];
  targetHealthScores?: { min: number; max: number };
  targetFeatures?: string[];
  targetWorkflows?: string[];
  excludeUsers?: string[];
}

export interface AdPlacement {
  locations: string[]; // ['dashboard', 'document_wizard_step_2', 'insights']
  priority: number; // Higher = shown first
  frequency: AdFrequency;
  maxImpressionsPerUser?: number;
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  type: AdType;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  headline?: string;
  bodyText?: string;
  ctaText: string;
  ctaUrl?: string;
  ctaAction?: CtaAction;
  ctaTargetId?: string; // Product ID, Book ID, Feature ID, etc.
  targeting: AdTargeting;
  placement: AdPlacement;
  startDate?: string;
  endDate?: string;
  timezone: string;
  status: AdStatus;
  impressionsCount: number;
  clicksCount: number;
  conversionsCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdImpression {
  id: string;
  adId: string;
  userId: string;
  businessId: string;
  location: string; // 'dashboard', 'document_wizard', etc.
  sessionId: string;
  viewedAt: string;
  clicked: boolean;
  clickedAt?: string;
  converted: boolean;
  convertedAt?: string;
  conversionValue?: number;
  metadata?: Record<string, any>;
}

// ============================================
// DOCUMENT TEMPLATES
// ============================================
export interface DocumentNumberingRule {
  prefix: string; // e.g., "INV"
  format: string; // e.g., "INV-{number}" or "INV-RET-{number}"
  start: number;
  padding: number; // e.g., 4 for "0001"
}

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType: 'invoice' | 'receipt' | 'quotation' | 'purchase_order' | 'supplier_agreement' | 'contract';
  businessType?: BusinessType; // NULL = available to all
  templateData: Record<string, any>; // Full template structure
  requiredFields: string[]; // ["customer_name", "items", "due_date"]
  numberingRule: DocumentNumberingRule;
  isActive: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ALERT RULES
// ============================================
export type AlertRuleType = 'warning' | 'danger' | 'info' | 'success';
export type ConditionType = 
  | 'profit_margin' 
  | 'cash_position' 
  | 'no_sales' 
  | 'low_stock' 
  | 'overdue_invoice'
  | 'overspending'
  | 'low_revenue'
  | 'high_expenses';

export interface BookReference {
  book: DreamBigBook;
  chapter: number;
  chapterTitle: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: AlertRuleType;
  conditionType: ConditionType;
  thresholdValue?: number; // For absolute values
  thresholdPercentage?: number; // For percentages
  thresholdDays?: number; // For time-based conditions
  messageTemplate: string; // "Low profit margin ({percentage}%)"
  actionTemplate?: string; // "Consider raising prices or reducing costs"
  bookReference?: BookReference;
  isActive: boolean;
  priority: number; // Higher = shown first
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PERMISSIONS
// ============================================
export type Permission = 
  | 'feature:manage'
  | 'product:create'
  | 'product:edit'
  | 'product:delete'
  | 'ad:create'
  | 'ad:edit'
  | 'ad:delete'
  | 'template:manage'
  | 'alert:manage'
  | 'user:view_all'
  | 'business:view_all'
  | 'analytics:view';

export interface UserRole {
  id: string;
  name: 'super_admin' | 'business_admin' | 'user';
  permissions: Permission[];
}

// ============================================
// ANALYTICS
// ============================================
export interface ProductAnalytics {
  productId: string;
  productName: string;
  views: number;
  purchases: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
}

export interface AdAnalytics {
  adId: string;
  adTitle: string;
  impressions: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  revenue: number;
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  totalProducts: number;
  totalAds: number;
  totalRevenue: number;
  productAnalytics: ProductAnalytics[];
  adAnalytics: AdAnalytics[];
}

