import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  DollarSign,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  CreditCard,
  Smartphone,
  Building2,
  Save,
  Calendar,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';

interface POSShift {
  id: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string | null;
  status: 'open' | 'closed';
  openingCash: number;
  expectedCash: number;
  actualCash: number | null;
  cashAtHand: number | null;
  cashDiscrepancy: number | null;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  mobileMoneySales: number;
  bankTransferSales: number;
  totalTransactions: number;
  totalReceipts: number;
  totalDiscounts: number;
  currency: string;
  notes: string | null;
  discrepancyNotes: string | null;
}

export default function POSDayEndScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [todayShift, setTodayShift] = useState<POSShift | null>(null);
  const [actualCash, setActualCash] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadTodayShift();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadTodayShift = async () => {
    if (!business?.id || !user?.id) return;

    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Check for existing open shift today
      const { data: shiftData, error } = await supabase
        .from('pos_shifts')
        .select('*')
        .eq('business_id', business.id)
        .eq('shift_date', today)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;

      if (shiftData) {
        const shift: POSShift = {
          id: shiftData.id,
          shiftDate: shiftData.shift_date,
          shiftStartTime: shiftData.shift_start_time,
          shiftEndTime: shiftData.shift_end_time,
          status: shiftData.status,
          openingCash: parseFloat(shiftData.opening_cash || '0'),
          expectedCash: parseFloat(shiftData.expected_cash || '0'),
          actualCash: shiftData.actual_cash ? parseFloat(shiftData.actual_cash) : null,
          cashAtHand: shiftData.cash_at_hand ? parseFloat(shiftData.cash_at_hand) : null,
          cashDiscrepancy: shiftData.cash_discrepancy ? parseFloat(shiftData.cash_discrepancy) : null,
          totalSales: parseFloat(shiftData.total_sales || '0'),
          cashSales: parseFloat(shiftData.cash_sales || '0'),
          cardSales: parseFloat(shiftData.card_sales || '0'),
          mobileMoneySales: parseFloat(shiftData.mobile_money_sales || '0'),
          bankTransferSales: parseFloat(shiftData.bank_transfer_sales || '0'),
          totalTransactions: shiftData.total_transactions || 0,
          totalReceipts: shiftData.total_receipts || 0,
          totalDiscounts: parseFloat(shiftData.total_discounts || '0'),
          currency: shiftData.currency || business.currency || 'USD',
          notes: shiftData.notes || null,
          discrepancyNotes: shiftData.discrepancy_notes || null,
        };
        setTodayShift(shift);
        if (shift.actualCash !== null) {
          setActualCash(shift.actualCash.toString());
        }
        if (shift.discrepancyNotes) {
          setDiscrepancyNotes(shift.discrepancyNotes);
        }
        if (shift.notes) {
          setNotes(shift.notes);
        }
      } else {
        // No open shift, create one
        await createNewShift();
      }
    } catch (error: any) {
      console.error('Failed to load shift:', error);
      Alert.alert('Error', error.message || 'Failed to load shift data');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewShift = async () => {
    if (!business?.id || !user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get last closed shift to get opening cash
      const { data: lastShift } = await supabase
        .from('pos_shifts')
        .select('actual_cash, cash_at_hand')
        .eq('business_id', business.id)
        .eq('status', 'closed')
        .order('shift_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const openingCash = lastShift?.actual_cash || lastShift?.cash_at_hand || 0;

      const { data: shiftData, error } = await supabase
        .from('pos_shifts')
        .insert({
          user_id: user.id,
          business_id: business.id,
          shift_date: today,
          opening_cash: openingCash,
          opened_by: user.id,
          status: 'open',
          currency: business.currency || 'USD',
        })
        .select()
        .single();

      if (error) throw error;

      if (shiftData) {
        const shift: POSShift = {
          id: shiftData.id,
          shiftDate: shiftData.shift_date,
          shiftStartTime: shiftData.shift_start_time,
          shiftEndTime: shiftData.shift_end_time,
          status: shiftData.status,
          openingCash: parseFloat(shiftData.opening_cash || '0'),
          expectedCash: parseFloat(shiftData.expected_cash || '0'),
          actualCash: null,
          cashAtHand: null,
          cashDiscrepancy: null,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0,
          mobileMoneySales: 0,
          bankTransferSales: 0,
          totalTransactions: 0,
          totalReceipts: 0,
          totalDiscounts: 0,
          currency: shiftData.currency || business.currency || 'USD',
          notes: null,
          discrepancyNotes: null,
        };
        setTodayShift(shift);
      }
    } catch (error: any) {
      console.error('Failed to create shift:', error);
      Alert.alert('Error', error.message || 'Failed to create new shift');
    }
  };

  const refreshShiftTotals = async () => {
    if (!todayShift?.id) return;

    try {
      // Call the database function to recalculate totals
      const { error } = await supabase.rpc('calculate_shift_totals', {
        p_shift_id: todayShift.id,
      });

      if (error) throw error;

      // Reload shift data
      await loadTodayShift();
    } catch (error: any) {
      console.error('Failed to refresh totals:', error);
      Alert.alert('Error', error.message || 'Failed to refresh shift totals');
    }
  };

  const handleCloseShift = async () => {
    if (!todayShift?.id || !actualCash) {
      Alert.alert('Error', 'Please enter the actual cash at hand');
      return;
    }

    try {
      setIsSaving(true);
      const cashAtHand = parseFloat(actualCash);
      const discrepancy = cashAtHand - todayShift.expectedCash;

      // First, recalculate totals
      await supabase.rpc('calculate_shift_totals', {
        p_shift_id: todayShift.id,
      });

      // Update shift with closing data
      const { error } = await supabase
        .from('pos_shifts')
        .update({
          actual_cash: cashAtHand,
          cash_at_hand: cashAtHand,
          cash_discrepancy: discrepancy,
          discrepancy_notes: discrepancyNotes || null,
          notes: notes || null,
          shift_end_time: new Date().toISOString(),
          closed_by: user?.id,
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', todayShift.id);

      if (error) throw error;

      Alert.alert('Success', 'Shift closed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setShowCloseModal(false);
            // Create new shift for next day
            createNewShift();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Failed to close shift:', error);
      Alert.alert('Error', error.message || 'Failed to close shift');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = todayShift?.currency || business?.currency || 'USD';
    return `${currency} ${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <PageHeader
          title="Day End Closing"
          subtitle="Cash reconciliation"
          icon={Calculator}
          iconGradient={['#10B981', '#059669']}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading shift data...</Text>
        </View>
      </View>
    );
  }

  if (!todayShift) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <PageHeader
          title="Day End Closing"
          subtitle="Cash reconciliation"
          icon={Calculator}
          iconGradient={['#10B981', '#059669']}
        />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={theme.accent.danger} />
          <Text style={[styles.errorText, { color: theme.text.primary }]}>No shift data available</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.accent.primary }]}
            onPress={loadTodayShift}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const discrepancy = actualCash
    ? parseFloat(actualCash) - todayShift.expectedCash
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <PageHeader
        title="Day End Closing"
        subtitle={`Shift: ${new Date(todayShift.shiftDate).toLocaleDateString()}`}
        icon={Calculator}
        iconGradient={['#10B981', '#059669']}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Shift Status Banner */}
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: todayShift.status === 'open' ? '#10B98120' : '#F59E0B20',
              },
            ]}
          >
            <View style={styles.statusContent}>
              {todayShift.status === 'open' ? (
                <CheckCircle size={24} color="#10B981" />
              ) : (
                <Clock size={24} color="#F59E0B" />
              )}
              <View style={styles.statusTextContainer}>
                <Text
                  style={[
                    styles.statusTitle,
                    {
                      color: todayShift.status === 'open' ? '#10B981' : '#F59E0B',
                    },
                  ]}
                >
                  Shift {todayShift.status === 'open' ? 'Open' : 'Closed'}
                </Text>
                <Text style={[styles.statusSubtitle, { color: theme.text.secondary }]}>
                  Started: {new Date(todayShift.shiftStartTime).toLocaleTimeString()}
                </Text>
              </View>
            </View>
            {todayShift.status === 'open' && (
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: theme.accent.primary }]}
                onPress={refreshShiftTotals}
              >
                <TrendingUp size={16} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Cash Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Cash Summary</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Opening Cash</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.openingCash)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Cash Sales</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  +{formatCurrency(todayShift.cashSales)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border.light }]} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.text.primary }]}>Expected Cash</Text>
                <Text style={[styles.summaryValue, { color: theme.accent.primary, fontWeight: '700' }]}>
                  {formatCurrency(todayShift.expectedCash)}
                </Text>
              </View>
            </View>

            {/* Actual Cash Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text.primary }]}>Actual Cash at Hand</Text>
              <TextInput
                style={[
                  styles.cashInput,
                  {
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor: discrepancy !== null && discrepancy !== 0 ? '#EF4444' : theme.border.light,
                  },
                ]}
                placeholder="Enter cash counted"
                placeholderTextColor={theme.text.tertiary}
                value={actualCash}
                onChangeText={setActualCash}
                keyboardType="decimal-pad"
                editable={todayShift.status === 'open'}
              />
              {actualCash && discrepancy !== null && (
                <View
                  style={[
                    styles.discrepancyBadge,
                    {
                      backgroundColor: discrepancy === 0 ? '#10B98120' : '#EF444420',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.discrepancyText,
                      {
                        color: discrepancy === 0 ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    {discrepancy === 0
                      ? '✓ Balanced'
                      : discrepancy > 0
                      ? `+${formatCurrency(discrepancy)} Over`
                      : `${formatCurrency(Math.abs(discrepancy))} Short`}
                  </Text>
                </View>
              )}
            </View>

            {discrepancy !== null && discrepancy !== 0 && (
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.text.primary }]}>Discrepancy Notes</Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    },
                  ]}
                  placeholder="Explain any discrepancies..."
                  placeholderTextColor={theme.text.tertiary}
                  value={discrepancyNotes}
                  onChangeText={setDiscrepancyNotes}
                  multiline
                  numberOfLines={3}
                  editable={todayShift.status === 'open'}
                />
              </View>
            )}
          </View>

          {/* Sales Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Sales Summary</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Total Sales</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary, fontWeight: '700' }]}>
                  {formatCurrency(todayShift.totalSales)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border.light }]} />

            <View style={styles.paymentMethodRow}>
              <View style={styles.paymentMethodItem}>
                <DollarSign size={20} color="#10B981" />
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Cash</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.cashSales)}
                </Text>
              </View>
              <View style={styles.paymentMethodItem}>
                <CreditCard size={20} color="#3B82F6" />
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Card</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.cardSales)}
                </Text>
              </View>
            </View>

            <View style={styles.paymentMethodRow}>
              <View style={styles.paymentMethodItem}>
                <Smartphone size={20} color="#8B5CF6" />
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Mobile Money</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.mobileMoneySales)}
                </Text>
              </View>
              <View style={styles.paymentMethodItem}>
                <Building2 size={20} color="#F59E0B" />
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Bank Transfer</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.bankTransferSales)}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border.light }]} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Transactions</Text>
                <Text style={[styles.statValue, { color: theme.text.primary }]}>
                  {todayShift.totalTransactions}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Receipts</Text>
                <Text style={[styles.statValue, { color: theme.text.primary }]}>
                  {todayShift.totalReceipts}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Discounts</Text>
                <Text style={[styles.statValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.totalDiscounts)}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes Section */}
          <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Notes</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: theme.background.secondary,
                  color: theme.text.primary,
                  borderColor: theme.border.light,
                },
              ]}
              placeholder="Add any notes about this shift..."
              placeholderTextColor={theme.text.tertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={todayShift.status === 'open'}
            />
          </View>

          {/* Close Shift Button */}
          {todayShift.status === 'open' && (
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowCloseModal(true)}
              disabled={!actualCash}
            >
              <Save size={20} color="#FFF" />
              <Text style={styles.closeButtonText}>Close Shift</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Close Shift Confirmation Modal */}
      <Modal visible={showCloseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Close Shift?</Text>
            <Text style={[styles.modalMessage, { color: theme.text.secondary }]}>
              Are you sure you want to close this shift? This action cannot be undone.
            </Text>
            {discrepancy !== null && discrepancy !== 0 && (
              <View
                style={[
                  styles.discrepancyWarning,
                  {
                    backgroundColor: discrepancy > 0 ? '#F59E0B20' : '#EF444420',
                  },
                ]}
              >
                <AlertCircle size={20} color={discrepancy > 0 ? '#F59E0B' : '#EF4444'} />
                <Text
                  style={[
                    styles.discrepancyWarningText,
                    {
                      color: discrepancy > 0 ? '#F59E0B' : '#EF4444',
                    },
                  ]}
                >
                  {discrepancy > 0
                    ? `Cash over by ${formatCurrency(discrepancy)}`
                    : `Cash short by ${formatCurrency(Math.abs(discrepancy))}`}
                </Text>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: theme.border.medium }]}
                onPress={() => setShowCloseModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: theme.accent.primary }]}
                onPress={handleCloseShift}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Close Shift</Text>
                )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  statusBanner: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  inputSection: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  cashInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  discrepancyBadge: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discrepancyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  paymentMethodItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  discrepancyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  discrepancyWarningText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonConfirm: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

