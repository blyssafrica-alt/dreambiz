import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Package, Eye, ShoppingCart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { PlatformProduct } from '@/types/super-admin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 40; // match store contentContainer paddingHorizontal * 2
const CARD_GAP = 16;
const GRID_COLS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_GAP) / GRID_COLS;
const MIN_TOUCH_TARGET = 44; // Apple HIG minimum

export type StoreProductCardVariant = 'grid' | 'list' | 'compact' | 'featured';

function isValidImageUri(uri: string | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const t = uri.trim();
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://');
}

function getBadge(product: PlatformProduct): { label: string; color: string } | null {
  if (product.featured) return { label: 'Featured', color: '#8B5CF6' };
  if (product.isHot || product.salePrice) {
    if (product.salePrice) {
      const now = new Date();
      const start = product.saleStartDate ? new Date(product.saleStartDate) : null;
      const end = product.saleEndDate ? new Date(product.saleEndDate) : null;
      if ((!start || now >= start) && (!end || now <= end))
        return { label: 'Hot Deal', color: '#EF4444' };
    } else if (product.isHot) return { label: 'Hot Deal', color: '#EF4444' };
  }
  const tags = product.tags || [];
  if (product.isNew || tags.some((t: string) => /^new$/i.test(String(t)))) return { label: 'New', color: '#10B981' };
  if (tags.some((t: string) => /hot_deal|hot deal/i.test(String(t)))) return { label: 'Hot Deal', color: '#EF4444' };
  if (product.isSponsored) return { label: 'Sponsored', color: '#6366F1' };
  if (product.isPopular || tags.some((t: string) => /popular/i.test(String(t)))) return { label: 'Popular', color: '#F59E0B' };
  if (tags.some((t: string) => /featured/i.test(String(t)))) return { label: 'Featured', color: '#8B5CF6' };
  if (product.manageStock && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold)
    return { label: 'Low stock', color: '#F59E0B' };
  return null;
}

/** Small product type badge (Physical, Digital, Course, Event) - does not replace main badge */
function getTypeBadge(product: PlatformProduct): { label: string } | null {
  const t = product.type || 'physical';
  if (t === 'physical') return { label: 'Physical' };
  if (t === 'digital') return { label: 'Digital' };
  if (t === 'course') return { label: 'Course' };
  if (t === 'event') return { label: 'Event' };
  if (t === 'service') return { label: 'Service' };
  if (t === 'subscription') return { label: 'Subscription' };
  return null;
}

interface StoreProductCardProps {
  product: PlatformProduct;
  variant?: StoreProductCardVariant;
  onPress: () => void;
  onQuickView?: () => void;
  onQuickAdd?: () => void;
}

