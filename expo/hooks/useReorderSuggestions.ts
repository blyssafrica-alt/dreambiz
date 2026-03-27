import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ReorderSuggestion {
  id: string;
  business_id: string;
  product_id: string;
  supplier_id: string | null;
  suggested_quantity: number;
  reason: 'below_reorder_level' | 'fast_selling' | 'stockout_risk' | 'seasonal';
  status: 'open' | 'dismissed' | 'ordered' | 'snoozed';
  created_at: string;
  updated_at: string;
  products?: { name: string; quantity: number; reorder_level: number | null; cost_price: number } | null;
  supplier_marketplace_profiles?: { business_name: string } | null;
}

export function useReorderSuggestions(businessId: string | undefined) {
  return useQuery({
    queryKey: ['reorder-suggestions', businessId],
    queryFn: async (): Promise<ReorderSuggestion[]> => {
      const { data, error } = await supabase
        .from('reorder_suggestions')
        .select(`
          id,
          business_id,
          product_id,
          supplier_id,
          suggested_quantity,
          reason,
          status,
          created_at,
          updated_at,
          products(name, quantity, reorder_level, cost_price),
          supplier_marketplace_profiles(business_name)
        `)
        .eq('business_id', businessId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        business_id: r.business_id,
        product_id: r.product_id,
        supplier_id: r.supplier_id,
        suggested_quantity: Number(r.suggested_quantity),
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        products: r.products,
        supplier_marketplace_profiles: r.supplier_marketplace_profiles,
      }));
    },
    enabled: !!businessId,
  });
}

export function useGenerateReorderSuggestions(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_reorder_suggestions', {
        p_business_id: businessId,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; count?: number };
      if (!result?.ok) throw new Error(result?.error ?? 'Failed to generate suggestions');
      return result;
    },
    onSuccess: () => {
      if (businessId) qc.invalidateQueries({ queryKey: ['reorder-suggestions', businessId] });
    },
  });
}

export function useUpdateReorderSuggestionStatus(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'dismissed' | 'snoozed' }) => {
      const { error } = await supabase
        .from('reorder_suggestions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (businessId) qc.invalidateQueries({ queryKey: ['reorder-suggestions', businessId] });
    },
  });
}

export function useCreatePOFromSuggestion(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await supabase.rpc('create_purchase_order_from_suggestion', {
        p_suggestion_id: suggestionId,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; purchase_order_id?: string };
      if (!result?.ok) throw new Error(result?.error ?? 'Failed to create order');
      return result;
    },
    onSuccess: () => {
      if (businessId) qc.invalidateQueries({ queryKey: ['reorder-suggestions', businessId] });
      qc.invalidateQueries({ queryKey: ['purchase-orders-buyer'] });
    },
  });
}
