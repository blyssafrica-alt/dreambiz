import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SupplierProfitRow {
  supplier_id: string;
  supplier_name: string | null;
  purchases_value: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number | null;
}

export function useSupplierProfit(
  businessId: string | undefined,
  dateFrom: string,
  dateTo: string
) {
  return useQuery({
    queryKey: ['supplier-profit', businessId, dateFrom, dateTo],
    queryFn: async (): Promise<SupplierProfitRow[]> => {
      const { data, error } = await supabase.rpc('get_supplier_profit_summary', {
        p_business_id: businessId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name ?? null,
        purchases_value: Number(r.purchases_value),
        revenue: Number(r.revenue),
        cogs: Number(r.cogs),
        gross_profit: Number(r.gross_profit),
        margin_pct: r.margin_pct != null ? Number(r.margin_pct) : null,
      }));
    },
    enabled: !!businessId && !!dateFrom && !!dateTo,
  });
}
