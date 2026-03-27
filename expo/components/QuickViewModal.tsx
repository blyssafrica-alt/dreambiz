import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShoppingCart, Minus, Plus, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import type { PlatformProduct } from '@/types/super-admin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.9, 720);
const IMAGE_HEIGHT = 220;

function isValidImageUri(uri: string | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const t = uri.trim();
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://');
}

interface QuickViewModalProps {
  product: PlatformProduct | null;
  visible: boolean;
  onClose: () => void;
  onOpenFull: (productId: string) => void;
}

export function QuickViewModal({ product, visible, onClose, onOpenFull }: QuickViewModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToStoreCart } = useProducts();
  const [quantity, setQuantity] = React.useState(1);
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setDescriptionExpanded(false);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 68, friction: 12 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  if (!product) return null;

  const imgUri = product.images?.[0];
  const showImg = isValidImageUri(imgUri);
  const currentPrice = product.salePrice ?? product.basePrice;
  const isOnSale = product.salePrice != null && product.salePrice < product.basePrice;
  const hasStock = !product.manageStock || product.stockQuantity > 0;
  const totalPrice = (currentPrice * quantity).toFixed(2);
  const descriptionText = product.description || product.shortDescription || '';
  const hasDescription = descriptionText.length > 0;
  const showSeeMore = descriptionText.length > 80;

  const handleQuickAdd = () => {
    if (!hasStock) return;
    addToStoreCart(product, quantity);
    Alert.alert(
      'Added to cart',
      `${product.name} has been added. Go to cart to checkout.`,
      [
        { text: 'Continue shopping', onPress: onClose },
        { text: 'View cart', onPress: () => { onClose(); router.push('/(tabs)/store/cart' as any); } },
      ]
    );
  };

  const openFull = () => {
    onClose();
    onOpenFull(product.id);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            backgroundColor: theme.background.primary,
            paddingBottom: insets.bottom + 24,
          },
          Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -12 },
              shadowOpacity: 0.2,
              shadowRadius: 28,
            },
            android: { elevation: 24 },
          }),
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header: handle + close */}
        <View style={styles.header}>
          <View style={[styles.handle, { backgroundColor: theme.text.tertiary + '40' }]} />
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.background.card }]}
            onPress={onClose}
            hitSlop={14}
          >
            <X size={20} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero image */}
        <View style={[styles.imageWrap, { backgroundColor: theme.background.secondary }]}>
          {showImg ? (
            <Image source={{ uri: imgUri! }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: theme.background.tertiary }]} />
          )}
          {isOnSale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>Sale</Text>
            </View>
          )}
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 }]}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={3}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.accent.primary }]}>
              {product.currency} {currentPrice.toFixed(2)}
            </Text>
            {isOnSale && (
              <Text style={[styles.original, { color: theme.text.tertiary }]}>
                {product.currency} {product.basePrice.toFixed(2)}
              </Text>
            )}
          </View>

          {/* Description – always show when present, with See more / See less */}
          {hasDescription && (
            <View style={[styles.descriptionCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.descriptionTitle, { color: theme.text.primary }]}>Description</Text>
              <Text
                style={[styles.description, { color: theme.text.secondary }]}
                numberOfLines={descriptionExpanded ? undefined : 4}
              >
                {descriptionText}
              </Text>
              {showSeeMore && (
                <TouchableOpacity
                  onPress={() => setDescriptionExpanded((e) => !e)}
                  style={styles.seeMoreRow}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seeMoreText, { color: theme.accent.primary }]}>
                    {descriptionExpanded ? 'See less' : 'See more'}
                  </Text>
                  {descriptionExpanded ? (
                    <ChevronUp size={18} color={theme.accent.primary} />
                  ) : (
                    <ChevronDown size={18} color={theme.accent.primary} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={[styles.quantityLabel, { color: theme.text.secondary }]}>Quantity</Text>
          <View style={[styles.quantityRow, { backgroundColor: theme.background.secondary }]}>
            <TouchableOpacity
              style={[styles.qtyBtn, { borderColor: theme.border.light }]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Minus size={20} color={quantity <= 1 ? theme.text.tertiary : theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: theme.text.primary }]}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, { borderColor: theme.border.light }]}
              onPress={() => setQuantity((q) => q + 1)}
              disabled={product.manageStock && quantity >= product.stockQuantity}
            >
              <Plus size={20} color={product.manageStock && quantity >= product.stockQuantity ? theme.text.tertiary : theme.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: theme.border.light }]}>
            <Text style={[styles.totalLabel, { color: theme.text.secondary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: theme.accent.primary }]}>
              {product.currency} {totalPrice}
            </Text>
          </View>
        </ScrollView>

        {/* Sticky actions */}
        <View style={[styles.actions, { paddingHorizontal: 20 }]}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: hasStock ? theme.accent.primary : theme.text.tertiary,
                opacity: hasStock ? 1 : 0.7,
              },
            ]}
            onPress={handleQuickAdd}
            disabled={!hasStock}
            activeOpacity={0.88}
          >
            <>
              <ShoppingCart size={22} color="#FFF" />
              <Text style={styles.primaryBtnText}>
                {hasStock ? `Add to cart · ${product.currency} ${totalPrice}` : 'Out of stock'}
              </Text>
            </>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border.light }]}
            onPress={openFull}
            activeOpacity={0.8}
          >
            <ExternalLink size={18} color={theme.accent.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.accent.primary }]}>View full details</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
  },
  saleBadge: {
    position: 'absolute',
    top: 12,
    left: 20,
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saleBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 18,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  original: {
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  descriptionCard: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  descriptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    opacity: 0.9,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    opacity: 0.95,
  },
  seeMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  seeMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  quantityLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 12,
  },
  qtyBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  actions: {
    gap: 12,
    paddingTop: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    borderWidth: 2,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
