/**
 * Single source of truth for supplier onboarding flow.
 * State machine + deterministic route mapping for route guards.
 */

import { supabase } from '@/lib/supabase';
import { getMySupplierApplication } from '@/hooks/useSupplierApplication';
import type { SupplierApplicationRow } from '@/hooks/useSupplierApplication';

export const SupplierFlowState = {
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  LOGGED_IN_EMAIL_UNVERIFIED: 'LOGGED_IN_EMAIL_UNVERIFIED',
  ONBOARDING_INCOMPLETE: 'ONBOARDING_INCOMPLETE',
  NO_APPLICATION: 'NO_APPLICATION',
  DRAFT_IN_PROGRESS: 'DRAFT_IN_PROGRESS',
  SUBMITTED_PENDING: 'SUBMITTED_PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type SupplierFlowStateType = keyof typeof SupplierFlowState;

export interface SupplierFlowResult {
  state: SupplierFlowStateType;
  /** Route the user must be on for this state (enforced by guards). */
  expectedRoute: string;
  user: {
    id: string;
    email: string | null;
    emailVerified: boolean;
    onboardingComplete: boolean;
  } | null;
  supplierApplication: {
    exists: boolean;
    status: string | null;
    currentStep: number;
    submittedAt: string | null;
    approvedAt: string | null;
    applicationId: string | null;
  } | null;
}

const SUPPLIER_ROUTES = {
  [SupplierFlowState.NOT_LOGGED_IN]: '/landing',
  [SupplierFlowState.LOGGED_IN_EMAIL_UNVERIFIED]: '/verify-email',
  [SupplierFlowState.ONBOARDING_INCOMPLETE]: '/onboarding',
  [SupplierFlowState.NO_APPLICATION]: '/supplier-apply',
  [SupplierFlowState.DRAFT_IN_PROGRESS]: '/suppliers-marketplace/become-a-supplier',
  [SupplierFlowState.SUBMITTED_PENDING]: '/suppliers-marketplace/my-application',
  [SupplierFlowState.APPROVED]: '/supplier',
  [SupplierFlowState.REJECTED]: '/suppliers-marketplace/my-application',
} as const;

/**
 * Returns the single allowed route for a given flow state.
 * Used by route guards and unit tests.
 */
export function getExpectedRouteForState(state: SupplierFlowStateType): string {
  return SUPPLIER_ROUTES[state] ?? '/landing';
}

/**
 * Resolves current supplier flow state from auth + session + onboarding + application.
 * Call this when user is authenticated (or to get NOT_LOGGED_IN).
 */
export async function getSupplierFlowState(params: {
  userId: string | null;
  email: string | null;
  emailVerified: boolean;
  onboardingComplete: boolean;
  isEmployee?: boolean;
}): Promise<SupplierFlowResult> {
  const { userId, emailVerified, onboardingComplete, isEmployee } = params;

  if (!userId) {
    return {
      state: 'NOT_LOGGED_IN',
      expectedRoute: getExpectedRouteForState('NOT_LOGGED_IN'),
      user: null,
      supplierApplication: null,
    };
  }

  if (isEmployee) {
    return {
      state: 'NOT_LOGGED_IN',
      expectedRoute: '/landing',
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
      supplierApplication: null,
    };
  }

  if (!emailVerified) {
    return {
      state: 'LOGGED_IN_EMAIL_UNVERIFIED',
      expectedRoute: getExpectedRouteForState('LOGGED_IN_EMAIL_UNVERIFIED'),
      user: { id: userId, email: params.email ?? null, emailVerified: false, onboardingComplete: false },
      supplierApplication: null,
    };
  }

  if (!onboardingComplete) {
    return {
      state: 'ONBOARDING_INCOMPLETE',
      expectedRoute: getExpectedRouteForState('ONBOARDING_INCOMPLETE'),
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: false },
      supplierApplication: null,
    };
  }

  const application: SupplierApplicationRow | null = await getMySupplierApplication(userId);

  if (!application) {
    return {
      state: 'NO_APPLICATION',
      expectedRoute: getExpectedRouteForState('NO_APPLICATION'),
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
      supplierApplication: { exists: false, status: null, currentStep: 0, submittedAt: null, approvedAt: null, applicationId: null },
    };
  }

  const status = application.status;
  const currentStep = application.current_step ?? 0;
  const submittedAt = application.submitted_at ?? null;
  const approvedAt = application.reviewed_at ?? (status === 'approved' ? application.updated_at : null);

  if (status === 'approved') {
    return {
      state: 'APPROVED',
      expectedRoute: getExpectedRouteForState('APPROVED'),
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
      supplierApplication: {
        exists: true,
        status: 'approved',
        currentStep,
        submittedAt,
        approvedAt,
        applicationId: application.id,
      },
    };
  }

  if (status === 'declined') {
    return {
      state: 'REJECTED',
      expectedRoute: getExpectedRouteForState('REJECTED'),
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
      supplierApplication: {
        exists: true,
        status: 'declined',
        currentStep,
        submittedAt,
        approvedAt: null,
        applicationId: application.id,
      },
    };
  }

  if (status === 'submitted' || status === 'pending') {
    return {
      state: 'SUBMITTED_PENDING',
      expectedRoute: getExpectedRouteForState('SUBMITTED_PENDING'),
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
      supplierApplication: {
        exists: true,
        status,
        currentStep,
        submittedAt,
        approvedAt: null,
        applicationId: application.id,
      },
    };
  }

  if (status === 'draft' || status === 'needs_info') {
    return {
      state: 'DRAFT_IN_PROGRESS',
      expectedRoute: getExpectedRouteForState('DRAFT_IN_PROGRESS'),
      user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
      supplierApplication: {
        exists: true,
        status,
        currentStep,
        submittedAt,
        approvedAt: null,
        applicationId: application.id,
      },
    };
  }

  return {
    state: 'NO_APPLICATION',
    expectedRoute: getExpectedRouteForState('NO_APPLICATION'),
    user: { id: userId, email: params.email ?? null, emailVerified: true, onboardingComplete: true },
    supplierApplication: { exists: true, status, currentStep, submittedAt, approvedAt: null, applicationId: application.id },
  };
}

/** Paths that are part of the supplier flow (guarded). */
export const SUPPLIER_FLOW_PATHS = [
  'supplier-apply',
  'supplier-login',
  'suppliers-marketplace/become-a-supplier',
  'suppliers-marketplace/my-application',
  'supplier',
] as const;

export function isSupplierFlowPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, '');
  return SUPPLIER_FLOW_PATHS.some((p) => normalized === p || normalized.startsWith(p + '/'));
}
