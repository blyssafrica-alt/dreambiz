import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SupplierPerformanceRow {
  supplier_id: string;
  business_name: string | null;
  ranking_score: number;
  trust_score: number;
  avg_rating: number;
  review_count: number;
  rfq_total: number;
  rfq_responded: number;
  rfq_response_rate_pct: number | null;
  complaint_count: number;
  follower_count: number;
  avg_response_hours: number | null;
  featured: boolean;
  verification_tier: string | null;
  badges: string[];
}

export function useSupplierPerformance(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-performance', supplierId],
    queryFn: async (): Promise<SupplierPerformanceRow | null> => {
      const { data, error } = await supabase
        .from('supplier_performance_score')
        .select('*')
        .eq('supplier_id', supplierId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const d = data as any;
      return {
        supplier_id: d.supplier_id,
        business_name: d.business_name ?? null,
        ranking_score: Number(d.ranking_score ?? 0),
        trust_score: Number(d.trust_score ?? 0),
        avg_rating: Number(d.avg_rating ?? 0),
        review_count: Number(d.review_count ?? 0),
        rfq_total: Number(d.rfq_total ?? 0),
        rfq_responded: Number(d.rfq_responded ?? 0),
        rfq_response_rate_pct: d.rfq_response_rate_pct != null ? Number(d.rfq_response_rate_pct) : null,
        complaint_count: Number(d.complaint_count ?? 0),
        follower_count: Number(d.follower_count ?? 0),
        avg_response_hours: d.avg_response_hours != null ? Number(d.avg_response_hours) : null,
        featured: !!d.featured,
        verification_tier: d.verification_tier ?? null,
        badges: Array.isArray(d.badges) ? d.badges.filter(Boolean) : [],
      };
    },
    enabled: !!supplierId,
  });
}

/** Admin: list all suppliers by ranking */
export function useSupplierPerformanceList() {
  return useQuery({
    queryKey: ['supplier-performance-list'],
    queryFn: async (): Promise<SupplierPerformanceRow[]> => {
      const { data, error } = await supabase
        .from('supplier_performance_score')
        .select('*')
        .order('ranking_score', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        supplier_id: d.supplier_id,
        business_name: d.business_name ?? null,
        ranking_score: Number(d.ranking_score ?? 0),
        trust_score: Number(d.trust_score ?? 0),
        avg_rating: Number(d.avg_rating ?? 0),
        review_count: Number(d.review_count ?? 0),
        rfq_total: Number(d.rfq_total ?? 0),
        rfq_responded: Number(d.rfq_responded ?? 0),
        rfq_response_rate_pct: d.rfq_response_rate_pct != null ? Number(d.rfq_response_rate_pct) : null,
        complaint_count: Number(d.complaint_count ?? 0),
        follower_count: Number(d.follower_count ?? 0),
        avg_response_hours: d.avg_response_hours != null ? Number(d.avg_response_hours) : null,
        featured: !!d.featured,
        verification_tier: d.verification_tier ?? null,
        badges: Array.isArray(d.badges) ? d.badges.filter(Boolean) : [],
      }));
    },
  });
}