export function StoreProductCard({ product, variant = 'grid', onPress, onQuickView, onQuickAdd }: StoreProductCardProps) {
  const { theme } = useTheme();
  const imgUri = product.images?.[0];
  const showImg = isValidImageUri(imgUri);
  const badge = getBadge(product);
  const typeBadge = getTypeBadge(product);
  const currentPrice = product.salePrice ?? product.basePrice;
  const isOnSale = product.salePrice != null && product.salePrice < product.basePrice;

  const hasStock = !product.manageStock || product.stockQuantity > 0;

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={[styles.featuredCard, { backgroundColor: theme.background.card }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.currency} ${currentPrice.toFixed(2)}`}
      >
        <View style={styles.featuredImageWrap}>
          {showImg ? (
            <Image source={{ uri: imgUri! }} style={styles.featuredImage} resizeMode="cover" />
          ) : (
            <View style={[styles.featuredImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
              <Package size={40} color={theme.text.tertiary} />
            </View>
          )}
          {badge && (
            <View style={[styles.badgePill, { backgroundColor: badge.color }]}>
              <Text style={styles.badgePillText}>{badge.label}</Text>
            </View>
          )}
          {typeBadge && (
            <View style={[styles.typePill, { backgroundColor: theme.background.card + 'E6', borderColor: theme.border.light }]}>
              <Text style={[styles.typePillText, { color: theme.text.secondary }]}>{typeBadge.label}</Text>
            </View>
          )}
          {(onQuickView || onQuickAdd) && (
            <View style={styles.quickActionsOverlay}>
              {onQuickView && (
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: 'rgba(255,255,255,0.95)' }]}
                  onPress={(e) => { e?.stopPropagation?.(); onQuickView(); }}
                  hitSlop={10}
                  accessibilityLabel="Quick view"
                  accessibilityRole="button"
                >
                  <Eye size={20} color={theme.text.primary} />
                </TouchableOpacity>
              )}
              {onQuickAdd && hasStock && (
                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: theme.accent.primary }]}
                  onPress={(e) => { e?.stopPropagation?.(); onQuickAdd(); }}
                  hitSlop={10}
                  accessibilityLabel="Add to cart"
                  accessibilityRole="button"
                >
                  <ShoppingCart size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <View style={styles.featuredContent}>
          <Text style={[styles.featuredName, { color: theme.text.primary }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.featuredPriceRow}>
            <Text style={[styles.featuredPrice, { color: theme.accent.primary }]}>
              {product.currency} {currentPrice.toFixed(2)}
            </Text>
            {isOnSale && (
              <Text style={[styles.originalPriceSmall, { color: theme.text.tertiary }]}>
                {product.currency} {product.basePrice.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: theme.background.card }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.currency} ${currentPrice.toFixed(2)}`}
      >
        {showImg ? (
          <Image source={{ uri: imgUri! }} style={styles.listImage} resizeMode="cover" />
        ) : (
          <View style={[styles.listImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
            <Package size={28} color={theme.text.tertiary} />
          </View>
        )}
        <View style={styles.listContent}>
          <View style={styles.listBadgeRow}>
            {badge && (
              <View style={[styles.badgePillSmall, { backgroundColor: badge.color }]}>
                <Text style={styles.badgePillText}>{badge.label}</Text>
              </View>
            )}
            {typeBadge && (
              <View style={[styles.typePillSmall, { borderColor: theme.border.light }]}>
                <Text style={[styles.typePillText, { color: theme.text.secondary }]}>{typeBadge.label}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.listName, { color: theme.text.primary }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.shortDescription ? (
            <Text style={[styles.listDesc, { color: theme.text.secondary }]} numberOfLines={1}>
              {product.shortDescription}
            </Text>
          ) : null}
          <Text style={[styles.listPrice, { color: theme.accent.primary }]}>
            {product.currency} {currentPrice.toFixed(2)}
            {isOnSale && (
              <Text style={[styles.originalPriceSmall, { color: theme.text.tertiary }]}> · was {product.currency} {product.basePrice.toFixed(2)}</Text>
            )}
          </Text>
          {(onQuickView || onQuickAdd) && (
            <View style={styles.listActions}>
              {onQuickView && (
                <TouchableOpacity
                  onPress={(e) => { e?.stopPropagation?.(); onQuickView(); }}
                  style={[styles.listActionBtn, { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }]}
                  accessibilityLabel="Quick view"
                  accessibilityRole="button"
                >
                  <Eye size={16} color={theme.accent.primary} />
                  <Text style={[styles.listActionText, { color: theme.accent.primary }]}>Quick view</Text>
                </TouchableOpacity>
              )}
              {onQuickAdd && hasStock && (
                <TouchableOpacity
                  onPress={(e) => { e?.stopPropagation?.(); onQuickAdd(); }}
                  style={[styles.listActionBtn, styles.listActionAdd, { backgroundColor: theme.accent.primary, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }]}
                  accessibilityLabel="Add to cart"
                  accessibilityRole="button"
                >
                  <ShoppingCart size={16} color="#FFF" />
                  <Text style={styles.listActionAddText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: theme.background.card }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.currency} ${currentPrice.toFixed(2)}`}
      >
        {showImg ? (
          <Image source={{ uri: imgUri! }} style={styles.compactImage} resizeMode="cover" />
        ) : (
          <View style={[styles.compactImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
            <Package size={20} color={theme.text.tertiary} />
          </View>
        )}
        <Text style={[styles.compactName, { color: theme.text.primary }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.compactPrice, { color: theme.accent.primary }]}>
          {product.currency} {currentPrice.toFixed(2)}
        </Text>
        <View style={styles.compactActions}>
          {onQuickView && (
            <TouchableOpacity
              onPress={(e) => { e?.stopPropagation?.(); onQuickView(); }}
              style={styles.compactQuickView}
              hitSlop={10}
              accessibilityLabel="Quick view"
              accessibilityRole="button"
            >
              <Eye size={16} color={theme.accent.primary} />
            </TouchableOpacity>
          )}
          {onQuickAdd && hasStock && (
            <TouchableOpacity
              onPress={(e) => { e?.stopPropagation?.(); onQuickAdd(); }}
              style={[styles.compactQuickAdd, { backgroundColor: theme.accent.primary }]}
              hitSlop={10}
              accessibilityLabel="Add to cart"
              accessibilityRole="button"
            >
              <ShoppingCart size={16} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // grid (default)
  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: theme.background.card }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${product.currency} ${currentPrice.toFixed(2)}`}
    >
      <View style={styles.gridImageWrap}>
        {showImg ? (
          <Image source={{ uri: imgUri! }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
            <Package size={36} color={theme.text.tertiary} />
          </View>
        )}
        {badge && (
          <View style={[styles.badgePill, { backgroundColor: badge.color }]}>
            <Text style={styles.badgePillText}>{badge.label}</Text>
          </View>
        )}
        {typeBadge && (
          <View style={[styles.typePill, { backgroundColor: theme.background.card + 'E6', borderColor: theme.border.light }]}>
            <Text style={[styles.typePillText, { color: theme.text.secondary }]}>{typeBadge.label}</Text>
          </View>
        )}
        {(onQuickView || onQuickAdd) && (
          <View style={styles.gridQuickActions}>
            {onQuickView && (
              <TouchableOpacity
                style={[styles.gridQuickActionBtn, { backgroundColor: 'rgba(255,255,255,0.95)' }]}
                onPress={(e) => { e?.stopPropagation?.(); onQuickView(); }}
                hitSlop={10}
                accessibilityLabel="Quick view"
                accessibilityRole="button"
              >
                <Eye size={18} color={theme.text.primary} />
              </TouchableOpacity>
            )}
            {onQuickAdd && hasStock && (
              <TouchableOpacity
                style={[styles.gridQuickActionBtn, { backgroundColor: theme.accent.primary }]}
                onPress={(e) => { e?.stopPropagation?.(); onQuickAdd(); }}
                hitSlop={10}
                accessibilityLabel="Add to cart"
                accessibilityRole="button"
              >
                <ShoppingCart size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.gridContent}>
        <Text style={[styles.gridName, { color: theme.text.primary }]} numberOfLines={3}>
          {product.name}
        </Text>
        {product.shortDescription ? (
          <Text style={[styles.gridDesc, { color: theme.text.secondary }]} numberOfLines={2}>
            {product.shortDescription}
          </Text>
        ) : null}
        <View style={styles.gridFooter}>
          <Text style={[styles.gridPrice, { color: theme.accent.primary }]}>
            {product.currency} {currentPrice.toFixed(2)}
          </Text>
          {isOnSale && (
            <Text style={[styles.saleLabel, { color: '#EF4444' }]}>Sale</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  featuredImageWrap: {
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredContent: {
    padding: 18,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  featuredPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  featuredPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  originalPriceSmall: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  listImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
    marginLeft: 14,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  listDesc: {
    fontSize: 13,
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 17,
    fontWeight: '800',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  listActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  listActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listActionAdd: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  listActionAddText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    marginBottom: 6,
  },
  compactImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  compactImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  compactPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactQuickView: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactQuickAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gridImageWrap: {
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: 180,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridQuickActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  gridQuickActionBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gridContent: {
    padding: 16,
  },
  gridName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  gridDesc: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridPrice: {
    fontSize: 17,
    fontWeight: '800',
  },
  saleLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  listBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badgePillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typePillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  typePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgePillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
