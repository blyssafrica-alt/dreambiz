import { Stack } from 'expo-router';
import { 
  Plus, 
  Calendar,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react-native';
import { useState, useMemo } from 'react';
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

interface Appointment {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  service: string;
  date: string;
  time: string;
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export default function AppointmentsScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = useBusiness(); // Context hook - values not needed yet
  const { theme } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Appointment['status']>('all');

  const filteredAppointments = useMemo(() => {
    if (filterStatus === 'all') return appointments;
    return appointments.filter(a => a.status === filterStatus);
  }, [appointments, filterStatus]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => {
        const appointmentDate = new Date(`${a.date}T${a.time}`);
        return appointmentDate > now && a.status !== 'cancelled' && a.status !== 'completed';
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
  }, [appointments]);

  const handleSave = () => {
    if (!customerName || !service || !date || !time) {
      RNAlert.alert('Missing Fields', 'Please fill in customer name, service, date, and time');
      return;
    }

    const appointment: Appointment = {
      id: editingId || Date.now().toString(),
      customerName,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      service,
      date,
      time,
      duration: parseInt(duration) || 60,
      status: editingId ? appointments.find(a => a.id === editingId)?.status || 'scheduled' : 'scheduled',
      notes: notes || undefined,
      createdAt: editingId ? appointments.find(a => a.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    };

    if (editingId) {
      setAppointments(appointments.map(a => a.id === editingId ? appointment : a));
    } else {
      setAppointments([...appointments, appointment]);
    }

    handleCloseModal();
    RNAlert.alert('Success', editingId ? 'Appointment updated' : 'Appointment scheduled');
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAppointments(appointments.filter(a => a.id !== id));
          },
        },
      ]
    );
  };

  const handleStatusChange = (id: string, newStatus: Appointment['status']) => {
    setAppointments(appointments.map(a => 
      a.id === id ? { ...a, status: newStatus } : a
    ));
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setCustomerName(appointment.customerName);
    setCustomerPhone(appointment.customerPhone || '');
    setCustomerEmail(appointment.customerEmail || '');
    setService(appointment.service);
    setDate(appointment.date);
    setTime(appointment.time);
    setDuration(appointment.duration.toString());
    setNotes(appointment.notes || '');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setService('');
    setDate('');
    setTime('');
    setDuration('60');
    setNotes('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Appointments', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Appointments</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
            {upcomingAppointments.length} upcoming
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
        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Upcoming</Text>
            {upcomingAppointments.slice(0, 3).map(appointment => (
              <View
                key={appointment.id}
                style={[styles.appointmentCard, { backgroundColor: theme.background.card }]}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={[styles.appointmentCustomer, { color: theme.text.primary }]}>
                      {appointment.customerName}
                    </Text>
                    <Text style={[styles.appointmentService, { color: theme.text.secondary }]}>
                      {appointment.service}
                    </Text>
                    <View style={styles.appointmentDateTime}>
                      <Calendar size={14} color={theme.text.tertiary} />
                      <Text style={[styles.appointmentDate, { color: theme.text.tertiary }]}>
                        {formatDate(appointment.date)} at {appointment.time}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(appointment.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                      {appointment.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.appointmentActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleStatusChange(appointment.id, 'confirmed')}
                  >
                    <CheckCircle size={18} color={theme.accent.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(appointment)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(appointment.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* All Appointments */}
        <View style={styles.section}>
          <View style={styles.filterRow}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>All Appointments</Text>
            <View style={styles.filterButtons}>
              {(['all', 'scheduled', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    { backgroundColor: filterStatus === status ? theme.accent.primary : theme.background.secondary },
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: filterStatus === status ? '#FFF' : theme.text.secondary },
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                No appointments {filterStatus !== 'all' ? `with status "${filterStatus}"` : ''}
              </Text>
            </View>
          ) : (
            filteredAppointments.map(appointment => (
              <View
                key={appointment.id}
                style={[styles.appointmentCard, { backgroundColor: theme.background.card }]}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={[styles.appointmentCustomer, { color: theme.text.primary }]}>
                      {appointment.customerName}
                    </Text>
                    <Text style={[styles.appointmentService, { color: theme.text.secondary }]}>
                      {appointment.service}
                    </Text>
                    <View style={styles.appointmentDateTime}>
                      <Calendar size={14} color={theme.text.tertiary} />
                      <Text style={[styles.appointmentDate, { color: theme.text.tertiary }]}>
                        {formatDate(appointment.date)} at {appointment.time} ({appointment.duration} min)
                      </Text>
                    </View>
                    {appointment.notes && (
                      <Text style={[styles.appointmentNotes, { color: theme.text.tertiary }]}>
                        {appointment.notes}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(appointment.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                      {appointment.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.appointmentActions}>
                  {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleStatusChange(appointment.id, 'completed')}
                    >
                      <CheckCircle size={18} color={theme.accent.success} />
                    </TouchableOpacity>
                  )}
                  {appointment.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleStatusChange(appointment.id, 'cancelled')}
                    >
                      <XCircle size={18} color={theme.accent.danger} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(appointment)}
                  >
                    <Edit2 size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(appointment.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
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
                {editingId ? 'Edit Appointment' : 'New Appointment'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Customer Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Service *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={service}
                  onChangeText={setService}
                  placeholder="e.g., Haircut, Consultation"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Date *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Time *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={time}
                    onChangeText={setTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Duration (minutes)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="60"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Customer Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Customer Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  placeholder="Enter email"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="email-address"
                />
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentCustomer: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentService: {
    fontSize: 14,
    marginBottom: 8,
  },
  appointmentDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 12,
  },
  appointmentNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
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
  inputRow: {
    flexDirection: 'row',
    gap: 12,
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
  cancelButton: {
    // Styled via backgroundColor
  },
  saveButton: {
    // Styled via backgroundColor
  },
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

