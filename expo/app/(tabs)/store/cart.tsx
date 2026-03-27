import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingCart } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import type { StoreCartItem } from '@/contexts/ProductContext';
import type { PlatformProduct } from '@/types/super-admin';
import {
  CartStepper,
  CartItemRow,
  OrderSummaryCard,
  PromoCodeRow,
  StickyCheckoutBar,
} from '@/components/cart';
import { CartSkeleton } from '@/components/cart';
import { CART_SPACING } from '@/constants/cart-design';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 100 : 90;

export default function CartScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    storeCart,
    storeCartCount,
    removeFromStoreCart,
    updateStoreCartQuantity,
    addToStoreCart,
    refreshProducts,
    getProductById,
    isLoading: productsLoading,
  } = useProducts();

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ productName: string; item: StoreCartItem } | null>(null);
  const checkoutTappedRef = useRef(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshProducts();
    } catch (e: any) {
      setError(e?.message ?? 'Could not load cart');
    } finally {
      setRefreshing(false);
    }
  }, [refreshProducts]);

  const subtotal = storeCart.reduce((sum, item) => {
    const p = getProductById(item.product.id) ?? item.product;
    const unit = p.salePrice != null ? p.salePrice : p.basePrice;
    return sum + unit * item.quantity;
  }, 0);
  const discount = 0;
  const total = subtotal - discount;
  const currency = storeCart[0]?.product.currency ?? 'USD';

  const hasOutOfStock = storeCart.some((item) => {
    const p = getProductById(item.product.id) ?? item.product;
    return p.manageStock && p.stockQuantity < item.quantity;
  });

  const showClearConfirm = useCallback(() => {
    if (storeCart.length === 0) return;
    Alert.alert(
      'Clear cart?',
      `Remove ${storeCartCount} item${storeCartCount !== 1 ? 's' : ''} from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => storeCart.forEach((i) => removeFromStoreCart(i.product.id)) },
      ]
    );
  }, [storeCart, storeCartCount, removeFromStoreCart]);

  const handleRemove = useCallback(
    (productId: string) => {
      const item = storeCart.find((i) => i.product.id === productId);
      if (item) {
        removeFromStoreCart(productId);
        setSnackbar({ productName: item.product.name, item });
        const t = setTimeout(() => setSnackbar(null), 3500);
        return () => clearTimeout(t);
      }
    },
    [storeCart, removeFromStoreCart]
  );

  const handleUndo = useCallback(() => {
    if (snackbar) {
      addToStoreCart(snackbar.item.product, snackbar.item.quantity);
      setSnackbar(null);
    }
  }, [snackbar, addToStoreCart]);

  const handleQuantityChange = useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) {
        const item = storeCart.find((i) => i.product.id === productId);
        if (item) {
          removeFromStoreCart(productId);
          setSnackbar({ productName: item.product.name, item });
          setTimeout(() => setSnackbar(null), 3500);
        }
      } else {
        updateStoreCartQuantity(productId, quantity);
      }
    },
    [storeCart, removeFromStoreCart, updateStoreCartQuantity]
  );

  const handleProceedToCheckout = useCallback(() => {
    if (storeCart.length === 0 || hasOutOfStock || checkoutTappedRef.current) return;
    checkoutTappedRef.current = true;
    router.push('/(tabs)/store/checkout' as any);
    setTimeout(() => {
      checkoutTappedRef.current = false;
    }, 800);
  }, [storeCart.length, hasOutOfStock, router]);

  const hasDigital = storeCart.some((item) => {
    const p = item.product;
    return p.type === 'digital' || p.deliveryType === 'download';
  });

  const renderItem = useCallback(
    ({ item }: { item: StoreCartItem }) => {
      const product = getProductById(item.product.id) ?? item.product;
      const unitPrice = product.salePrice != null ? product.salePrice : product.basePrice;
      const lineTotal = unitPrice * item.quantity;
      const maxQty = product.manageStock ? product.stockQuantity : 999;
      const isOutOfStock = product.manageStock && product.stockQuantity < item.quantity;
      const priceUpdated = false;

      return (
        <CartItemRow
          item={item}
          product={product}
          unitPrice={unitPrice}
          lineTotal={lineTotal}
          maxQty={maxQty}
          isOutOfStock={!!isOutOfStock}
          priceUpdated={priceUpdated}
          onQuantityChange={updateStoreCartQuantity}
          onRemove={handleRemove}
          theme={theme}
        />
      );
    },
    [getProductById, updateStoreCartQuantity, handleRemove, theme]
  );

  const listHeader = (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Items</Text>
      <Text style={[styles.sectionCount, { color: theme.text.tertiary }]}>{storeCartCount} item{storeCartCount !== 1 ? 's' : ''}</Text>
    </View>
  );

  const listFooter = (
    <>
      <PromoCodeRow theme={theme} />
      <OrderSummaryCard
        subtotal={subtotal}
        discount={discount}
        total={total}
        currency={currency}
        showDigitalNote={hasDigital}
        theme={theme}
      />
      <View style={{ height: 24 }} />
    </>
  );

  if (productsLoading && storeCart.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <SafeAreaView edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.border.light }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={12} accessibilityLabel="Go back">
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Cart</Text>
            <View style={styles.headerRight} />
          </View>
          <CartStepper activeStep="cart" theme={theme} />
          <CartSkeleton />
        </SafeAreaView>
      </View>
    );
  }

  if (storeCart.length === 0 && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <SafeAreaView edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.border.light }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={12} accessibilityLabel="Go back">
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Cart</Text>
            <View style={styles.headerRight} />
          </View>
          <CartStepper activeStep="cart" theme={theme} />
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.background.card }]}>
              <ShoppingCart size={56} color={theme.text.tertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Your cart is empty</Text>
            <Text style={[styles.emptySub, { color: theme.text.secondary }]}>
              Add products from the store, then return here to checkout.
            </Text>
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.replace('/(tabs)/store' as any)}
              accessibilityLabel="Browse store"
              accessibilityRole="button"
            >
              <Text style={styles.browseBtnText}>Browse store</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error && storeCart.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <SafeAreaView edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.border.light }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={12}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Cart</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.errorWrap}>
            <Text style={[styles.errorText, { color: theme.text.secondary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={onRefresh}
              accessibilityLabel="Retry"
              accessibilityRole="button"
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: theme.border.light }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
            hitSlop={12}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Cart</Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
              {storeCartCount} item{storeCartCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {storeCartCount > 1 ? (
            <TouchableOpacity
              onPress={showClearConfirm}
              style={styles.clearBtn}
              hitSlop={8}
              accessibilityLabel="Clear cart"
              accessibilityRole="button"
            >
              <Text style={[styles.clearBtnText, { color: theme.accent.danger }]}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>

        <CartStepper activeStep="cart" theme={theme} />

        <FlatList
          data={storeCart}
          keyExtractor={(item) => item.product.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent.primary]} />
          }
        />

        <View style={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}>
          <StickyCheckoutBar
            total={total}
            currency={currency}
            onCheckout={handleProceedToCheckout}
            loading={false}
            disabled={storeCart.length === 0 || hasOutOfStock}
            theme={theme}
          />
        </View>

        {snackbar && (
          <View style={[styles.snackbar, { backgroundColor: theme.text.primary }]}>
            <Text style={styles.snackbarText} numberOfLines={1}>
              Removed {snackbar.productName}
            </Text>
            <TouchableOpacity
              onPress={handleUndo}
              hitSlop={12}
              accessibilityLabel="Undo remove"
              accessibilityRole="button"
            >
              <Text style={styles.snackbarUndo}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CART_SPACING.md,
    paddingVertical: CART_SPACING.sm,
    borderBottomWidth: 1,
  },
  headerBack: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  headerRight: { minWidth: 44 },
  clearBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '600' },
  listContent: {
    paddingHorizontal: CART_SPACING.lg,
    paddingTop: CART_SPACING.md,
    paddingBottom: CART_SPACING.xl + 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: CART_SPACING.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionCount: { fontSize: 13 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  browseBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  browseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  snackbar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: CART_SPACING.lg,
    right: CART_SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  snackbarText: { color: '#FFF', fontSize: 14, flex: 1 },
  snackbarUndo: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 12 },
});
