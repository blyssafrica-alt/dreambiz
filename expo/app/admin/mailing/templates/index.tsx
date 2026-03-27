import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, ChevronRight, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type Template = {
  id: string;
  name: string;
  created_at: string;
};

export default function AdminMailingTemplatesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) setList(data as Template[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Templates"
        subtitle="Reusable email templates"
        showLogo={false}
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={() => router.push('/admin/mailing/templates/new' as any)}>
            <Plus size={24} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
              <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.emptyIconWrap}>
                <FileText size={64} color="#0EA5E9" strokeWidth={1.5} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No templates yet</Text>
              <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>Create your first template or run admin_mailing_seed_templates.sql for starter templates.</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.push('/admin/mailing/templates/new' as any)} activeOpacity={0.85}>
                <Plus size={20} color="#FFF" />
                <Text style={styles.emptyBtnText}>Create template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            list.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push(`/admin/mailing/templates/${t.id}` as any)}
                activeOpacity={0.88}
              >
                <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.cardIcon}>
                  <FileText size={26} color="#0EA5E9" strokeWidth={2} />
                </LinearGradient>
                <View style={styles.cardContent}>
                  <Text style={[styles.name, { color: theme.text.primary }]}>{t.name}</Text>
                  <Text style={[styles.date, { color: theme.text.tertiary }]}>
                    {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <ChevronRight size={22} color={theme.text.tertiary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { padding: 40, borderRadius: 24, alignItems: 'center', marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  date: { fontSize: 13 },
});
