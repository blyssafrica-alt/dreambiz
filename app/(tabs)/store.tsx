import { Stack } from 'expo-router';
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
  const { products, isLoading } = useProducts();
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
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.status === 'published';
  });

  const featuredProducts = filteredProducts.filter(p => p.featured);

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
          }}
        >
          <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
            <Search size={20} color={theme.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search products..."
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: Platform.OS === 'ios' ? 120 : 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {featuredProducts.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Featured Products</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {featuredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.featuredCard, { backgroundColor: theme.background.card }]}
                    >
                      {product.images && product.images.length > 0 && (
                        <Image source={{ uri: product.images[0] }} style={styles.featuredImage} />
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
                  <Package size={64} color={theme.text.tertiary} />
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No products found</Text>
                  <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                    {searchQuery ? 'Try a different search term' : 'Check back later for new products'}
                  </Text>
                </View>
              ) : (
                <View style={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[styles.productCard, { backgroundColor: theme.background.card }]}
                    >
                      {product.images && product.images.length > 0 ? (
                        <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                      ) : (
                        <View style={[styles.productImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                          <Package size={32} color={theme.text.tertiary} />
                        </View>
                      )}
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
                          {product.featured && (
                            <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                              <Star size={12} color={theme.accent.primary} fill={theme.accent.primary} />
                            </View>
                          )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  featuredContent: {
    padding: 16,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginHorizontal: -8,
  },
  productCard: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  featuredBadge: {
    padding: 4,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});

