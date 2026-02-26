/// <reference path="./deno.d.ts" />
/**
 * Expire promotion trials and discounts.
 * Run on a schedule (e.g. every hour via cron/GitHub Actions).
 *
 * 1. Trials: status='trial' AND trial_ends_at < NOW() -> status='expired'
 * 2. Discounts: discount_ends_at < NOW() -> final_price=base_price, clear promotion fields
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    // 1. Expire trials
    const { data: expiredTrials, error: trialsErr } = await supabase
      .from("supplier_subscriptions")
      .update({
        status: "expired",
        updated_at: now,
      })
      .eq("status", "trial")
      .lt("trial_ends_at", now)
      .select("id");

    if (trialsErr) throw trialsErr;
    const trialsCount = expiredTrials?.length ?? 0;

    // 2. Expire discounts (final_price -> base_price, clear promotion)
    const { data: subsWithExpiredDiscount } = await supabase
      .from("supplier_subscriptions")
      .select("id, base_price")
      .not("discount_ends_at", "is", null)
      .lt("discount_ends_at", now);

    let discountsCount = 0;
    if (subsWithExpiredDiscount?.length) {
      for (const sub of subsWithExpiredDiscount) {
        const { error } = await supabase
          .from("supplier_subscriptions")
          .update({
            final_price: sub.base_price,
            discount_ends_at: null,
            promotion_id: null,
            updated_at: now,
          })
          .eq("id", sub.id);
        if (!error) discountsCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredTrials: trialsCount,
        expiredDiscounts: discountsCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
