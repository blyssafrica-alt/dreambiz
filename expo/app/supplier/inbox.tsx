import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, ChevronRight, FileText, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';
import { useSupplierRfqs } from '@/hooks/useSupplierRfq';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

type ConversationRow = {
  id: string;
  supplier_profile_id: string;
  user_id: string;
  updated_at: string;
  last_message?: string | null;
  buyer_name?: string | null;
  buyer_email?: string | null;
};

export default function SupplierInboxScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const canShowRfqs = isFeatureVisible('supplier-rfq-respond') || isFeatureVisible('supplier-inbox');
  const { data: rfqs = [] } = useSupplierRfqs(profileId ?? undefined);

  useEffect(() => {
    if (!user?.id) {
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
      const { data: convs } = await supabase
        .from('supplier_conversations')
        .select('id, supplier_profile_id, user_id, updated_at')
        .eq('supplier_profile_id', profile.id)
        .order('updated_at', { ascending: false });
      if (!convs?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }
      const userIds = [...new Set(convs.map((c) => c.user_id).filter(Boolean))];
      const buyerMap: Record<string, { name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name, email').in('id', userIds);
        users?.forEach((u: { id: string; name: string | null; email: string | null }) => {
          buyerMap[u.id] = { name: u.name ?? null, email: u.email ?? null };
        });
      }
      const lastMsgs = await Promise.all(
        convs.map(async (c) => {
          const { data: msg } = await supabase
            .from('supplier_messages')
            .select('body')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const buyer = c.user_id ? buyerMap[c.user_id] : null;
          return {
            ...c,
            last_message: msg?.body ?? null,
            buyer_name: buyer?.name ?? null,
            buyer_email: buyer?.email ?? null,
          };
        })
      );
      setConversations(lastMsgs as ConversationRow[]);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleDeleteConversation = (convId: string, buyerName: string) => {
    Alert.alert('Delete conversation', `Remove conversation with ${buyerName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('supplier_conversations').delete().eq('id', convId);
            if (error) throw error;
            setConversations((prev) => prev.filter((c) => c.id !== convId));
            Alert.alert('Deleted', 'Conversation removed.');
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not delete.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading inbox...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Inbox"
        subtitle="Conversations with buyers"
        icon={MessageSquare}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.inverse} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
            <MessageSquare size={48} color={theme.text.tertiary} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No conversations yet</Text>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Buyers can start a chat from your store page. New conversations will appear here.</Text>
          </View>
        ) : (
          conversations.map((c) => (
            <View key={c.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
              <TouchableOpacity style={styles.cardTouch} onPress={() => router.push(`/supplier/inbox/${c.id}` as any)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: theme.surface.info }]}>
                  <MessageSquare size={22} color={theme.accent.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>{c.buyer_name || c.buyer_email || 'Buyer'}</Text>
                  <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>{c.last_message || 'No messages yet'}</Text>
                  <Text style={[styles.cardTime, { color: theme.text.tertiary }]}>{new Date(c.updated_at).toLocaleDateString()}</Text>
                </View>
                <ChevronRight size={20} color={theme.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteConversation(c.id, c.buyer_name || c.buyer_email || 'Buyer')}>
                <Trash2 size={18} color={theme.accent.danger || '#DC2626'} />
              </TouchableOpacity>
            </View>
          ))
        )}
        {canShowRfqs && (
          <>
            <View style={[styles.sectionHeader, { borderColor: theme.background.tertiary }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Requests for quote</Text>
              <TouchableOpacity onPress={() => router.push('/supplier/rfqs' as any)}>
                <Text style={[styles.link, { color: theme.accent.primary }]}>View all</Text>
              </TouchableOpacity>
            </View>
            {rfqs.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
                <FileText size={36} color={theme.text.tertiary} strokeWidth={1.5} />
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No RFQs yet. Requests will appear here.</Text>
              </View>
            ) : (
              rfqs.slice(0, 3).map((rfq: { id: string; quantity: number; unit?: string | null; notes?: string | null; createdAt: string; status: string }) => (
                <TouchableOpacity
                  key={rfq.id}
                  style={[styles.card, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push(`/supplier/rfqs/${rfq.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: theme.surface.info }]}>
                    <FileText size={22} color={theme.accent.primary} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Qty: {rfq.quantity} {rfq.unit || ''}</Text>
                    <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>{rfq.notes || 'No notes'}</Text>
                    <Text style={[styles.cardTime, { color: theme.text.tertiary }]}>{new Date(rfq.createdAt).toLocaleDateString()} · {rfq.status}</Text>
                  </View>
                  <ChevronRight size={20} color={theme.text.tertiary} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { padding: spacing.xl, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.md },
  emptyTitle: { ...typography.cardTitle, marginTop: spacing.sm, marginBottom: spacing.xxs },
  emptyText: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.md },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    minHeight: minTouchTarget,
  },
  cardTouch: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { padding: 8, marginLeft: 4 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.cardTitle },
  cardSub: { ...typography.caption, marginTop: spacing.xxs },
  cardTime: { fontSize: 12, marginTop: spacing.xxs },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
  },
  sectionTitle: { ...typography.cardTitle },
  link: { fontSize: 14, fontWeight: '600' },
});
