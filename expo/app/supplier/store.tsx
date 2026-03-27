import { useRouter } from 'expo-router';
import { ArrowLeft, Store, Upload, X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as RNAlert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';

const BUCKET_SUPPLIER_ASSETS = 'supplier_assets';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export default function SupplierStoreScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [categoryFocus, setCategoryFocus] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  /** Local URI of just-picked image so it displays immediately (same pattern as Books cover) */
  const [logoLocalUri, setLogoLocalUri] = useState<string | null>(null);
  const [coverLocalUri, setCoverLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const [profileRes, catsRes] = await Promise.all([
        supabase.from('supplier_marketplace_profiles').select('*').eq('user_id', user.id).eq('status', 'approved').maybeSingle(),
        supabase.from('supplier_marketplace_categories').select('id, name').eq('is_active', true).order('display_order'),
      ]);
      const { data, error } = profileRes;
      if (error || !data) {
        setLoading(false);
        return;
      }
      if (catsRes.data) setCategories(catsRes.data as { id: string; name: string }[]);
      setProfileId(data.id);
      setBusinessName(data.business_name || '');
      setCategoryFocus(data.category_focus || '');
      setCountry(data.country || '');
      setCity(data.city || '');
      setRegion(data.region || '');
      setAddress(data.address || '');
      setEmail(data.email || '');
      setCompanyEmail(data.company_email || '');
      setPhone(data.phone || '');
      setWhatsapp(data.whatsapp || '');
      setWebsite(data.website || '');
      setDescription(data.description || '');
      setLogoUrl(data.logo_url || null);
      setCoverUrl(data.cover_url || null);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const pickImage = async (type: 'logo' | 'cover') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please allow access to your photos to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      // Show selected image immediately (same pattern as Books cover upload)
      if (type === 'logo') {
        setLogoLocalUri(asset.uri);
        setUploadingLogo(true);
      } else {
        setCoverLocalUri(asset.uri);
        setUploadingCover(true);
      }
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, type === 'logo' ? 'supplier-logo' : 'supplier-cover');
        const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${type === 'logo' ? 'logos' : 'covers'}/${Date.now()}-${fileName}`;
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const contentType = mimeMap[fileExt] || 'image/jpeg';
        const publicUrl = await uploadBase64ToStorage(supabase, {
          bucket: BUCKET_SUPPLIER_ASSETS,
          filePath,
          base64,
          contentType,
          upsert: false,
        });
        if (type === 'logo') {
          setLogoUrl(publicUrl);
          setLogoLocalUri(null);
          setUploadingLogo(false);
        } else {
          setCoverUrl(publicUrl);
          setCoverLocalUri(null);
          setUploadingCover(false);
        }
      } catch (e: any) {
        if (type === 'logo') {
          setUploadingLogo(false);
          setLogoLocalUri(null);
        } else {
          setUploadingCover(false);
          setCoverLocalUri(null);
        }
        RNAlert.alert('Upload failed', e?.message || 'Could not upload image.');
      }
    } catch (e: any) {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingCover(false);
      RNAlert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    const trimmedName = businessName.trim();
    const trimmedEmail = email.trim();
    if (!profileId) return;
    if (!trimmedName) {
      RNAlert.alert('Required', 'Please enter your business name.');
      return;
    }
    if (!trimmedEmail) {
      RNAlert.alert('Required', 'Please enter your email.');
      return;
    }
    setSaving(true);
    try {
      let slug = slugify(trimmedName);
      const { data: existing } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existing && existing.id !== profileId) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      const { error } = await supabase
        .from('supplier_marketplace_profiles')
        .update({
          business_name: trimmedName,
          slug,
          category_focus: categoryFocus.trim() || null,
          country: country.trim() || null,
          city: city.trim() || null,
          region: region.trim() || null,
          address: address.trim() || null,
          email: trimmedEmail,
          company_email: companyEmail.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          website: website.trim() || null,
          description: description.trim() || null,
          logo_url: logoUrl || null,
          cover_url: coverUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
        .eq('user_id', user!.id);
      if (error) throw error;
      RNAlert.alert('Saved', 'Your store profile has been updated.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
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
        <Text style={{ color: theme.text.secondary }}>No approved supplier profile found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="My Store"
        subtitle="Edit profile"
        icon={Store}
        iconGradient={['#0EA5E9', '#0284C7']}
        showLogo={false}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Branding</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Logo</Text>
          {(logoLocalUri || logoUrl) ? (
            <View style={styles.imageRow}>
              {logoLocalUri ? (
                <Image source={{ uri: logoLocalUri }} style={styles.logoThumb} resizeMode="contain" />
              ) : (
                <StorageImage uri={logoUrl} bucket="supplier" style={styles.logoThumb} resizeMode="contain" />
              )}
              <TouchableOpacity
                onPress={() => {
                  setLogoUrl(null);
                  setLogoLocalUri(null);
                }}
              >
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.uploadArea, { borderColor: theme.text.tertiary }]} onPress={() => pickImage('logo')} disabled={uploadingLogo}>
              {uploadingLogo ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Upload size={24} color={theme.accent.primary} /><Text style={[styles.uploadText, { color: theme.text.tertiary }]}>Add logo</Text></>}
            </TouchableOpacity>
          )}
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Cover image</Text>
          {(coverLocalUri || coverUrl) ? (
            <View style={styles.imageRow}>
              {coverLocalUri ? (
                <Image source={{ uri: coverLocalUri }} style={styles.coverThumb} resizeMode="cover" />
              ) : (
                <StorageImage uri={coverUrl} bucket="supplier" style={styles.coverThumb} resizeMode="cover" />
              )}
              <TouchableOpacity
                onPress={() => {
                  setCoverUrl(null);
                  setCoverLocalUri(null);
                }}
              >
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.uploadArea, { borderColor: theme.text.tertiary }]} onPress={() => pickImage('cover')} disabled={uploadingCover}>
              {uploadingCover ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Upload size={24} color={theme.accent.primary} /><Text style={[styles.uploadText, { color: theme.text.tertiary }]}>Add cover</Text></>}
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 20 }]}>Business</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Business name *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Business name" placeholderTextColor={theme.text.tertiary} value={businessName} onChangeText={setBusinessName} />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Category focus</Text>
          {categories.length > 0 ? (
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !categoryFocus && { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary }]}
                onPress={() => setCategoryFocus('')}
              >
                <Text style={[styles.chipText, { color: !categoryFocus ? '#FFF' : theme.text.secondary }]}>None</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, categoryFocus === c.name && { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary }]}
                  onPress={() => setCategoryFocus(c.name)}
                >
                  <Text style={[styles.chipText, { color: categoryFocus === c.name ? '#FFF' : theme.text.secondary }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="e.g. Electronics, Food" placeholderTextColor={theme.text.tertiary} value={categoryFocus} onChangeText={setCategoryFocus} />
          )}
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Description</Text>
          <TextInput style={[styles.input, styles.inputMultiline, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="About your business" placeholderTextColor={theme.text.tertiary} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

          <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 20 }]}>Location</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Country</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Country" placeholderTextColor={theme.text.tertiary} value={country} onChangeText={setCountry} />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>City</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="City" placeholderTextColor={theme.text.tertiary} value={city} onChangeText={setCity} />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Region / State</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Region or state" placeholderTextColor={theme.text.tertiary} value={region} onChangeText={setRegion} />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Address</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Street address" placeholderTextColor={theme.text.tertiary} value={address} onChangeText={setAddress} />

          <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 20 }]}>Contact</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Email *</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Email" placeholderTextColor={theme.text.tertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Phone</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Phone" placeholderTextColor={theme.text.tertiary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>WhatsApp</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="WhatsApp number" placeholderTextColor={theme.text.tertiary} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Company email</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="e.g. info@company.com" placeholderTextColor={theme.text.tertiary} value={companyEmail} onChangeText={setCompanyEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Website</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="https://yourcompany.com" placeholderTextColor={theme.text.tertiary} value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent.primary }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  card: { padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 12, fontWeight: '500' },
  input: { padding: 14, borderRadius: 12, fontSize: 15 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  logoThumb: { width: 80, height: 80, borderRadius: 8 },
  coverThumb: { height: 120, width: '100%', borderRadius: 8, maxWidth: 280 },
  uploadArea: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  uploadText: { marginTop: 8, fontSize: 14 },
  saveBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 14, fontWeight: '600' },
});
