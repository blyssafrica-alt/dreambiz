import { useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as RNAlert,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { TEMPLATE_VARIABLES, toVariableTag, applySampleVariables } from '@/lib/email-template-variables';

function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.5;padding:16px;margin:0;color:#1f2937;}</style></head><body>${body}</body></html>`;
}

const DEFAULT_HTML = '<h1>Hi {{first_name}}</h1>\n<p>Welcome to DreamBiz.</p>\n<p>Variables: {{business_name}}, {{supplier_store}}, {{plan_name}}, {{days_left}}</p>\n<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';

export default function AdminMailingTemplateNewScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [saving, setSaving] = useState(false);
  const [contentMode, setContentMode] = useState<'html' | 'preview'>('html');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const insertVariable = (key: string) => {
    const tag = toVariableTag(key);
    const start = Math.min(selection.start, html.length);
    const before = html.slice(0, start);
    const after = html.slice(selection.end);
    const nextHtml = before + tag + after;
    setHtml(nextHtml);
    const newPos = start + tag.length;
    setSelection({ start: newPos, end: newPos });
  };

  const save = async () => {
    if (!name.trim()) {
      RNAlert.alert('Error', 'Template name is required.');
      return;
    }
    if (!html.trim()) {
      RNAlert.alert('Error', 'HTML content is required.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('email_templates')
        .insert({ name: name.trim(), html: html.trim(), created_by: user?.id ?? null })
        .select('id')
        .single();
      if (error) throw error;
      RNAlert.alert('Created', 'Template saved.', [
        { text: 'Edit', onPress: () => router.replace(`/admin/mailing/templates/${data.id}` as any) },
        { text: 'Back', onPress: () => router.back() },
      ]);
    } catch (e) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to create template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="New template"
        subtitle="Create a reusable email template"
        showLogo={false}
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Template details</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.text.tertiary }]}>Name and HTML content</Text>
          </LinearGradient>
          <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
            placeholder="e.g. Welcome email"
            placeholderTextColor={theme.text.tertiary}
            value={name}
            onChangeText={setName}
          />
          <Text style={[styles.variableHint, { color: theme.text.tertiary }]}>Tap a variable to insert at cursor. Variables are replaced per recipient when sending:</Text>
          <View style={styles.variableRow}>
            {TEMPLATE_VARIABLES.map((v) => (
              <TouchableOpacity
                key={v.key}
                style={[styles.varChip, { backgroundColor: theme.background.secondary }]}
                onPress={() => { setContentMode('html'); insertVariable(v.key); }}
              >
                <Text style={[styles.varChipText, { color: theme.accent.primary }]}>{'{{'}{v.key}{'}}'}</Text>
                <Text style={[styles.varChipDesc, { color: theme.text.tertiary }]}>{v.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.chipRow, { marginTop: 12 }]}>
            <TouchableOpacity style={[styles.chip, contentMode === 'html' && { backgroundColor: theme.accent.primary }]} onPress={() => setContentMode('html')}>
              <Text style={[styles.chipText, { color: contentMode === 'html' ? '#FFF' : theme.text.secondary }]}>HTML</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, contentMode === 'preview' && { backgroundColor: theme.accent.primary }]} onPress={() => setContentMode('preview')}>
              <Text style={[styles.chipText, { color: contentMode === 'preview' ? '#FFF' : theme.text.secondary }]}>Preview</Text>
            </TouchableOpacity>
          </View>
          {contentMode === 'html' ? (
            <>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>HTML body</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder={'<h1>Hi {{first_name}}</h1>...'}
                placeholderTextColor={theme.text.tertiary}
                value={html}
                onChangeText={setHtml}
                onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
                  const { start, end } = e.nativeEvent.selection;
                  setSelection({ start, end });
                }}
                multiline
              />
            </>
          ) : (
            <View style={[styles.previewWrap, { backgroundColor: theme.background.secondary }]}>
              <WebView
                source={{ html: wrapEmailHtml(applySampleVariables(html || '<p>No content</p>')) }}
                style={styles.previewWebView}
                scrollEnabled
                nestedScrollEnabled
                showsVerticalScrollIndicator
                originWhitelist={['*']}
              />
            </View>
          )}
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.accent.primary, marginTop: 20 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>Create template</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { borderRadius: 20, padding: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  sectionHeader: { padding: 18, borderRadius: 14, marginBottom: 20, marginHorizontal: -2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 14, marginTop: 4, opacity: 0.9 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 12 },
  variableHint: { fontSize: 12, marginTop: 16, marginBottom: 8 },
  variableRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  varChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  varChipText: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  varChipDesc: { fontSize: 11, marginTop: 2 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  textArea: { minHeight: 180, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  chipText: { fontSize: 14, fontWeight: '700' },
  previewWrap: { height: 360, borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  previewWebView: { flex: 1 },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnPrimary: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  btnText: { fontWeight: '600', fontSize: 15 },
});
