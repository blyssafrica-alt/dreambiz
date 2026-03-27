import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Mail, Copy, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert as RNAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function-helper';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export default function AdminMailingCampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<{ queued: number; delivered: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: camp, error: campErr } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (campErr) throw campErr;
      setCampaign(camp);

      const { data: recs } = await supabase
        .from('email_recipients')
        .select('status')
        .eq('campaign_id', id);
      const counts = { queued: 0, delivered: 0, failed: 0 };
      (recs || []).forEach((r: { status: string }) => {
        if (r.status === 'queued' || r.status === 'sending') counts.queued++;
        else if (r.status === 'delivered') counts.delivered++;
        else if (r.status === 'failed') counts.failed++;
      });
      setStats(counts);
    } catch (e) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSend = () => {
    RNAlert.alert(
      'Send campaign',
      `Send to ~${campaign?.audience_count_estimate ?? '?'} recipients?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const { data, error } = await invokeEdgeFunction('admin-mailing-send-campaign', {
                body: { campaign_id: id },
              });
              if (error) {
                const msg = (error as any)?.status === 401
                  ? 'Session expired or invalid. Please sign out and sign in again.'
                  : (error as any)?.message ?? 'Failed to send';
                RNAlert.alert('Error', msg);
                return;
              }
              const res = data as { success?: boolean; sent?: number; error?: string };
              if (res?.success) {
                RNAlert.alert('Sent', `Delivered to ${res.sent ?? 0} recipients.`);
                load();
              } else {
                RNAlert.alert('Error', (res as any)?.error || 'Send failed');
              }
            } catch (e) {
              RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to send');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    router.push(`/admin/mailing/new?duplicate=${id}` as any);
  };

  const handleDelete = () => {
    const isSent = campaign?.status === 'sent';
    RNAlert.alert(
      'Delete campaign',
      isSent
        ? 'This will remove the campaign and its delivery history. This cannot be undone.'
        : 'Delete this campaign? Recipients will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
              if (error) throw error;
              RNAlert.alert('Deleted', 'Campaign removed.', [{ text: 'OK', onPress: () => router.replace('/admin/mailing' as any) }]);
            } catch (e) {
              RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to delete campaign.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !campaign) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={campaign.name}
        subtitle={STATUS_LABELS[campaign.status] || campaign.status}
        showLogo={false}
        icon={Mail}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.cardHeader}>
            <Mail size={22} color="#0EA5E9" strokeWidth={2} />
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Campaign details</Text>
          </LinearGradient>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Subject</Text>
          <Text style={[styles.value, { color: theme.text.primary }]}>{campaign.subject}</Text>
          {campaign.preview_text && (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Preview</Text>
              <Text style={[styles.value, { color: theme.text.secondary }]}>{campaign.preview_text}</Text>
            </>
          )}
        </View>

        {stats && (
          <View style={[styles.statsCard, { backgroundColor: theme.background.card }]}>
            <LinearGradient colors={['#10B98122', '#05966912']} style={styles.stat}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stats.delivered}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Delivered</Text>
            </LinearGradient>
            <LinearGradient colors={['#F59E0B22', '#D9770612']} style={styles.stat}>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.queued}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Queued</Text>
            </LinearGradient>
            <LinearGradient colors={['#FEE2E222', '#FECACA18']} style={styles.stat}>
              <Text style={[styles.statValue, { color: '#991B1B' }]}>{stats.failed}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Failed</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.actions}>
          {campaign.status === 'draft' && (
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.accent.primary }]} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <><Send size={20} color="#FFF" strokeWidth={2.5} /><Text style={[styles.btnText, { color: '#FFF' }]}>Send campaign</Text></>}
            </TouchableOpacity>
          )}
          {campaign.status === 'draft' && (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary, { backgroundColor: theme.background.secondary }]} onPress={() => router.push(`/admin/mailing/new?edit=${id}` as any)} activeOpacity={0.85}>
              <Text style={[styles.btnText, { color: theme.text.primary }]}>Edit draft</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnSecondary, { backgroundColor: theme.background.secondary }]} onPress={handleDuplicate} activeOpacity={0.85}>
            <Copy size={18} color={theme.text.primary} strokeWidth={2.5} />
            <Text style={[styles.btnText, { color: theme.text.primary }]}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger, { backgroundColor: theme.accent.danger + '18' }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.85}
          >
            {deleting ? <ActivityIndicator size="small" color={theme.accent.danger} /> : <Trash2 size={18} color={theme.accent.danger} strokeWidth={2.5} />}
            <Text style={[styles.btnText, { color: theme.accent.danger }]}>Delete campaign</Text>
          </TouchableOpacity>
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
  card: { padding: 20, borderRadius: 20, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 14, marginBottom: 18, marginHorizontal: -2 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 15, marginBottom: 14 },
  statsCard: { flexDirection: 'row', gap: 12, marginBottom: 20, padding: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  stat: { flex: 1, padding: 18, borderRadius: 16 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  actions: { gap: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnPrimary: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  btnSecondary: {},
  btnDanger: {},
  btnText: { fontWeight: '600', fontSize: 15 },
});
