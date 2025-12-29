import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, FileText, Edit } from 'lucide-react-native';
import type { DocumentTemplate } from '@/types/super-admin';

export default function TemplatesManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('document_type', { ascending: true });

      if (error) throw error;

      if (data) {
        setTemplates(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          documentType: row.document_type,
          businessType: row.business_type,
          templateData: row.template_data,
          requiredFields: row.required_fields || [],
          numberingRule: row.numbering_rule,
          isActive: row.is_active,
          version: row.version,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
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
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Document Templates
        </Text>
        <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Template creation UI coming soon')}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No templates yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              Create your first template to get started
            </Text>
          </View>
        ) : (
          templates.map((template) => (
            <View
              key={template.id}
              style={[styles.templateCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, { color: theme.text.primary }]}>
                    {template.name}
                  </Text>
                  <View style={styles.templateMeta}>
                    <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                      <Text style={[styles.badgeText, { color: theme.accent.info }]}>
                        {template.documentType.replace('_', ' ')}
                      </Text>
                    </View>
                    {template.businessType && (
                      <View style={[styles.badge, { backgroundColor: theme.surface.success }]}>
                        <Text style={[styles.badgeText, { color: theme.accent.success }]}>
                          {template.businessType}
                        </Text>
                      </View>
                    )}
                    {template.isActive && (
                      <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>
                          Active
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.version, { color: theme.text.secondary }]}>
                      v{template.version}
                    </Text>
                  </View>
                  {template.requiredFields.length > 0 && (
                    <Text style={[styles.requiredFields, { color: theme.text.secondary }]}>
                      Required: {template.requiredFields.join(', ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={[styles.editButton, { backgroundColor: theme.surface.info }]}
                  onPress={() => Alert.alert('Coming Soon', 'Template editor coming soon')}
                >
                  <Edit size={18} color={theme.accent.info} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateInfo: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  version: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  requiredFields: {
    fontSize: 12,
    marginTop: 4,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

