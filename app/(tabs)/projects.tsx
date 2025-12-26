import { Stack } from 'expo-router';
import { 
  Plus, 
  FolderKanban,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Calendar,
  DollarSign,
  User
} from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Project } from '@/types/business';

export default function ProjectsScreen() {
  const { business, projects, addProject, updateProject, deleteProject } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [progress, setProgress] = useState('0');
  const [notes, setNotes] = useState('');

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const handleSave = async () => {
    if (!name) {
      RNAlert.alert('Missing Fields', 'Please enter project name');
      return;
    }

    const progressNum = parseFloat(progress) || 0;
    if (progressNum < 0 || progressNum > 100) {
      RNAlert.alert('Invalid Progress', 'Progress must be between 0 and 100');
      return;
    }

    try {
      if (editingId) {
        await updateProject(editingId, {
          name,
          description: description || undefined,
          clientName: clientName || undefined,
          status,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          budget: budget ? parseFloat(budget) : undefined,
          currency: business?.currency || 'USD',
          progress: progressNum,
          notes: notes || undefined,
        });
      } else {
        await addProject({
          name,
          description: description || undefined,
          clientName: clientName || undefined,
          status,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          budget: budget ? parseFloat(budget) : undefined,
          currency: business?.currency || 'USD',
          progress: progressNum,
          notes: notes || undefined,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Project updated' : 'Project added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save project');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description || '');
    setClientName(project.clientName || '');
    setStatus(project.status);
    setStartDate(project.startDate || '');
    setEndDate(project.endDate || '');
    setBudget(project.budget?.toString() || '');
    setProgress(project.progress.toString());
    setNotes(project.notes || '');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Project',
      'Are you sure you want to delete this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setClientName('');
    setStatus('planning');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setProgress('0');
    setNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return { bg: theme.surface.info, text: theme.accent.info };
      case 'active': return { bg: theme.surface.success, text: theme.accent.success };
      case 'on_hold': return { bg: theme.surface.warning, text: theme.accent.warning };
      case 'completed': return { bg: '#D1FAE5', text: '#065F46' };
      case 'cancelled': return { bg: theme.surface.danger, text: theme.accent.danger };
      default: return { bg: theme.background.secondary, text: theme.text.tertiary };
    }
  };

  const getStatusIcon = (status: string) => {
    const colors = getStatusColor(status);
    switch (status) {
      case 'planning': return <Calendar size={16} color={colors.text} />;
      case 'active': return <Clock size={16} color={colors.text} />;
      case 'on_hold': return <AlertCircle size={16} color={colors.text} />;
      case 'completed': return <CheckCircle size={16} color={colors.text} />;
      case 'cancelled': return <X size={16} color={colors.text} />;
      default: return null;
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Projects', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Projects</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
            {activeProjects.length} active, {completedProjects.length} completed
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <FolderKanban size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No projects yet
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Your First Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          projects.map(project => (
            <View key={project.id} style={[styles.projectCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.projectHeader}>
                <View style={styles.projectInfo}>
                  <Text style={[styles.projectName, { color: theme.text.primary }]}>
                    {project.name}
                  </Text>
                  {project.clientName && (
                    <View style={styles.clientRow}>
                      <User size={14} color={theme.text.tertiary} />
                      <Text style={[styles.clientText, { color: theme.text.secondary }]}>
                        {project.clientName}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.projectActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(project)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(project.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {project.description && (
                <Text style={[styles.projectDescription, { color: theme.text.secondary }]}>
                  {project.description}
                </Text>
              )}

              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status).bg }]}>
                {getStatusIcon(project.status)}
                <Text style={[styles.statusText, { color: getStatusColor(project.status).text }]}>
                  {project.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: theme.text.secondary }]}>Progress</Text>
                  <Text style={[styles.progressValue, { color: theme.accent.primary }]}>
                    {project.progress}%
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.background.secondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${project.progress}%`,
                        backgroundColor: theme.accent.primary,
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.projectDetails}>
                {project.budget && (
                  <View style={styles.detailRow}>
                    <DollarSign size={16} color={theme.text.tertiary} />
                    <Text style={[styles.detailText, { color: theme.text.secondary }]}>
                      Budget: {formatCurrency(project.budget)}
                    </Text>
                  </View>
                )}
                {project.startDate && (
                  <View style={styles.detailRow}>
                    <Calendar size={16} color={theme.text.tertiary} />
                    <Text style={[styles.detailText, { color: theme.text.secondary }]}>
                      {new Date(project.startDate).toLocaleDateString()} 
                      {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Project' : 'New Project'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Project Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter project name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Client Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Enter client name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Project description"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Status</Text>
                <View style={styles.statusOptions}>
                  {(['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: status === s ? theme.accent.primary : theme.background.secondary,
                        }
                      ]}
                      onPress={() => setStatus(s)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        { color: status === s ? '#fff' : theme.text.primary }
                      ]}>
                        {s.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Start Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>End Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Budget</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={budget}
                    onChangeText={setBudget}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Progress (%)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={progress}
                    onChangeText={setProgress}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  projectCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientText: {
    fontSize: 14,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  projectDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  projectDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
