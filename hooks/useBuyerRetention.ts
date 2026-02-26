import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useSavedSuppliers(userId: string | undefined) {
  return useQuery({
    queryKey: ['buyer-saved-suppliers', userId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('buyer_saved_suppliers')
        .select('supplier_profile_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.supplier_profile_id);
    },
    enabled: !!userId,
  });
}

export function useFollowedSuppliers(userId: string | undefined) {
  return useQuery({
    queryKey: ['buyer-followed-suppliers', userId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('buyer_followed_suppliers')
        .select('supplier_profile_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.supplier_profile_id);
    },
    enabled: !!userId,
  });
}

export function useSavedProducts(userId: string | undefined) {
  return useQuery({
    queryKey: ['buyer-saved-products', userId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('buyer_saved_products')
        .select('product_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.product_id);
    },
    enabled: !!userId,
  });
}

export function useToggleSavedSupplier(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierProfileId, save }: { supplierProfileId: string; save: boolean }) => {
      if (save) {
        const { error } = await supabase.from('buyer_saved_suppliers').upsert(
          { user_id: userId, supplier_profile_id: supplierProfileId },
          { onConflict: 'user_id,supplier_profile_id' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('buyer_saved_suppliers')
          .delete()
          .eq('user_id', userId)
          .eq('supplier_profile_id', supplierProfileId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ['buyer-saved-suppliers', userId] });
    },
  });
}

export function useToggleFollowSupplier(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierProfileId, follow }: { supplierProfileId: string; follow: boolean }) => {
      if (follow) {
        const { error } = await supabase.from('buyer_followed_suppliers').upsert(
          { user_id: userId, supplier_profile_id: supplierProfileId },
          { onConflict: 'user_id,supplier_profile_id' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('buyer_followed_suppliers')
          .delete()
          .eq('user_id', userId)
          .eq('supplier_profile_id', supplierProfileId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ['buyer-followed-suppliers', userId] });
    },
  });
}

export function useToggleSavedProduct(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, save }: { productId: string; save: boolean }) => {
      if (save) {
        const { error } = await supabase.from('buyer_saved_products').upsert(
          { user_id: userId, product_id: productId },
          { onConflict: 'user_id,product_id' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('buyer_saved_products')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', productId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ['buyer-saved-products', userId] });
    },
  });
}

export function useRecordProductView(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('buyer_recently_viewed_products').insert({
        user_id: userId,
        product_id: productId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ['buyer-recently-viewed', userId] });
    },
  });
}

export function useSupplierFollowerCount(supplierProfileId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-follower-count', supplierProfileId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('buyer_followed_suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_profile_id', supplierProfileId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!supplierProfileId,
  });
}

export function useRecentProductViews(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['buyer-recently-viewed', userId, limit],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('buyer_recently_viewed_products')
        .select('product_id')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.product_id);
      return [...new Set(ids)];
    },
    enabled: !!userId,
  });
}
