import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react-native';
import type { FeatureConfig } from '@/types/super-admin';

export default function FeaturesManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { refreshFeatures } = useFeatures();
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('feature_config')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      if (data) {
        setFeatures(data.map((row: any) => ({
          id: row.id,
          featureId: row.feature_id,
          name: row.name,
          description: row.description,
          category: row.category,
          visibility: row.visibility || {},
          access: row.access || {},
          enabled: row.enabled,
          enabledByDefault: row.enabled_by_default,
          canBeDisabled: row.can_be_disabled,
          updatedBy: row.updated_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = async (featureId: string, enabled: boolean) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feature_config')
        .update({ 
          enabled,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('feature_id', featureId);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.featureId === featureId ? { ...f, enabled } : f
      ));

      // CRITICAL: Refresh the FeatureContext so all users see the changes immediately
      await refreshFeatures();

      // Show success feedback
      Alert.alert(
        'Success', 
        `${featureId} has been ${enabled ? 'enabled' : 'disabled'}. Changes are now live for all users.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to toggle feature:', error);
      Alert.alert(
        'Error',
        `Failed to ${enabled ? 'enable' : 'disable'} feature: ${error?.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Feature Management
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.description, { color: theme.text.secondary }]}>
          Enable or disable features globally. Changes affect all users.
        </Text>

        {features.map((feature) => (
          <View
            key={feature.id}
            style={[styles.featureCard, { backgroundColor: theme.background.card }]}
          >
            <View style={styles.featureHeader}>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureName, { color: theme.text.primary }]}>
                  {feature.name}
                </Text>
                {feature.description && (
                  <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                    {feature.description}
                  </Text>
                )}
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                    <Text style={[styles.badgeText, { color: theme.accent.info }]}>
                      {feature.category}
                    </Text>
                  </View>
                  {feature.visibility.showAsTab && (
                    <View style={[styles.badge, { backgroundColor: theme.surface.success }]}>
                      <Text style={[styles.badgeText, { color: theme.accent.success }]}>
                        Tab
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Switch
                value={feature.enabled}
                onValueChange={(enabled) => toggleFeature(feature.featureId, enabled)}
                disabled={!feature.canBeDisabled}
                trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                thumbColor="#FFF"
              />
            </View>

            {feature.access.requiresBook && feature.access.requiresBook.length > 0 && (
              <View style={styles.accessInfo}>
                <Text style={[styles.accessLabel, { color: theme.text.secondary }]}>
                  Requires Book:
                </Text>
                <Text style={[styles.accessValue, { color: theme.text.primary }]}>
                  {feature.access.requiresBook.join(', ')}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  featureCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featureInfo: {
    flex: 1,
    marginRight: 16,
  },
  featureName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accessInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  accessLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  accessValue: {
    fontSize: 14,
  },
});

