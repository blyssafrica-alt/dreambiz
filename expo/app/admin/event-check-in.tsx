import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Ticket, CheckCircle, XCircle, RotateCcw } from 'lucide-react-native';

export default function EventCheckInScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCheckIn = useCallback(
    async (undo: boolean) => {
      const code = ticketCode.trim().toUpperCase();
      if (!code) {
        Alert.alert('Enter code', 'Enter or scan a ticket code.');
        return;
      }
      setLoading(true);
      setLastResult(null);
      try {
        const { data, error } = await supabase.rpc('check_in_ticket', {
          p_ticket_code: code,
          p_checked_in_by: user?.id ?? null,
          p_undo: undo,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        const success = row?.success ?? false;
        const message = row?.message ?? (success ? 'Done' : 'Unknown result');
        setLastResult({ success, message });
        if (success) setTicketCode('');
      } catch (e: any) {
        setLastResult({ success: false, message: e?.message ?? 'Failed' });
      } finally {
        setLoading(false);
      }
    },
    [ticketCode, user?.id]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Event Check-in</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Ticket size={40} color={theme.accent.primary} />
            <Text style={[styles.instruction, { color: theme.text.secondary }]}>
              Enter ticket code or scan QR. Then tap Check in or Undo check-in.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
              placeholder="Ticket code (e.g. T12345-1-abc)"
              placeholderTextColor={theme.text.tertiary}
              value={ticketCode}
              onChangeText={setTicketCode}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.undoBtn, { backgroundColor: theme.background.secondary, borderColor: theme.border.medium }]}
                onPress={() => handleCheckIn(true)}
                disabled={loading}
              >
                <RotateCcw size={20} color={theme.text.primary} />
                <Text style={[styles.btnText, { color: theme.text.primary }]}>Undo check-in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.checkInBtn, { backgroundColor: theme.accent.primary }]}
                onPress={() => handleCheckIn(false)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FFF" />
                    <Text style={[styles.btnText, { color: '#FFF' }]}>Check in</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {lastResult && (
            <View
              style={[
                styles.result,
                { backgroundColor: lastResult.success ? theme.accent.success + '20' : theme.accent.danger + '20', borderColor: lastResult.success ? theme.accent.success : theme.accent.danger },
              ]}
            >
              {lastResult.success ? (
                <CheckCircle size={24} color={theme.accent.success} />
              ) : (
                <XCircle size={24} color={theme.accent.danger} />
              )}
              <Text style={[styles.resultText, { color: theme.text.primary }]}>{lastResult.message}</Text>
            </View>
          )}

          <Text style={[styles.note, { color: theme.text.tertiary }]}>
            Only super admins can use check-in. Double check-in is blocked (shows "Already checked in"). Use Undo to reverse.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backBtn: { width: 40, padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  undoBtn: { borderWidth: 1 },
  checkInBtn: {},
  btnText: { fontSize: 16, fontWeight: '600' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  resultText: { flex: 1, fontSize: 15 },
  note: { fontSize: 12, textAlign: 'center' },
});
