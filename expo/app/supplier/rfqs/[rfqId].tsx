import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRfqQuotes, useCreateQuote } from '@/hooks/useSupplierRfq';
import { sendNotification } from '@/lib/notifications';
import { recordSupplierEvent } from '@/lib/supplier-analytics';
import type { SupplierRfq, SupplierQuote } from '@/types/supplier-marketplace';

export default function SupplierRfqDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ rfqId: string | string[] }>();
  const rfqId = typeof params.rfqId === 'string' ? params.rfqId : params.rfqId?.[0];
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rfq, setRfq] = useState<SupplierRfq | null>(null);
  const [loading, setLoading] = useState(true);

  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [moq, setMoq] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [notes, setNotes] = useState('');

  const createQuote = useCreateQuote(profileId ?? undefined);
  const { data: quotes = [] } = useRfqQuotes(rfqId);

  useEffect(() => {
    if (!rfqId || !user?.id) {
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
      setProfileId(profile?.id ?? null);

      const { data: rfqRow, error } = await supabase.from('supplier_rfqs').select('*').eq('id', rfqId).single();
      if (error || !rfqRow) {
        setLoading(false);
        return;
      }
      const r = rfqRow as any;
      setRfq({
        id: r.id,
        supplierProfileId: r.supplier_profile_id,
        productId: r.product_id ?? null,
        buyerUserId: r.buyer_user_id,
        quantity: Number(r.quantity),
        unit: r.unit ?? null,
        deliveryLocation: r.delivery_location ?? null,
        neededByDate: r.needed_by_date ?? null,
        notes: r.notes ?? null,
        attachmentUrls: r.attachment_urls ?? [],
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
      setLoading(false);
    };
    load();
  }, [rfqId, user?.id]);

  const submitQuote = async () => {
    if (!rfqId || !rfq) return;
    const price = parseFloat(unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      RNAlert.alert('Required', 'Please enter a valid unit price.');
      return;
    }
    try {
      await createQuote.mutateAsync({
        rfq_id: rfqId,
        unit_price: price,
        currency: currency.trim() || 'USD',
        lead_time_days: leadTimeDays.trim() ? parseInt(leadTimeDays, 10) : undefined,
        moq: moq.trim() ? parseInt(moq, 10) : undefined,
        delivery_terms: deliveryTerms.trim() || undefined,
        payment_terms: paymentTerms.trim() || undefined,
        validity_days: validityDays.trim() ? parseInt(validityDays, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      recordSupplierEvent(rfq.supplierProfileId, 'rfq_response', { userId: user?.id });
      sendNotification({
        title: 'Quote received',
        message: 'The supplier has sent you a quote. Check your requests for quote.',
        userId: rfq.buyerUserId,
      }).catch(() => {});
      RNAlert.alert('Quote sent', 'Your quote has been sent to the buyer.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not send quote.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!rfq) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>RFQ not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }];
  const canAddQuote = rfq.status === 'open' && quotes.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Request for quote"
        subtitle={`Qty: ${rfq.quantity} ${rfq.unit || ''}`}
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Buyer request</Text>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Quantity</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{rfq.quantity} {rfq.unit || 'units'}</Text>
          {rfq.deliveryLocation ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Delivery location</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{rfq.deliveryLocation}</Text>
            </>
          ) : null}
          {rfq.neededByDate ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Needed by</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{rfq.neededByDate}</Text>
            </>
          ) : null}
          {rfq.notes ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Notes</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{rfq.notes}</Text>
            </>
          ) : null}
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>Status: {rfq.status}</Text>
        </View>

        {quotes.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Your quote(s)</Text>
            {quotes.map((q: SupplierQuote) => (
              <View key={q.id} style={[styles.quoteBlock, { borderColor: theme.background.secondary }]}>
                <Text style={[styles.value, { color: theme.text.primary }]}>{q.currency} {q.unitPrice.toLocaleString()} per unit</Text>
                {q.leadTimeDays != null && <Text style={[styles.muted, { color: theme.text.tertiary }]}>Lead time: {q.leadTimeDays} days</Text>}
                {q.notes && <Text style={[styles.muted, { color: theme.text.tertiary }]}>{q.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {canAddQuote && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Send a quote</Text>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Unit price *</Text>
            <TextInput style={inputStyle} placeholder="0.00" placeholderTextColor={theme.text.tertiary} value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Currency</Text>
            <TextInput style={inputStyle} placeholder="USD" placeholderTextColor={theme.text.tertiary} value={currency} onChangeText={setCurrency} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Lead time (days)</Text>
            <TextInput style={inputStyle} placeholder="e.g. 7" placeholderTextColor={theme.text.tertiary} value={leadTimeDays} onChangeText={setLeadTimeDays} keyboardType="number-pad" />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>MOQ (minimum order)</Text>
            <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={theme.text.tertiary} value={moq} onChangeText={setMoq} keyboardType="number-pad" />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Delivery terms</Text>
            <TextInput style={inputStyle} placeholder="e.g. FOB, CIF" placeholderTextColor={theme.text.tertiary} value={deliveryTerms} onChangeText={setDeliveryTerms} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Payment terms</Text>
            <TextInput style={inputStyle} placeholder="e.g. Net 30" placeholderTextColor={theme.text.tertiary} value={paymentTerms} onChangeText={setPaymentTerms} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Quote validity (days)</Text>
            <TextInput style={inputStyle} placeholder="e.g. 14" placeholderTextColor={theme.text.tertiary} value={validityDays} onChangeText={setValidityDays} keyboardType="number-pad" />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Notes</Text>
            <TextInput style={[inputStyle, styles.textArea]} placeholder="Optional notes" placeholderTextColor={theme.text.tertiary} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.accent.primary }]} onPress={submitQuote} disabled={createQuote.isPending}>
              {createQuote.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Send quote</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 8 },
  value: { fontSize: 15 },
  muted: { fontSize: 13, marginTop: 4 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 8 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  quoteBlock: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  submitBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
