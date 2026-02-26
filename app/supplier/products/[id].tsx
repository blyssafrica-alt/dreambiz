import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, DollarSign, Eye, EyeOff, Lightbulb, Package, Plus, Send, Sparkles, Trash2, Upload, X } from 'lucide-react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';

const AVAILABILITY_OPTIONS = ['in_stock', 'low_stock', 'out_of_stock', 'on_order'];
const STEPS = ['basics', 'pricing', 'details', 'media', 'submit'] as const;
type Step = (typeof STEPS)[number];

export default function SupplierProductEditScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [profileId, setProfileId] = useState<string | null>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [step, setStep] = useState<Step>('basics');
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [availabilityStatus, setAvailabilityStatus] = useState('in_stock');
  const [sku, setSku] = useState('');
  const [unitType, setUnitType] = useState('unit');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable'>('fixed');
  const [tierPrices, setTierPrices] = useState<{ minQty: string; price: string }[]>([]);
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; supplier_marketplace_categories: { name: string } | null }[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [status, setStatus] = useState<string>('draft');
  const [productFound, setProductFound] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  };
  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  const completionScore = (() => {
    let score = 0;
    if (name.trim()) score += 25;
    if (shortDescription.trim()) score += 10;
    if (description.trim()) score += 10;
    if (price.trim()) score += 15;
    if (imageUrls.length > 0) score += 20;
    if (subcategoryId) score += 10;
    if (imageUrls.length >= 2) score += 10;
    return Math.min(100, score);
  })();

  const suggestedSubcategory = (() => {
    const n = name.trim().toLowerCase();
    if (!n || subcategories.length === 0 || subcategoryId) return null;
    const match = subcategories.find((s) => s.name.toLowerCase().includes(n.split(' ')[0]) || n.includes(s.name.toLowerCase()));
    return match?.id ?? null;
  })();

  const canSubmit = name.trim().length > 0;
  const tips: string[] = [];

  const generateDescription = () => {
    const n = name.trim();
    if (!n) return;
    const words = n.split(/\s+/).filter((w) => w.length > 2);
    const short = words.length >= 3 ? `${words.slice(0, 4).join(' ')} – premium quality, bulk available.` : `${n} – high quality, wholesale pricing.`;
    const full = `${n}.\n\nHigh-quality product ideal for industrial and commercial use. We offer competitive wholesale pricing and flexible minimum order quantities. Contact us for custom requirements, volume discounts, and delivery options.`;
    setShortDescription((prev) => prev || short);
    setDescription((prev) => prev || full);
  };

  const suggestPrice = async () => {
    if (!profileId) return;
    setSuggestingPrice(true);
    try {
      let q = supabase
        .from('supplier_marketplace_products')
        .select('price')
        .eq('status', 'published')
        .not('price', 'is', null);
      if (subcategoryId) q = q.eq('subcategory_id', subcategoryId);
      else if (name.trim()) {
        const firstWord = name.trim().split(/\s+/)[0];
        if (firstWord.length >= 3) q = q.ilike('name', `%${firstWord}%`);
      }
      const { data } = await q.limit(20);
      if (data && data.length > 0) {
        const prices = data.map((r: any) => parseFloat(r.price)).filter((p) => !isNaN(p));
        if (prices.length > 0) {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          setPrice(avg.toFixed(2));
          RNAlert.alert('Price suggested', `Based on ${prices.length} similar product(s), average is ${currency} ${avg.toFixed(2)}`);
        }
      } else {
        RNAlert.alert('No data', 'No similar products found to suggest a price.');
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not fetch suggestions');
    } finally {
      setSuggestingPrice(false);
    }
  };
  if (!name.trim()) tips.push('Product name is required');
  if (imageUrls.length === 0) tips.push('Add at least one image – products with photos get 3× more views');
  if (imageUrls.length === 1) tips.push('Add more images – listings with 2+ photos convert better');
  if (!shortDescription.trim()) tips.push('A short description helps buyers decide quickly');
  if (!subcategoryId && subcategories.length > 0) tips.push('Choosing a category helps buyers find your product');

  useEffect(() => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }
    const load = async () => {
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
      const [canRes, subRes, productRes] = await Promise.all([
        supabase.rpc('supplier_can_publish', { profile_id: profile.id }),
        supabase.from('supplier_marketplace_subcategories').select('id, name, supplier_marketplace_categories(name)').eq('supplier_profile_id', profile.id).in('status', ['approved', 'pending']).order('name'),
        supabase
          .from('supplier_marketplace_products')
          .select('*')
          .eq('id', id)
          .eq('supplier_profile_id', profile.id)
          .single(),
      ]);
      setCanPublish(canRes.data === true);
      if (subRes.data) setSubcategories(subRes.data as any);
      const { data: product, error } = productRes;
      if (error || !product) {
        setProductFound(false);
        setLoading(false);
        return;
      }
      setProductFound(true);
      setName(product.name || '');
      setShortDescription(product.short_description || '');
      setDescription(product.description || '');
      setPrice(product.price != null ? String(product.price) : '');
      setCurrency(product.currency || 'USD');
      setMinOrderQty(String(product.min_order_qty ?? 1));
      setAvailabilityStatus(product.availability_status || 'in_stock');
      setSku(product.sku || '');
      setUnitType(product.unit_type || 'unit');
      setLeadTimeDays(product.lead_time_days != null ? String(product.lead_time_days) : '');
      setPriceType(product.price_type === 'negotiable' ? 'negotiable' : 'fixed');
      setSubcategoryId(product.subcategory_id || null);
      const tiers = product.tier_prices;
      setTierPrices(Array.isArray(tiers) && tiers.length > 0 ? tiers.map((t: { min_qty?: number; price?: number }) => ({ minQty: String(t.min_qty ?? ''), price: String(t.price ?? '') })) : []);
      const specs = product.specifications;
      setSpecifications(Array.isArray(specs) && specs.length > 0 ? specs.map((s: { key?: string; value?: string }) => ({ key: s.key ?? '', value: s.value ?? '' })) : []);
      setImageUrls(Array.isArray(product.image_urls) ? product.image_urls : []);
      setStatus(product.status || 'draft');
      setLoading(false);
    };
    load();
  }, [user?.id, id]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please grant camera roll access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, 'supplier-product');
        const filePath = `supplier_products/${fileName}`;
        let contentType = 'image/jpeg';
        if (asset.mimeType) {
          const mimeTypes = asset.mimeType.split(',').map((m) => m.trim());
          const imageMime = mimeTypes.find((m) => m.startsWith('image/'));
          if (imageMime) contentType = imageMime;
        }
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        if (!contentType || contentType === 'image/jpeg') contentType = mimeMap[ext] || 'image/jpeg';
        const url = await uploadBase64ToStorage(supabase, { bucket: 'product_images', filePath, base64, contentType, upsert: false });
        setImageUrls((prev) => (prev.length < 6 ? [...prev, url] : prev));
      } catch (e: any) {
        RNAlert.alert('Upload Error', e?.message || 'Failed to upload');
      } finally {
        setUploading(false);
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const runAutosave = useCallback(async () => {
    if (!profileId || !id || !name.trim() || saving) return;
    setAutosaveStatus('saving');
    try {
      const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const payload = {
        name: name.trim(),
        slug,
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        price: price.trim() ? parseFloat(price) : null,
        currency: currency.trim() || 'USD',
        min_order_qty: Math.max(1, parseInt(minOrderQty, 10) || 1),
        availability_status: availabilityStatus,
        sku: sku.trim() || null,
        unit_type: unitType.trim() || 'unit',
        lead_time_days: leadTimeDays.trim() ? parseInt(leadTimeDays, 10) : null,
        price_type: priceType,
        subcategory_id: subcategoryId || null,
        tier_prices: tierPrices
          .filter((t) => t.minQty.trim() && t.price.trim())
          .map((t) => ({ min_qty: parseInt(t.minQty, 10) || 0, price: parseFloat(t.price) || 0 }))
          .filter((t) => t.min_qty > 0 && t.price >= 0)
          .sort((a, b) => a.min_qty - b.min_qty),
        specifications: specifications
          .filter((s) => s.key.trim() && s.value.trim())
          .map((s) => ({ key: s.key.trim(), value: s.value.trim() })),
        image_urls: imageUrls,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('supplier_marketplace_products')
        .update(payload)
        .eq('id', id)
        .eq('supplier_profile_id', profileId);
      if (error) throw error;
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    } catch {
      setAutosaveStatus('idle');
    }
  }, [profileId, id, name, shortDescription, description, price, currency, minOrderQty, availabilityStatus, sku, unitType, leadTimeDays, priceType, subcategoryId, tierPrices, specifications, imageUrls, saving]);

  useEffect(() => {
    if (!profileId || !id || loading || saving) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      runAutosave();
      autosaveTimeoutRef.current = null;
    }, 2500);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [profileId, id, loading, saving, name, shortDescription, description, price, currency, minOrderQty, availabilityStatus, sku, unitType, leadTimeDays, priceType, subcategoryId, JSON.stringify(tierPrices), JSON.stringify(specifications), JSON.stringify(imageUrls), runAutosave]);

  const save = async (targetStatus?: 'draft' | 'pending' | 'published') => {
    if (!profileId || !id || !name.trim()) {
      RNAlert.alert('Required', 'Product name is required.');
      return;
    }
    const newStatus = targetStatus ?? status;
    if (newStatus === 'published' && !canPublish) {
      RNAlert.alert('Cannot publish', 'You need an active subscription with available product slots.');
      return;
    }
    setSaving(true);
    try {
      const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const payload: Record<string, unknown> = {
        name: name.trim(),
        slug,
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        price: price.trim() ? parseFloat(price) : null,
        currency: currency.trim() || 'USD',
        min_order_qty: Math.max(1, parseInt(minOrderQty, 10) || 1),
        availability_status: availabilityStatus,
        sku: sku.trim() || null,
        unit_type: unitType.trim() || 'unit',
        lead_time_days: leadTimeDays.trim() ? parseInt(leadTimeDays, 10) : null,
        price_type: priceType,
        subcategory_id: subcategoryId || null,
        tier_prices: tierPrices
          .filter((t) => t.minQty.trim() && t.price.trim())
          .map((t) => ({ min_qty: parseInt(t.minQty, 10) || 0, price: parseFloat(t.price) || 0 }))
          .filter((t) => t.min_qty > 0 && t.price >= 0)
          .sort((a, b) => a.min_qty - b.min_qty),
        specifications: specifications
          .filter((s) => s.key.trim() && s.value.trim())
          .map((s) => ({ key: s.key.trim(), value: s.value.trim() })),
        image_urls: imageUrls,
        updated_at: new Date().toISOString(),
      };
      if (targetStatus !== undefined) payload.status = targetStatus;
      const { error } = await supabase
        .from('supplier_marketplace_products')
        .update(payload)
        .eq('id', id)
        .eq('supplier_profile_id', profileId);
      if (error) throw error;
      if (targetStatus !== undefined) setStatus(targetStatus);
      const msg = targetStatus === 'draft' ? 'Product saved as draft.' : targetStatus === 'pending' ? 'Product submitted for admin review.' : targetStatus === 'published' ? 'Product published.' : 'Product updated.';
      RNAlert.alert('Saved', msg);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setPublishStatus = async (newStatus: 'published' | 'draft') => {
    if (!profileId || !id) return;
    if (newStatus === 'published' && !canPublish) {
      RNAlert.alert('Cannot publish', 'You need an active subscription with available product slots.');
      return;
    }
    setActing(true);
    try {
      const { error } = await supabase
        .from('supplier_marketplace_products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('supplier_profile_id', profileId);
      if (error) throw error;
      setStatus(newStatus);
      RNAlert.alert(newStatus === 'published' ? 'Published' : 'Unpublished', newStatus === 'published' ? 'Product is visible on your store.' : 'Product is now a draft.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update status');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!id) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Product not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
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
  if (!productFound) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Product not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPublished = status === 'published';
  const isDraft = status === 'draft';
  const isRejected = status === 'rejected';

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="Edit Product"
        subtitle={status}
        icon={Package}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={() => router.push('/supplier/analytics' as any)}>
            <BarChart3 size={22} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.stepTabs, { borderBottomColor: theme.border.medium }]}>
        {STEPS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.stepTab, step === s && { borderBottomColor: theme.accent.primary, borderBottomWidth: 2 }]}
            onPress={() => setStep(s)}
          >
            <Text style={[styles.stepTabLabel, { color: step === s ? theme.accent.primary : theme.text.tertiary }]}>
              {s === 'basics' && 'Basics'}
              {s === 'pricing' && 'Pricing'}
              {s === 'details' && 'Details'}
              {s === 'media' && 'Media'}
              {s === 'submit' && 'Review'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.stepIndicatorRow}>
        <Text style={[styles.stepIndicator, { color: theme.text.tertiary }]}>Step {stepIndex + 1} of {STEPS.length}</Text>
        {autosaveStatus === 'saving' && <Text style={[styles.autosaveLabel, { color: theme.text.tertiary }]}>Saving...</Text>}
        {autosaveStatus === 'saved' && <Text style={[styles.autosaveLabel, { color: theme.accent.primary }]}>Saved</Text>}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          {step === 'basics' && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Category</Text>
              {subcategories.length === 0 ? (
                <Text style={[styles.helperText, { color: theme.text.tertiary }]}>Add subcategories in Products → Subcategories first.</Text>
              ) : (
                <>
                  {suggestedSubcategory && (
                    <TouchableOpacity style={[styles.suggestChip, { backgroundColor: theme.surface.info }]} onPress={() => setSubcategoryId(suggestedSubcategory)}>
                      <Lightbulb size={14} color={theme.accent.primary} />
                      <Text style={[styles.suggestChipText, { color: theme.accent.primary }]}>Suggested: {subcategories.find((s) => s.id === suggestedSubcategory)?.name}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, !subcategoryId && { backgroundColor: theme.accent.primary }]} onPress={() => setSubcategoryId(null)}>
                    <Text style={[styles.chipText, { color: !subcategoryId ? '#FFF' : theme.text.secondary }]}>None</Text>
                  </TouchableOpacity>
                  {subcategories.map((s) => (
                    <TouchableOpacity key={s.id} style={[styles.chip, subcategoryId === s.id && { backgroundColor: theme.accent.primary }]} onPress={() => setSubcategoryId(s.id)}>
                      <Text style={[styles.chipText, { color: subcategoryId === s.id ? '#FFF' : theme.text.secondary }]} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                </>
              )}
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
              <Text style={[styles.hintText, { color: theme.text.tertiary }]}>Clear, descriptive names get more views</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Product name" placeholderTextColor={theme.text.tertiary} value={name} onChangeText={setName} />
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Short description</Text>
              <TextInput style={[styles.input, styles.inputMultiline, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Brief summary" placeholderTextColor={theme.text.tertiary} value={shortDescription} onChangeText={setShortDescription} multiline numberOfLines={2} />
              <TouchableOpacity style={[styles.assistBtn, { backgroundColor: theme.surface.info, marginTop: 6 }]} onPress={generateDescription} disabled={!name.trim()}>
                <Sparkles size={16} color={theme.accent.primary} />
                <Text style={[styles.assistBtnText, { color: theme.accent.primary }]}>Generate description from name</Text>
              </TouchableOpacity>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Description</Text>
              <TextInput style={[styles.input, styles.inputMultiline, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Full description" placeholderTextColor={theme.text.tertiary} value={description} onChangeText={setDescription} multiline numberOfLines={4} />
            </>
          )}

          {step === 'pricing' && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Price</Text>
              <TouchableOpacity style={[styles.assistBtn, styles.assistBtnInline, { backgroundColor: theme.surface.info }]} onPress={suggestPrice} disabled={suggestingPrice}>
                {suggestingPrice ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Sparkles size={16} color={theme.accent.primary} /><Text style={[styles.assistBtnText, { color: theme.accent.primary }]}>Suggest from similar products</Text></>}
              </TouchableOpacity>
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.inputPrice, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="0.00" placeholderTextColor={theme.text.tertiary} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
                <TextInput style={[styles.input, styles.inputCurrency, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="USD" value={currency} onChangeText={setCurrency} />
              </View>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Price type</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, priceType === 'fixed' && { backgroundColor: theme.accent.primary }]} onPress={() => setPriceType('fixed')}>
                  <Text style={[styles.chipText, { color: priceType === 'fixed' ? '#FFF' : theme.text.secondary }]}>Fixed</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, priceType === 'negotiable' && { backgroundColor: theme.accent.primary }]} onPress={() => setPriceType('negotiable')}>
                  <Text style={[styles.chipText, { color: priceType === 'negotiable' ? '#FFF' : theme.text.secondary }]}>Negotiable</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Min order qty</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="1" value={minOrderQty} onChangeText={setMinOrderQty} keyboardType="number-pad" />
              <Text style={[styles.label, { color: theme.text.tertiary, marginTop: 16 }]}>Volume pricing (optional)</Text>
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>Price breaks by quantity</Text>
              {tierPrices.map((t, i) => (
                <View key={i} style={[styles.tierRow, { backgroundColor: theme.background.secondary }]}>
                  <TextInput style={[styles.input, styles.tierQty, { backgroundColor: theme.background.primary, color: theme.text.primary }]} placeholder="Qty" value={t.minQty} onChangeText={(v) => setTierPrices((p) => p.map((x, j) => (j === i ? { ...x, minQty: v } : x)))} keyboardType="number-pad" />
                  <TextInput style={[styles.input, styles.tierPrice, { backgroundColor: theme.background.primary, color: theme.text.primary }]} placeholder="Price" value={t.price} onChangeText={(v) => setTierPrices((p) => p.map((x, j) => (j === i ? { ...x, price: v } : x)))} keyboardType="decimal-pad" />
                  <TouchableOpacity onPress={() => setTierPrices((p) => p.filter((_, j) => j !== i))}>
                    <Trash2 size={20} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.addTierBtn, { borderColor: theme.border.medium }]} onPress={() => setTierPrices((p) => [...p, { minQty: '', price: '' }])}>
                <Plus size={18} color={theme.accent.primary} />
                <Text style={[styles.addTierBtnText, { color: theme.accent.primary }]}>Add price tier</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'details' && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>SKU (optional)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="e.g. SKU-001" placeholderTextColor={theme.text.tertiary} value={sku} onChangeText={setSku} />
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Unit type</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="unit, kg, box" placeholderTextColor={theme.text.tertiary} value={unitType} onChangeText={setUnitType} />
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Lead time (days, optional)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="e.g. 7" placeholderTextColor={theme.text.tertiary} value={leadTimeDays} onChangeText={setLeadTimeDays} keyboardType="number-pad" />
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Availability</Text>
              <View style={styles.chipRow}>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[styles.chip, availabilityStatus === opt && { backgroundColor: theme.accent.primary }]} onPress={() => setAvailabilityStatus(opt)}>
                    <Text style={[styles.chipText, { color: availabilityStatus === opt ? '#FFF' : theme.text.secondary }]}>{opt.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: theme.text.tertiary, marginTop: 16 }]}>Specifications (optional)</Text>
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>Add key-value pairs: Material, Weight, Size, Color, etc.</Text>
              {specifications.map((s, i) => (
                <View key={i} style={[styles.tierRow, { backgroundColor: theme.background.secondary }]}>
                  <TextInput style={[styles.input, styles.tierQty, { backgroundColor: theme.background.primary, color: theme.text.primary }]} placeholder="Key" value={s.key} onChangeText={(v) => setSpecifications((p) => p.map((x, j) => (j === i ? { ...x, key: v } : x)))} />
                  <TextInput style={[styles.input, styles.tierPrice, { backgroundColor: theme.background.primary, color: theme.text.primary }]} placeholder="Value" value={s.value} onChangeText={(v) => setSpecifications((p) => p.map((x, j) => (j === i ? { ...x, value: v } : x)))} />
                  <TouchableOpacity onPress={() => setSpecifications((p) => p.filter((_, j) => j !== i))}>
                    <Trash2 size={20} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.addTierBtn, { borderColor: theme.border.medium }]} onPress={() => setSpecifications((p) => [...p, { key: '', value: '' }])}>
                <Plus size={18} color={theme.accent.primary} />
                <Text style={[styles.addTierBtnText, { color: theme.accent.primary }]}>Add specification</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'media' && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Product images (up to 6)</Text>
              <View style={styles.imageGrid}>
                {imageUrls.map((url, i) => (
                  <View key={i} style={styles.imageWrap}>
                    <StorageImage uri={url} bucket="product" style={styles.thumb} resizeMode="cover" placeholderIcon="package" />
                    <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImageUrls((p) => p.filter((_, j) => j !== i))}>
                      <X size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUrls.length < 6 && (
                  <TouchableOpacity style={[styles.uploadArea, styles.uploadAreaSmall, { borderColor: theme.text.tertiary }]} onPress={pickImage} disabled={uploading}>
                    {uploading ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Upload size={22} color={theme.accent.primary} /><Text style={[styles.uploadText, { color: theme.text.tertiary, fontSize: 12 }]}>Add</Text></>}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {step === 'submit' && (
            <View style={styles.reviewSection}>
              <View style={[styles.progressBarBg, { backgroundColor: theme.background.secondary }]}>
                <View style={[styles.progressBarFill, { width: `${completionScore}%`, backgroundColor: theme.accent.primary }]} />
              </View>
              <Text style={[styles.progressLabel, { color: theme.text.tertiary }]}>{completionScore}% complete</Text>
              <Text style={[styles.reviewTitle, { color: theme.text.primary }]}>Review your product</Text>
              <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>Category: {subcategories.find((s) => s.id === subcategoryId)?.name ?? 'None'}</Text>
              <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>Name: {name || '—'}</Text>
              <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>Price: {price ? `${currency} ${price}` : '—'}</Text>
              {tierPrices.filter((t) => t.minQty && t.price).length > 0 && (
                <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>Tiers: {tierPrices.filter((t) => t.minQty && t.price).map((t) => `${t.minQty}+ @ ${t.price}`).join(', ')}</Text>
              )}
              <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>MOQ: {minOrderQty}</Text>
              <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>Status: {status}</Text>
              {specifications.filter((s) => s.key.trim() && s.value.trim()).length > 0 && (
                <Text style={[styles.reviewRow, { color: theme.text.secondary }]}>Specs: {specifications.filter((s) => s.key.trim() && s.value.trim()).map((s) => `${s.key}: ${s.value}`).join(', ')}</Text>
              )}
              {imageUrls.length > 0 && (
                <View style={styles.reviewImageGrid}>
                  {imageUrls.slice(0, 3).map((url, i) => (
                    <StorageImage key={i} uri={url} bucket="product" style={styles.thumb} resizeMode="cover" placeholderIcon="package" />
                  ))}
                </View>
              )}
              {tips.length > 0 && (
                <View style={[styles.tipsBox, { backgroundColor: theme.surface.info + '30', borderColor: theme.accent.primary + '40' }]}>
                  <Text style={[styles.tipsTitle, { color: theme.text.primary }]}>Tips to improve</Text>
                  {tips.map((t, i) => (
                    <Text key={i} style={[styles.tipItem, { color: theme.text.secondary }]}>• {t}</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border.medium }]}>
        <View style={styles.footerRow}>
          {stepIndex > 0 ? (
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: theme.background.secondary }]} onPress={goBack}>
              <ChevronLeft size={18} color={theme.text.primary} />
              <Text style={[styles.footerBtnText, { color: theme.text.primary }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerBtn} />
          )}
          {stepIndex < STEPS.length - 1 ? (
            <TouchableOpacity style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: theme.accent.primary }]} onPress={goNext}>
              <Text style={[styles.footerBtnText, { color: '#FFF' }]}>Next</Text>
              <ChevronRight size={18} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.submitButtons}>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.accent.primary }]} onPress={() => save()} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.submitBtnText, { color: '#FFF' }]}>Save changes</Text>}
              </TouchableOpacity>
              {(isDraft || isRejected) && (
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#3B82F6' }]} onPress={() => save('pending')} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <><Send size={18} color="#FFF" /><Text style={[styles.submitBtnText, { color: '#FFF' }]}>Submit for review</Text></>}
                </TouchableOpacity>
              )}
              {isDraft && canPublish && (
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => setPublishStatus('published')} disabled={acting}>
                  {acting ? <ActivityIndicator size="small" color="#065F46" /> : <><Eye size={18} color="#065F46" /><Text style={[styles.submitBtnText, { color: '#065F46' }]}>Publish now</Text></>}
                </TouchableOpacity>
              )}
              {isPublished && (
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => setPublishStatus('draft')} disabled={acting}>
                  {acting ? <ActivityIndicator size="small" color="#991B1B" /> : <><EyeOff size={18} color="#991B1B" /><Text style={[styles.submitBtnText, { color: '#991B1B' }]}>Unpublish</Text></>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stepTabs: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  stepTab: { paddingVertical: 12, paddingHorizontal: 12, marginRight: 4 },
  stepTabLabel: { fontSize: 14, fontWeight: '500' },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  stepIndicator: { fontSize: 12, color: '#6B7280' },
  autosaveLabel: { fontSize: 12, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 12 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  inputPrice: { flex: 1 },
  inputCurrency: { width: 70, marginLeft: 8 },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  uploadArea: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  uploadText: { marginTop: 8 },
  helperText: { fontSize: 12, marginBottom: 8 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, marginTop: 6 },
  tierQty: { width: 70, marginBottom: 0 },
  tierPrice: { flex: 1, marginBottom: 0 },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginTop: 8, borderWidth: 1, borderRadius: 8 },
  addTierBtnText: { fontSize: 14, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  imageWrap: { position: 'relative' },
  removeImgBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 },
  uploadAreaSmall: { width: 80, height: 80, padding: 8 },
  reviewImageGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  suggestChipText: { fontSize: 13, fontWeight: '600' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 12, marginBottom: 12 },
  tipsBox: { marginTop: 16, padding: 12, borderRadius: 10, borderWidth: 1 },
  tipsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  tipItem: { fontSize: 12, marginBottom: 2 },
  hintText: { fontSize: 11, marginBottom: 4, fontStyle: 'italic' },
  assistBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  assistBtnInline: { marginBottom: 8 },
  assistBtnText: { fontSize: 13, fontWeight: '600' },
  reviewSection: { paddingVertical: 8 },
  reviewTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  reviewRow: { fontSize: 14, marginBottom: 6 },
  reviewImage: { marginTop: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  footerBtnPrimary: { flex: 1 },
  footerBtnText: { fontSize: 16, fontWeight: '600' },
  submitButtons: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  submitBtnText: { fontWeight: '600', fontSize: 15 },
});
