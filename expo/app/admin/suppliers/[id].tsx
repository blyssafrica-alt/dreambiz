import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Truck, CheckCircle, XCircle, PauseCircle, FileText, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { Linking } from 'react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert as RNAlert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

export default function AdminSupplierDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [acting, setActing] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState<{ id: string; document_type: string; file_url: string; file_name: string | null; verified_at: string | null }[]>([]);
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [verificationTier, setVerificationTier] = useState<string>('');
  const [featured, setFeatured] = useState(false);
  const [savingTier, setSavingTier] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase.from('supplier_marketplace_profiles').select('*').eq('id', id).single();
    if (!error && data) {
      setProfile(data);
      setAdminNotes(data.admin_notes || '');
      setVerificationTier(data.verification_tier || '');
      setFeatured(data.featured ?? false);
    }
    const { data: docs } = await supabase
      .from('supplier_verification_documents')
      .select('id, document_type, file_url, file_name, verified_at')
      .eq('supplier_profile_id', id)
      .order('created_at', { ascending: true });
    if (docs) setVerificationDocs(docs);
    setLoading(false);
  };

  const verifyDocument = async (docId: string) => {
    if (!user?.id) return;
    setVerifyingDocId(docId);
    try {
      const { error } = await supabase
        .from('supplier_verification_documents')
        .update({ verified_at: new Date().toISOString(), verified_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', docId);
      if (error) throw error;
      setVerificationDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, verified_at: new Date().toISOString() } : d)));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to verify document.');
    } finally {
      setVerifyingDocId(null);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const logAudit = async (action: string, details: Record<string, unknown>) => {
    if (!user?.id) return;
    await supabase.from('supplier_admin_audit_log').insert({
      admin_user_id: user.id,
      action,
      target_type: 'supplier_profile',
      target_id: id,
      details,
    });
  };

  const updateStatus = async (newStatus: string) => {
    if (!id || !profile) return;
    setActing(true);
    try {
      const { error } = await supabase
        .from('supplier_marketplace_profiles')
        .update({
          status: newStatus,
          admin_notes: adminNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await logAudit(`status_${newStatus}`, { previousStatus: profile.status, newStatus, adminNotes: adminNotes.trim() || null });

      if (profile.user_id) {
        const messages: Record<string, { title: string; message: string }> = {
          approved: { title: 'Supplier application approved', message: `Your supplier application for "${profile.business_name}" has been approved. You can now access your supplier dashboard.` },
          declined: { title: 'Supplier application declined', message: `Your supplier application for "${profile.business_name}" was declined. You can reapply from the marketplace.` },
          suspended: { title: 'Supplier account suspended', message: `Your supplier account "${profile.business_name}" has been suspended. Contact support if you have questions.` },
        };
        const msg = messages[newStatus];
        if (msg) {
          sendNotification({ title: msg.title, message: msg.message, userId: profile.user_id }).catch(() => {});
        }
      }

      setProfile((p: any) => (p ? { ...p, status: newStatus, admin_notes: adminNotes.trim() || null } : p));
      RNAlert.alert('Done', `Supplier application ${newStatus}.`);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update status.');
    } finally {
      setActing(false);
    }
  };

  const handleApprove = () => {
    RNAlert.alert('Approve supplier', 'Approve this supplier so they can access the supplier dashboard and list products?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => updateStatus('approved') },
    ]);
  };

  const handleDecline = () => {
    RNAlert.alert('Decline application', 'Decline this supplier application? They can reapply later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => updateStatus('declined') },
    ]);
  };

  const handleSuspend = () => {
    RNAlert.alert('Suspend supplier', 'Suspend this supplier? Their store will be hidden until you approve again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => updateStatus('suspended') },
    ]);
  };

  const saveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('supplier_marketplace_profiles')
        .update({ admin_notes: adminNotes.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setProfile((p: any) => (p ? { ...p, admin_notes: adminNotes.trim() || null } : p));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const VERIFICATION_TIERS = ['', 'basic', 'verified', 'premium', 'manufacturer', 'distributor'] as const;

  const saveVerificationAndFeatured = async () => {
    if (!id) return;
    setSavingTier(true);
    try {
      const tier = verificationTier === '' ? null : verificationTier;
      const { error } = await supabase
        .from('supplier_marketplace_profiles')
        .update({
          verification_tier: tier,
          featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await logAudit('update_verification_featured', { verification_tier: tier, featured });
      await supabase.rpc('refresh_supplier_profile_trust_score', { p_profile_id: id });
      setProfile((p: any) => (p ? { ...p, verification_tier: tier, featured } : p));
      load();
      RNAlert.alert('Saved', 'Verification tier and featured updated. Trust score refreshed.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save.');
    } finally {
      setSavingTier(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = profile.status === 'pending';
  const isApproved = profile.status === 'approved';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={profile.business_name}
        subtitle={profile.status}
        icon={Truck}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Email</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{profile.email || '—'}</Text>
          {profile.company_email && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Company email</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{profile.company_email}</Text>
            </>
          )}
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Phone</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{profile.phone || '—'}</Text>
          {profile.website && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Website</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{profile.website}</Text>
            </>
          )}
          {(profile.legal_name || profile.registration_number || profile.tax_id) && (
            <>
              {profile.legal_name && (
                <>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Legal name</Text>
                  <Text style={[styles.value, { color: theme.text.primary }]}>{profile.legal_name}</Text>
                </>
              )}
              {profile.registration_number && (
                <>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Registration number</Text>
                  <Text style={[styles.value, { color: theme.text.primary }]}>{profile.registration_number}</Text>
                </>
              )}
              {profile.tax_id && (
                <>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Tax ID / VAT</Text>
                  <Text style={[styles.value, { color: theme.text.primary }]}>{profile.tax_id}</Text>
                </>
              )}
            </>
          )}
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Location</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{[profile.city, profile.country].filter(Boolean).join(', ') || '—'}</Text>
          {profile.address && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Address</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{profile.address}</Text>
            </>
          )}
          {profile.description && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Description</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{profile.description}</Text>
            </>
          )}
        </View>

        {verificationDocs.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Verification documents</Text>
            {verificationDocs.map((doc) => (
              <View key={doc.id} style={[styles.docRow, { backgroundColor: theme.background.secondary }]}>
                <FileText size={20} color={theme.accent.primary} />
                <View style={styles.docBody}>
                  <Text style={[styles.value, { color: theme.text.primary }]}>{doc.document_type.replace(/_/g, ' ')}</Text>
                  {doc.file_name && <Text style={[styles.label, { color: theme.text.tertiary }]}>{doc.file_name}</Text>}
                </View>
                <TouchableOpacity onPress={() => doc.file_url && Linking.openURL(doc.file_url)} style={styles.docLink}>
                  <ExternalLink size={18} color={theme.accent.primary} />
                </TouchableOpacity>
                {doc.verified_at ? (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={16} color={theme.accent.success} />
                    <Text style={[styles.verifiedText, { color: theme.accent.success }]}>Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: theme.accent.success }]}
                    onPress={() => verifyDocument(doc.id)}
                    disabled={verifyingDocId === doc.id}
                  >
                    {verifyingDocId === doc.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallButtonText}>Verify</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Verification & ranking</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Verification tier</Text>
          <View style={styles.tierRow}>
            {VERIFICATION_TIERS.map((t) => (
              <TouchableOpacity
                key={t || 'none'}
                style={[styles.tierChip, { backgroundColor: verificationTier === t ? theme.accent.primary : theme.background.secondary }]}
                onPress={() => setVerificationTier(t)}
              >
                <Text style={[styles.tierChipText, { color: verificationTier === t ? '#FFF' : theme.text.secondary }]}>{t || 'None'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.featuredRow, { marginTop: 12 }]}>
            <Text style={[styles.value, { color: theme.text.primary }]}>Featured supplier</Text>
            <Switch value={featured} onValueChange={setFeatured} trackColor={{ false: theme.background.tertiary, true: theme.accent.primary }} thumbColor="#FFF" />
          </View>
          <TouchableOpacity style={[styles.smallButton, { backgroundColor: theme.accent.primary, marginTop: 12 }]} onPress={saveVerificationAndFeatured} disabled={savingTier}>
            {savingTier ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallButtonText}>Save & refresh trust score</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Admin notes</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
            placeholder="Internal notes (not visible to supplier)"
            placeholderTextColor={theme.text.tertiary}
            value={adminNotes}
            onChangeText={setAdminNotes}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={[styles.smallButton, { backgroundColor: theme.accent.primary }]} onPress={saveNotes} disabled={savingNotes}>
            {savingNotes ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallButtonText}>Save notes</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Actions</Text>
          {acting ? (
            <ActivityIndicator size="small" color={theme.accent.primary} style={styles.actionsRow} />
          ) : (
            <View style={styles.actionsRow}>
              {isPending && (
                <>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={handleApprove}>
                    <CheckCircle size={20} color="#065F46" />
                    <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={handleDecline}>
                    <XCircle size={20} color="#991B1B" />
                    <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Decline</Text>
                  </TouchableOpacity>
                </>
              )}
              {isApproved && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={handleSuspend}>
                  <PauseCircle size={20} color="#92400E" />
                  <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Suspend</Text>
                </TouchableOpacity>
              )}
              {(profile.status === 'declined' || profile.status === 'suspended') && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={handleApprove}>
                  <CheckCircle size={20} color="#065F46" />
                  <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Approve again</Text>
                </TouchableOpacity>
              )}
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
  label: { fontSize: 12, marginTop: 12, marginBottom: 2 },
  value: { fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  notesInput: { padding: 12, borderRadius: 10, minHeight: 80, textAlignVertical: 'top', fontSize: 15, marginBottom: 10 },
  smallButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  smallButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8 },
  docBody: { flex: 1, marginLeft: 10 },
  docLink: { padding: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 13, fontWeight: '600' },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tierChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  tierChipText: { fontSize: 14, fontWeight: '500' },
  featuredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
