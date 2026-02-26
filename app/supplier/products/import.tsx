import { useRouter } from 'expo-router';
import { ArrowLeft, FileUp, Package } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ParsedRow = {
  name: string;
  price?: string;
  short_description?: string;
  description?: string;
  currency?: string;
  min_order_qty?: string;
  sku?: string;
  unit_type?: string;
  availability_status?: string;
};

function parseCSV(content: string): ParsedRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const cols = header.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  const nameIdx = cols.findIndex((c) => c === 'name' || c === 'product name' || c === 'product_name');
  const priceIdx = cols.findIndex((c) => c === 'price' || c === 'unit price');
  const shortDescIdx = cols.findIndex((c) => c === 'short_description' || c === 'short description');
  const descIdx = cols.findIndex((c) => c === 'description');
  const currencyIdx = cols.findIndex((c) => c === 'currency');
  const moqIdx = cols.findIndex((c) => c === 'min_order_qty' || c === 'moq' || c === 'min order qty');
  const skuIdx = cols.findIndex((c) => c === 'sku');
  const unitIdx = cols.findIndex((c) => c === 'unit_type' || c === 'unit' || c === 'unit type');
  const availIdx = cols.findIndex((c) => c === 'availability_status' || c === 'availability');

  if (nameIdx < 0) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if ((ch === ',' && !inQuotes) || ch === '\t') {
        result.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    result.push(cur.trim());
    return result;
  };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    const name = (cells[nameIdx] ?? '').trim().replace(/^"|"$/g, '');
    if (!name) continue;
    rows.push({
      name,
      price: priceIdx >= 0 ? (cells[priceIdx] ?? '').trim() : undefined,
      short_description: (shortDescIdx >= 0 ? cells[shortDescIdx] : undefined)?.trim().replace(/^"|"$/g, ''),
      description: (descIdx >= 0 ? cells[descIdx] : undefined)?.trim().replace(/^"|"$/g, ''),
      currency: currencyIdx >= 0 ? (cells[currencyIdx] ?? 'USD').trim() || 'USD' : 'USD',
      min_order_qty: moqIdx >= 0 ? (cells[moqIdx] ?? '1').trim() || '1' : '1',
      sku: skuIdx >= 0 ? (cells[skuIdx] ?? '').trim() : undefined,
      unit_type: unitIdx >= 0 ? (cells[unitIdx] ?? 'unit').trim() || 'unit' : 'unit',
      availability_status: availIdx >= 0 ? (cells[availIdx] ?? 'in_stock').trim() || 'in_stock' : 'in_stock',
    });
  }
  return rows;
}

export default function SupplierProductImportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      setProfileId(data?.id ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/csv'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setFileName(result.assets[0].name);
      const content = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
      const parsed = parseCSV(content);
      if (parsed.length === 0) {
        RNAlert.alert('No valid rows', 'CSV must have a "name" column and at least one data row.');
        return;
      }
      setRows(parsed);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not read file');
    }
  };

  const doImport = async () => {
    if (!profileId || rows.length === 0) return;
    setImporting(true);
    try {
      let ok = 0;
      let err = 0;
      for (const r of rows) {
        const slug = (r.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'product') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const { error } = await supabase.from('supplier_marketplace_products').insert({
          supplier_profile_id: profileId,
          name: r.name,
          slug,
          short_description: r.short_description || r.description || '',
          description: r.description || r.short_description || '',
          price: r.price ? parseFloat(r.price) : null,
          currency: r.currency || 'USD',
          min_order_qty: parseInt(r.min_order_qty || '1', 10) || 1,
          sku: r.sku || null,
          unit_type: r.unit_type || 'unit',
          availability_status: ['in_stock', 'low_stock', 'out_of_stock', 'on_order'].includes(r.availability_status || '') ? r.availability_status : 'in_stock',
          image_urls: [],
          tier_prices: [],
          status: 'draft',
        });
        if (error) err++;
        else ok++;
      }
      RNAlert.alert('Import complete', `${ok} product(s) imported as drafts.${err ? ` ${err} failed.` : ''}`, [
        { text: 'OK', onPress: () => router.replace('/supplier/products' as any) },
      ]);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const clearPreview = () => {
    setRows([]);
    setFileName(null);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!profileId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>No approved supplier profile.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="Import products"
        subtitle="Upload CSV"
        icon={FileUp}
        iconGradient={['#6366F1', '#4F46E5']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.title, { color: theme.text.primary }]}>CSV format</Text>
          <Text style={[styles.hint, { color: theme.text.tertiary }]}>
            Required: name{'\n'}
            Optional: price, short_description, description, currency, min_order_qty, sku, unit_type, availability_status
          </Text>
          <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: theme.accent.primary }]} onPress={pickFile} disabled={importing}>
            <FileUp size={22} color="#FFF" />
            <Text style={styles.uploadBtnText}>Choose CSV file</Text>
          </TouchableOpacity>
          {fileName && (
            <Text style={[styles.fileName, { color: theme.text.secondary }]}>{fileName}</Text>
          )}
        </View>

        {rows.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.title, { color: theme.text.primary }]}>{rows.length} product(s) ready</Text>
              <TouchableOpacity onPress={clearPreview}>
                <Text style={[styles.clearBtn, { color: theme.accent.danger }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.previewList} nestedScrollEnabled>
              {rows.slice(0, 20).map((r, i) => (
                <View key={i} style={[styles.previewRow, { borderBottomColor: theme.border.medium }]}>
                  <Package size={18} color={theme.text.tertiary} />
                  <View style={styles.previewRowBody}>
                    <Text style={[styles.previewName, { color: theme.text.primary }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={[styles.previewMeta, { color: theme.text.tertiary }]}>{r.price ? `${r.currency || 'USD'} ${r.price}` : 'No price'} · MOQ {r.min_order_qty || 1}</Text>
                  </View>
                </View>
              ))}
              {rows.length > 20 && (
                <Text style={[styles.moreRows, { color: theme.text.tertiary }]}>... and {rows.length - 20} more</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: theme.accent.primary }]} onPress={doImport} disabled={importing}>
              {importing ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.importBtnText}>Import as drafts</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start' },
  uploadBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  fileName: { fontSize: 13, marginTop: 8 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clearBtn: { fontSize: 14, fontWeight: '600' },
  previewList: { maxHeight: 280, marginBottom: 16 },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  previewRowBody: { flex: 1 },
  previewName: { fontSize: 15, fontWeight: '500' },
  previewMeta: { fontSize: 12, marginTop: 2 },
  moreRows: { fontSize: 13, marginTop: 8 },
  importBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  importBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
