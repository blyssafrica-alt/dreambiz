import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import { StoreProductCard } from '@/components/StoreProductCard';
import { ArrowLeft, ShoppingCart, Star, Package, Minus, Plus, AlertCircle, ChevronDown, ChevronUp, Download, Calendar, MapPin, Truck, GraduationCap } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PlatformProduct } from '@/types/super-admin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_MAX_HEIGHT = 300;
const TAB_BAR_HEIGHT = 64;
const BOTTOM_EXTRA_PADDING = 20;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { getProductById, addToStoreCart, products } = useProducts();
  const [product, setProduct] = useState<PlatformProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const loadProduct = useCallback(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const foundProduct = getProductById(id);
      if (foundProduct) {
        setProduct(foundProduct);
        // Initialize variations with first option
        const initialVariations: Record<string, string> = {};
        foundProduct.variations.forEach(variation => {
          if (variation.options.length > 0) {
            initialVariations[variation.name] = variation.options[0];
          }
        });
        setSelectedVariations(initialVariations);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  }, [getProductById, id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const getCurrentPrice = () => {
    if (!product) return 0;
    
    let basePrice = product.basePrice;
    
    // Apply sale price if available and within date range
    if (product.salePrice) {
      const now = new Date();
      const saleStart = product.saleStartDate ? new Date(product.saleStartDate) : null;
      const saleEnd = product.saleEndDate ? new Date(product.saleEndDate) : null;
      
      if ((!saleStart || now >= saleStart) && (!saleEnd || now <= saleEnd)) {
        basePrice = product.salePrice;
      }
    }
    
    // Apply variation price modifiers
    let variationModifier = 0;
    product.variations.forEach(variation => {
      const selectedOption = selectedVariations[variation.name];
      if (selectedOption && variation.priceModifiers) {
        variationModifier += variation.priceModifiers[selectedOption] || 0;
      }
    });
    
    return basePrice + variationModifier;
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.manageStock && product.stockQuantity < quantity) {
      Alert.alert('Out of Stock', 'Insufficient stock available');
      return;
    }

    addToStoreCart(product, quantity);
    Alert.alert(
      'Added to cart',
      `${product.name} has been added. Go to cart to checkout.`,
      [
        { text: 'Continue shopping' },
        { text: 'View cart', onPress: () => router.push('/(tabs)/store/cart' as any) },
      ]
    );
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    if (product?.manageStock && newQuantity > product.stockQuantity) {
      Alert.alert('Insufficient Stock', `Only ${product.stockQuantity} available`);
      return;
    }
    setQuantity(newQuantity);
  };

  const handleVariationChange = (variationName: string, option: string) => {
    setSelectedVariations(prev => ({
      ...prev,
      [variationName]: option,
    }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Package size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPrice = getCurrentPrice();
  const isOnSale = product.salePrice && currentPrice < product.basePrice;
  const totalPrice = currentPrice * quantity;
  const hasStock = !product.manageStock || product.stockQuantity > 0;
  const stockStatus = product.manageStock 
    ? (product.stockQuantity === 0 ? 'Out of Stock' : `${product.stockQuantity} in stock`)
    : 'In Stock';

  const stickyBarBottomPadding = TAB_BAR_HEIGHT + insets.bottom + BOTTOM_EXTRA_PADDING;
  const bottomBarHeight = 160 + stickyBarBottomPadding;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: product.name, headerShown: false }} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.background.card }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="always"
      >
        {/* Section 1: Product media gallery – contain so full image visible; badges top-right to avoid overlapping title */}
        {product.images && product.images.length > 0 && (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setSelectedImageIndex(index);
              }}
              style={styles.imageCarousel}
              nestedScrollEnabled={false}
            >
              {product.images.map((imageUri, index) => (
                <View key={index} style={[styles.productImageWrap, { width: SCREEN_WIDTH, height: IMAGE_MAX_HEIGHT }]}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
            {/* Badge pills – top-right so they don't overlap product title text in banner */}
            <View style={styles.badgeOverlay} pointerEvents="none">
              {product.featured && (
                <View style={[styles.badgePill, { backgroundColor: theme.accent.primary }]}>
                  <Star size={12} color="#FFF" fill="#FFF" />
                  <Text style={styles.badgePillText}>Featured</Text>
                </View>
              )}
              {isOnSale && (
                <View style={[styles.badgePill, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.badgePillText}>Hot Deal</Text>
                </View>
              )}
              {product.manageStock && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold && (
                <View style={[styles.badgePill, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.badgePillText}>Low stock</Text>
                </View>
              )}
              {(product.tags || []).some(t => /^new$/i.test(String(t))) && (
                <View style={[styles.badgePill, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.badgePillText}>New</Text>
                </View>
              )}
            </View>
            {product.images.length > 1 && (
              <View style={styles.imageIndicators}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: selectedImageIndex === index 
                          ? theme.accent.primary 
                          : theme.text.tertiary + '40',
                      }
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Product Info – card with rounded corners and shadow (animated) */}
        <Animated.View
          style={[
            styles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: theme.background.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              marginTop: -12,
              overflow: 'hidden',
              paddingTop: 24,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
                android: { elevation: 8 },
              }),
            },
          ]}
        >
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={[styles.title, { color: theme.text.primary }]}>{product.name}</Text>
              {product.sku && (
                <Text style={[styles.sku, { color: theme.text.tertiary }]}>SKU: {product.sku}</Text>
              )}
            </View>
            {product.featured && (
              <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                <Star size={16} color={theme.accent.primary} fill={theme.accent.primary} />
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            {isOnSale && (
              <Text style={[styles.originalPrice, { color: theme.text.tertiary }]}>
                {product.currency} {product.basePrice.toFixed(2)}
              </Text>
            )}
            <Text style={[styles.price, { color: theme.accent.primary }]}>
              {product.currency} {currentPrice.toFixed(2)}
            </Text>
            {isOnSale && (
              <View style={[styles.saleBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.saleText, { color: '#EF4444' }]}>ON SALE</Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          {product.manageStock && (
            <View style={[
              styles.stockStatus,
              { 
                backgroundColor: product.stockQuantity === 0 
                  ? '#EF444420' 
                  : product.stockQuantity <= product.lowStockThreshold
                  ? '#F59E0B20'
                  : '#10B98120'
              }
            ]}>
              <AlertCircle 
                size={16} 
                color={product.stockQuantity === 0 
                  ? '#EF4444' 
                  : product.stockQuantity <= product.lowStockThreshold
                  ? '#F59E0B'
                  : '#10B981'
                } 
              />
              <Text style={[
                styles.stockText,
                { 
                  color: product.stockQuantity === 0 
                    ? '#EF4444' 
                    : product.stockQuantity <= product.lowStockThreshold
                    ? '#F59E0B'
                    : '#10B981'
                }
              ]}>
                {stockStatus}
              </Text>
            </View>
          )}

          {/* Section 4: Description – expandable Read more */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <TouchableOpacity
                style={styles.descriptionHeaderRow}
                onPress={() => setDescriptionExpanded((e) => !e)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Description</Text>
                {descriptionExpanded ? (
                  <ChevronUp size={20} color={theme.text.tertiary} />
                ) : (
                  <ChevronDown size={20} color={theme.text.tertiary} />
                )}
              </TouchableOpacity>
              <Text style={[styles.description, { color: theme.text.secondary }]} selectable numberOfLines={descriptionExpanded ? undefined : 4}>
                {product.description}
              </Text>
              {!descriptionExpanded && product.description.length > 80 && (
                <TouchableOpacity onPress={() => setDescriptionExpanded(true)} style={styles.readMoreBtn}>
                  <Text style={[styles.readMoreText, { color: theme.accent.primary }]}>Read more</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Short Description */}
          {product.shortDescription && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.description, { color: theme.text.secondary }]} selectable>
                {product.shortDescription}
              </Text>
            </View>
          )}

          {/* Variations */}
          {product.variations && product.variations.length > 0 && (
            <View style={styles.variationsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Options</Text>
              {product.variations.map((variation, index) => (
                <View key={index} style={styles.variationGroup}>
                  <Text style={[styles.variationLabel, { color: theme.text.primary }]}>
                    {variation.name}
                  </Text>
                  <View style={styles.variationOptions}>
                    {variation.options.map((option) => {
                      const isSelected = selectedVariations[variation.name] === option;
                      const priceModifier = variation.priceModifiers?.[option] || 0;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.variationOption,
                            {
                              backgroundColor: isSelected 
                                ? theme.accent.primary + '20' 
                                : theme.background.secondary,
                              borderColor: isSelected 
                                ? theme.accent.primary 
                                : theme.border.light,
                            }
                          ]}
                          onPress={() => handleVariationChange(variation.name, option)}
                        >
                          <Text style={[
                            styles.variationOptionText,
                            { color: isSelected ? theme.accent.primary : theme.text.primary }
                          ]}>
                            {option}
                          </Text>
                          {priceModifier !== 0 && (
                            <Text style={[
                              styles.variationPrice,
                              { color: isSelected ? theme.accent.primary : theme.text.secondary }
                            ]}>
                              {priceModifier > 0 ? '+' : ''}{product.currency} {priceModifier.toFixed(2)}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Product Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Type</Text>
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                  {(product.type || 'physical').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
              {product.categoryId && (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Category</Text>
                  <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                    {product.categoryId}
                  </Text>
                </View>
              )}
              {product.tags && product.tags.length > 0 && (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {product.tags.map((tag, index) => (
                      <View key={index} style={[styles.tag, { backgroundColor: theme.background.secondary }]}>
                        <Text style={[styles.tagText, { color: theme.text.secondary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Type-specific sections (extensions only) */}
          {(product.type === 'digital' || product.deliveryType === 'download') && (
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Files included</Text>
              <View style={[styles.typeSectionBlock, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.typeSectionRow}>
                  <Download size={20} color={theme.text.tertiary} />
                  <Text style={[styles.typeSectionText, { color: theme.text.secondary }]}>
                    Digital files (PDF, documents, media) — available after purchase. Download or open from My Purchases.
                  </Text>
                </View>
              </View>
            </View>
          )}
          {(product.type === 'course' || product.deliveryType === 'course') && (
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Course outline</Text>
              <View style={[styles.typeSectionBlock, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.typeSectionRow}>
                  <GraduationCap size={20} color={theme.text.tertiary} />
                  <Text style={[styles.typeSectionText, { color: theme.text.secondary }]}>
                    {product.deliveryConfig?.courseLink
                      ? 'Modules and lessons — available after purchase. Continue from My Purchases.'
                      : 'Course content — available after purchase. Access via My Purchases.'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          {(product.type === 'event' || product.deliveryType === 'event') && (
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Event details</Text>
              <View style={[styles.typeSectionBlock, { backgroundColor: theme.background.secondary }]}>
                {product.deliveryConfig?.eventDate && (
                  <View style={styles.typeSectionRow}>
                    <Calendar size={18} color={theme.text.tertiary} />
                    <Text style={[styles.typeSectionText, { color: theme.text.secondary }]}>{product.deliveryConfig.eventDate}</Text>
                  </View>
                )}
                {(product.deliveryConfig?.venueName || product.deliveryConfig?.address || product.deliveryConfig?.city) && (
                  <View style={styles.typeSectionRow}>
                    <MapPin size={18} color={theme.text.tertiary} />
                    <Text style={[styles.typeSectionText, { color: theme.text.secondary }]}>
                      {[product.deliveryConfig.venueName, product.deliveryConfig.address, product.deliveryConfig.city].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}
                {!product.deliveryConfig?.eventDate && !product.deliveryConfig?.venueName && (
                  <Text style={[styles.typeSectionText, { color: theme.text.secondary }]}>
                    Date and venue — see your ticket after purchase (My Purchases).
                  </Text>
                )}
              </View>
            </View>
          )}
          {(product.type === 'physical' || product.deliveryType === 'shipping') && (
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Shipping & delivery</Text>
              <View style={[styles.typeSectionBlock, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.typeSectionRow}>
                  <Truck size={20} color={theme.text.tertiary} />
                  <Text style={[styles.typeSectionText, { color: theme.text.secondary }]}>
                    Physical item — we ship to your address. Track your order from My Purchases after payment.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Section 6: Related products – same category */}
          {(() => {
            const related = (products || [])
              .filter((p) => p.id !== product.id && p.status === 'published' && (product.categoryId ? p.categoryId === product.categoryId : true))
              .slice(0, 8);
            if (related.length === 0) return null;
            return (
              <View style={styles.relatedSection}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>More like this</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll} contentContainerStyle={styles.relatedScrollContent}>
                  {related.map((p) => (
                    <StoreProductCard key={p.id} product={p} variant="featured" onPress={() => router.push(`/(tabs)/store/${p.id}` as any)} />
                  ))}
                </ScrollView>
              </View>
            );
          })()}
        </Animated.View>
      </ScrollView>

      {/* Sticky bottom action bar – explicit bottom padding so price and button are never cut */}
      <View style={[styles.footerWrapper, { paddingBottom: stickyBarBottomPadding }]}>
        <View style={[styles.footer, { backgroundColor: theme.background.card, borderTopColor: theme.border.light }]}>
          <View style={styles.quantitySection}>
            <Text style={[styles.quantityLabel, { color: theme.text.secondary }]}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus size={18} color={quantity <= 1 ? theme.text.tertiary : theme.text.primary} />
              </TouchableOpacity>
              <Text style={[styles.quantityValue, { color: theme.text.primary }]}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => handleQuantityChange(1)}
                disabled={product.manageStock && quantity >= product.stockQuantity}
              >
                <Plus size={18} color={product.manageStock && quantity >= product.stockQuantity ? theme.text.tertiary : theme.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.purchaseSection}>
            <View style={styles.totalPrice}>
              <Text style={[styles.totalLabel, { color: theme.text.secondary }]}>Total</Text>
              <Text style={[styles.totalValue, { color: theme.accent.primary }]} numberOfLines={1}>
                {product.currency} {totalPrice.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                {
                  backgroundColor: hasStock ? theme.accent.primary : theme.text.tertiary,
                  opacity: hasStock ? 1 : 0.6,
                },
              ]}
              onPress={handleAddToCart}
              disabled={!hasStock}
              activeOpacity={0.85}
            >
              <>
                <ShoppingCart size={20} color="#FFF" />
                <Text style={styles.purchaseButtonText}>
                  {hasStock ? 'Add to Cart' : 'Out of Stock'}
                </Text>
              </>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: 'transparent',
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageSection: {
    marginBottom: 0,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  imageCarousel: {
    width: SCREEN_WIDTH,
  },
  productImageWrap: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_MAX_HEIGHT,
    backgroundColor: 'transparent',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    right: 16,
    left: undefined,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgePillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoSection: {
    padding: 20,
    marginTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  sku: {
    fontSize: 12,
    marginTop: 4,
  },
  featuredBadge: {
    padding: 8,
    borderRadius: 12,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
  saleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  readMoreBtn: {
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  variationsSection: {
    marginBottom: 24,
  },
  variationGroup: {
    marginBottom: 16,
  },
  variationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  variationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  variationOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  variationPrice: {
    fontSize: 10,
    marginTop: 2,
  },
  detailsSection: {
    marginBottom: 24,
  },
  typeSectionBlock: {
    flexDirection: 'column',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  typeSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeSectionText: {
    fontSize: 14,
    flex: 1,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  relatedSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  relatedScroll: {
    marginHorizontal: -20,
  },
  relatedScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  quantitySection: {
    marginBottom: 14,
  },
  quantityLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  purchaseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  totalPrice: {
    flexShrink: 0,
    minWidth: 0,
    maxWidth: '42%',
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  purchaseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 150,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

