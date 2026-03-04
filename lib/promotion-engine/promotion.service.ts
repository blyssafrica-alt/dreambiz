/**
 * Promotion CRUD and target resolution.
 * Clean separation: no subscription logic here.
 */

import { supabase } from '@/lib/supabase';
import type { SubscriptionPromotion, CreatePromotionInput } from '@/types/promotion';

function mapPromotion(row: Record<string, unknown>): SubscriptionPromotion {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    type: row.type as SubscriptionPromotion['type'],
    targetGroup: row.target_group as SubscriptionPromotion['targetGroup'],

    trialDays: row.trial_days != null ? Number(row.trial_days) : null,
    discountPercent: row.discount_percent != null ? Number(row.discount_percent) : null,
    discountAmount: row.discount_amount != null ? Number(row.discount_amount) : null,
    currency: (row.currency as string) ?? 'USD',

    recentDaysDefinition: Number(row.recent_days_definition ?? 14),
    inactiveDaysDefinition: Number(row.inactive_days_definition ?? 30),

    durationInDays: Number(row.duration_in_days),
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    maxRedemptions: row.max_redemptions != null ? Number(row.max_redemptions) : null,
    isActive: Boolean(row.is_active),

    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createPromotion(input: CreatePromotionInput): Promise<SubscriptionPromotion> {
  const row = {
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    target_group: input.targetGroup,

    trial_days: input.type === 'free_trial' ? input.trialDays : null,
    discount_percent: input.type === 'percentage_discount' ? input.discountPercent : null,
    discount_amount: input.type === 'fixed_discount' ? input.discountAmount : null,
    currency: input.currency ?? 'USD',

    recent_days_definition: input.recentDaysDefinition ?? 14,
    inactive_days_definition: input.inactiveDaysDefinition ?? 30,

    duration_in_days: input.durationInDays,
    start_date: input.startDate,
    end_date: input.endDate,
    max_redemptions: input.maxRedemptions ?? null,
    is_active: input.isActive ?? true,
  };

  const { data, error } = await supabase
    .from('subscription_promotions')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  if (input.targetGroup === 'manual' && input.manualTargetIds?.length) {
    await supabase.from('subscription_promotion_targets').insert(
      input.manualTargetIds.map((supplier_profile_id) => ({
        promotion_id: data.id,
        supplier_profile_id,
      }))
    );
  }

  return mapPromotion(data);
}

export async function getPromotion(id: string): Promise<SubscriptionPromotion | null> {
  const { data, error } = await supabase
    .from('subscription_promotions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapPromotion(data);
}

export async function listPromotions(activeOnly = false): Promise<SubscriptionPromotion[]> {
  let q = supabase.from('subscription_promotions').select('*').order('created_at', { ascending: false });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapPromotion);
}

export async function updatePromotion(
  id: string,
  updates: Partial<CreatePromotionInput>
): Promise<SubscriptionPromotion> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name != null) row.name = updates.name;
  if (updates.description != null) row.description = updates.description;
  if (updates.isActive != null) row.is_active = updates.isActive;
  if (updates.startDate != null) row.start_date = updates.startDate;
  if (updates.endDate != null) row.end_date = updates.endDate;
  if (updates.maxRedemptions != null) row.max_redemptions = updates.maxRedemptions;
  if (updates.recentDaysDefinition != null) row.recent_days_definition = updates.recentDaysDefinition;
  if (updates.inactiveDaysDefinition != null) row.inactive_days_definition = updates.inactiveDaysDefinition;
  if (updates.durationInDays != null) row.duration_in_days = updates.durationInDays;
  if (updates.currency != null) row.currency = updates.currency;
  if (updates.type != null) {
    row.type = updates.type;
    row.trial_days = updates.type === 'free_trial' ? (updates.trialDays ?? null) : null;
    row.discount_percent = updates.type === 'percentage_discount' ? (updates.discountPercent ?? null) : null;
    row.discount_amount = updates.type === 'fixed_discount' ? (updates.discountAmount ?? null) : null;
  } else if (updates.trialDays != null || updates.discountPercent != null || updates.discountAmount != null) {
    if (updates.trialDays != null) row.trial_days = updates.trialDays;
    if (updates.discountPercent != null) row.discount_percent = updates.discountPercent;
    if (updates.discountAmount != null) row.discount_amount = updates.discountAmount;
  }
  if (updates.targetGroup != null) row.target_group = updates.targetGroup;

  const { data, error } = await supabase
    .from('subscription_promotions')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (updates.targetGroup === 'manual' && updates.manualTargetIds) {
    await supabase.from('subscription_promotion_targets').delete().eq('promotion_id', id);
    if (updates.manualTargetIds.length > 0) {
      await supabase.from('subscription_promotion_targets').insert(
        updates.manualTargetIds.map((supplier_profile_id) => ({
          promotion_id: id,
          supplier_profile_id,
        }))
      );
    }
  }

  return mapPromotion(data);
}

/**
 * Permanently delete a promotion. Targets and redemptions are removed (CASCADE).
 * Subscriptions keep their row; promotion_id is set to NULL (ON DELETE SET NULL).
 */
export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from('subscription_promotions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Get manual target supplier profile IDs for a promotion (target_group = 'manual').
 */
export async function getPromotionManualTargets(promotionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('subscription_promotion_targets')
    .select('supplier_profile_id')
    .eq('promotion_id', promotionId);
  if (error) throw error;
  return (data ?? []).map((r: { supplier_profile_id: string }) => r.supplier_profile_id);
}

/**
 * Resolve target supplier profile IDs for a promotion (dynamic query).
 */
export async function resolvePromotionTargets(promotionId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('resolve_promotion_target_suppliers', {
    p_promotion_id: promotionId,
  });
  if (error) throw error;
  return (data ?? []).map((r: { supplier_profile_id: string }) => r.supplier_profile_id);
}
