import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import { ArrowLeft, ShoppingCart, Star, Package, Minus, Plus, Check, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlatformProduct } from '@/types/super-admin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { getProductById, purchaseProduct } = useProducts();
  const [product, setProduct] = useState<PlatformProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = () => {
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
  };

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

  const handlePurchase = async () => {
    if (!product) return;

    if (product.manageStock && product.stockQuantity < quantity) {
      Alert.alert('Out of Stock', 'Insufficient stock available');
      return;
    }

    try {
      setIsPurchasing(true);
      await purchaseProduct(product.id, quantity);
      Alert.alert('Success', 'Product added to your purchases!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to purchase product');
    } finally {
      setIsPurchasing(false);
    }
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: product.name, headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        {product.images && product.images.length > 0 && (
          <View style={styles.imageSection}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setSelectedImageIndex(index);
              }}
            >
              {product.images.map((imageUri, index) => (
                <Image 
                  key={index} 
                  source={{ uri: imageUri }} 
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
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

        {/* Product Info */}
        <View style={[styles.infoSection, { backgroundColor: theme.background.card }]}>
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

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Description</Text>
              <Text style={[styles.description, { color: theme.text.secondary }]}>
                {product.description}
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
                  {product.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
        </View>
      </ScrollView>

      {/* Purchase Footer */}
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
            <Text style={[styles.totalValue, { color: theme.accent.primary }]}>
              {product.currency} {totalPrice.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.purchaseButton, 
              { 
                backgroundColor: hasStock ? theme.accent.primary : theme.text.tertiary,
                opacity: hasStock ? 1 : 0.6,
              }
            ]}
            onPress={handlePurchase}
            disabled={!hasStock || isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <ShoppingCart size={20} color="#FFF" />
                <Text style={styles.purchaseButtonText}>
                  {hasStock ? 'Add to Cart' : 'Out of Stock'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 120,
  },
  imageSection: {
    marginBottom: 20,
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#F3F4F6',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  quantitySection: {
    marginBottom: 12,
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
  },
  totalPrice: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  purchaseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

