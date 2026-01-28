import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Save, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface StoreMetadataForm {
  privacyPolicyUrl: string;
  termsUrl: string;
  supportUrl: string;
  description: string;
  keywords: string[];
  screenshots: string[];
}

export default function StoreMetadataScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [screenshotInput, setScreenshotInput] = useState('');
  const [formData, setFormData] = useState<StoreMetadataForm>({
    privacyPolicyUrl: '',
    termsUrl: '',
    supportUrl: '',
    description: '',
    keywords: [],
    screenshots: [],
  });

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_store_metadata')
        .select('*')
        .eq('key', 'default')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasExisting(true);
        const keywords = Array.isArray(data.keywords) ? data.keywords : [];
        const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];
        setFormData({
          privacyPolicyUrl: data.privacy_policy_url || '',
          termsUrl: data.terms_url || '',
          supportUrl: data.support_url || '',
          description: data.description || '',
          keywords,
          screenshots,
        });
        setKeywordsInput(keywords.join(', '));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load store metadata');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddScreenshot = () => {
    const trimmed = screenshotInput.trim();
    if (!trimmed) return;
    setFormData(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, trimmed],
    }));
    setScreenshotInput('');
  };

  const handleRemoveScreenshot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const keywords = keywordsInput
        .split(',')
        .map(word => word.trim())
        .filter(Boolean);

      const payload = {
        key: 'default',
        privacy_policy_url: formData.privacyPolicyUrl.trim() || null,
        terms_url: formData.termsUrl.trim() || null,
        support_url: formData.supportUrl.trim() || null,
        description: formData.description.trim() || null,
        keywords,
        screenshots: formData.screenshots,
        updated_by: user.id,
        ...(hasExisting ? {} : { created_by: user.id }),
      };

      const { error } = await supabase
        .from('app_store_metadata')
        .upsert(payload, { onConflict: 'key' });

      if (error) throw error;

      setFormData(prev => ({ ...prev, keywords }));
      setHasExisting(true);
      Alert.alert('Success', 'Store metadata saved.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save store metadata');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Store Metadata</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Save size={22} color={isSaving ? theme.text.muted : theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Legal URLs</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
          placeholder="Privacy Policy URL"
          placeholderTextColor={theme.text.muted}
          value={formData.privacyPolicyUrl}
          onChangeText={(text) => setFormData(prev => ({ ...prev, privacyPolicyUrl: text }))}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
          placeholder="Terms of Service URL"
          placeholderTextColor={theme.text.muted}
          value={formData.termsUrl}
          onChangeText={(text) => setFormData(prev => ({ ...prev, termsUrl: text }))}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
          placeholder="Support URL"
          placeholderTextColor={theme.text.muted}
          value={formData.supportUrl}
          onChangeText={(text) => setFormData(prev => ({ ...prev, supportUrl: text }))}
          autoCapitalize="none"
        />

        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Store Description</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.background.card, color: theme.text.primary }]}
          placeholder="App store description"
          placeholderTextColor={theme.text.muted}
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
        />

        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Keywords</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
          placeholder="Comma-separated keywords"
          placeholderTextColor={theme.text.muted}
          value={keywordsInput}
          onChangeText={setKeywordsInput}
          autoCapitalize="none"
        />
        {formData.keywords.length > 0 && (
          <Text style={[styles.helperText, { color: theme.text.secondary }]}>
            Saved keywords: {formData.keywords.join(', ')}
          </Text>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Screenshots</Text>
        <View style={styles.screenshotRow}>
          <TextInput
            style={[styles.input, styles.screenshotInput, { backgroundColor: theme.background.card, color: theme.text.primary }]}
            placeholder="Screenshot URL"
            placeholderTextColor={theme.text.muted}
            value={screenshotInput}
            onChangeText={setScreenshotInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
            onPress={handleAddScreenshot}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {formData.screenshots.map((url, index) => (
          <View key={`${url}-${index}`} style={[styles.screenshotItem, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.screenshotText, { color: theme.text.primary }]} numberOfLines={1}>
              {url}
            </Text>
            <TouchableOpacity onPress={() => handleRemoveScreenshot(index)}>
              <X size={18} color={theme.accent.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Metadata'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 12,
  },
  screenshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenshotInput: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  screenshotText: {
    flex: 1,
    marginRight: 12,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});


