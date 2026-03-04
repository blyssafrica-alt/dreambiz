import { useRouter } from 'expo-router';
import { Search, Truck, ArrowLeft, ShieldCheck, Star, Package, Clock, Megaphone, BadgeDollarSign, FileText, LayoutGrid, List, MessageSquare, ShoppingCart } from 'lucide-react-native';
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRecentProductViews, useFollowedSuppliers } from '@/hooks/useBuyerRetention';
import { useFollowedSuppliersUpdates } from '@/hooks/useSupplierUpdates';
import { useActiveSponsoredSupplierIds } from '@/hooks/useSponsoredPlacements';
import { useMySupplierApplication } from '@/hooks/useSupplierApplication';
import type { SupplierMarketplaceProfile, SupplierMarketplaceCategory, SupplierVerificationTier } from '@/types/supplier-marketplace';
import { spacing, radius, typography } from '@/constants/layout';

const VERIFICATION_TIER_LABELS: Record<NonNullable<SupplierVerificationTier>, string> = {
  basic: 'Basic',
  verified: 'Verified',
  premium: 'Premium',
  manufacturer: 'Manufacturer',
  distributor: 'Distributor',
};

export default function SuppliersMarketplaceScreen() {
  const { theme } = useTheme();
  const { isFeatureVisible } = useFeatures();
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierMarketplaceProfile[]>([]);
  const [categories, setCategories] = useState<SupplierMarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'ranked' | 'followed' | 'rated' | 'newest'>('ranked');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [supplierViewMode, setSupplierViewMode] = useState<'card' | 'list'>('card');
  const [recentProducts, setRecentProducts] = useState<{ id: string; name: string; image_urls: string[]; supplier_profile_id: string }[]>([]);
  const [followedSuppliers, setFollowedSuppliers] = useState<SupplierMarketplaceProfile[]>([]);
  const { data: recentProductIds = [] } = useRecentProductViews(user?.id, 10);
  const { data: followedSupplierIds = [] } = useFollowedSuppliers(user?.id);
  const { data: updatesFeed = [] } = useFollowedSuppliersUpdates(followedSupplierIds, 20);
  const { data: sponsoredSupplierIds = new Set<string>() } = useActiveSponsoredSupplierIds('home');
  const { data: myApplication } = useMySupplierApplication(user?.id);

  const canAccess = isFeatureVisible('supplier-marketplace');
  if (!canAccess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text.secondary }}>Access to the supplier marketplace is not available for your plan.</Text>
      </View>
    );
  }

  const mapProfile = (r: any) => ({
    id: r.id,
    userId: r.user_id,
    businessName: r.business_name,
    slug: r.slug,
    categoryFocus: r.category_focus,
    country: r.country,
    city: r.city,
    region: r.region,
    address: r.address,
    email: r.email,
    phone: r.phone,
    whatsapp: r.whatsapp,
    description: r.description,
    logoUrl: r.logo_url,
    coverUrl: r.cover_url,
    status: r.status,
    verificationLevel: r.verification_level ?? 0,
    verificationBadgeText: r.verification_badge_text,
    verificationTier: r.verification_tier ?? null,
    trustScore: r.trust_score ?? 0,
    featured: r.featured ?? false,
    adminNotes: r.admin_notes,
    avgResponseHours: r.avg_response_hours != null ? Number(r.avg_response_hours) : null,
    firstSupplierReplyAt: r.first_supplier_reply_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      let suppliersRes: { data: any[] | null; error: any };
      if (sortBy === 'ranked' || sortBy === 'followed' || sortBy === 'rated') {
        suppliersRes = await supabase
          .from('supplier_marketplace_ranked')
          .select('*')
          .order(sortBy === 'ranked' ? 'ranking_score' : sortBy === 'followed' ? 'follower_count' : 'avg_rating', { ascending: false, nullsFirst: false })
          .limit(50);
        if (suppliersRes.error) {
          suppliersRes = await supabase
            .from('supplier_marketplace_profiles')
            .select('*')
            .eq('status', 'approved')
            .order('featured', { ascending: false })
            .order('trust_score', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(50);
        }
      } else {
        suppliersRes = await supabase
          .from('supplier_marketplace_profiles')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);
      }
      const categoriesRes = await supabase
        .from('supplier_marketplace_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (suppliersRes.data) {
        setSuppliers(suppliersRes.data.map(mapProfile));
      }
      if (categoriesRes.data) {
        setCategories(
          categoriesRes.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            description: r.description,
            imageUrl: r.image_url,
            displayOrder: r.display_order ?? 0,
            isActive: r.is_active ?? true,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }))
        );
      }
    } catch (e) {
      console.error('Suppliers marketplace load:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sortBy]);

  const filteredSuppliers = useMemo(() => {
    let list = suppliers;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.businessName || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.categoryFocus || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q) ||
          (s.country || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategoryId) {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (cat) {
        const slugLower = (cat.slug || cat.name || '').toLowerCase();
        const nameLower = (cat.name || '').toLowerCase();
        list = list.filter((s) => {
          const focus = (s.categoryFocus || '').toLowerCase();
          return focus && (focus.includes(slugLower) || focus.includes(nameLower));
        });
      }
    }
    return list;
  }, [suppliers, searchQuery, selectedCategoryId, categories]);

  useEffect(() => {
    if (recentProductIds.length === 0) {
      setRecentProducts([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_products')
        .select('id, name, image_urls, supplier_profile_id')
        .eq('status', 'published')
        .in('id', recentProductIds);
      if (!data) return;
      const order = new Map(recentProductIds.map((id, i) => [id, i]));
      const sorted = [...data].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
      setRecentProducts(sorted as { id: string; name: string; image_urls: string[]; supplier_profile_id: string }[]);
    };
    load();
  }, [recentProductIds.join(',')]);

  useEffect(() => {
    if (followedSupplierIds.length === 0) {
      setFollowedSuppliers([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('*')
        .eq('status', 'approved')
        .in('id', followedSupplierIds);
      if (!data) return;
      setFollowedSuppliers(
        data.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          businessName: r.business_name,
          slug: r.slug,
          categoryFocus: r.category_focus,
          country: r.country,
          city: r.city,
          region: r.region,
          address: r.address,
          email: r.email,
          phone: r.phone,
          whatsapp: r.whatsapp,
          description: r.description,
          logoUrl: r.logo_url,
          coverUrl: r.cover_url,
          status: r.status,
          verificationLevel: r.verification_level ?? 0,
          verificationBadgeText: r.verification_badge_text,
          verificationTier: r.verification_tier ?? null,
          trustScore: r.trust_score ?? 0,
          featured: r.featured ?? false,
          adminNotes: r.admin_notes,
          avgResponseHours: r.avg_response_hours != null ? Number(r.avg_response_hours) : null,
          firstSupplierReplyAt: r.first_supplier_reply_at ?? null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      );
    };
    load();
  }, [followedSupplierIds.join(',')]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]} edges={['top']}>
      <LinearGradient colors={['#0C4A6E', '#0EA5E9', '#0284C7']} style={styles.heroGradient}>
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.heroBack}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Find Suppliers</Text>
          <Text style={styles.heroSubtitle}>Browse verified suppliers and products</Text>
        </View>
      </LinearGradient>
      <View style={[styles.searchRow, { backgroundColor: theme.background.card, marginHorizontal: 16, marginTop: -12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }]}>
        <Search size={20} color={theme.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder="Search suppliers or products..."
          placeholderTextColor={theme.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={[styles.sortRow, { paddingHorizontal: 16 }]}>
        {(['ranked', 'followed', 'rated', 'newest'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sortBy === s && { backgroundColor: theme.accent.primary }]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortChipText, { color: sortBy === s ? '#FFF' : theme.text.secondary }]}>
              {s === 'ranked' ? 'Top ranked' : s === 'followed' ? 'Most followed' : s === 'rated' ? 'Best rated' : 'Newest'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {user && updatesFeed.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>Updates from suppliers you follow</Text>
              {updatesFeed.slice(0, 10).map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.card, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push(`/suppliers-marketplace/${u.supplier_id}` as any)}
                >
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>{u.title}</Text>
                    <Megaphone size={14} color={theme.text.tertiary} />
                  </View>
                  <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                    {u.supplier_marketplace_profiles?.business_name ?? 'Supplier'} · {u.type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {user && (
            <View style={styles.buyerLinksSection}>
              <Text style={[styles.buyerLinksSectionTitle, { color: theme.text.secondary }]}>Quick access</Text>
              <View style={styles.buyerLinksRow}>
                <TouchableOpacity
                  style={[styles.buyerLinkCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push('/rfq' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.buyerLinkIconWrap, { backgroundColor: theme.accent.primary + '18' }]}>
                    <FileText size={22} color={theme.accent.primary} />
                  </View>
                  <Text style={[styles.buyerLinkTitle, { color: theme.text.primary }]}>My RFQs</Text>
                  <Text style={[styles.buyerLinkSub, { color: theme.text.tertiary }]}>Quotes & create orders</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.buyerLinkCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push('/purchase-orders' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.buyerLinkIconWrap, { backgroundColor: theme.accent.primary + '18' }]}>
                    <ShoppingCart size={22} color={theme.accent.primary} />
                  </View>
                  <Text style={[styles.buyerLinkTitle, { color: theme.text.primary }]}>Purchase orders</Text>
                  <Text style={[styles.buyerLinkSub, { color: theme.text.tertiary }]}>Order history</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.buyerLinkCard, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push('/suppliers-marketplace/my-messages' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.buyerLinkIconWrap, { backgroundColor: theme.accent.primary + '18' }]}>
                    <MessageSquare size={22} color={theme.accent.primary} />
                  </View>
                  <Text style={[styles.buyerLinkTitle, { color: theme.text.primary }]}>My Messages</Text>
                  <Text style={[styles.buyerLinkSub, { color: theme.text.tertiary }]}>Conversations with suppliers</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {user && myApplication && (
            <TouchableOpacity
              style={[styles.card, styles.myApplicationCard, { backgroundColor: theme.background.card }]}
              onPress={() => router.push('/suppliers-marketplace/my-application' as any)}
            >
              <FileText size={22} color={theme.accent.primary} />
              <View style={styles.myApplicationText}>
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Your supplier application</Text>
                <Text style={[styles.cardSub, { color: theme.text.tertiary }]}>
                  {myApplication.status === 'draft' && 'Draft — tap to continue'}
                  {myApplication.status === 'needs_info' && 'More info needed — tap to continue'}
                  {(myApplication.status === 'submitted' || myApplication.status === 'pending') && 'Under review — tap to view'}
                  {myApplication.status === 'approved' && 'Approved — go to dashboard'}
                  {myApplication.status === 'declined' && 'Declined — tap to re-apply'}
                </Text>
              </View>
              <Text style={[styles.myApplicationCta, { color: theme.accent.primary }]}>
                {myApplication.status === 'approved' ? 'Dashboard' : 'View'}
              </Text>
            </TouchableOpacity>
          )}
          {user && followedSuppliers.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>Suppliers you follow</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.recentList}>
                {followedSuppliers.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.card, styles.followedCard, { backgroundColor: theme.background.card }]}
                    onPress={() => router.push(`/suppliers-marketplace/${s.id}` as any)}
                  >
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>{s.businessName}</Text>
                    {(s.city || s.country) && (
                      <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>{[s.city, s.country].filter(Boolean).join(', ')}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {user && recentProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Recently viewed</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.recentList}>
                {recentProducts.map((p) => {
                  const img = Array.isArray(p.image_urls) && p.image_urls[0] ? p.image_urls[0] : null;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.recentCard, { backgroundColor: theme.background.card }]}
                      onPress={() => router.push(`/suppliers-marketplace/product/${p.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.recentCardImageWrap}>
                        <StorageImage uri={img} bucket="product" style={styles.recentImage} resizeMode="cover" placeholderIcon="package" />
                      </View>
                      <View style={styles.recentCardContent}>
                        <Text style={[styles.recentCardTitle, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          <View style={styles.section}>
            <View style={[styles.supplierSectionHeader, { borderBottomColor: theme.border.light }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Suppliers{filteredSuppliers.length !== suppliers.length ? ` (${filteredSuppliers.length})` : ''}
              </Text>
              <View style={styles.viewModeGroup}>
                <TouchableOpacity style={[styles.viewModeBtn, supplierViewMode === 'card' && { backgroundColor: theme.accent.primary + '22' }]} onPress={() => setSupplierViewMode('card')}>
                  <LayoutGrid size={20} color={supplierViewMode === 'card' ? theme.accent.primary : theme.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewModeBtn, supplierViewMode === 'list' && { backgroundColor: theme.accent.primary + '22' }]} onPress={() => setSupplierViewMode('list')}>
                  <List size={20} color={supplierViewMode === 'list' ? theme.accent.primary : theme.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>
            {categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterScroll} contentContainerStyle={styles.categoryFilterContent}>
                <TouchableOpacity
                  style={[styles.categoryFilterChip, { backgroundColor: !selectedCategoryId ? theme.accent.primary : theme.background.secondary }]}
                  onPress={() => setSelectedCategoryId(null)}
                >
                  <Text style={[styles.categoryFilterChipText, { color: !selectedCategoryId ? '#FFF' : theme.text.secondary }]}>All</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryFilterChip, { backgroundColor: selectedCategoryId === c.id ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setSelectedCategoryId(selectedCategoryId === c.id ? null : c.id)}
                  >
                    <Text style={[styles.categoryFilterChipText, { color: selectedCategoryId === c.id ? '#FFF' : theme.text.secondary }]} numberOfLines={1}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {filteredSuppliers.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
                <Truck size={40} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  {searchQuery || selectedCategoryId
                    ? 'No suppliers match your filters.'
                    : 'No suppliers yet. Check back later or apply to become a supplier.'}
                </Text>
                {(searchQuery || selectedCategoryId) && (
                  <TouchableOpacity
                    style={[styles.clearFiltersBtn, { backgroundColor: theme.accent.primary }]}
                    onPress={() => { setSearchQuery(''); setSelectedCategoryId(null); }}
                  >
                    <Text style={styles.clearFiltersBtnText}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : supplierViewMode === 'list' ? (
              <View style={styles.supplierList}>
                {filteredSuppliers.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.supplierCardList, { backgroundColor: theme.background.card }]}
                    onPress={() => router.push(`/suppliers-marketplace/${s.id}` as any)}
                  >
                    <StorageImage uri={s.logoUrl} bucket="supplier" style={styles.supplierListLogo} containerStyle={styles.supplierListLogoWrap} resizeMode="contain" />
                    <View style={styles.supplierListBody}>
                      <View style={styles.cardTitleRow}>
                        {s.featured && <Star size={12} color={theme.accent.primary} fill={theme.accent.primary} style={styles.cardStar} />}
                        <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>{s.businessName}</Text>
                      </View>
                      {(s.city || s.country) && (
                        <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>{[s.city, s.country].filter(Boolean).join(', ')}</Text>
                      )}
                      <View style={styles.badges}>
                        {s.verificationTier && s.verificationTier !== 'basic' && (
                          <View style={[styles.tierBadge, { backgroundColor: theme.surface.info }]}>
                            <Text style={[styles.tierBadgeText, { color: theme.accent.primary }]}>{VERIFICATION_TIER_LABELS[s.verificationTier]}</Text>
                          </View>
                        )}
                        {(s.trustScore ?? 0) > 0 && <Text style={[styles.trustScore, { color: theme.accent.primary }]}>{s.trustScore}%</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              filteredSuppliers.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.supplierCard, { backgroundColor: theme.background.card, borderWidth: s.featured ? 2 : 0, borderColor: s.featured ? theme.accent.primary : 'transparent', overflow: 'hidden', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }]}
                  onPress={() => router.push(`/suppliers-marketplace/${s.id}` as any)}
                >
                  <View style={styles.supplierCardTop}>
                    <StorageImage uri={s.logoUrl} bucket="supplier" style={styles.supplierCardLogo} containerStyle={styles.supplierCardLogoWrap} resizeMode="contain" />
                    <View style={styles.supplierCardBody}>
                      <View style={styles.cardTitleRow}>
                        {s.featured && <Star size={14} color={theme.accent.primary} fill={theme.accent.primary} style={styles.cardStar} />}
                        <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>{s.businessName}</Text>
                      </View>
                      {(s.city || s.country) && (
                        <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                          {[s.city, s.country].filter(Boolean).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.badges}>
                      {s.verificationTier && s.verificationTier !== 'basic' && (
                        <View style={[styles.tierBadge, { backgroundColor: theme.surface.info }]}>
                          <ShieldCheck size={12} color={theme.accent.primary} />
                          <Text style={[styles.tierBadgeText, { color: theme.accent.primary }]}>{VERIFICATION_TIER_LABELS[s.verificationTier]}</Text>
                        </View>
                      )}
                      {(s.trustScore ?? 0) > 0 && (
                        <Text style={[styles.trustScore, { color: theme.accent.primary }]}>{s.trustScore}%</Text>
                      )}
                      {(s.avgResponseHours != null || s.firstSupplierReplyAt) && (
                        <View style={[styles.tierBadge, { backgroundColor: '#D1FAE5' }]}>
                          <Clock size={11} color="#065F46" />
                          <Text style={[styles.tierBadgeText, { color: '#065F46' }]}>
                            {s.avgResponseHours != null ? (s.avgResponseHours <= 24 ? '<24h' : `~${Math.round(s.avgResponseHours)}h`) : '•'}
                          </Text>
                        </View>
                      )}
                      {sponsoredSupplierIds.has(s.id) && (
                        <View style={[styles.tierBadge, { backgroundColor: '#FEF3C7' }]}>
                          <BadgeDollarSign size={11} color="#B45309" />
                          <Text style={[styles.tierBadgeText, { color: '#B45309' }]}>Sponsored</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { paddingTop: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: spacing.md },
  heroContent: { marginTop: spacing.xs },
  heroBack: { alignSelf: 'flex-start', padding: spacing.xxs, marginBottom: spacing.xs },
  heroTitle: { ...typography.pageTitle, fontSize: 26, color: '#FFF' },
  heroSubtitle: { ...typography.bodySmall, color: 'rgba(255,255,255,0.9)', marginTop: spacing.xxs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingBottom: spacing.sm },
  sortChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  sortChipText: { ...typography.label },
  searchInput: { flex: 1, ...typography.body, paddingVertical: spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.cardTitle, fontSize: 15, marginBottom: spacing.sm },
  chips: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, marginRight: spacing.xs },
  chipText: { ...typography.bodySmall },
  card: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  supplierCard: { padding: 0, marginBottom: spacing.sm },
  supplierCardTop: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingBottom: spacing.xs },
  supplierCardLogoWrap: { width: 52, height: 52, borderRadius: radius.md },
  supplierCardLogo: { width: 52, height: 52, borderRadius: radius.md },
  supplierCardBody: { flex: 1, marginLeft: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  cardTitle: { ...typography.cardTitle, flex: 1 },
  cardStar: { marginRight: spacing.xs },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm },
  tierBadgeText: { ...typography.overline },
  trustScore: { ...typography.caption, fontWeight: '600' },
  cardSub: { ...typography.caption, marginTop: spacing.xxs },
  empty: { padding: spacing.xxl, borderRadius: radius.lg, alignItems: 'center' },
  emptyText: { marginTop: spacing.sm, textAlign: 'center', ...typography.bodySmall },
  clearFiltersBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  clearFiltersBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  recentList: { paddingVertical: spacing.xxs, gap: spacing.sm },
  recentCard: {
    width: 150,
    marginRight: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recentCardImageWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  recentImage: { width: '100%', height: '100%' },
  recentCardContent: { padding: spacing.sm, paddingTop: spacing.xs },
  recentCardTitle: { ...typography.label, fontWeight: '600', lineHeight: 18 },
  recentImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  buyerLinksSection: { marginBottom: spacing.lg },
  buyerLinksSectionTitle: { ...typography.overline, marginBottom: spacing.sm, paddingHorizontal: 2 },
  buyerLinksRow: { flexDirection: 'row', gap: spacing.sm },
  buyerLinkCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  buyerLinkIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  buyerLinkTitle: { ...typography.label, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  buyerLinkSub: { ...typography.overline, textAlign: 'center', lineHeight: 14 },
  followedCard: { width: 180, marginRight: spacing.sm },
  myApplicationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  myApplicationText: { flex: 1 },
  myApplicationCta: { ...typography.bodySmall, fontWeight: '600' },
  supplierSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  viewModeGroup: { flexDirection: 'row', gap: spacing.xxs },
  viewModeBtn: { padding: spacing.xs, borderRadius: radius.sm },
  categoryFilterScroll: { marginHorizontal: -spacing.md, marginBottom: spacing.sm },
  categoryFilterContent: { paddingHorizontal: spacing.md, gap: spacing.xs },
  categoryFilterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, marginRight: spacing.xs },
  categoryFilterChipText: { ...typography.bodySmall, fontWeight: '600' },
  supplierList: { gap: spacing.sm },
  supplierCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  supplierListLogoWrap: { width: 48, height: 48, borderRadius: radius.md },
  supplierListLogo: { width: 48, height: 48, borderRadius: radius.md },
  supplierListBody: { flex: 1, marginLeft: spacing.sm },
});
