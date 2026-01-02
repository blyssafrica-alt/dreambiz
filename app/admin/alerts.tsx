import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, AlertCircle, AlertTriangle, Info, CheckCircle, X, Save, Trash2, Edit } from 'lucide-react-native';
import type { AlertRule } from '@/types/super-admin';

export default function AlertsManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'warning' as AlertRule['type'],
    conditionType: 'threshold_value',
    thresholdValue: '',
    thresholdPercentage: '',
    thresholdDays: '',
    messageTemplate: '',
    actionTemplate: '',
    isActive: true,
    priority: '5',
  });

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
        setAlerts(
          data.map((row: any) => ({
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
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (alert?: AlertRule) => {
    if (alert) {
      setEditingAlert(alert);
      setFormData({
        name: alert.name,
        type: alert.type,
        conditionType: alert.conditionType,
        thresholdValue: alert.thresholdValue?.toString() || '',
        thresholdPercentage: alert.thresholdPercentage?.toString() || '',
        thresholdDays: alert.thresholdDays?.toString() || '',
        messageTemplate: alert.messageTemplate,
        actionTemplate: alert.actionTemplate || '',
        isActive: alert.isActive,
        priority: alert.priority.toString(),
      });
    } else {
      setEditingAlert(null);
      setFormData({
        name: '',
        type: 'warning',
        conditionType: 'threshold_value',
        thresholdValue: '',
        thresholdPercentage: '',
        thresholdDays: '',
        messageTemplate: '',
        actionTemplate: '',
        isActive: true,
        priority: '5',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.messageTemplate) {
      Alert.alert('Error', 'Please fill in name and message template');
      return;
    }

    try {
      const alertData: any = {
        name: formData.name,
        type: formData.type,
        condition_type: formData.conditionType,
        message_template: formData.messageTemplate,
        action_template: formData.actionTemplate || null,
        is_active: formData.isActive,
        priority: parseInt(formData.priority),
        created_by: user?.id,
      };

      if (formData.thresholdValue) alertData.threshold_value = parseFloat(formData.thresholdValue);
      if (formData.thresholdPercentage) alertData.threshold_percentage = parseFloat(formData.thresholdPercentage);
      if (formData.thresholdDays) alertData.threshold_days = parseInt(formData.thresholdDays);

      if (editingAlert) {
        const { error } = await supabase.from('alert_rules').update(alertData).eq('id', editingAlert.id);
        if (error) throw error;
        Alert.alert('Success', 'Alert rule updated successfully');
      } else {
        const { error } = await supabase.from('alert_rules').insert(alertData);
        if (error) throw error;
        Alert.alert('Success', 'Alert rule created successfully');
      }

      setShowModal(false);
      loadAlerts();
    } catch (error) {
      console.error('Failed to save alert:', error);
      Alert.alert('Error', 'Failed to save alert rule');
    }
  };

  const handleDelete = async (alertId: string) => {
    Alert.alert('Delete Alert Rule', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('alert_rules').delete().eq('id', alertId);
            if (error) throw error;
            Alert.alert('Success', 'Alert rule deleted');
            loadAlerts();
          } catch (error) {
            console.error('Failed to delete alert:', error);
            Alert.alert('Error', 'Failed to delete alert rule');
          }
        },
      },
    ]);
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Alert Rules</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No alert rules yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>Create your first alert rule to get started</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={[styles.alertCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.alertHeader}>
                {getAlertIcon(alert.type)}
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertName, { color: theme.text.primary }]}>{alert.name}</Text>
                  <Text style={[styles.alertCondition, { color: theme.text.secondary }]}>
                    {alert.conditionType.replace('_', ' ')}
                    {alert.thresholdPercentage && ` (${alert.thresholdPercentage}%)`}
                    {alert.thresholdValue && ` (${alert.thresholdValue})`}
                    {alert.thresholdDays && ` (${alert.thresholdDays} days)`}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: alert.isActive ? '#10B98120' : '#64748B20' }]}>
                  <Text style={[styles.badgeText, { color: alert.isActive ? '#10B981' : '#64748B' }]}>
                    {alert.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.alertActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => handleOpenModal(alert)}
                  >
                    <Edit size={18} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => handleDelete(alert.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.alertContent}>
                <Text style={[styles.alertMessage, { color: theme.text.primary }]}>{alert.messageTemplate}</Text>
                {alert.actionTemplate && (
                  <Text style={[styles.alertAction, { color: theme.text.secondary }]}>Action: {alert.actionTemplate}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Alert Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingAlert ? 'Edit Alert Rule' : 'Create Alert Rule'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Alert rule name"
                placeholderTextColor={theme.text.tertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Type</Text>
              <View style={styles.typeButtons}>
                {(['danger', 'warning', 'info', 'success'] as AlertRule['type'][]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, { backgroundColor: formData.type === type ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.type === type ? '#FFF' : theme.text.primary }]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Message Template *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Alert message"
                placeholderTextColor={theme.text.tertiary}
                value={formData.messageTemplate}
                onChangeText={(text) => setFormData({ ...formData, messageTemplate: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Action Template</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Suggested action"
                placeholderTextColor={theme.text.tertiary}
                value={formData.actionTemplate}
                onChangeText={(text) => setFormData({ ...formData, actionTemplate: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Priority (1-10)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="5"
                placeholderTextColor={theme.text.tertiary}
                value={formData.priority}
                onChangeText={(text) => setFormData({ ...formData, priority: text })}
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent.primary }]} onPress={handleSave}>
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  alertCard: { padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  alertCondition: { fontSize: 12, textTransform: 'capitalize' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  alertActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  alertContent: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  alertMessage: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  alertAction: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 500 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 4 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  typeButtonText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
