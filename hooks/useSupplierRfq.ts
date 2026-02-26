import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SupplierRfq, SupplierQuote } from '@/types/supplier-marketplace';

export interface CreateRfqInput {
  supplier_profile_id: string;
  product_id?: string | null;
  buyer_user_id: string;
  quantity: number;
  unit?: string | null;
  delivery_location?: string | null;
  needed_by_date?: string | null;
  notes?: string | null;
  attachment_urls?: string[];
}

export interface CreateQuoteInput {
  rfq_id: string;
  unit_price: number;
  currency?: string;
  lead_time_days?: number | null;
  moq?: number | null;
  delivery_terms?: string | null;
  payment_terms?: string | null;
  validity_days?: number | null;
  notes?: string | null;
}

function mapRfq(r: any): SupplierRfq {
  return {
    id: r.id,
    supplierProfileId: r.supplier_profile_id,
    productId: r.product_id ?? null,
    buyerUserId: r.buyer_user_id,
    quantity: Number(r.quantity),
    unit: r.unit ?? null,
    deliveryLocation: r.delivery_location ?? null,
    neededByDate: r.needed_by_date ?? null,
    notes: r.notes ?? null,
    attachmentUrls: r.attachment_urls ?? [],
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapQuote(r: any): SupplierQuote {
  return {
    id: r.id,
    rfqId: r.rfq_id,
    unitPrice: Number(r.unit_price),
    currency: r.currency ?? 'USD',
    leadTimeDays: r.lead_time_days ?? null,
    moq: r.moq ?? null,
    deliveryTerms: r.delivery_terms ?? null,
    paymentTerms: r.payment_terms ?? null,
    validityDays: r.validity_days ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useBuyerRfqs(buyerUserId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-rfqs-buyer', buyerUserId],
    queryFn: async (): Promise<SupplierRfq[]> => {
      const { data, error } = await supabase
        .from('supplier_rfqs')
        .select('*')
        .eq('buyer_user_id', buyerUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRfq);
    },
    enabled: !!buyerUserId,
  });
}

export function useSupplierRfqs(supplierProfileId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-rfqs-supplier', supplierProfileId],
    queryFn: async (): Promise<SupplierRfq[]> => {
      const { data, error } = await supabase
        .from('supplier_rfqs')
        .select('*')
        .eq('supplier_profile_id', supplierProfileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRfq);
    },
    enabled: !!supplierProfileId,
  });
}

export function useRfqQuotes(rfqId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-quotes', rfqId],
    queryFn: async (): Promise<SupplierQuote[]> => {
      const { data, error } = await supabase
        .from('supplier_quotes')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapQuote);
    },
    enabled: !!rfqId,
  });
}

export function useCreateRfq(buyerUserId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRfqInput) => {
      const { data, error } = await supabase
        .from('supplier_rfqs')
        .insert({
          ...input,
          buyer_user_id: input.buyer_user_id || buyerUserId,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: () => {
      if (buyerUserId) qc.invalidateQueries({ queryKey: ['supplier-rfqs-buyer', buyerUserId] });
    },
  });
}

export function useCreateQuote(supplierProfileId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const { data, error } = await supabase
        .from('supplier_quotes')
        .insert(input)
        .select('id')
        .single();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['supplier-quotes', vars.rfq_id] });
      if (supplierProfileId) qc.invalidateQueries({ queryKey: ['supplier-rfqs-supplier', supplierProfileId] });
    },
  });
}
