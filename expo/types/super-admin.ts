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
export type ProductType = 'physical' | 'digital' | 'course' | 'event' | 'service' | 'subscription';
export type ProductStatus = 'draft' | 'published' | 'archived';
export type StockStatus = 'in_stock' | 'out_of_stock' | 'on_backorder';

/** How the product is delivered after purchase: download (unlock file), shipping (physical), course (e.g. WhatsApp), event (ticket) */
export type DeliveryType = 'download' | 'shipping' | 'course' | 'event' | 'na';
/** Fulfillment state for a purchase line */
export type FulfillmentStatus = 'pending' | 'unlocked' | 'shipped' | 'enrolled' | 'ticket_issued' | 'na' | 'none' | 'processing' | 'delivered' | 'ready';

export interface DeliveryConfig {
  downloadUrl?: string;
  coursePlatform?: string;  // e.g. 'whatsapp', 'telegram'
  courseLink?: string;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  [key: string]: unknown;
}

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
  /** Optional badge flags (mega-store). If not set, app derives Hot from sale, New from tags/createdAt. */
  isHot?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  isSponsored?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  /** Optional thumbnail; app may use images[0] if not set */
  thumbnailUrl?: string;
  /** Optional gallery; app may use images if not set */
  galleryUrls?: string[];
  /** How this product is fulfilled (default derived from type: digital→download, physical→shipping) */
  deliveryType?: DeliveryType;
  /** Config for delivery: download URL, course platform, event details, etc. */
  deliveryConfig?: DeliveryConfig;
}

/** Digital product file attachment */
export interface ProductFile {
  id: string;
  productId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  size?: number;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

/** Course linked to a product */
export interface Course {
  id: string;
  productId: string;
  overview?: string;
  level?: string;
  estimatedDuration?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  content?: string;
  videoUrl?: string;
  sortOrder: number;
  createdAt: string;
}

export interface LessonAttachment {
  id: string;
  lessonId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  createdAt: string;
}

/** Event linked to a product */
export interface PlatformEvent {
  id: string;
  productId: string;
  startDatetime: string;
  endDatetime?: string;
  venueName?: string;
  address?: string;
  city?: string;
  maxAttendees?: number;
  createdAt: string;
  updatedAt: string;
}

/** Ticket for event fulfillment */
export interface Ticket {
  id: string;
  orderId: string;
  orderItemId?: string;
  eventId: string;
  userId: string;
  ticketCode: string;
  qrValue?: string;
  downloadableTicketUrl?: string;
  status: 'active' | 'used' | 'cancelled';
  createdAt: string;
}

/** Shipping record for physical order */
export interface Shipping {
  id: string;
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingStatus: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'failed';
  createdAt: string;
  updatedAt: string;
}

/** User access grant for digital/course/event after purchase */
export interface UserAccess {
  id: string;
  userId: string;
  productId: string;
  accessType: 'digital' | 'course' | 'event';
  orderId?: string;
  orderItemId?: string;
  grantedAt: string;
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
  orderId?: string;
  fulfillmentStatus?: FulfillmentStatus;
  fulfillmentMetadata?: Record<string, any>;
  /** Snapshot of product type at purchase (physical|digital|course|event) */
  typeSnapshot?: Record<string, unknown>;
}

/** Order status (unified); payment_status remains for payment flow */
export type OrderStatus = 'pending_payment' | 'paid' | 'pending_verification' | 'fulfilled' | 'cancelled';

/** One order per cart checkout; groups product_purchases */
export interface StoreOrder {
  id: string;
  userId: string;
  businessId: string;
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus?: OrderStatus;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ADVERTISEMENTS
// ============================================
export type AdType = 'banner' | 'card' | 'modal' | 'inline' | 'video';
export type AdStatus = 'draft' | 'pending' | 'active' | 'paused' | 'archived' | 'rejected';
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
  targetGenders?: string[];
  targetAgeMin?: number;
  targetAgeMax?: number;
  targetInterests?: string[];
  requireAdConsent?: boolean;
}

export interface AdPlacement {
  locations: string[]; // ['dashboard', 'document_wizard_step_2', 'insights']
  priority: number; // Higher = shown first
  frequency: AdFrequency;
  maxImpressionsPerUser?: number;
  delaySeconds?: number;
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
  campaignId?: string;
  adSetId?: string;
  targeting: AdTargeting;
  placement: AdPlacement;
  spend?: number; // Budget limit
  spendCurrency?: string; // Budget currency
  spendActual?: number;
  billingType?: 'cpc' | 'cpe' | 'cpa';
  billingRate?: number;
  revenue?: number;
  paymentStatus?: 'pending' | 'approved' | 'rejected';
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  adminNotes?: string;
  adPackageId?: string;
  autoRenew?: boolean;
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

export interface AdCampaign {
  id: string;
  name: string;
  objective?: string;
  status: AdStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spendActual?: number;
  currency?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  adSetCount?: number;
  adCount?: number;
}

export interface AdSet {
  id: string;
  campaignId?: string;
  name: string;
  status: AdStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spendActual?: number;
  spendActualToday?: number;
  currency?: string;
  billingType?: 'cpc' | 'cpe' | 'cpa';
  billingRate?: number;
  pacingEnabled?: boolean;
  dailyBudget?: number;
  attributionClickDays?: number;
  attributionViewDays?: number;
  optimizationGoal?: 'impressions' | 'clicks' | 'conversions';
  learningEventThreshold?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdPackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  pricePerLocation: number;
  durationDays: number;
  isActive: boolean;
  displayOrder: number;
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

