import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY_DRAFT = 'supplier_application_draft';

export type SupplierApplicationStatus = 'draft' | 'submitted' | 'pending' | 'approved' | 'declined' | 'needs_info';

export interface SupplierApplicationPayload {
  step0?: { understandReview?: boolean; agreeTerms?: boolean };
  step1?: {
    display_name?: string;
    supplier_type?: string;
    country?: string;
    city?: string;
    address?: string;
    years_in_operation?: number;
    registration_number?: string;
    legal_name?: string;
    tax_id?: string;
  };
  step2?: {
    selected_category_ids?: string[];
    subcategories?: { category_id: string; name: string }[];
    product_keywords?: string[];
  };
  step3?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    social_facebook?: string;
    social_instagram?: string;
    preferred_contact?: string;
  };
  step4?: {
    logo_url?: string;
    cover_url?: string;
    tagline?: string;
    about_description?: string;
    business_hours?: string;
  };
  step5?: {
    doc_urls?: Record<string, string>;
    can_provide_invoices?: boolean;
    accept_supplier_rules?: boolean;
  };
  step6?: { intended_plan_id?: string };
}

export interface SupplierApplicationRow {
  id: string;
  owner_user_id: string;
  status: SupplierApplicationStatus;
  payload: SupplierApplicationPayload;
  display_name: string | null;
  supplier_type: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  admin_requested_fields: string[];
  created_at: string;
  updated_at: string;
  /** 0-based wizard step for draft/needs_info (resume). */
  current_step?: number;
}

function buildListRow(r: any): SupplierApplicationRow {
  return {
    id: r.id,
    owner_user_id: r.owner_user_id,
    status: r.status,
    payload: (r.payload as SupplierApplicationPayload) || {},
    display_name: r.display_name ?? null,
    supplier_type: r.supplier_type ?? null,
    country: r.country ?? null,
    city: r.city ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    submitted_at: r.submitted_at ?? null,
    reviewed_at: r.reviewed_at ?? null,
    admin_note: r.admin_note ?? null,
    admin_requested_fields: Array.isArray(r.admin_requested_fields) ? r.admin_requested_fields : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
    current_step: r.current_step != null ? Number(r.current_step) : 0,
  };
}

export async function getDraftForUser(userId: string): Promise<SupplierApplicationRow | null> {
  const { data, error } = await supabase
    .from('supplier_applications')
    .select('*')
    .eq('owner_user_id', userId)
    .in('status', ['draft', 'needs_info'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return buildListRow(data);
}

export async function getApplicationById(id: string): Promise<SupplierApplicationRow | null> {
  const { data, error } = await supabase.from('supplier_applications').select('*').eq('id', id).single();
  if (error || !data) return null;
  return buildListRow(data);
}

/** Single application for the user (any status). One row per user. */
export async function getMySupplierApplication(userId: string): Promise<SupplierApplicationRow | null> {
  const { data, error } = await supabase
    .from('supplier_applications')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return buildListRow(data);
}

/** Get-or-create single application via RPC (ensures one per user, no duplicates). */
export async function getOrCreateSupplierApplication(userId: string): Promise<SupplierApplicationRow | null> {
  const { data, error } = await supabase.rpc('get_or_create_supplier_application');
  if (error) {
    console.warn('get_or_create_supplier_application:', error.message);
    return null;
  }
  if (!data || typeof data !== 'object' || (data as { error?: string }).error) {
    return null;
  }
  return buildListRow(data);
}

export function useSupplierApplicationDraft(userId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-application-draft', userId],
    queryFn: () => (userId ? getDraftForUser(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
}

export function useMySupplierApplication(userId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-application-mine', userId],
    queryFn: () => (userId ? getMySupplierApplication(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
}

/** Single source of truth: get or create the one application for the user (for wizard load). */
export function useOrCreateSupplierApplication(userId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-application-or-create', userId],
    queryFn: () => (userId ? getOrCreateSupplierApplication(userId) : Promise.resolve(null)),
    enabled: !!userId,
  });
}

export function useUpsertSupplierApplicationDraft(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id?: string;
      payload: SupplierApplicationPayload;
      denormalized?: Partial<Record<string, unknown>>;
      currentStep?: number;
    }) => {
      const { id, payload, denormalized, currentStep } = params;
      if (!userId) throw new Error('You must be signed in to save.');
      const row: Record<string, unknown> = {
        owner_user_id: userId,
        status: 'draft',
        payload,
        updated_at: new Date().toISOString(),
        ...denormalized,
      };
      if (currentStep != null) row.current_step = Math.max(0, Math.min(7, currentStep));
      if (id) {
        const { data, error } = await supabase
          .from('supplier_applications')
          .update(row)
          .eq('id', id)
          .eq('owner_user_id', userId)
          .select('id')
          .single();
        if (error) throw error;
        return data?.id as string;
      } else {
        const { data, error } = await supabase.from('supplier_applications').insert(row).select('id').single();
        if (error) throw error;
        return data?.id as string;
      }
    },
    onSuccess: (_, variables) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['supplier-application-draft', userId] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-mine', userId] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-or-create', userId] });
      }
      if (variables.id) queryClient.invalidateQueries({ queryKey: ['supplier-application', variables.id] });
    },
  });
}

