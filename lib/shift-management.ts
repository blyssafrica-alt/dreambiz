/**
 * Shift Management Utilities
 * Handles POS shift creation, checking, and handover
 */

import { supabase } from './supabase';
import { getCurrentEmployee } from './get-current-employee';

export interface ShiftInfo {
  id: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string | null;
  status: 'open' | 'closed';
  openedBy: string;
  openedByName?: string;
  currentEmployeeId?: string;
  openingCash: number;
  expectedCash: number;
  currency: string;
}

export interface ShiftHandoverInfo {
  shift: ShiftInfo;
  openedByEmployee: {
    id: string;
    name: string;
  };
}

/**
 * Check if there's an open shift for today
 */
export async function checkOpenShift(businessId: string): Promise<ShiftInfo | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: shiftData, error } = await supabase
      .from('pos_shifts')
      .select(`
        id,
        shift_date,
        shift_start_time,
        shift_end_time,
        status,
        opened_by,
        current_employee_id,
        opening_cash,
        expected_cash,
        currency
      `)
      .eq('business_id', businessId)
      .eq('shift_date', today)
      .eq('status', 'open')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      throw error;
    }

    if (!shiftData) {
      return null;
    }

    // Get employee name from opened_by (which is user_id)
    let openedByName: string | undefined = undefined;
    if (shiftData.opened_by) {
      try {
        // Find employee with this auth_user_id
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('name')
          .eq('auth_user_id', shiftData.opened_by)
          .maybeSingle();
        if (!employeeError && employee) {
          openedByName = employee?.name;
        }
      } catch (empError) {
        // Employee lookup failed - not critical, continue without name
        console.log('Could not fetch employee name for shift opener:', empError);
      }
    }

    return {
      id: shiftData.id,
      shiftDate: shiftData.shift_date,
      shiftStartTime: shiftData.shift_start_time,
      shiftEndTime: shiftData.shift_end_time,
      status: shiftData.status,
      openedBy: shiftData.opened_by,
      openedByName: openedByName,
      currentEmployeeId: shiftData.current_employee_id,
      openingCash: parseFloat(shiftData.opening_cash || '0'),
      expectedCash: parseFloat(shiftData.expected_cash || '0'),
      currency: shiftData.currency || 'USD',
    };
  } catch (error: any) {
    console.error('Error checking open shift:', error?.message || error);
    // Return null to indicate no shift found or error occurred
    return null;
  }
}

/**
 * Create a new shift
 */
export async function createShift(
  businessId: string,
  userId: string, // Auth user_id (for user_id and opened_by fields)
  employeeId: string, // Employee ID (for current_employee_id field)
  openingCash: number,
  currency: string = 'USD'
): Promise<ShiftInfo> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get last closed shift's closing cash as default opening cash
    const { data: lastShift } = await supabase
      .from('pos_shifts')
      .select('actual_cash, cash_at_hand')
      .eq('business_id', businessId)
      .eq('status', 'closed')
      .order('shift_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Use provided opening cash, or last shift's closing cash, or 0
    const defaultOpeningCash = openingCash || parseFloat(lastShift?.actual_cash?.toString() || '0') || parseFloat(lastShift?.cash_at_hand?.toString() || '0') || 0;

    const { data: shiftData, error } = await supabase
      .from('pos_shifts')
      .insert({
        user_id: userId, // Auth user_id
        business_id: businessId,
        shift_date: today,
        opening_cash: defaultOpeningCash,
        opened_by: userId, // Auth user_id
        current_employee_id: employeeId, // Employee ID for tracking
        status: 'open',
        currency: currency,
      })
      .select(`
        id,
        shift_date,
        shift_start_time,
        shift_end_time,
        status,
        opened_by,
        current_employee_id,
        opening_cash,
        expected_cash,
        currency
      `)
      .single();

    if (error) throw error;

    return {
      id: shiftData.id,
      shiftDate: shiftData.shift_date,
      shiftStartTime: shiftData.shift_start_time,
      shiftEndTime: shiftData.shift_end_time,
      status: shiftData.status,
      openedBy: shiftData.opened_by,
      currentEmployeeId: shiftData.current_employee_id,
      openingCash: parseFloat(shiftData.opening_cash || '0'),
      expectedCash: parseFloat(shiftData.expected_cash || '0'),
      currency: shiftData.currency || 'USD',
    };
  } catch (error) {
    console.error('Error creating shift:', error);
    throw error;
  }
}

/**
 * Take over existing shift (shift handover)
 */
export async function takeOverShift(shiftId: string, employeeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('pos_shifts')
      .update({
        current_employee_id: employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shiftId);

    if (error) throw error;
  } catch (error) {
    console.error('Error taking over shift:', error);
    throw error;
  }
}

/**
 * Check shift status for current employee
 * Returns shift info and whether current employee opened it
 */
export async function getShiftForEmployee(businessId: string): Promise<{
  shift: ShiftInfo | null;
  isShiftOpener: boolean;
  canTakeOver: boolean;
}> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return {
      shift: null,
      isShiftOpener: false,
      canTakeOver: false,
    };
  }

  const shift = await checkOpenShift(businessId);
  if (!shift) {
    return {
      shift: null,
      isShiftOpener: false,
      canTakeOver: false,
    };
  }

  // Note: opened_by might be user_id, not employee_id
  // We'll need to check if current employee's user_id matches
  const { data: { user } } = await supabase.auth.getUser();
  const isShiftOpener = shift.openedBy === user?.id || shift.currentEmployeeId === employee.id;
  const canTakeOver = !isShiftOpener;

  return {
    shift,
    isShiftOpener,
    canTakeOver,
  };
}

