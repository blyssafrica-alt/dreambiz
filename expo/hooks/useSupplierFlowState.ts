/**
 * Single source of truth hook for supplier flow state.
 * Used by route guards. Timeout 10s, retry and error state to avoid infinite loading.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getSupplierFlowState, type SupplierFlowResult } from '@/lib/supplier-flow';

const QUERY_KEY = 'supplier-flow-state';
const STALE_MS = 60 * 1000;
const API_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export interface UseSupplierFlowStateParams {
  userId: string | null;
  email: string | null;
  emailVerified: boolean | null;
  onboardingComplete: boolean;
  isEmployee?: boolean;
  /** Only run when user is in supplier flow (e.g. on supplier-apply or after supplier intent). */
  enabled?: boolean;
}

export function useSupplierFlowState(params: UseSupplierFlowStateParams) {
  const {
    userId,
    email,
    emailVerified,
    onboardingComplete,
    isEmployee,
    enabled = true,
  } = params;

  const enabledQuery = Boolean(
    enabled && (userId !== undefined && (userId === null || (emailVerified !== undefined && onboardingComplete !== undefined)))
  );

  const query = useQuery({
    queryKey: [QUERY_KEY, userId ?? 'anon', emailVerified ?? null, onboardingComplete, isEmployee ?? false],
    queryFn: async (): Promise<SupplierFlowResult> => {
      const result = await withTimeout(
        getSupplierFlowState({
          userId: userId ?? null,
          email: email ?? null,
          emailVerified: emailVerified === true,
          onboardingComplete,
          isEmployee,
        }),
        API_TIMEOUT_MS
      );
      return result;
    },
    enabled: enabledQuery,
    staleTime: STALE_MS,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const refetch = useCallback(() => {
    query.refetch();
  }, [query]);

  return {
    ...query,
    flowState: query.data ?? null,
    expectedRoute: query.data?.expectedRoute ?? null,
    state: query.data?.state ?? null,
    refetch,
    isTimeout: query.error?.message === 'TIMEOUT',
  };
}