/** Submit via RPC so status always becomes 'submitted' atomically. */
export function useSubmitSupplierApplication(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      applicationId: string;
      finalPayload: SupplierApplicationPayload;
      denormalized: Record<string, unknown>;
      userId?: string;
    }) => {
      const { applicationId, finalPayload, denormalized, userId: paramUserId } = params;
      const uid = paramUserId ?? userId;
      if (!uid) throw new Error('You must be signed in to submit.');
      const denormJson = denormalized as Record<string, unknown>;
      const { data, error } = await supabase.rpc('submit_supplier_application', {
        p_application_id: applicationId,
        p_payload: finalPayload,
        p_denormalized: denormJson,
      });
      if (error) throw new Error(error.message || 'Failed to submit.');
      const result = data as { error?: string; current_status?: string; message?: string };
      if (result?.error === 'not_authenticated') throw new Error('You must be signed in to submit.');
      if (result?.error === 'not_found_or_forbidden') throw new Error('Application not found or access denied.');
      if (result?.error === 'invalid_status') throw new Error('ALREADY_SUBMITTED');
      if (result?.error === 'validation') throw new Error(result.message || 'Validation failed.');
      if (result?.error) throw new Error(result.error);
      return applicationId;
    },
    onSuccess: (_, variables) => {
      const uid = variables.userId ?? userId;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['supplier-application-draft', uid] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-mine', uid] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-or-create', uid] });
      }
    },
  });
}

/** Withdraw submitted/pending application to draft (via RPC). */
export async function withdrawSupplierApplication(applicationId: string): Promise<SupplierApplicationRow | null> {
  const { data, error } = await supabase.rpc('withdraw_supplier_application', { p_application_id: applicationId });
  if (error || !data || (data as { error?: string }).error) return null;
  return buildListRow(data);
}

/** Re-apply after decline: set status to draft so user can edit and resubmit (via RPC). */
export async function reapplySupplierApplication(applicationId: string): Promise<SupplierApplicationRow | null> {
  const { data, error } = await supabase.rpc('reapply_supplier_application', { p_application_id: applicationId });
  if (error || !data || (data as { error?: string }).error) return null;
  return buildListRow(data);
}

export function useWithdrawSupplierApplication(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const row = await withdrawSupplierApplication(applicationId);
      if (!row) throw new Error('Could not withdraw application.');
      return row;
    },
    onSuccess: (_, __, context) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['supplier-application-draft', userId] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-mine', userId] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-or-create', userId] });
      }
    },
  });
}

export function useReapplySupplierApplication(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const row = await reapplySupplierApplication(applicationId);
      if (!row) throw new Error('Could not start re-application.');
      return row;
    },
    onSuccess: (_, __, context) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['supplier-application-draft', userId] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-mine', userId] });
        queryClient.invalidateQueries({ queryKey: ['supplier-application-or-create', userId] });
      }
    },
  });
}

export async function getLocalDraft(): Promise<SupplierApplicationPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return null;
    return JSON.parse(raw) as SupplierApplicationPayload;
  } catch {
    return null;
  }
}

export async function setLocalDraft(payload: SupplierApplicationPayload): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload));
}

export async function clearLocalDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_DRAFT);
}
