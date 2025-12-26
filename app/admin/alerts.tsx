import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react-native';
import type { AlertRule } from '@/types/super-admin';

export default function AlertsManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;

      if (data) {
        setAlerts(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          conditionType: row.condition_type,
          thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : undefined,
          thresholdPercentage: row.threshold_percentage ? parseFloat(row.threshold_percentage) : undefined,
          thresholdDays: row.threshold_days,
          messageTemplate: row.message_template,
          actionTemplate: row.action_template,
          bookReference: row.book_reference,
          isActive: row.is_active,
          priority: row.priority,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertIcon = (type: AlertRule['type']) => {
    switch (type) {
      case 'danger':
        return <AlertCircle size={20} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'info':
        return <Info size={20} color="#3B82F6" />;
      case 'success':
        return <CheckCircle size={20} color="#10B981" />;
      default:
        return <AlertCircle size={20} color="#64748B" />;
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
          Alert Rules
        </Text>
        <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Alert rule creation UI coming soon')}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No alert rules yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              Create your first alert rule to get started
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View
              key={alert.id}
              style={[styles.alertCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.alertHeader}>
                {getAlertIcon(alert.type)}
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertName, { color: theme.text.primary }]}>
                    {alert.name}
                  </Text>
                  <Text style={[styles.alertCondition, { color: theme.text.secondary }]}>
                    {alert.conditionType.replace('_', ' ')}
                    {alert.thresholdPercentage && ` (${alert.thresholdPercentage}%)`}
                    {alert.thresholdValue && ` (${alert.thresholdValue})`}
                    {alert.thresholdDays && ` (${alert.thresholdDays} days)`}
                  </Text>
                </View>
                <View style={[styles.badge, { 
                  backgroundColor: alert.isActive ? '#10B98120' : '#64748B20' 
                }]}>
                  <Text style={[styles.badgeText, { 
                    color: alert.isActive ? '#10B981' : '#64748B' 
                  }]}>
                    {alert.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.alertContent}>
                <Text style={[styles.alertMessage, { color: theme.text.primary }]}>
                  {alert.messageTemplate}
                </Text>
                {alert.actionTemplate && (
                  <Text style={[styles.alertAction, { color: theme.text.secondary }]}>
                    Action: {alert.actionTemplate}
                  </Text>
                )}
                {alert.bookReference && (
                  <View style={styles.bookRef}>
                    <Text style={[styles.bookRefText, { color: theme.accent.primary }]}>
                      📖 {alert.bookReference.chapterTitle} (Ch. {alert.bookReference.chapter})
                    </Text>
                  </View>
                )}
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
  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertCondition: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertContent: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  alertAction: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bookRef: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
  },
  bookRefText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

