import { useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react-native';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';
import { useSupplierUpdates, useCreateSupplierUpdate, useUpdateSupplierUpdate, useDeleteSupplierUpdate, type SupplierUpdateType } from '@/hooks/useSupplierUpdates';

const UPDATE_TYPES: { value: SupplierUpdateType; label: string }[] = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'new_product', label: 'New product' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'restock', label: 'Restock' },
];

export default function SupplierUpdatesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SupplierUpdateType>('announcement');

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      setProfileId(data?.id ?? null);
    };
    load();
  }, [user?.id]);

  const { data: updates = [], isLoading } = useSupplierUpdates(profileId ?? undefined);
  const createUpdate = useCreateSupplierUpdate(profileId ?? undefined);
  const updateUpdate = useUpdateSupplierUpdate(profileId ?? undefined);
  const deleteUpdate = useDeleteSupplierUpdate(profileId ?? undefined);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setType('announcement');
    setModalOpen(true);
  };

  const openEdit = (u: { id: string; title: string; message: string | null; type: SupplierUpdateType }) => {
    setEditingId(u.id);
    setTitle(u.title);
    setMessage(u.message || '');
    setType(u.type);
    setModalOpen(true);
  };

  const submitCreate = async () => {
    const t = title.trim();
    if (!t) {
      RNAlert.alert('Required', 'Enter a title.');
      return;
    }
    if (!profileId) return;
    try {
      if (editingId) {
        await updateUpdate.mutateAsync({ id: editingId, title: t, message: message.trim() || undefined, type });
        setModalOpen(false);
        RNAlert.alert('Updated', 'Your update has been updated.');
      } else {
        await createUpdate.mutateAsync({ title: t, message: message.trim() || undefined, type });
        setModalOpen(false);
        const { data: followers } = await supabase
          .from('buyer_followed_suppliers')
          .select('user_id')
          .eq('supplier_profile_id', profileId);
        const userIds = (followers ?? []).map((r: any) => r.user_id).filter(Boolean);
        userIds.slice(0, 50).forEach((uid) => {
          sendNotification({
            title: 'Update from supplier',
            message: t.length > 60 ? t.slice(0, 57) + '…' : t,
            userId: uid,
          }).catch(() => {});
        });
        RNAlert.alert('Published', 'Your update has been posted. Followers will be notified.');
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not save update.');
    }
  };

  const handleDelete = (u: { id: string; title: string }) => {
    RNAlert.alert('Delete update', `Delete "${u.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUpdate.mutateAsync(u.id);
            RNAlert.alert('Deleted', 'Update removed.');
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || 'Could not delete.');
          }
        },
      },
    ]);
  };

  if (!profileId && !isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Updates"
        subtitle="Announcements and news for your followers"
        icon={Megaphone}
        iconGradient={['#F59E0B', '#D97706']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={openCreate}>
            <Plus size={24} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {updates.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
              <Megaphone size={40} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No updates yet. Post an announcement or promotion to notify your followers.</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent.primary }]} onPress={openCreate}>
                <Text style={styles.addBtnText}>Post update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            updates.map((u) => (
              <View key={u.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.typeLabel, { color: theme.text.tertiary }]}>{u.type.replace('_', ' ')}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(u)} style={[styles.iconBtn, { backgroundColor: theme.accent.primary + '20' }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Pencil size={18} color={theme.accent.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(u)} style={[styles.iconBtn, { backgroundColor: (theme.accent.danger || '#DC2626') + '20' }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Trash2 size={18} color={theme.accent.danger || '#DC2626'} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.title, { color: theme.text.primary }]}>{u.title}</Text>
                {u.message ? <Text style={[styles.message, { color: theme.text.secondary }]}>{u.message}</Text> : null}
                <Text style={[styles.date, { color: theme.text.tertiary }]}>{new Date(u.created_at).toLocaleString()}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingId ? 'Edit update' : 'Post update'}</Text>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Type</Text>
            <View style={styles.typeRow}>
              {UPDATE_TYPES.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeChip, type === opt.value && { backgroundColor: theme.accent.primary }]}
                  onPress={() => setType(opt.value)}
                >
                  <Text style={[styles.typeChipText, { color: type === opt.value ? '#FFF' : theme.text.primary }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Short title"
              placeholderTextColor={theme.text.tertiary}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Message (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Details..."
              placeholderTextColor={theme.text.tertiary}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setModalOpen(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={submitCreate} disabled={createUpdate.isPending || updateUpdate.isPending}>
                {(createUpdate.isPending || updateUpdate.isPending) ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>{editingId ? 'Save' : 'Post'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyCard: { padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 12 },
  addBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  card: { padding: 16, borderRadius: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 10, borderRadius: 10 },
  typeLabel: { fontSize: 12, textTransform: 'capitalize' },
  title: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  message: { fontSize: 14, marginTop: 6 },
  date: { fontSize: 12, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  typeChipText: { fontSize: 14 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});
