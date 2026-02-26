import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText, CheckCircle, XCircle, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as RNAlert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUrl } from '@/lib/supabase';
import { normalizeSupplierAssetUrl } from '@/lib/storage-utils';
import { sendNotification } from '@/lib/notifications';
import type { SupplierApplicationPayload } from '@/hooks/useSupplierApplication';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export default function AdminSupplierApplicationDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [requestedFields, setRequestedFields] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error } = await supabase.from('supplier_applications').select('*').eq('id', id).single();
      if (!error && data) {
        setApp(data);
        setAdminNote(data.admin_note || '');
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    if (!id || !app) return;
    setActing(true);
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        admin_note: adminNote.trim() || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'needs_info') {
        updates.admin_requested_fields = requestedFields.trim() ? requestedFields.split(',').map((s) => s.trim()).filter(Boolean) : [];
      }
      const { error } = await supabase.from('supplier_applications').update(updates).eq('id', id);
      if (error) throw error;

      const messages: Record<string, { title: string; message: string }> = {
        approved: { title: 'Supplier application approved', message: `Your supplier application for "${app.display_name || 'your business'}" has been approved. You can now access your supplier dashboard.` },
        declined: { title: 'Supplier application declined', message: `Your supplier application was declined. ${adminNote.trim() ? `Reason: ${adminNote.trim()}` : 'Contact support if you have questions.'}` },
        needs_info: { title: 'More information needed', message: `We need more information for your supplier application. ${requestedFields.trim() ? `Please provide: ${requestedFields.trim()}. ` : ''}${adminNote.trim() ? adminNote.trim() : ''}` },
      };
      const msg = messages[newStatus];
      if (msg && app.owner_user_id) {
        sendNotification({ title: msg.title, message: msg.message, userId: app.owner_user_id }).catch(() => {});
      }

      setApp((a: any) => (a ? { ...a, status: newStatus } : a));
      RNAlert.alert('Done', `Application ${newStatus}.`);
      if (newStatus === 'approved') router.replace('/admin/suppliers' as any);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update.');
    } finally {
      setActing(false);
    }
  };

  const handleApprove = async () => {
    if (!app) return;
    if (app.status === 'approved' || app.status === 'declined') {
      RNAlert.alert('Already processed', 'This application has already been approved or declined.');
      return;
    }
    RNAlert.alert('Approve application', 'Create supplier profile and notify the applicant?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActing(true);
          try {
            const payload = (app.payload || {}) as SupplierApplicationPayload;
            const s1 = payload.step1 || {};
            const s3 = payload.step3 || {};
            const s4 = payload.step4 || {};
            const displayName = app.display_name || s1.display_name || 'Supplier';
            let slug = slugify(displayName);
            const { data: existingSlug } = await supabase.from('supplier_marketplace_profiles').select('id').eq('slug', slug).maybeSingle();
            if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

            const { data: insertedProfile, error: insertError } = await supabase.from('supplier_marketplace_profiles').insert({
              user_id: app.owner_user_id,
              business_name: displayName,
              slug,
              category_focus: null,
              country: s1.country || app.country,
              city: s1.city || app.city,
              region: null,
              address: s1.address || app.address,
              email: s3.email || app.email || '',
              phone: s3.phone || app.phone,
              whatsapp: s3.whatsapp || app.whatsapp,
              website: s3.website || app.website,
              company_email: s3.email,
              description: s4.about_description || null,
              logo_url: s4.logo_url || app.logo_url,
              cover_url: s4.cover_url || app.cover_url,
              status: 'approved',
            }).select('id').single();
            if (insertError) throw insertError;

            const docUrls = (payload.step5?.doc_urls || {}) as { company_registration?: string; proof_of_residence?: string };
            if (insertedProfile?.id && (docUrls.company_registration || docUrls.proof_of_residence)) {
              const docs: { supplier_profile_id: string; document_type: string; file_url: string; file_name: string | null }[] = [];
              if (docUrls.company_registration) docs.push({ supplier_profile_id: insertedProfile.id, document_type: 'company_registration', file_url: docUrls.company_registration, file_name: null });
              if (docUrls.proof_of_residence) docs.push({ supplier_profile_id: insertedProfile.id, document_type: 'proof_of_residence', file_url: docUrls.proof_of_residence, file_name: null });
              await supabase.from('supplier_verification_documents').insert(docs);
            }

            await supabase
              .from('supplier_applications')
              .update({ status: 'approved', admin_note: adminNote.trim() || null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq('id', id);

            if (app.owner_user_id) {
              sendNotification({
                title: 'Supplier application approved',
                message: `Your supplier application for "${displayName}" has been approved. You can now access your supplier dashboard.`,
                userId: app.owner_user_id,
              }).catch(() => {});
            }
            RNAlert.alert('Approved', 'Supplier profile created. Applicant has been notified.', [{ text: 'OK', onPress: () => router.replace('/admin/suppliers' as any) }]);
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || 'Failed to create profile.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const handleDecline = () => {
    RNAlert.alert('Decline application', 'The applicant will be notified. They can reapply later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => updateStatus('declined') },
    ]);
  };

  const handleNeedsInfo = () => {
    if (!requestedFields.trim() && !adminNote.trim()) {
      RNAlert.alert('Add details', 'Please enter which fields you need or add an admin note.');
      return;
    }
    updateStatus('needs_info');
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!app) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Application not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const payload = (app.payload || {}) as SupplierApplicationPayload;
  const s1 = payload.step1 || {};
  const s2 = payload.step2 || {};
  const s3 = payload.step3 || {};
  const s4 = payload.step4 || {};
  const s5 = payload.step5 || {};
  const logoUrl = s4.logo_url || app.logo_url;
  const coverUrl = s4.cover_url || app.cover_url;
  const docUrls = (s5?.doc_urls || app.doc_urls || {}) as { company_registration?: string; proof_of_residence?: string };
  const aboutDescription = s4.about_description ?? app.about_description ?? null;
  const address = s1.address ?? app.address ?? null;
  const registrationNumber = s1.registration_number ?? app.registration_number ?? null;
  const legalName = s1.legal_name ?? null;
  const taxId = s1.tax_id ?? null;
  const categoryKeywords = (s2.product_keywords as string[] | undefined)?.join(', ') ?? (app.product_keywords as string[] | undefined)?.join(', ') ?? null;

  const openUrl = (url: string | null | undefined) => {
    const raw = url && typeof url === 'string' ? url.trim() : '';
    if (!raw) return;
    const normalized = normalizeSupplierAssetUrl(raw, supabaseUrl) || raw;
    Linking.canOpenURL(normalized).then((ok) => { if (ok) Linking.openURL(normalized); });
  };
  const logoDisplayUrl = normalizeSupplierAssetUrl(logoUrl, supabaseUrl) || logoUrl;
  const coverDisplayUrl = normalizeSupplierAssetUrl(coverUrl, supabaseUrl) || coverUrl;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={app.display_name || 'Application'}
        subtitle={app.status}
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Applicant info</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Business name</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{app.display_name || s1.display_name || '—'}</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Email</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{app.email || s3.email || '—'}</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Phone</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{app.phone || s3.phone || '—'}</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Country / City</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{[app.country, app.city].filter(Boolean).join(', ') || '—'}</Text>
          {address ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Address</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{address}</Text>
            </>
          ) : null}
          {registrationNumber ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Registration number</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{registrationNumber}</Text>
            </>
          ) : null}
          {legalName ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Legal name</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{legalName}</Text>
            </>
          ) : null}
          {taxId ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Tax ID</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{taxId}</Text>
            </>
          ) : null}
          {categoryKeywords ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Category / products</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{categoryKeywords}</Text>
            </>
          ) : null}
          {aboutDescription ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>About / description</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{aboutDescription}</Text>
            </>
          ) : null}
        </View>

        {(logoUrl || coverUrl || docUrls?.company_registration || docUrls?.proof_of_residence) ? (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Attachments (logo, cover, documents)</Text>
            {(logoUrl || coverUrl) ? (
              <View style={styles.thumbRow}>
                {logoUrl ? (
                  <TouchableOpacity onPress={() => openUrl(logoUrl)} style={styles.thumbWrap}>
                    <Image source={{ uri: logoDisplayUrl || undefined }} style={styles.thumbImage} resizeMode="contain" />
                    <Text style={[styles.linkText, { color: theme.accent.primary, marginTop: 4 }]}>Logo</Text>
                  </TouchableOpacity>
                ) : null}
                {coverUrl ? (
                  <TouchableOpacity onPress={() => openUrl(coverUrl)} style={styles.thumbWrap}>
                    <Image source={{ uri: coverDisplayUrl || undefined }} style={styles.thumbImage} resizeMode="cover" />
                    <Text style={[styles.linkText, { color: theme.accent.primary, marginTop: 4 }]}>Cover</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {docUrls?.company_registration ? (
              <TouchableOpacity onPress={() => openUrl(docUrls.company_registration!)} style={styles.linkRow}>
                <Text style={[styles.linkText, { color: theme.accent.primary }]}>Company registration document</Text>
              </TouchableOpacity>
            ) : null}
            {docUrls?.proof_of_residence ? (
              <TouchableOpacity onPress={() => openUrl(docUrls.proof_of_residence!)} style={styles.linkRow}>
                <Text style={[styles.linkText, { color: theme.accent.primary }]}>Proof of residence</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Admin note</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
            placeholder="Internal note or message to applicant"
            placeholderTextColor={theme.text.tertiary}
            value={adminNote}
            onChangeText={setAdminNote}
            multiline
            numberOfLines={3}
          />
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Requested fields (for Needs info)</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
            placeholder="e.g. Registration document, Proof of address"
            placeholderTextColor={theme.text.tertiary}
            value={requestedFields}
            onChangeText={setRequestedFields}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Actions</Text>
          {acting ? (
            <ActivityIndicator size="small" color={theme.accent.primary} />
          ) : (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={handleApprove}>
                <CheckCircle size={20} color="#065F46" />
                <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={handleDecline}>
                <XCircle size={20} color="#991B1B" />
                <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={handleNeedsInfo}>
                <MessageCircle size={20} color="#92400E" />
                <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Request more info</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  label: { fontSize: 12, marginTop: 10, marginBottom: 2 },
  value: { fontSize: 15 },
  notesInput: { padding: 12, borderRadius: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 15, marginTop: 6 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
  linkRow: { paddingVertical: 8 },
  linkText: { fontSize: 15, textDecorationLine: 'underline' },
  thumbRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  thumbWrap: { flex: 1, alignItems: 'center' },
  thumbImage: { width: '100%', height: 80, borderRadius: 8, backgroundColor: '#eee' },
});
