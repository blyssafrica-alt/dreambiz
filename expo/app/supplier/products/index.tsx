import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, Copy, FileUp, Package, Pencil, Eye, EyeOff, CheckSquare, Square, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ProductRow = {
  id: string;
  name: string;
  status: string;
  price: number | null;
  currency: string;
  image_urls: string[];
  created_at: string;
};

export default function SupplierProductsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('supplier_marketplace_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle();
    if (!profile) {
      setLoading(false);
      return;
    }
    setProfileId(profile.id);

    const [productsRes, canPublishRes] = await Promise.all([
      supabase.from('supplier_marketplace_products').select('id, name, status, price, currency, image_urls, created_at').eq('supplier_profile_id', profile.id).order('created_at', { ascending: false }),
      supabase.rpc('supplier_can_publish', { profile_id: profile.id }),
    ]);

    if (productsRes.data) setProducts(productsRes.data as ProductRow[]);
    if (canPublishRes.data === true) setCanPublish(true);
    else setCanPublish(false);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handlePublish = async (productId: string) => {
    if (!profileId || !canPublish) {
      RNAlert.alert('Cannot publish', 'You need an active subscription with available product slots to publish.');
      return;
    }
    setActingId(productId);
    try {
      const { error } = await supabase.from('supplier_marketplace_products').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', productId).eq('supplier_profile_id', profileId);
      if (error) throw error;
      RNAlert.alert('Published', 'Product is now visible on your store.');
      load();
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to publish');
    } finally {
      setActingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const bulkSetStatus = async (newStatus: 'draft' | 'pending') => {
    if (!profileId || selectedIds.size === 0) return;
    setBulkActing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('supplier_marketplace_products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('supplier_profile_id', profileId)
        .in('id', ids);
      if (error) throw error;
      RNAlert.alert('Done', `${ids.length} product(s) updated.`);
      setSelectMode(false);
      setSelectedIds(new Set());
      load();
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setBulkActing(false);
    }
  };

  const handleDuplicate = async (productId: string) => {
    if (!profileId) return;
    setActingId(productId);
    try {
      const { data: orig, error: fetchErr } = await supabase
        .from('supplier_marketplace_products')
        .select('*')
        .eq('id', productId)
        .eq('supplier_profile_id', profileId)
        .single();
      if (fetchErr || !orig) throw fetchErr || new Error('Product not found');
      const { name, slug, short_description, description, price, currency, min_order_qty, availability_status, sku, unit_type, lead_time_days, price_type, subcategory_id, image_urls, tier_prices } = orig;
      const newName = (name || '').trim() + ' (Copy)';
      const newSlug = (slug || newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) + '-' + Date.now();
      const { error } = await supabase.from('supplier_marketplace_products').insert({
        supplier_profile_id: profileId,
        name: newName,
        slug: newSlug,
        short_description: short_description,
        description: description,
        price: price,
        currency: currency || 'USD',
        min_order_qty: min_order_qty ?? 1,
        availability_status: availability_status || 'in_stock',
        sku: sku,
        unit_type: unit_type || 'unit',
        lead_time_days: lead_time_days,
        price_type: price_type || 'fixed',
        subcategory_id: subcategory_id,
        image_urls: image_urls || [],
        tier_prices: tier_prices || [],
        status: 'draft',
      });
      if (error) throw error;
      RNAlert.alert('Duplicated', 'Product copied as draft.');
      load();
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to duplicate');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!profileId) return;
    RNAlert.alert('Delete product', `Permanently remove "${productName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActingId(productId);
          try {
            const { error } = await supabase.from('supplier_marketplace_products').delete().eq('id', productId).eq('supplier_profile_id', profileId);
            if (error) throw error;
            RNAlert.alert('Deleted', 'Product removed.');
            load();
          } catch (e: any) {
            const msg = e?.message || '';
            const isFkViolation = /foreign key|violates.*constraint|supplier_purchase_order/i.test(msg);
            RNAlert.alert(
              'Cannot delete',
              isFkViolation
                ? "This product can't be deleted because it appears in purchase orders. Unpublish it instead to hide it from your store."
                : msg || 'Failed to delete'
            );
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const handleUnpublish = async (productId: string) => {
    if (!profileId) return;
    RNAlert.alert('Unpublish', 'Hide this product from your store?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unpublish',
        onPress: async () => {
          setActingId(productId);
          try {
            const { error } = await supabase.from('supplier_marketplace_products').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', productId).eq('supplier_profile_id', profileId);
            if (error) throw error;
            load();
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || 'Failed to unpublish');
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!profileId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>No approved supplier profile.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="My Products"
        subtitle="Manage catalog"
        icon={Package}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/supplier/analytics' as any)}>
              <BarChart3 size={22} color={theme.accent.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/supplier/products/import' as any)}>
              <FileUp size={22} color={theme.accent.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); } else setSelectMode(true); }}>
              <CheckSquare size={22} color={selectMode ? theme.accent.primary : theme.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/supplier/products/new' as any)}>
              <Plus size={24} color={theme.accent.primary} />
            </TouchableOpacity>
          </View>
        }
      />
      {selectMode && products.length > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: theme.background.card, borderBottomColor: theme.border.medium }]}>
          <TouchableOpacity onPress={selectAll}>
            <Text style={[styles.bulkBarText, { color: theme.accent.primary }]}>{selectedIds.size === products.length ? 'Deselect all' : 'Select all'}</Text>
          </TouchableOpacity>
          <Text style={[styles.bulkBarCount, { color: theme.text.secondary }]}>{selectedIds.size} selected</Text>
          <View style={styles.bulkBarBtns}>
            <TouchableOpacity style={[styles.bulkBarBtn, { backgroundColor: theme.surface.info }]} onPress={() => bulkSetStatus('pending')} disabled={bulkActing || selectedIds.size === 0}>
              {bulkActing ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <Text style={[styles.bulkBarBtnText, { color: theme.accent.primary }]}>Submit for review</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bulkBarBtn, { backgroundColor: theme.background.secondary }]} onPress={() => bulkSetStatus('draft')} disabled={bulkActing || selectedIds.size === 0}>
              <Text style={[styles.bulkBarBtnText, { color: theme.text.primary }]}>Save as draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkBarBtn, { backgroundColor: theme.accent.danger ? theme.accent.danger + '20' : '#FEE2E2' }]}
              onPress={() => {
                if (selectedIds.size === 0) return;
                RNAlert.alert('Delete products', `Permanently remove ${selectedIds.size} product(s)? This cannot be undone.`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      setBulkActing(true);
                      try {
                        const ids = Array.from(selectedIds);
                        const { error } = await supabase.from('supplier_marketplace_products').delete().eq('supplier_profile_id', profileId!).in('id', ids);
                        if (error) throw error;
                        RNAlert.alert('Deleted', `${ids.length} product(s) removed.`);
                        setSelectMode(false);
                        setSelectedIds(new Set());
                        load();
                      } catch (e: any) {
                        const msg = e?.message || '';
                        const isFkViolation = /foreign key|violates.*constraint|supplier_purchase_order/i.test(msg);
                        RNAlert.alert(
                          'Cannot delete',
                          isFkViolation
                            ? "One or more products can't be deleted because they appear in purchase orders. Unpublish them instead to hide from your store."
                            : msg || 'Failed to delete'
                        );
                      } finally {
                        setBulkActing(false);
                      }
                    },
                  },
                ]);
              }}
              disabled={bulkActing || selectedIds.size === 0}
            >
              <View style={styles.bulkBarBtnInner}>
                <Trash2 size={16} color={theme.accent.danger || '#DC2626'} />
                <Text style={[styles.bulkBarBtnText, { color: theme.accent.danger || '#DC2626' }]}>Delete</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {products.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
            <Package size={56} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No products yet</Text>
            <Text style={[styles.emptySub, { color: theme.text.tertiary }]}>Add your first product to start selling in the marketplace.</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.push('/supplier/products/new' as any)}>
              <Plus size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Add product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          products.map((p) => {
            const firstImage = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null;
            const isPublished = p.status === 'published';
            const isDraft = p.status === 'draft';
            const acting = actingId === p.id;
            return (
              <View key={p.id} style={[styles.card, { backgroundColor: theme.background.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }]}>
                {selectMode && (
                  <TouchableOpacity style={styles.selectCheck} onPress={() => toggleSelect(p.id)}>
                    {selectedIds.has(p.id) ? <CheckSquare size={24} color={theme.accent.primary} fill={theme.accent.primary} /> : <Square size={24} color={theme.text.tertiary} />}
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cardMain} onPress={() => (selectMode ? toggleSelect(p.id) : router.push({ pathname: '/supplier/products/[id]', params: { id: p.id } } as any))}>
                  <View style={styles.thumbWrap}>
                    <StorageImage uri={firstImage} bucket="product" style={styles.thumb} resizeMode="cover" placeholderIcon="package" />
                    <View style={[styles.statusBadge, isPublished ? { backgroundColor: '#D1FAE5' } : isDraft ? { backgroundColor: '#F3F4F6' } : { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.statusBadgeText, isPublished ? { color: '#065F46' } : isDraft ? { color: '#4B5563' } : { color: '#92400E' }]}>{p.status}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                    <Text style={[styles.priceText, { color: theme.text.secondary }]}>{p.price != null ? `${p.currency} ${Number(p.price).toFixed(2)}` : 'No price set'}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.actions}>
                  {!selectMode && (
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.background.secondary }]} onPress={() => handleDuplicate(p.id)} disabled={acting}>
                      {acting && actingId === p.id ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <Copy size={18} color={theme.accent.primary} />}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.background.secondary }]} onPress={() => router.push({ pathname: '/supplier/products/[id]', params: { id: p.id } } as any)}>
                    <Pencil size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.accent.danger ? theme.accent.danger + '20' : '#FEE2E2' }]} onPress={() => handleDelete(p.id, p.name)} disabled={acting}>
                    {acting && actingId === p.id ? <ActivityIndicator size="small" color={theme.accent.danger || '#DC2626'} /> : <Trash2 size={18} color={theme.accent.danger || '#DC2626'} />}
                  </TouchableOpacity>
                  {isDraft && canPublish && (
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => handlePublish(p.id)} disabled={acting}>
                      {acting ? <ActivityIndicator size="small" color="#065F46" /> : <Eye size={18} color="#065F46" />}
                    </TouchableOpacity>
                  )}
                  {isPublished && (
                    <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleUnpublish(p.id)} disabled={acting}>
                      {acting ? <ActivityIndicator size="small" color="#991B1B" /> : <EyeOff size={18} color="#991B1B" />}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 14, borderRadius: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  statusBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  cardBody: { marginLeft: 14, flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  priceText: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  muted: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 20 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bulkBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderBottomWidth: 1 },
  bulkBarText: { fontSize: 14, fontWeight: '600' },
  bulkBarCount: { fontSize: 13, flex: 1 },
  bulkBarBtns: { flexDirection: 'row', gap: 8 },
  bulkBarBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  bulkBarBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulkBarBtnText: { fontSize: 13, fontWeight: '600' },
  selectCheck: { marginRight: 8, padding: 4 },
});
