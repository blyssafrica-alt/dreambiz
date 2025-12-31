import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import { ShoppingBag, Search, Star, Package } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StoreScreen() {
  const { theme } = useTheme();
  const { products, isLoading, refreshProducts } = useProducts();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Animation setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    // Refresh products when screen is focused
    refreshProducts();
  }, [refreshProducts]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.status === 'published';
  });

  const featuredProducts = filteredProducts.filter(p => p.featured);
  const categories = Array.from(new Set(products.filter(p => p.status === 'published' && p.categoryId).map(p => p.categoryId))).filter(Boolean);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader
          title="Store"
          subtitle="Browse DreamBig products and resources"
          icon={ShoppingBag}
          iconGradient={['#8B5CF6', '#7C3AED']}
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

          {/* Category Filter */}
          {categories.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryContainer}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: !selectedCategory ? theme.accent.primary : theme.background.secondary,
                    borderColor: !selectedCategory ? theme.accent.primary : theme.border.light,
                  }
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[
                  styles.categoryChipText,
                  { color: !selectedCategory ? '#FFF' : theme.text.primary }
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(categoryId => (
                <TouchableOpacity
                  key={categoryId}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: selectedCategory === categoryId ? theme.accent.primary : theme.background.secondary,
                      borderColor: selectedCategory === categoryId ? theme.accent.primary : theme.border.light,
                    }
                  ]}
                  onPress={() => setSelectedCategory(categoryId)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: selectedCategory === categoryId ? '#FFF' : theme.text.primary }
                  ]}>
                    {categoryId}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {featuredProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Featured Products</Text>
                  <View style={[styles.featuredBadgeHeader, { backgroundColor: theme.accent.primary + '15' }]}>
                    <Star size={14} color={theme.accent.primary} fill={theme.accent.primary} />
                    <Text style={[styles.featuredBadgeText, { color: theme.accent.primary }]}>
                      {featuredProducts.length}
                    </Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {featuredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.featuredCard, { backgroundColor: theme.background.card }]}
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      activeOpacity={0.8}
                    >
                      {product.images && product.images.length > 0 ? (
                        <Image source={{ uri: product.images[0] }} style={styles.featuredImage} />
                      ) : (
                        <View style={[styles.featuredImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                          <Package size={40} color={theme.text.tertiary} />
                        </View>
                      )}
                      <View style={styles.featuredContent}>
                        <Text style={[styles.featuredName, { color: theme.text.primary }]} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <Text style={[styles.featuredPrice, { color: theme.accent.primary }]}>
                          {product.currency} {product.basePrice.toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.productCard, { backgroundColor: theme.background.card }]}
                      onPress={() => router.push(`/(tabs)/store/${product.id}` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.productImageWrapper}>
                        {product.images && product.images.length > 0 ? (
                          <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                        ) : (
                          <View style={[styles.productImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                            <Package size={36} color={theme.text.tertiary} />
                          </View>
                        )}
                        {product.featured && (
                          <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                            <Star size={12} color={theme.accent.primary} fill={theme.accent.primary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.productContent}>
                        <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={2}>
                          {product.name}
                        </Text>
                        {product.shortDescription && (
                          <Text style={[styles.productDesc, { color: theme.text.secondary }]} numberOfLines={2}>
                            {product.shortDescription}
                          </Text>
                        )}
                        <View style={styles.productFooter}>
                          <Text style={[styles.productPrice, { color: theme.accent.primary }]}>
                            {product.currency} {product.basePrice.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
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
    width: 36,
    height: 36,
    borderRadius: 10,
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
    paddingTop: 8,
    paddingBottom: 120,
    flexGrow: 1,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  horizontalScroll: {
    marginHorizontal: -20,
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
    gap: 14,
    marginHorizontal: -7,
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
  categoryScroll: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  categoryContainer: {
    paddingRight: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

