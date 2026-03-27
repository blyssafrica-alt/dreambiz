import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type POStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  supplier_marketplace_products?: { name: string } | null;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  buyer_id: string;
  rfq_id: string | null;
  status: POStatus;
  total_amount: number;
  currency: string;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  inventory_added?: boolean;
  supplier_marketplace_profiles?: { business_name: string };
  supplier_purchase_order_items?: PurchaseOrderItem[];
}

function mapItem(i: any): PurchaseOrderItem {
  return {
    id: i.id,
    purchase_order_id: i.purchase_order_id,
    product_id: i.product_id,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
    supplier_marketplace_products: i.supplier_marketplace_products,
  };
}

function mapPo(r: any): PurchaseOrder {
  return {
    id: r.id,
    supplier_id: r.supplier_id,
    buyer_id: r.buyer_id,
    rfq_id: r.rfq_id ?? null,
    status: r.status,
    total_amount: Number(r.total_amount),
    currency: r.currency ?? 'USD',
    delivery_address: r.delivery_address ?? null,
    notes: r.notes ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    inventory_added: r.inventory_added === true,
    supplier_marketplace_profiles: r.supplier_marketplace_profiles,
    supplier_purchase_order_items: Array.isArray(r.supplier_purchase_order_items) ? r.supplier_purchase_order_items.map(mapItem) : [],
  };
}

export function useBuyerPurchaseOrders(buyerId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-orders-buyer', buyerId],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const { data, error } = await supabase
        .from('supplier_purchase_orders')
        .select('*, supplier_marketplace_profiles(business_name), supplier_purchase_order_items(*, supplier_marketplace_products(name))')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPo);
    },
    enabled: !!buyerId,
  });
}

export function useSupplierPurchaseOrders(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-orders-supplier', supplierId],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const { data, error } = await supabase
        .from('supplier_purchase_orders')
        .select('*, supplier_purchase_order_items(*)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPo);
    },
    enabled: !!supplierId,
  });
}

export function useCreatePurchaseOrder(buyerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { supplier_id: string; rfq_id?: string; total_amount: number; currency?: string; delivery_address?: string; notes?: string; items: { product_id: string; quantity: number; unit_price: number }[] }) => {
      const { data: po, error: poError } = await supabase
        .from('supplier_purchase_orders')
        .insert({
          supplier_id: payload.supplier_id,
          buyer_id: buyerId,
          rfq_id: payload.rfq_id ?? null,
          status: 'draft',
          total_amount: payload.total_amount,
          currency: payload.currency ?? 'USD',
          delivery_address: payload.delivery_address ?? null,
          notes: payload.notes ?? null,
        })
        .select()
        .single();
      if (poError) throw poError;
      if (payload.items.length > 0) {
        const { error: itemsError } = await supabase.from('supplier_purchase_order_items').insert(
          payload.items.map((i) => ({ purchase_order_id: po.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
        );
        if (itemsError) throw itemsError;
      }
      return mapPo(po);
    },
    onSuccess: () => {
      if (buyerId) qc.invalidateQueries({ queryKey: ['purchase-orders-buyer', buyerId] });
    },
  });
}

export function useSendPurchaseOrder(buyerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from('supplier_purchase_orders')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', poId)
        .eq('buyer_id', buyerId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (buyerId) qc.invalidateQueries({ queryKey: ['purchase-orders-buyer', buyerId] });
    },
  });
}

export function useUpdatePOStatusSupplier(supplierId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ poId, status }: { poId: string; status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase
        .from('supplier_purchase_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', poId)
        .eq('supplier_id', supplierId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (supplierId) qc.invalidateQueries({ queryKey: ['purchase-orders-supplier', supplierId] });
    },
  });
}

export type AddToInventoryPaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'credit';

export function useAddPOToInventory(buyerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      businessId: string;
      purchaseOrderId: string;
      itemIds: string[];
      paymentMethod: AddToInventoryPaymentMethod;
      sellingPrices?: Record<string, number>;
    }) => {
      const { data, error } = await supabase.rpc('add_po_to_inventory', {
        p_business_id: params.businessId,
        p_purchase_order_id: params.purchaseOrderId,
        p_item_ids: params.itemIds,
        p_payment_method: params.paymentMethod,
        p_selling_prices: params.sellingPrices ?? {},
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; total_cost?: number };
      if (!result?.ok) throw new Error(result?.error ?? 'Failed to add to inventory');
      return result;
    },
    onSuccess: (_, __) => {
      if (buyerId) qc.invalidateQueries({ queryKey: ['purchase-orders-buyer', buyerId] });
    },
  });
}
