import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type SupplierUpdateType = 'announcement' | 'new_product' | 'promotion' | 'restock';

export interface SupplierUpdate {
  id: string;
  supplier_id: string;
  title: string;
  message: string | null;
  type: SupplierUpdateType;
  related_product_id: string | null;
  created_at: string;
}

export function useSupplierUpdates(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-updates', supplierId],
    queryFn: async (): Promise<SupplierUpdate[]> => {
      const { data, error } = await supabase
        .from('supplier_updates')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupplierUpdate[];
    },
    enabled: !!supplierId,
  });
}

/** Updates from followed suppliers (for marketplace feed). Pass list of supplier IDs the user follows. */
export function useFollowedSuppliersUpdates(followedSupplierIds: string[], limit = 30) {
  return useQuery({
    queryKey: ['supplier-updates-feed', followedSupplierIds.join(','), limit],
    queryFn: async (): Promise<(SupplierUpdate & { supplier_marketplace_profiles?: { business_name: string } })[]> => {
      if (followedSupplierIds.length === 0) return [];
      const { data, error } = await supabase
        .from('supplier_updates')
        .select('*, supplier_marketplace_profiles(business_name)')
        .in('supplier_id', followedSupplierIds)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as (SupplierUpdate & { supplier_marketplace_profiles?: { business_name: string } })[];
    },
    enabled: followedSupplierIds.length > 0,
  });
}

export function useCreateSupplierUpdate(supplierId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; message?: string; type: SupplierUpdateType; related_product_id?: string }) => {
      const { data, error } = await supabase
        .from('supplier_updates')
        .insert({
          supplier_id: supplierId,
          title: payload.title.trim(),
          message: payload.message?.trim() || null,
          type: payload.type,
          related_product_id: payload.related_product_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SupplierUpdate;
    },
    onSuccess: () => {
      if (supplierId) qc.invalidateQueries({ queryKey: ['supplier-updates', supplierId] });
      qc.invalidateQueries({ queryKey: ['supplier-updates-feed'] });
    },
  });
}

export function useUpdateSupplierUpdate(supplierId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; title: string; message?: string; type: SupplierUpdateType }) => {
      const { data, error } = await supabase
        .from('supplier_updates')
        .update({
          title: payload.title.trim(),
          message: payload.message?.trim() || null,
          type: payload.type,
        })
        .eq('id', payload.id)
        .eq('supplier_id', supplierId)
        .select()
        .single();
      if (error) throw error;
      return data as SupplierUpdate;
    },
    onSuccess: () => {
      if (supplierId) qc.invalidateQueries({ queryKey: ['supplier-updates', supplierId] });
      qc.invalidateQueries({ queryKey: ['supplier-updates-feed'] });
    },
  });
}

export function useDeleteSupplierUpdate(supplierId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supplier_updates')
        .delete()
        .eq('id', id)
        .eq('supplier_id', supplierId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (supplierId) qc.invalidateQueries({ queryKey: ['supplier-updates', supplierId] });
      qc.invalidateQueries({ queryKey: ['supplier-updates-feed'] });
    },
  });
}
