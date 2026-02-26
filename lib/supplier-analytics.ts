import { supabase } from './supabase';

export type SupplierAnalyticsEventType =
  | 'profile_view'
  | 'product_view'
  | 'contact_click'
  | 'contact_call'
  | 'contact_email'
  | 'contact_whatsapp'
  | 'contact_website'
  | 'rfq_created'
  | 'rfq_response'
  | 'po_created'
  | 'follow';

/**
 * Record a supplier marketplace analytics event.
 * RLS: Authenticated insert allowed; supplier can read own.
 */
export async function recordSupplierEvent(
  supplierProfileId: string,
  eventType: SupplierAnalyticsEventType,
  options?: { productId?: string; userId?: string; sessionId?: string }
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('supplier_analytics_events').insert({
      supplier_profile_id: supplierProfileId,
      product_id: options?.productId ?? null,
      event_type: eventType,
      user_id: options?.userId ?? user?.id ?? null,
      session_id: options?.sessionId ?? null,
    });
  } catch {
    // Non-blocking; avoid breaking UX
  }
}
