import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, ChevronRight, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

type ConversationRow = {
  id: string;
  supplier_profile_id: string;
  user_id: string;
  updated_at: string;
  last_message?: string | null;
  supplier_name?: string | null;
};

export default function BuyerMyMessagesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: convs } = await supabase
        .from('supplier_conversations')
        .select('id, supplier_profile_id, user_id, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!convs?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }
      const profileIds = [...new Set(convs.map((c) => c.supplier_profile_id).filter(Boolean))];
      const profileMap: Record<string, string | null> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('supplier_marketplace_profiles').select('id, business_name').in('id', profileIds);
        profiles?.forEach((p: { id: string; business_name: string | null }) => {
          profileMap[p.id] = p.business_name ?? null;
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
          return {
            ...c,
            last_message: msg?.body ?? null,
            supplier_name: c.supplier_profile_id ? profileMap[c.supplier_profile_id] ?? 'Supplier' : 'Supplier',
          };
        })
      );
      setConversations(lastMsgs as ConversationRow[]);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleDeleteConversation = (convId: string, supplierName: string) => {
    Alert.alert('Delete conversation', `Remove conversation with ${supplierName}? This cannot be undone.`, [
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

  const canAccess = isFeatureVisible('supplier-marketplace');
  if (!canAccess) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Access to the supplier marketplace is not available for your plan.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="My Messages"
        subtitle="Conversations with suppliers"
        icon={MessageSquare}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.inverse ?? '#FFF'} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {conversations.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
            <MessageSquare size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No messages yet</Text>
            <Text style={[styles.emptySub, { color: theme.text.tertiary }]}>
              Visit a supplier store and tap Message to start a conversation.
            </Text>
          </View>
        ) : (
          conversations.map((c) => (
            <View key={c.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
              <TouchableOpacity
                style={styles.cardTouch}
                onPress={() => router.push(`/suppliers-marketplace/conversation/${c.supplier_profile_id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.surface.info }]}>
                  <MessageSquare size={22} color={theme.accent.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>
                    {c.supplier_name || 'Supplier'}
                  </Text>
                  <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                    {c.last_message || 'No messages yet'}
                  </Text>
                  <Text style={[styles.cardTime, { color: theme.text.tertiary }]}>{new Date(c.updated_at).toLocaleDateString()}</Text>
                </View>
                <ChevronRight size={20} color={theme.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteConversation(c.id, c.supplier_name || 'Supplier')}>
                <Trash2 size={18} color={theme.accent.danger || '#DC2626'} />
              </TouchableOpacity>
            </View>
          ))
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
  loadingLabel: { marginTop: 12, fontSize: typography.caption.fontSize },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    minHeight: minTouchTarget * 4,
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: typography.cardTitle.fontSize, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: typography.caption.fontSize, marginTop: 6, textAlign: 'center' },
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
  iconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: typography.body.fontSize, fontWeight: '600' },
  cardSub: { fontSize: typography.caption.fontSize, marginTop: 2 },
  cardTime: { fontSize: typography.overline.fontSize, marginTop: 2 },
});
