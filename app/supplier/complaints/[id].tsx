import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, ExternalLink } from 'lucide-react-native';
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

type Complaint = {
  id: string;
  subject: string;
  description: string;
  order_reference: string | null;
  evidence_urls: string[];
  status: string;
  supplier_response: string | null;
  supplier_evidence_urls: string[];
  supplier_responded_at: string | null;
  created_at: string;
};

export default function SupplierComplaintDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [evidenceUrlsText, setEvidenceUrlsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !user?.id) {
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
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('supplier_marketplace_complaints')
        .select('id, subject, description, order_reference, evidence_urls, status, supplier_response, supplier_evidence_urls, supplier_responded_at, created_at')
        .eq('id', id)
        .eq('supplier_profile_id', profile.id)
        .maybeSingle();
      if (error || !data) {
        setLoading(false);
        return;
      }
      const c = data as Complaint;
      setComplaint(c);
      setResponseText(c.supplier_response ?? '');
      setEvidenceUrlsText(Array.isArray(c.supplier_evidence_urls) ? c.supplier_evidence_urls.join('\n') : '');
      setLoading(false);
    };
    load();
  }, [id, user?.id]);

  const canRespond = complaint && (complaint.status === 'open' || complaint.status === 'in_review') && !complaint.supplier_response;

  const submitResponse = async () => {
    if (!complaint || !profileId || !responseText.trim()) {
      RNAlert.alert('Required', 'Please enter your response.');
      return;
    }
    setSubmitting(true);
    try {
      const urls = evidenceUrlsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from('supplier_marketplace_complaints')
        .update({
          supplier_response: responseText.trim(),
          supplier_evidence_urls: urls,
          supplier_responded_at: new Date().toISOString(),
          status: 'supplier_response',
          updated_at: new Date().toISOString(),
        })
        .eq('id', complaint.id)
        .eq('supplier_profile_id', profileId);
      if (error) throw error;
      const { data: row } = await supabase.from('supplier_marketplace_complaints').select('user_id').eq('id', complaint.id).single();
      if (row?.user_id) {
        sendNotification({
          title: 'Supplier responded to your complaint',
          message: `The supplier has submitted a response. Subject: ${complaint.subject.slice(0, 50)}…`,
          userId: row.user_id,
        }).catch(() => {});
      }
      setComplaint((prev) => prev ? { ...prev, supplier_response: responseText.trim(), supplier_evidence_urls: urls, supplier_responded_at: new Date().toISOString(), status: 'supplier_response' } : null);
      RNAlert.alert('Submitted', 'Your response has been sent. Admin will review.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !complaint) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent.primary} />
        ) : (
          <>
            <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>Complaint not found.</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
              <Text style={{ color: theme.accent.primary, fontWeight: '600' }}>Go back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Complaint"
        subtitle={complaint.subject}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.subject, { color: theme.text.primary }]}>{complaint.subject}</Text>
          <Text style={[styles.body, { color: theme.text.secondary }]}>{complaint.description}</Text>
          {complaint.order_reference ? (
            <Text style={[styles.muted, { color: theme.text.tertiary }]}>Order ref: {complaint.order_reference}</Text>
          ) : null}
          {Array.isArray(complaint.evidence_urls) && complaint.evidence_urls.length > 0 && (
            <View style={styles.evidenceLinks}>
              {complaint.evidence_urls.map((url, i) => (
                <TouchableOpacity key={i} onPress={() => Linking.openURL(url)} style={styles.evidenceLink}>
                  <ExternalLink size={14} color={theme.accent.primary} />
                  <Text style={[styles.evidenceLinkText, { color: theme.accent.primary }]}>Evidence {i + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>{new Date(complaint.created_at).toLocaleString()}</Text>
          <Text style={[styles.statusBadge, { color: theme.text.tertiary }]}>{complaint.status.replace('_', ' ')}</Text>
        </View>

        {complaint.supplier_response ? (
          <View style={[styles.card, styles.responseBlock, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Your response</Text>
            <Text style={[styles.body, { color: theme.text.primary }]}>{complaint.supplier_response}</Text>
            {Array.isArray(complaint.supplier_evidence_urls) && complaint.supplier_evidence_urls.length > 0 && (
              <View style={styles.evidenceLinks}>
                {complaint.supplier_evidence_urls.map((url, i) => (
                  <TouchableOpacity key={i} onPress={() => Linking.openURL(url)} style={styles.evidenceLink}>
                    <ExternalLink size={14} color={theme.accent.primary} />
                    <Text style={[styles.evidenceLinkText, { color: theme.accent.primary }]}>Evidence {i + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {complaint.supplier_responded_at && (
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>Submitted: {new Date(complaint.supplier_responded_at).toLocaleString()}</Text>
            )}
          </View>
        ) : canRespond ? (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Your response (required)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Explain your side and attach any evidence links (one per line)"
              placeholderTextColor={theme.text.tertiary}
              value={responseText}
              onChangeText={setResponseText}
              multiline
            />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Evidence URLs (one per line, optional)</Text>
            <TextInput
              style={[styles.textArea, styles.urlInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="https://..."
              placeholderTextColor={theme.text.tertiary}
              value={evidenceUrlsText}
              onChangeText={setEvidenceUrlsText}
              multiline
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.accent.primary }]}
              onPress={submitResponse}
              disabled={submitting || !responseText.trim()}
            >
              {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Submit response</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  subject: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 14, marginTop: 8 },
  muted: { fontSize: 12, marginTop: 6 },
  statusBadge: { fontSize: 12, marginTop: 8 },
  label: { fontSize: 12, marginBottom: 6 },
  evidenceLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  evidenceLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidenceLinkText: { fontSize: 13 },
  responseBlock: { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  textArea: { padding: 12, borderRadius: 8, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  urlInput: { minHeight: 60 },
  submitBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '600' },
});
