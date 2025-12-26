import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlatformProduct, ProductCategory, ProductPurchase } from '@/types/super-admin';
import type { DreamBigBook, BusinessType, BusinessStage } from '@/types/business';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';
import { useFeatures } from './FeatureContext';

interface ProductContextValue {
  products: PlatformProduct[];
  categories: ProductCategory[];
  isLoading: boolean;
  isProductVisible: (product: PlatformProduct) => boolean;
  getVisibleProducts: () => PlatformProduct[];
  getProductById: (id: string) => PlatformProduct | undefined;
  purchaseProduct: (productId: string, quantity?: number) => Promise<ProductPurchase | null>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductContextProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const { business } = useBusiness();
  const { enabledFeatureIds } = useFeatures();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [user, business, getProductById]);

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
        refreshProducts,
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

