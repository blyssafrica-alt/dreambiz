import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import { StoreProductCard } from '@/components/StoreProductCard';
import { AutoPlayCarousel } from '@/components/AutoPlayCarousel';
import { QuickViewModal } from '@/components/QuickViewModal';
import { ShoppingBag, Search, Flame, Star, Package, LayoutGrid, List, LayoutList, SlidersHorizontal, Sparkles, ShoppingCart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlatformProduct } from '@/types/super-admin';

type ViewMode = 'grid' | 'list' | 'compact';
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
  { key: 'name', label: 'Name A–Z' },
];

function isOnSale(p: PlatformProduct): boolean {
  if (!p.salePrice) return false;
  const now = new Date();
  const start = p.saleStartDate ? new Date(p.saleStartDate) : null;
  const end = p.saleEndDate ? new Date(p.saleEndDate) : null;
  return (!start || now >= start) && (!end || now <= end);
}

function isNewProduct(p: PlatformProduct): boolean {
  const tags = p.tags || [];
  if (tags.some((t: string) => /^new$/i.test(String(t)))) return true;
  const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return created >= thirtyDaysAgo;
}

export default function StoreScreen() {
  const { theme } = useTheme();
  const { products, categories: categoryList, isLoading, refreshProducts, addToStoreCart, storeCartCount } = useProducts();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<PlatformProduct | null>(null);

  const handleQuickAdd = (product: PlatformProduct) => {
    const hasStock = !product.manageStock || product.stockQuantity > 0;
    if (!hasStock) return;
    addToStoreCart(product, 1);
    Alert.alert(
      'Added to cart',
      `${product.name} was added. Go to cart to checkout.`,
      [
        { text: 'Continue shopping' },
        { text: 'View cart', onPress: () => router.push('/(tabs)/store/cart' as any) },
      ]
    );
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    refreshProducts();
  }, [fadeAnim, refreshProducts, slideAnim]);

  const categoryIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    (categoryList || []).forEach((c) => { map[c.id] = c.name || c.slug || c.id; });
    return map;
  }, [categoryList]);

  const categoryFilterOptions = useMemo(() => {
    const ids = Array.from(new Set(products.filter(p => p.status === 'published' && p.categoryId).map(p => p.categoryId))).filter(Boolean) as string[];
    return ids.map((id) => ({ id, name: categoryIdToName[id] || id }));
  }, [products, categoryIdToName]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((product) => {
      const matchesSearch = !searchQuery.trim() ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
      return matchesSearch && matchesCategory && product.status === 'published';
    });
    switch (sortBy) {
      case 'price_asc':
        list = [...list].sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'name':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list = [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return list;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const featuredProducts = useMemo(() => filteredProducts.filter((p) => p.featured), [filteredProducts]);
  const hotDealsProducts = useMemo(() => filteredProducts.filter(isOnSale), [filteredProducts]);
  const newArrivalsProducts = useMemo(() => filteredProducts.filter(isNewProduct), [filteredProducts]);
  const recommendedProducts = useMemo(() => {
    const featured = new Set(featuredProducts.map((p) => p.id));
    return filteredProducts.filter((p) => !featured.has(p.id)).slice(0, 8);
  }, [filteredProducts, featuredProducts]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader
          title="DreamBig Store"
          subtitle="Browse products & resources · Cart & checkout"
          icon={ShoppingBag}
          iconGradient={['#8B5CF6', '#7C3AED']}
          rightAction={
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/store/cart' as any)}
              style={[styles.cartIconBtn, { backgroundColor: storeCartCount > 0 ? 'rgba(255,255,255,0.25)' : 'transparent' }]}
              hitSlop={12}
            >
              {storeCartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{storeCartCount > 99 ? '99+' : storeCartCount}</Text>
                </View>
              )}
              <ShoppingCart size={24} color="#FFF" />
            </TouchableOpacity>
          }
        />

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            flex: 1,
          }}
        >
          <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
            <View style={[styles.searchIconContainer, { backgroundColor: theme.background.secondary }]}>
              <Search size={18} color={theme.text.secondary} />
            </View>
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search products..."
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* View cart bar - always visible so users see cart & checkout */}
          <TouchableOpacity
            style={[styles.viewCartBar, { backgroundColor: theme.accent.primary }]}
            onPress={() => router.push('/(tabs)/store/cart' as any)}
            activeOpacity={0.85}
          >
            <ShoppingCart size={22} color="#FFF" />
            <Text style={styles.viewCartBarText}>
              {storeCartCount > 0
                ? `View cart (${storeCartCount} ${storeCartCount === 1 ? 'item' : 'items'}) · Checkout`
                : 'View cart & checkout'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.myPurchasesLink, { borderBottomColor: theme.border.light }]}
            onPress={() => router.push('/my-purchases' as any)}
            activeOpacity={0.7}
          >
            <Package size={18} color={theme.accent.primary} />
            <Text style={[styles.myPurchasesLinkText, { color: theme.accent.primary }]}>My Purchases · Orders & digital access</Text>
          </TouchableOpacity>

          {/* Filters row: categories + view + sort */}
          <View style={[styles.toolbar, { backgroundColor: theme.background.primary }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
              <TouchableOpacity
                style={[styles.categoryChip, { backgroundColor: !selectedCategory ? theme.accent.primary : theme.background.secondary, borderColor: !selectedCategory ? theme.accent.primary : theme.border.light }]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, { color: !selectedCategory ? '#FFF' : theme.text.primary }]}>All</Text>
              </TouchableOpacity>
              {categoryFilterOptions.map(({ id, name }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.categoryChip, { backgroundColor: selectedCategory === id ? theme.accent.primary : theme.background.secondary, borderColor: selectedCategory === id ? theme.accent.primary : theme.border.light }]}
                  onPress={() => setSelectedCategory(id)}
                >
                  <Text style={[styles.categoryChipText, { color: selectedCategory === id ? '#FFF' : theme.text.primary }]} numberOfLines={1}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.viewSortRow, { borderTopColor: theme.border.light }]}>
              <View style={styles.viewModeGroup}>
                {(['grid', 'list', 'compact'] as ViewMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.viewModeBtn, { backgroundColor: viewMode === mode ? theme.accent.primary + '22' : 'transparent' }]}
                    onPress={() => setViewMode(mode)}
                  >
                    {mode === 'grid' && <LayoutGrid size={20} color={viewMode === mode ? theme.accent.primary : theme.text.tertiary} />}
                    {mode === 'list' && <List size={20} color={viewMode === mode ? theme.accent.primary : theme.text.tertiary} />}
                    {mode === 'compact' && <LayoutList size={20} color={viewMode === mode ? theme.accent.primary : theme.text.tertiary} />}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.sortBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setShowSortMenu((v) => !v)}>
                <SlidersHorizontal size={18} color={theme.text.secondary} />
                <Text style={[styles.sortBtnText, { color: theme.text.secondary }]}>{SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Sort'}</Text>
              </TouchableOpacity>
            </View>
            {showSortMenu && (
              <View style={[styles.sortMenu, { backgroundColor: theme.background.card }]}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.key} style={styles.sortMenuItem} onPress={() => { setSortBy(opt.key); setShowSortMenu(false); }}>
                    <Text style={[styles.sortMenuText, { color: sortBy === opt.key ? theme.accent.primary : theme.text.primary }]}>{opt.label}</Text>
                    {sortBy === opt.key && <Star size={14} color={theme.accent.primary} fill={theme.accent.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {featuredProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Featured</Text>
                  <View style={[styles.featuredBadgeHeader, { backgroundColor: theme.accent.primary + '15' }]}>
                    <Star size={14} color={theme.accent.primary} fill={theme.accent.primary} />
                    <Text style={[styles.featuredBadgeText, { color: theme.accent.primary }]}>{featuredProducts.length}</Text>
                  </View>
                </View>
                <AutoPlayCarousel itemCount={featuredProducts.length} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                  {featuredProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="featured"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </AutoPlayCarousel>
              </View>
            )}

            {hotDealsProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Flame size={22} color="#EF4444" />
                  <Text style={[styles.sectionTitle, { color: theme.text.primary, marginLeft: 8 }]}>Hot deals</Text>
                </View>
                <AutoPlayCarousel itemCount={hotDealsProducts.length} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                  {hotDealsProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="featured"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </AutoPlayCarousel>
              </View>
            )}

            {newArrivalsProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={22} color={theme.accent.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text.primary, marginLeft: 8 }]}>New arrivals</Text>
                </View>
                <AutoPlayCarousel itemCount={newArrivalsProducts.length} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                  {newArrivalsProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="featured"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </AutoPlayCarousel>
              </View>
            )}

            {recommendedProducts.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Recommended for you</Text>
                <AutoPlayCarousel itemCount={recommendedProducts.length} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
                  {recommendedProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="featured"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </AutoPlayCarousel>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                All Products ({filteredProducts.length})
              </Text>
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.accent.primary} style={{ marginTop: 40 }} />
              ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: theme.background.secondary }]}>
                    <Package size={48} color={theme.text.tertiary} />
                  </View>
                  <Text style={[styles.emptyText, { color: theme.text.primary }]}>
                    {searchQuery || selectedCategory ? 'No products found' : 'Store is empty'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.text.secondary }]}>
                    {searchQuery
                      ? 'Try a different search term or clear filters'
                      : selectedCategory
                      ? 'No products in this category'
                      : 'Products will appear here once they are added'}
                  </Text>
                  {(searchQuery || selectedCategory) && (
                    <TouchableOpacity
                      style={[styles.clearButton, { backgroundColor: theme.accent.primary }]}
                      onPress={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                      }}
                    >
                      <Text style={styles.clearButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : viewMode === 'list' ? (
                <View style={styles.productsList}>
                  {filteredProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="list"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </View>
              ) : viewMode === 'compact' ? (
                <View style={styles.productsCompact}>
                  {filteredProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <StoreProductCard
                      key={product.id}
                      product={product}
                      variant="grid"
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      onQuickView={() => setQuickViewProduct(product)}
                      onQuickAdd={() => handleQuickAdd(product)}
                    />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        <QuickViewModal
          product={quickViewProduct}
          visible={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onOpenFull={(id) => {
            setQuickViewProduct(null);
            router.push(`/(tabs)/store/${id}` as any);
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cartIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewCartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  viewCartBarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  myPurchasesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  myPurchasesLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
    flexGrow: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  horizontalScroll: {
    marginHorizontal: -20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  featuredCard: {
    width: 300,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredContent: {
    padding: 18,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  featuredPrice: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    width: '47.5%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  productImageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  productContent: {
    padding: 14,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  productDesc: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
    opacity: 0.7,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featuredBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  featuredBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  clearButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  toolbar: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  categoryScroll: {
    marginBottom: 0,
  },
  categoryContainer: {
    paddingRight: 12,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  viewSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewModeBtn: {
    padding: 10,
    borderRadius: 12,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortMenu: {
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sortMenuText: {
    fontSize: 15,
    fontWeight: '600',
  },
  productsList: {
    gap: 10,
  },
  productCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    position: 'relative',
  },
  productImageList: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  productImagePlaceholderList: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContentList: {
    flex: 1,
    marginLeft: 14,
  },
  productNameList: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  productDescList: {
    fontSize: 13,
    marginBottom: 4,
  },
  productPriceList: {
    fontSize: 17,
    fontWeight: '800',
  },
  featuredBadgeSmall: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    borderRadius: 8,
  },
  productsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  productImageCompact: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  productImagePlaceholderCompact: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productNameCompact: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  productPriceCompact: {
    fontSize: 15,
    fontWeight: '700',
  },
});
