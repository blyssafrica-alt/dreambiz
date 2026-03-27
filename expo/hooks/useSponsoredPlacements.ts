import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type PlacementType = 'home' | 'category' | 'search' | 'profile' | 'homepage_featured' | 'feed_featured' | 'category_featured';
export type PlacementStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_admin_approval'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'paused'
  | 'pending';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface SponsoredPlacement {
  id: string;
  supplier_id: string;
  product_id: string | null;
  placement: PlacementType;
  starts_at: string;
  ends_at: string;
  status: PlacementStatus;
  payment_status: PaymentStatus;
  price_amount: number | null;
  currency: string | null;
  approved_by_admin_id: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PlacementPricingTier {
  id: string;
  placement_type: string;
  label: string;
  description: string | null;
  benefits: string[];
  price: number;
  currency: string;
  duration_days: number;
  priority_weight: number;
  display_order: number;
  highlight_flag: boolean;
  is_active: boolean;
}

export function useSupplierPlacements(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['sponsored-placements', supplierId],
    queryFn: async (): Promise<SponsoredPlacement[]> => {
      const { data, error } = await supabase
        .from('supplier_sponsored_placements')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SponsoredPlacement[];
    },
    enabled: !!supplierId,
  });
}

/** Active placements for marketplace: only approved + paid + within date range. Never shows unpaid or unapproved. */
export function useActiveSponsoredSupplierIds(placement: PlacementType = 'home') {
  return useQuery({
    queryKey: ['sponsored-active', placement],
    queryFn: async (): Promise<Set<string>> => {
      const now = new Date().toISOString();
      const placementValues =
        placement === 'home'
          ? ['home', 'feed_featured', 'homepage_featured']
          : placement === 'category'
            ? ['category', 'category_featured']
            : [placement];
      const { data, error } = await supabase
        .from('supplier_sponsored_placements')
        .select('supplier_id')
        .in('placement', placementValues)
        .eq('status', 'approved')
        .eq('payment_status', 'paid')
        .lte('starts_at', now)
        .gte('ends_at', now);
      if (error) throw error;
      return new Set((data ?? []).map((r: { supplier_id: string }) => r.supplier_id));
    },
  });
}

/** Fetches admin-configured placement tiers. Only active tiers; order by display_order. */
export function usePlacementPricing() {
  return useQuery({
    queryKey: ['sponsored-placement-pricing'],
    queryFn: async (): Promise<PlacementPricingTier[]> => {
      const { data, error } = await supabase
        .from('supplier_sponsored_placement_pricing')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.map((r) => ({
        ...r,
        benefits: Array.isArray(r.benefits) ? r.benefits : (typeof r.benefits === 'string' ? (() => { try { return JSON.parse(r.benefits); } catch { return []; } })() : []),
        display_order: r.display_order ?? 0,
        highlight_flag: r.highlight_flag ?? false,
        is_active: r.is_active !== false,
      }));
    },
  });
}

export function useCreateSponsoredPlacement(supplierId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      placement: PlacementType;
      placement_type: string;
      price_amount: number;
      currency: string;
      duration_days: number;
      starts_at: string;
      ends_at: string;
      product_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('supplier_sponsored_placements')
        .insert({
          supplier_id: supplierId,
          placement: payload.placement,
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          product_id: payload.product_id ?? null,
          status: 'pending_payment',
          payment_status: 'unpaid',
          price_amount: payload.price_amount,
          currency: payload.currency,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SponsoredPlacement;
    },
    onSuccess: () => {
      if (supplierId) qc.invalidateQueries({ queryKey: ['sponsored-placements', supplierId] });
    },
  });
}

/** Mark placement as paid (after payment gateway confirmation). Enforced server-side. */
export function useConfirmPlacementPayment(placementId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('supplier_sponsored_placement_mark_paid', {
        placement_id: placementId,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) throw new Error(result?.error ?? 'Could not confirm payment');
      return result;
    },
    onSuccess: (_, __, context) => {
      qc.invalidateQueries({ queryKey: ['sponsored-placements'] });
    },
  });
}
