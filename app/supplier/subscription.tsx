import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, CheckCircle, Upload, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  Image,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  product_limit: number;
  ads_allowed: boolean;
  featured_allowed: boolean;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  start_date: string | null;
  expires_at: string | null;
  trial_ends_at?: string | null;
  discount_ends_at?: string | null;
  base_price?: number | null;
  final_price?: number | null;
  proof_of_payment_url: string | null;
  payment_reference: string | null;
  verified_at: string | null;
  created_at: string;
  plan?: Plan;
};

export default function SupplierSubscriptionScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

    const [plansRes, subsRes] = await Promise.all([
      supabase.from('supplier_subscription_plans').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      supabase.from('supplier_subscriptions').select('*, supplier_subscription_plans(*)').eq('supplier_profile_id', profile.id).order('created_at', { ascending: false }),
    ]);

    if (plansRes.data) {
      setPlans(
        plansRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          price: parseFloat(r.price),
          currency: r.currency || 'USD',
          duration_days: r.duration_days,
          product_limit: r.product_limit,
          ads_allowed: r.ads_allowed ?? false,
          featured_allowed: r.featured_allowed ?? false,
        }))
      );
    }
    if (subsRes.data) {
      setSubscriptions(
        subsRes.data.map((s: any) => ({
          ...s,
          plan: s.supplier_subscription_plans
            ? {
                id: s.supplier_subscription_plans.id,
                name: s.supplier_subscription_plans.name,
                description: s.supplier_subscription_plans.description,
                price: parseFloat(s.supplier_subscription_plans.price),
                currency: s.supplier_subscription_plans.currency || 'USD',
                duration_days: s.supplier_subscription_plans.duration_days,
                product_limit: s.supplier_subscription_plans.product_limit,
                ads_allowed: s.supplier_subscription_plans.ads_allowed ?? false,
                featured_allowed: s.supplier_subscription_plans.featured_allowed ?? false,
              }
            : undefined,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const activeSubscription = subscriptions.find((s) => {
    if (s.status !== 'active' && s.status !== 'trial') return false;
    if (s.status === 'trial' && s.trial_ends_at) {
      return new Date(s.trial_ends_at) > new Date();
    }
    return s.expires_at ? new Date(s.expires_at) > new Date() : true;
  });
  const pendingSubscription = subscriptions.find((s) => s.status === 'pending_payment');

  const handlePickProof = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please grant camera roll access to upload proof of payment');
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
      setUploadingProof(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, 'supplier-sub-proof');
        const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `supplier_subscription_proofs/${fileName}`;
        let contentType = 'image/jpeg';
        if (asset.mimeType) {
          const mimeTypes = asset.mimeType.split(',').map((m) => m.trim());
          const imageMime = mimeTypes.find((m) => m.startsWith('image/'));
          if (imageMime) contentType = imageMime;
        }
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
          gif: 'image/gif',
        };
        if (!contentType || contentType === 'image/jpeg') contentType = mimeMap[fileExt] || 'image/jpeg';
        const publicUrl = await uploadBase64ToStorage(supabase, {
          bucket: 'payment_proofs',
          filePath,
          base64,
          contentType,
          upsert: false,
        });
        setProofUrl(publicUrl);
      } catch (e: any) {
        RNAlert.alert('Upload Error', e?.message || 'Failed to upload proof');
      } finally {
        setUploadingProof(false);
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!profileId || !selectedPlan) return;
    if (!proofUrl) {
      RNAlert.alert('Proof Required', 'Please upload proof of payment');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('supplier_subscriptions').insert({
        supplier_profile_id: profileId,
        plan_id: selectedPlan.id,
        status: 'pending_payment',
        proof_of_payment_url: proofUrl,
        payment_reference: paymentReference.trim() || null,
      });
      if (error) throw error;
      RNAlert.alert('Submitted', 'Your subscription request has been submitted. An admin will verify your payment and activate your plan.');
      setSelectedPlan(null);
      setProofUrl(null);
      setPaymentReference('');
      load();
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
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
        title="Supplier Subscription"
        subtitle="Plan & payment"
        icon={CreditCard}
        iconGradient={['#F59E0B', '#D97706']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeSubscription && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <View style={styles.row}>
              <CheckCircle size={24} color="#059669" />
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Current plan</Text>
            </View>
            <Text style={[styles.planName, { color: theme.text.primary }]}>{activeSubscription.plan?.name ?? 'Plan'}</Text>
            {activeSubscription.status === 'trial' && activeSubscription.trial_ends_at && (
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>
                Free trial until {new Date(activeSubscription.trial_ends_at).toLocaleDateString()}
              </Text>
            )}
            {activeSubscription.discount_ends_at && (
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>
                Promotional discount until {new Date(activeSubscription.discount_ends_at).toLocaleDateString()}
              </Text>
            )}
            {activeSubscription.expires_at && (
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>
                Plan expires {new Date(activeSubscription.expires_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {pendingSubscription && !activeSubscription && (
          <View style={[styles.card, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.cardTitle, { color: '#92400E' }]}>Pending verification</Text>
            <Text style={{ color: '#92400E', fontSize: 14 }}>Your payment proof has been submitted. An admin will verify and activate your plan soon.</Text>
          </View>
        )}

        {!activeSubscription && !pendingSubscription && plans.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Choose a plan</Text>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planRow,
                  { backgroundColor: theme.background.secondary },
                  selectedPlan?.id === plan.id && { borderColor: theme.accent.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedPlan(plan)}
              >
                <View>
                  <Text style={[styles.planName, { color: theme.text.primary }]}>{plan.name}</Text>
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>
                    {plan.currency} {plan.price} · {plan.duration_days} days · up to {plan.product_limit} products
                  </Text>
                </View>
                {selectedPlan?.id === plan.id && <CheckCircle size={22} color={theme.accent.primary} />}
              </TouchableOpacity>
            ))}

            {selectedPlan && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 16 }]}>Payment proof</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="Payment reference (optional)"
                  placeholderTextColor={theme.text.tertiary}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                />
                {proofUrl ? (
                  <View style={styles.proofRow}>
                    <Image source={{ uri: proofUrl }} style={styles.proofThumb} />
                    <TouchableOpacity onPress={() => setProofUrl(null)}>
                      <X size={24} color={theme.text.secondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: theme.background.secondary, borderColor: theme.text.tertiary }]}
                    onPress={handlePickProof}
                    disabled={uploadingProof}
                  >
                    {uploadingProof ? (
                      <ActivityIndicator size="small" color={theme.accent.primary} />
                    ) : (
                      <>
                        <Upload size={20} color={theme.accent.primary} />
                        <Text style={[styles.uploadBtnText, { color: theme.text.primary }]}>Upload proof of payment</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: theme.accent.primary }]}
                  onPress={handleSubmit}
                  disabled={!proofUrl || submitting}
                >
                  {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Submit for verification</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {plans.length === 0 && !activeSubscription && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={{ color: theme.text.secondary }}>No subscription plans available yet. Check back later.</Text>
          </View>
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
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  planName: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 13, marginTop: 2 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginBottom: 8 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 10 },
  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  proofThumb: { width: 80, height: 80, borderRadius: 8 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', marginBottom: 12 },
  uploadBtnText: { fontSize: 15 },
  submitBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
