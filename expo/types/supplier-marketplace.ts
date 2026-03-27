/**
 * Supplier Marketplace (network / storefront) types
 */

export interface SupplierMarketplaceProfile {
  id: string;
  userId: string;
  businessName: string;
  slug: string | null;
  categoryFocus: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  email: string;
  companyEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  status: 'pending' | 'approved' | 'declined' | 'suspended';
  verificationLevel: number;
  verificationBadgeText: string | null;
  verificationTier?: SupplierVerificationTier | null;
  trustScore: number;
  featured: boolean;
  adminNotes: string | null;
  /** Average response time in hours (from first reply / RFQ response). Used for SLA badge. */
  avgResponseHours?: number | null;
  /** Set when supplier sent first message in a conversation. */
  firstSupplierReplyAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SupplierVerificationDocType = 'company_registration' | 'proof_of_residence' | 'tax_certificate' | 'other';

export interface SupplierVerificationDocument {
  id: string;
  supplierProfileId: string;
  documentType: string;
  fileUrl: string;
  fileName: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierConversation {
  id: string;
  supplierProfileId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string | null;
  attachmentUrls: string[];
  attachmentNames: string[];
  readAt: string | null;
  createdAt: string;
}

export interface SupplierMarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierMarketplaceProduct {
  id: string;
  supplierProfileId: string;
  subcategoryId: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  imageUrls: string[];
  price: number | null;
  currency: string;
  minOrderQty: number;
  availabilityStatus: string;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  featured: boolean;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierMarketplaceReview {
  id: string;
  supplierProfileId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number;
  productLimit: number;
  adsAllowed: boolean;
  featuredAllowed: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Supplier network upgrade types ----

export type SupplierVerificationTier = 'basic' | 'verified' | 'premium' | 'manufacturer' | 'distributor';

export type SupplierRfqStatus = 'open' | 'quoted' | 'accepted' | 'declined' | 'expired';

export interface SupplierRfq {
  id: string;
  supplierProfileId: string;
  productId: string | null;
  buyerUserId: string;
  quantity: number;
  unit: string | null;
  deliveryLocation: string | null;
  neededByDate: string | null;
  notes: string | null;
  attachmentUrls: string[];
  status: SupplierRfqStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuote {
  id: string;
  rfqId: string;
  unitPrice: number;
  currency: string;
  leadTimeDays: number | null;
  moq: number | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  validityDays: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintStatus = 'open' | 'in_review' | 'supplier_response' | 'resolved' | 'dismissed';

export type ProductSpecification = { key: string; value: string };

export interface SupplierMarketplaceProductExtended extends SupplierMarketplaceProduct {
  sku?: string | null;
  unitType?: string | null;
  leadTimeDays?: number | null;
  priceType?: 'fixed' | 'negotiable' | null;
  tierPrices?: Array<{ minQty: number; price: number; currency?: string }> | null;
  specifications?: ProductSpecification[] | null;
}
