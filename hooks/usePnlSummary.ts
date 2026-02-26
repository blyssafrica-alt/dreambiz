import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PnlSummary {
  ok: boolean;
  total_sales: number;
  total_expenses: number;
  total_cogs: number;
  gross_profit: number;
  net_profit: number;
  error?: string;
}

export function usePnlSummary(
  businessId: string | undefined,
  dateFrom: string,
  dateTo: string
) {
  return useQuery({
    queryKey: ['pnl-summary', businessId, dateFrom, dateTo],
    queryFn: async (): Promise<PnlSummary> => {
      const { data, error } = await supabase.rpc('get_pnl_summary', {
        p_business_id: businessId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });
      if (error) throw error;
      const r = data as any;
      if (!r?.ok) return { ok: false, total_sales: 0, total_expenses: 0, total_cogs: 0, gross_profit: 0, net_profit: 0, error: r?.error };
      return {
        ok: true,
        total_sales: Number(r.total_sales),
        total_expenses: Number(r.total_expenses),
        total_cogs: Number(r.total_cogs),
        gross_profit: Number(r.gross_profit),
        net_profit: Number(r.net_profit),
      };
    },
    enabled: !!businessId && !!dateFrom && !!dateTo,
  });
}
