import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlatformProduct, ProductCategory, ProductPurchase, StoreOrder, DeliveryType, FulfillmentStatus } from '@/types/super-admin';
import type { DreamBigBook, BusinessType, BusinessStage } from '@/types/business';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';
import { useFeatures } from './FeatureContext';
import { useAds } from './AdContext';

export interface StoreCartItem {
  product: PlatformProduct;
  quantity: number;
}

interface ProductContextValue {
  products: PlatformProduct[];
  categories: ProductCategory[];
  isLoading: boolean;
  isProductVisible: (product: PlatformProduct) => boolean;
  getVisibleProducts: () => PlatformProduct[];
  getProductById: (id: string) => PlatformProduct | undefined;
  purchaseProduct: (productId: string, quantity?: number) => Promise<ProductPurchase | null>;
  /** Checkout full cart: create order, record each purchase with fulfillment, clear cart. Returns order + purchases for success screen. */
  checkoutCart: () => Promise<{ order: StoreOrder; purchases: ProductPurchase[] } | null>;
  /** Same as checkoutCart but with payment proof (DreamBig books style): order is pending until admin verifies. */
  checkoutCartWithPayment: (params: {
    paymentMethod: string;
    paymentReference?: string;
    paymentNotes?: string;
    proofOfPaymentUrl: string;
  }) => Promise<{ order: StoreOrder; purchases: ProductPurchase[] } | null>;
  refreshProducts: () => Promise<void>;
  /** Store cart (platform products) – add here, then checkout from cart screen */
  storeCart: StoreCartItem[];
  storeCartCount: number;
  addToStoreCart: (product: PlatformProduct, quantity?: number) => void;
  removeFromStoreCart: (productId: string) => void;
  updateStoreCartQuantity: (productId: string, quantity: number) => void;
  clearStoreCart: () => void;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductContextProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const { business } = useBusiness();
  const { enabledFeatureIds } = useFeatures();
  const { consumeLastAdClick, trackConversion } = useAds();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeCart, setStoreCart] = useState<StoreCartItem[]>([]);

  const storeCartCount = storeCart.reduce((sum, item) => sum + item.quantity, 0);

  const addToStoreCart = useCallback((product: PlatformProduct, quantity: number = 1) => {
    setStoreCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const qty = Math.max(1, quantity);
      if (product.manageStock && product.stockQuantity < (existing ? existing.quantity + qty : qty)) {
        return prev;
      }
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const removeFromStoreCart = useCallback((productId: string) => {
    setStoreCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateStoreCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setStoreCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setStoreCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearStoreCart = useCallback(() => setStoreCart([]), []);

  const loadProducts = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      if (categoriesData) {
        setCategories(categoriesData.map((row: any) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          parentId: row.parent_id,
          imageUrl: row.image_url,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }

      // Load products
      // Super admins can see all products (including drafts)
      const query = supabase
        .from('platform_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin) {
        query.eq('status', 'published');
      }

      const { data: productsData, error: productsError } = await query;

      if (productsError) throw productsError;

      if (productsData) {
        const platformProducts: PlatformProduct[] = productsData.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          shortDescription: row.short_description,
          sku: row.sku,
          type: row.type,
          basePrice: parseFloat(row.base_price),
          currency: row.currency,
          salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
          saleStartDate: row.sale_start_date,
          saleEndDate: row.sale_end_date,
          variations: row.variations || [],
          manageStock: row.manage_stock,
          stockQuantity: row.stock_quantity,
          lowStockThreshold: row.low_stock_threshold,
          stockStatus: row.stock_status,
          images: row.images || [],
          videoUrl: row.video_url,
          categoryId: row.category_id,
          tags: row.tags || [],
          visibilityRules: row.visibility_rules || {},
          status: row.status,
          featured: row.featured,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deliveryType: row.delivery_type ?? (row.type === 'digital' ? 'download' : row.type === 'physical' ? 'shipping' : undefined),
          deliveryConfig: row.delivery_config ?? undefined,
        }));

        setProducts(platformProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const isProductVisible = useCallback((product: PlatformProduct): boolean => {
    // Super admins can see all products
    if (isSuperAdmin) return true;

    // Must be published
    if (product.status !== 'published') return false;

    const userBook = business?.dreamBigBook;
    const businessType = business?.type;
    const businessStage = business?.stage;
    const rules = product.visibilityRules;

    // Check book requirement
    if (rules.visibleToBooks && rules.visibleToBooks.length > 0) {
      if (!userBook || !rules.visibleToBooks.includes(userBook)) {
        return false;
      }
    }

    // Check business type
    if (rules.visibleToBusinessTypes && businessType) {
      if (!rules.visibleToBusinessTypes.includes(businessType)) {
        return false;
      }
    }

    // Check feature requirement
    if (rules.requiresFeature) {
      if (!enabledFeatureIds.includes(rules.requiresFeature)) {
        return false;
      }
    }

    // Check business stage
    if (rules.minBusinessStage && businessStage) {
      const stageOrder: BusinessStage[] = ['idea', 'running', 'growing'];
      const minIndex = stageOrder.indexOf(rules.minBusinessStage);
      const currentIndex = stageOrder.indexOf(businessStage);
      if (currentIndex < minIndex) return false;
    }

    return true;
  }, [business, enabledFeatureIds, isSuperAdmin]);

  const getVisibleProducts = useCallback((): PlatformProduct[] => {
    return products.filter(p => isProductVisible(p));
  }, [products, isProductVisible]);

  const getProductById = useCallback((id: string): PlatformProduct | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  const purchaseProduct = useCallback(async (
    productId: string,
    quantity: number = 1
  ): Promise<ProductPurchase | null> => {
    if (!user || !business) return null;

    const product = getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check stock
    if (product.manageStock && product.stockQuantity < quantity) {
      throw new Error('Insufficient stock');
    }

    // Calculate price (use sale price if available and within date range)
    const now = new Date();
    let unitPrice = product.basePrice;
    
    if (product.salePrice) {
      const saleStart = product.saleStartDate ? new Date(product.saleStartDate) : null;
      const saleEnd = product.saleEndDate ? new Date(product.saleEndDate) : null;
      
      if ((!saleStart || now >= saleStart) && (!saleEnd || now <= saleEnd)) {
        unitPrice = product.salePrice;
      }
    }

    const totalPrice = unitPrice * quantity;

    try {
      const attribution = consumeLastAdClick();
      const { data, error } = await supabase
        .from('product_purchases')
        .insert({
          product_id: productId,
          user_id: user.id,
          business_id: business.id,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          currency: product.currency,
          payment_status: 'pending', // In future, integrate with payment gateway
          ...(attribution ? { ad_id: attribution.adId } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      // Update stock if managed
      if (product.manageStock) {
        await supabase
          .from('platform_products')
          .update({ stock_quantity: product.stockQuantity - quantity })
          .eq('id', productId);
      }

      if (attribution) {
        await trackConversion(attribution.adId, attribution.location, totalPrice);
      }

      return {
        id: data.id,
        productId: data.product_id,
        userId: data.user_id,
        businessId: data.business_id,
        quantity: data.quantity,
        unitPrice: parseFloat(data.unit_price),
        totalPrice: parseFloat(data.total_price),
        currency: data.currency,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status,
        purchasedAt: data.purchased_at,
        adId: data.ad_id,
        metadata: data.metadata,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Failed to purchase product:', error);
      throw error;
    }
  }, [user, business, consumeLastAdClick, trackConversion, getProductById]);

  /** Derive fulfillment status and metadata from product delivery type (download → unlock, shipping → pending, course → enrolled, event → ticket). */
  const getFulfillmentForProduct = useCallback((
    product: PlatformProduct,
    quantity: number
  ): { fulfillmentStatus: FulfillmentStatus; fulfillmentMetadata: Record<string, unknown> } => {
    const deliveryType: DeliveryType = product.deliveryType ?? (
      product.type === 'digital' ? 'download' :
      product.type === 'physical' ? 'shipping' :
      product.type === 'course' ? 'course' :
      product.type === 'event' ? 'event' : 'na'
    );
    const config = product.deliveryConfig ?? {};
    switch (deliveryType) {
      case 'download':
        return {
          fulfillmentStatus: 'unlocked',
          fulfillmentMetadata: {
            download_url: config.downloadUrl ?? product.videoUrl ?? (product.images?.[0] ?? null),
          },
        };
      case 'shipping':
        return { fulfillmentStatus: 'pending', fulfillmentMetadata: {} };
      case 'course':
        return {
          fulfillmentStatus: 'enrolled',
          fulfillmentMetadata: {
            course_platform: config.coursePlatform ?? 'whatsapp',
            course_link: config.courseLink ?? null,
          },
        };
      case 'event':
        return {
          fulfillmentStatus: 'ticket_issued',
          fulfillmentMetadata: {
            event_id: config.eventId ?? null,
            event_name: config.eventName ?? product.name,
            event_date: config.eventDate ?? null,
            ticket_quantity: quantity,
          },
        };
      default:
        return { fulfillmentStatus: 'na', fulfillmentMetadata: {} };
    }
  }, []);

  const checkoutCart = useCallback(async (): Promise<{ order: StoreOrder; purchases: ProductPurchase[] } | null> => {
    if (!user || !business || storeCart.length === 0) return null;

    const currency = storeCart[0]?.product.currency ?? 'USD';
    let orderTotal = 0;
    const lineItems: { product: PlatformProduct; quantity: number; unitPrice: number; totalPrice: number }[] = [];
    for (const item of storeCart) {
      const product = getProductById(item.product.id) ?? item.product;
      if (product.manageStock && product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const unitPrice = product.salePrice != null ? product.salePrice : product.basePrice;
      const totalPrice = unitPrice * item.quantity;
      orderTotal += totalPrice;
      lineItems.push({ product, quantity: item.quantity, unitPrice, totalPrice });
    }

    try {
      const { data: orderRow, error: orderError } = await supabase
        .from('store_orders')
        .insert({
          user_id: user.id,
          business_id: business.id,
          total_amount: orderTotal,
          currency,
          payment_status: 'completed',
        })
        .select()
        .single();

      if (orderError) throw orderError;
      if (!orderRow) throw new Error('Failed to create order');

      const orderId = orderRow.id;
      const purchases: ProductPurchase[] = [];

      for (const line of lineItems) {
        const { fulfillmentStatus, fulfillmentMetadata } = getFulfillmentForProduct(line.product, line.quantity);
        const attribution = consumeLastAdClick();
        const typeSnapshot = {
          type: line.product.type || 'physical',
          deliveryType: line.product.deliveryType ?? (line.product.type === 'digital' ? 'download' : line.product.type === 'physical' ? 'shipping' : line.product.type === 'course' ? 'course' : line.product.type === 'event' ? 'event' : null),
        };
        const { data: purchaseRow, error: purchaseError } = await supabase
          .from('product_purchases')
          .insert({
            product_id: line.product.id,
            user_id: user.id,
            business_id: business.id,
            order_id: orderId,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            total_price: line.totalPrice,
            currency: line.product.currency,
            payment_status: 'completed',
            fulfillment_status: fulfillmentStatus,
            fulfillment_metadata: fulfillmentMetadata,
            type_snapshot: typeSnapshot,
            ...(attribution ? { ad_id: attribution.adId } : {}),
          })
          .select()
          .single();

        if (purchaseError) throw purchaseError;
        if (purchaseRow) {
          purchases.push({
            id: purchaseRow.id,
            productId: purchaseRow.product_id,
            userId: purchaseRow.user_id,
            businessId: purchaseRow.business_id,
            quantity: purchaseRow.quantity,
            unitPrice: parseFloat(purchaseRow.unit_price),
            totalPrice: parseFloat(purchaseRow.total_price),
            currency: purchaseRow.currency,
            paymentStatus: purchaseRow.payment_status,
            purchasedAt: purchaseRow.purchased_at,
            orderId: purchaseRow.order_id,
            fulfillmentStatus: purchaseRow.fulfillment_status,
            fulfillmentMetadata: purchaseRow.fulfillment_metadata,
            typeSnapshot: purchaseRow.type_snapshot,
            createdAt: purchaseRow.created_at,
          });
        }

        if (line.product.manageStock) {
          await supabase
            .from('platform_products')
            .update({ stock_quantity: line.product.stockQuantity - line.quantity })
            .eq('id', line.product.id);
        }

        if (attribution) {
          await trackConversion(attribution.adId, attribution.location, line.totalPrice);
        }
      }

      await supabase.rpc('fulfill_order_access', { _order_id: orderId });
      clearStoreCart();
      await loadProducts();

      const order: StoreOrder = {
        id: orderRow.id,
        userId: orderRow.user_id,
        businessId: orderRow.business_id,
        totalAmount: parseFloat(orderRow.total_amount),
        currency: orderRow.currency,
        paymentStatus: orderRow.payment_status,
        orderStatus: (orderRow as any).order_status,
        paymentMethod: orderRow.payment_method,
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
      };
      return { order, purchases };
    } catch (error) {
      console.error('Checkout failed:', error);
      throw error;
    }
  }, [user, business, storeCart, getProductById, getFulfillmentForProduct, clearStoreCart, loadProducts, consumeLastAdClick, trackConversion]);

  const checkoutCartWithPayment = useCallback(async (params: {
    paymentMethod: string;
    paymentReference?: string;
    paymentNotes?: string;
    proofOfPaymentUrl: string;
  }): Promise<{ order: StoreOrder; purchases: ProductPurchase[] } | null> => {
    if (!user || !business || storeCart.length === 0) return null;

    const currency = storeCart[0]?.product.currency ?? 'USD';
    let orderTotal = 0;
    const lineItems: { product: PlatformProduct; quantity: number; unitPrice: number; totalPrice: number }[] = [];
    for (const item of storeCart) {
      const product = getProductById(item.product.id) ?? item.product;
      if (product.manageStock && product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const unitPrice = product.salePrice != null ? product.salePrice : product.basePrice;
      const totalPrice = unitPrice * item.quantity;
      orderTotal += totalPrice;
      lineItems.push({ product, quantity: item.quantity, unitPrice, totalPrice });
    }

    try {
      const { data: orderRow, error: orderError } = await supabase
        .from('store_orders')
        .insert({
          user_id: user.id,
          business_id: business.id,
          total_amount: orderTotal,
          currency,
          payment_status: 'pending',
          payment_method: params.paymentMethod,
          payment_reference: params.paymentReference || null,
          payment_notes: params.paymentNotes || null,
          proof_of_payment_url: params.proofOfPaymentUrl,
        })
        .select()
        .single();

      if (orderError) throw orderError;
      if (!orderRow) throw new Error('Failed to create order');

      const orderId = orderRow.id;
      const purchases: ProductPurchase[] = [];

      for (const line of lineItems) {
        const { fulfillmentStatus, fulfillmentMetadata } = getFulfillmentForProduct(line.product, line.quantity);
        const attribution = consumeLastAdClick();
        const typeSnapshot = {
          type: line.product.type || 'physical',
          deliveryType: line.product.deliveryType ?? (line.product.type === 'digital' ? 'download' : line.product.type === 'physical' ? 'shipping' : line.product.type === 'course' ? 'course' : line.product.type === 'event' ? 'event' : null),
        };
        const { data: purchaseRow, error: purchaseError } = await supabase
          .from('product_purchases')
          .insert({
            product_id: line.product.id,
            user_id: user.id,
            business_id: business.id,
            order_id: orderId,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            total_price: line.totalPrice,
            currency: line.product.currency,
            payment_status: 'pending',
            fulfillment_status: fulfillmentStatus,
            fulfillment_metadata: fulfillmentMetadata,
            type_snapshot: typeSnapshot,
            ...(attribution ? { ad_id: attribution.adId } : {}),
          })
          .select()
          .single();

        if (purchaseError) throw purchaseError;
        if (purchaseRow) {
          purchases.push({
            id: purchaseRow.id,
            productId: purchaseRow.product_id,
            userId: purchaseRow.user_id,
            businessId: purchaseRow.business_id,
            quantity: purchaseRow.quantity,
            unitPrice: parseFloat(purchaseRow.unit_price),
            totalPrice: parseFloat(purchaseRow.total_price),
            currency: purchaseRow.currency,
            paymentStatus: purchaseRow.payment_status,
            purchasedAt: purchaseRow.purchased_at,
            orderId: purchaseRow.order_id,
            fulfillmentStatus: purchaseRow.fulfillment_status,
            fulfillmentMetadata: purchaseRow.fulfillment_metadata,
            typeSnapshot: purchaseRow.type_snapshot,
            createdAt: purchaseRow.created_at,
          });
        }

        if (line.product.manageStock) {
          await supabase
            .from('platform_products')
            .update({ stock_quantity: line.product.stockQuantity - line.quantity })
            .eq('id', line.product.id);
        }

        if (attribution) {
          await trackConversion(attribution.adId, attribution.location, line.totalPrice);
        }
      }

      clearStoreCart();
      await loadProducts();

      const order: StoreOrder = {
        id: orderRow.id,
        userId: orderRow.user_id,
        businessId: orderRow.business_id,
        totalAmount: parseFloat(orderRow.total_amount),
        currency: orderRow.currency,
        paymentStatus: orderRow.payment_status,
        orderStatus: orderRow.order_status as any,
        paymentMethod: orderRow.payment_method,
        createdAt: orderRow.created_at,
        updatedAt: orderRow.updated_at,
      };
      return { order, purchases };
    } catch (error) {
      console.error('Checkout with payment failed:', error);
      throw error;
    }
  }, [user, business, storeCart, getProductById, getFulfillmentForProduct, clearStoreCart, loadProducts, consumeLastAdClick, trackConversion]);

  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isLoading,
        isProductVisible,
        getVisibleProducts,
        getProductById,
        purchaseProduct,
        checkoutCart,
        checkoutCartWithPayment,
        refreshProducts,
        storeCart,
        storeCartCount,
        addToStoreCart,
        removeFromStoreCart,
        updateStoreCartQuantity,
        clearStoreCart,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductContextProvider');
  }
  return context;
}

