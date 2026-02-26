import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, Send, Paperclip } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';
import { sendNotification } from '@/lib/notifications';
import { getBase64FromAsset, uploadBase64ToStorage, readBase64FromUri } from '@/lib/upload-utils';

const BUCKET_MESSAGE_ATTACHMENTS = 'supplier_assets';

type MessageRow = {
  id: string;
  sender_user_id: string;
  body: string | null;
  attachment_urls: string[];
  attachment_names: string[];
  created_at: string;
};

export default function SupplierInboxConversationScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId: string | string[] }>();
  const conversationId = typeof params.conversationId === 'string' ? params.conversationId : params.conversationId?.[0];
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationNotFound, setConversationNotFound] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [buyerUserId, setBuyerUserId] = useState<string | null>(null);
  const [buyerDisplayName, setBuyerDisplayName] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!conversationId || !user?.id) {
      setLoading(false);
      if (!conversationId) setConversationNotFound(true);
      return;
    }
    const load = async () => {
      const { data: profile } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (!profile?.id) {
        setLoading(false);
        setConversationNotFound(true);
        return;
      }
      const { data: conv, error: convErr } = await supabase
        .from('supplier_conversations')
        .select('user_id, supplier_profile_id')
        .eq('id', conversationId)
        .eq('supplier_profile_id', profile.id)
        .maybeSingle();
      if (convErr || !conv) {
        setConversationNotFound(true);
        setLoading(false);
        return;
      }
      const uid = (conv as { user_id?: string })?.user_id ?? null;
      if (uid) {
        setBuyerUserId(uid);
        const { data: buyer } = await supabase.from('users').select('name, email').eq('id', uid).maybeSingle();
        if (buyer) {
          setBuyerDisplayName((buyer as { name?: string }).name ?? null);
          setBuyerEmail((buyer as { email?: string }).email ?? null);
        }
      }
      const { data: msgs } = await supabase
        .from('supplier_messages')
        .select('id, sender_user_id, body, attachment_urls, attachment_names, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages((msgs as MessageRow[]) || []);
      setLoading(false);
    };
    load();
  }, [conversationId, user?.id]);

  const addAttachment = async () => {
    RNAlert.alert('Add attachment', 'Choose type', [
      { text: 'Photo', onPress: () => pickImage() },
      { text: 'Document', onPress: () => pickDocument() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      RNAlert.alert('Permission', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAttach(true);
    try {
      const base64 = await getBase64FromAsset(result.assets[0]);
      const name = `img-${Date.now()}.jpg`;
      const path = `message_attachments/${user?.id}/${Date.now()}-${name}`;
      const url = await uploadBase64ToStorage(supabase, { bucket: BUCKET_MESSAGE_ATTACHMENTS, filePath: path, base64, contentType: 'image/jpeg', upsert: false });
      setAttachmentUrls((u) => [...u, url]);
      setAttachmentNames((n) => [...n, name]);
    } catch (e: any) {
      RNAlert.alert('Upload failed', e?.message || 'Could not upload image.');
    } finally {
      setUploadingAttach(false);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    setUploadingAttach(true);
    try {
      const base64 = await readBase64FromUri(file.uri);
      const name = file.name || `doc-${Date.now()}.pdf`;
      const path = `message_attachments/${user?.id}/${Date.now()}-${name.replace(/[^a-z0-9.-]/gi, '-')}`;
      const url = await uploadBase64ToStorage(supabase, { bucket: BUCKET_MESSAGE_ATTACHMENTS, filePath: path, base64, contentType: file.mimeType || 'application/pdf', upsert: false });
      setAttachmentUrls((u) => [...u, url]);
      setAttachmentNames((n) => [...n, name]);
    } catch (e: any) {
      RNAlert.alert('Upload failed', e?.message || 'Could not upload document.');
    } finally {
      setUploadingAttach(false);
    }
  };

  const sendMessage = async () => {
    const text = body.trim();
    if (!conversationId || (!text && attachmentUrls.length === 0)) return;
    setSending(true);
    try {
      const { error } = await supabase.from('supplier_messages').insert({
        conversation_id: conversationId,
        sender_user_id: user!.id,
        body: text || null,
        attachment_urls: attachmentUrls.length ? attachmentUrls : [],
        attachment_names: attachmentUrls.length ? attachmentNames : [],
      });
      if (error) throw error;
      await supabase.from('supplier_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      if (buyerUserId) {
        sendNotification({
          title: 'New message from supplier',
          message: text ? (text.slice(0, 60) + (text.length > 60 ? '…' : '')) : 'You have a new message.',
          userId: buyerUserId,
        }).catch(() => {});
      }
      setBody('');
      setAttachmentUrls([]);
      setAttachmentNames([]);
      const { data: newMsg } = await supabase
        .from('supplier_messages')
        .select('id, sender_user_id, body, attachment_urls, attachment_names, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (newMsg) setMessages((m) => [...m, newMsg as MessageRow]);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  if (!user?.id) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Sign in required</Text>
        <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>Sign in to reply to buyers.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading conversation...</Text>
      </View>
    );
  }

  if (conversationNotFound) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Conversation not found</Text>
        <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>This conversation may have been deleted or you don't have access to it.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={buyerDisplayName || buyerEmail || 'Buyer'}
        subtitle={buyerEmail ? `${buyerEmail} · Reply to buyer` : 'Reply to buyer'}
        icon={MessageSquare}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.inverse} />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
          {messages.map((msg) => {
            const isMe = msg.sender_user_id === user.id;
            return (
              <View key={msg.id} style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                <View style={[styles.bubble, isMe ? { backgroundColor: theme.accent.primary } : { backgroundColor: theme.background.card }]}>
                  {msg.body ? <Text style={[styles.bubbleText, isMe ? { color: '#FFF' } : { color: theme.text.primary }]}>{msg.body}</Text> : null}
                  {msg.attachment_urls?.length > 0 && (
                    <View style={styles.attachWrap}>
                      {msg.attachment_urls.map((url, i) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_names?.[i] || '') || url.includes('image');
                        return isImage ? (
                          <Image key={i} source={{ uri: url }} style={styles.attachImg} />
                        ) : (
                          <TouchableOpacity key={i} onPress={() => url && Linking.openURL(url)}>
                            <Text style={[styles.attachLink, { color: isMe ? '#FFF' : theme.accent.primary }]}>{msg.attachment_names?.[i] || 'Document'}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <Text style={[styles.bubbleTime, isMe ? { color: 'rgba(255,255,255,0.8)' } : { color: theme.text.tertiary }]}>{new Date(msg.created_at).toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        {attachmentUrls.length > 0 && (
          <View style={[styles.pendingAttach, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.pendingAttachText, { color: theme.text.secondary }]}>{attachmentUrls.length} attachment(s)</Text>
          </View>
        )}
        <View style={[styles.inputRow, { backgroundColor: theme.background.card }]}>
          <TouchableOpacity onPress={addAttachment} disabled={uploadingAttach} style={styles.attachBtn}>
            {uploadingAttach ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <Paperclip size={22} color={theme.text.tertiary} />}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.text.tertiary}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity onPress={sendMessage} disabled={sending || (!body.trim() && attachmentUrls.length === 0)} style={[styles.sendBtn, { backgroundColor: theme.accent.primary }]} activeOpacity={0.85}>
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xs },
  bubbleWrap: { marginBottom: spacing.sm },
  bubbleLeft: { alignItems: 'flex-start' },
  bubbleRight: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', padding: spacing.sm, borderRadius: radius.lg },
  bubbleText: { ...typography.bodySmall },
  attachWrap: { marginTop: spacing.xs },
  attachImg: { width: 160, height: 120, borderRadius: radius.sm, marginTop: spacing.xxs },
  attachLink: { fontSize: 14, textDecorationLine: 'underline' },
  bubbleTime: { ...typography.overline },
  pendingAttach: { padding: spacing.xs, paddingHorizontal: spacing.md },
  pendingAttachText: { ...typography.caption },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, gap: spacing.xs },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.xl, maxHeight: 100, fontSize: 16 },
  attachBtn: { padding: spacing.xs, minWidth: minTouchTarget, minHeight: minTouchTarget, justifyContent: 'center', alignItems: 'center' },
  sendBtn: { padding: spacing.sm, borderRadius: radius.xl, minWidth: minTouchTarget, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  emptyTitle: { ...typography.sectionTitle, marginBottom: spacing.xs, textAlign: 'center' },
  emptyBody: { ...typography.bodySmall, marginBottom: spacing.md, textAlign: 'center' },
  primaryBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, minHeight: minTouchTarget, justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
