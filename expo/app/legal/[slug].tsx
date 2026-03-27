import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

interface LegalPage {
  title: string;
  content: string;
}

export default function LegalPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme } = useTheme();
  const [page, setPage] = useState<LegalPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('legal_pages')
        .select('title, content')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPage({ title: data.title, content: data.content });
      } else {
        setPage(null);
      }
    } catch (error) {
      console.error('Failed to load legal page:', error);
      setPage(null);
    } finally {
      setIsLoading(false);
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
      <Stack.Screen options={{ title: page?.title || 'Legal' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text.primary }]}>
          {page?.title || 'Legal'}
        </Text>
        <Text style={[styles.body, { color: theme.text.secondary }]}>
          {page?.content || 'This legal page is not available.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 14, lineHeight: 20 },
});

