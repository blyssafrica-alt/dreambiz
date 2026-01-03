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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import {
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
  RefreshCw,
  X,
  FileText,
  Calendar,
  Users,
  Percent,
  ShoppingBag,
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
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(true);
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
    } finally {
      setRefreshing(false);
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

  const discrepancyAbs = discrepancy !== null ? Math.abs(discrepancy) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <PageHeader
        title="Day End Closing"
        subtitle={`${new Date(todayShift.shiftDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        icon={Calculator}
        iconGradient={['#10B981', '#059669']}
        rightAction={
          todayShift.status === 'open' ? (
            <TouchableOpacity
              style={styles.refreshHeaderButton}
              onPress={refreshShiftTotals}
              disabled={refreshing}
            >
              <RefreshCw size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshShiftTotals}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Shift Status Card */}
          <LinearGradient
            colors={
              todayShift.status === 'open'
                ? ['#10B98115', '#05966908']
                : ['#F59E0B15', '#D9770608']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusCard}
          >
            <View style={styles.statusCardContent}>
              <View style={styles.statusIconWrapper}>
                {todayShift.status === 'open' ? (
                  <CheckCircle size={32} color="#10B981" strokeWidth={2.5} />
                ) : (
                  <Clock size={32} color="#F59E0B" strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.statusTextWrapper}>
                <Text
                  style={[
                    styles.statusTitle,
                    {
                      color: todayShift.status === 'open' ? '#10B981' : '#F59E0B',
                    },
                  ]}
                >
                  Shift {todayShift.status === 'open' ? 'Active' : 'Closed'}
                </Text>
                <Text style={[styles.statusSubtitle, { color: theme.text.secondary }]}>
                  Started: {new Date(todayShift.shiftStartTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {todayShift.shiftEndTime && (
                  <Text style={[styles.statusSubtitle, { color: theme.text.secondary }]}>
                    Closed: {new Date(todayShift.shiftEndTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>

          {/* Cash Reconciliation - Main Focus */}
          <View style={[styles.cashCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.cashCardHeader}>
              <View style={styles.cashCardIconWrapper}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.cashCardIconGradient}
                >
                  <DollarSign size={24} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </View>
              <Text style={[styles.cashCardTitle, { color: theme.text.primary }]}>Cash Reconciliation</Text>
            </View>

            {/* Opening Cash */}
            <View style={styles.cashRow}>
              <View style={styles.cashRowLeft}>
                <Text style={[styles.cashRowLabel, { color: theme.text.secondary }]}>Opening Cash</Text>
                <Text style={[styles.cashRowHint, { color: theme.text.tertiary }]}>Cash at start of shift</Text>
              </View>
              <Text style={[styles.cashRowValue, { color: theme.text.primary }]}>
                {formatCurrency(todayShift.openingCash)}
              </Text>
            </View>

            {/* Cash Sales */}
            <View style={styles.cashRow}>
              <View style={styles.cashRowLeft}>
                <Text style={[styles.cashRowLabel, { color: theme.text.secondary }]}>Cash Sales</Text>
                <Text style={[styles.cashRowHint, { color: theme.text.tertiary }]}>Total cash received</Text>
              </View>
              <Text style={[styles.cashRowValue, { color: '#10B981', fontWeight: '700' }]}>
                +{formatCurrency(todayShift.cashSales)}
              </Text>
            </View>

            {/* Expected Cash */}
            <View style={[styles.cashDivider, { backgroundColor: theme.border.light }]} />
            <View style={styles.cashRow}>
              <View style={styles.cashRowLeft}>
                <Text style={[styles.cashRowLabel, { color: theme.text.primary, fontWeight: '700' }]}>
                  Expected Cash
                </Text>
                <Text style={[styles.cashRowHint, { color: theme.text.tertiary }]}>
                  Opening + Cash Sales
                </Text>
              </View>
              <Text style={[styles.cashRowValue, { color: theme.accent.primary, fontWeight: '800', fontSize: 22 }]}>
                {formatCurrency(todayShift.expectedCash)}
              </Text>
            </View>

            {/* Actual Cash Input */}
            <View style={styles.cashInputSection}>
              <Text style={[styles.cashInputLabel, { color: theme.text.primary }]}>
                Actual Cash at Hand
              </Text>
              <Text style={[styles.cashInputHint, { color: theme.text.tertiary }]}>
                Count all cash in the drawer and enter the total
              </Text>
              <TextInput
                style={[
                  styles.cashInput,
                  {
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor:
                      discrepancy !== null && discrepancy !== 0 ? '#EF4444' : theme.border.light,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={theme.text.tertiary}
                value={actualCash}
                onChangeText={setActualCash}
                keyboardType="decimal-pad"
                editable={todayShift.status === 'open'}
                autoFocus={false}
              />

              {/* Discrepancy Display */}
              {actualCash && discrepancy !== null && (
                <View
                  style={[
                    styles.discrepancyCard,
                    {
                      backgroundColor:
                        discrepancy === 0
                          ? '#10B98115'
                          : discrepancy > 0
                          ? '#F59E0B15'
                          : '#EF444415',
                      borderColor:
                        discrepancy === 0
                          ? '#10B98140'
                          : discrepancy > 0
                          ? '#F59E0B40'
                          : '#EF444440',
                    },
                  ]}
                >
                  <View style={styles.discrepancyHeader}>
                    {discrepancy === 0 ? (
                      <CheckCircle size={24} color="#10B981" strokeWidth={2.5} />
                    ) : (
                      <AlertCircle
                        size={24}
                        color={discrepancy > 0 ? '#F59E0B' : '#EF4444'}
                        strokeWidth={2.5}
                      />
                    )}
                    <Text
                      style={[
                        styles.discrepancyTitle,
                        {
                          color:
                            discrepancy === 0
                              ? '#10B981'
                              : discrepancy > 0
                              ? '#F59E0B'
                              : '#EF4444',
                        },
                      ]}
                    >
                      {discrepancy === 0
                        ? 'Balanced'
                        : discrepancy > 0
                        ? `Over by ${formatCurrency(discrepancyAbs)}`
                        : `Short by ${formatCurrency(discrepancyAbs)}`}
                    </Text>
                  </View>
                  {discrepancy !== 0 && (
                    <Text
                      style={[
                        styles.discrepancyMessage,
                        {
                          color: theme.text.secondary,
                        },
                      ]}
                    >
                      {discrepancy > 0
                        ? 'You have more cash than expected. Please verify your count.'
                        : 'You have less cash than expected. Please recount and check for errors.'}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Discrepancy Notes */}
            {discrepancy !== null && discrepancy !== 0 && todayShift.status === 'open' && (
              <View style={styles.notesSection}>
                <Text style={[styles.notesLabel, { color: theme.text.primary }]}>
                  Explain Discrepancy
                </Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    },
                  ]}
                  placeholder="Enter notes about the discrepancy..."
                  placeholderTextColor={theme.text.tertiary}
                  value={discrepancyNotes}
                  onChangeText={setDiscrepancyNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>

          {/* Sales Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.summaryCardHeader}>
              <View style={styles.summaryCardIconWrapper}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.summaryCardIconGradient}
                >
                  <TrendingUp size={20} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </View>
              <Text style={[styles.summaryCardTitle, { color: theme.text.primary }]}>Sales Summary</Text>
            </View>

            {/* Total Sales */}
            <View style={styles.totalSalesBox}>
              <Text style={[styles.totalSalesLabel, { color: theme.text.secondary }]}>Total Sales</Text>
              <Text style={[styles.totalSalesValue, { color: theme.text.primary }]}>
                {formatCurrency(todayShift.totalSales)}
              </Text>
            </View>

            {/* Payment Methods Grid */}
            <View style={styles.paymentMethodsGrid}>
              <View style={[styles.paymentMethodCard, { backgroundColor: theme.background.secondary }]}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: '#10B98120' }]}>
                  <DollarSign size={20} color="#10B981" strokeWidth={2.5} />
                </View>
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Cash</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.cashSales)}
                </Text>
              </View>

              <View style={[styles.paymentMethodCard, { backgroundColor: theme.background.secondary }]}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: '#3B82F620' }]}>
                  <CreditCard size={20} color="#3B82F6" strokeWidth={2.5} />
                </View>
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Card</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.cardSales)}
                </Text>
              </View>

              <View style={[styles.paymentMethodCard, { backgroundColor: theme.background.secondary }]}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Smartphone size={20} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Mobile Money</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.mobileMoneySales)}
                </Text>
              </View>

              <View style={[styles.paymentMethodCard, { backgroundColor: theme.background.secondary }]}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Building2 size={20} color="#F59E0B" strokeWidth={2.5} />
                </View>
                <Text style={[styles.paymentMethodLabel, { color: theme.text.secondary }]}>Bank Transfer</Text>
                <Text style={[styles.paymentMethodValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.bankTransferSales)}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={[styles.statsDivider, { backgroundColor: theme.border.light }]} />
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <ShoppingBag size={18} color={theme.text.secondary} />
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Transactions</Text>
                <Text style={[styles.statValue, { color: theme.text.primary }]}>
                  {todayShift.totalTransactions}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border.light }]} />
              <View style={styles.statBox}>
                <FileText size={18} color={theme.text.secondary} />
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Receipts</Text>
                <Text style={[styles.statValue, { color: theme.text.primary }]}>
                  {todayShift.totalReceipts}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border.light }]} />
              <View style={styles.statBox}>
                <Percent size={18} color={theme.text.secondary} />
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Discounts</Text>
                <Text style={[styles.statValue, { color: theme.text.primary }]}>
                  {formatCurrency(todayShift.totalDiscounts)}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes Card */}
          {todayShift.status === 'open' && (
            <View style={[styles.notesCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.notesCardTitle, { color: theme.text.primary }]}>Shift Notes</Text>
              <TextInput
                style={[
                  styles.notesCardInput,
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
              />
            </View>
          )}

          {/* Close Shift Button */}
          {todayShift.status === 'open' && (
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor: discrepancy !== null && discrepancy !== 0 && discrepancy < 0 ? '#EF4444' : theme.accent.primary,
                  opacity: !actualCash ? 0.5 : 1,
                },
              ]}
              onPress={() => setShowCloseModal(true)}
              disabled={!actualCash}
              activeOpacity={0.8}
            >
              <Save size={22} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.closeButtonText}>Close Shift</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Close Shift Confirmation Modal */}
      <Modal visible={showCloseModal} transparent animationType="fade" onRequestClose={() => setShowCloseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Close Shift?</Text>
              <TouchableOpacity
                onPress={() => setShowCloseModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalMessage, { color: theme.text.secondary }]}>
              Are you sure you want to close this shift? This action cannot be undone.
            </Text>
            {discrepancy !== null && discrepancy !== 0 && (
              <View
                style={[
                  styles.modalDiscrepancyWarning,
                  {
                    backgroundColor:
                      discrepancy > 0 ? '#F59E0B15' : '#EF444415',
                    borderColor: discrepancy > 0 ? '#F59E0B40' : '#EF444440',
                  },
                ]}
              >
                <AlertCircle
                  size={24}
                  color={discrepancy > 0 ? '#F59E0B' : '#EF4444'}
                  strokeWidth={2.5}
                />
                <View style={styles.modalDiscrepancyTextWrapper}>
                  <Text
                    style={[
                      styles.modalDiscrepancyTitle,
                      {
                        color: discrepancy > 0 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  >
                    Cash {discrepancy > 0 ? 'Over' : 'Short'}
                  </Text>
                  <Text style={[styles.modalDiscrepancyAmount, { color: theme.text.primary }]}>
                    {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonCancel,
                  { borderColor: theme.border.medium, backgroundColor: theme.background.secondary },
                ]}
                onPress={() => setShowCloseModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  {
                    backgroundColor: discrepancy !== null && discrepancy !== 0 && discrepancy < 0 ? '#EF4444' : theme.accent.primary,
                  },
                ]}
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
    fontWeight: '500',
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
  refreshHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusCard: {
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextWrapper: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  cashCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cashCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cashCardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cashCardIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashCardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cashRowLeft: {
    flex: 1,
  },
  cashRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cashRowHint: {
    fontSize: 13,
    fontWeight: '400',
  },
  cashRowValue: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  cashDivider: {
    height: 1,
    marginVertical: 16,
  },
  cashInputSection: {
    marginTop: 8,
  },
  cashInputLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cashInputHint: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 12,
  },
  cashInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  discrepancyCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  discrepancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  discrepancyTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  discrepancyMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesSection: {
    marginTop: 16,
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryCardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryCardIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalSalesBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalSalesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalSalesValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsDivider: {
    height: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  notesCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  notesCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  notesCardInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalDiscrepancyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalDiscrepancyTextWrapper: {
    flex: 1,
  },
  modalDiscrepancyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDiscrepancyAmount: {
    fontSize: 20,
    fontWeight: '700',
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
    minHeight: 52,
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
