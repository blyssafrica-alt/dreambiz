/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: supabaseAnonKey,
        },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;
    const { data: ads, error: adsError } = await supabaseAdmin
      .from('advertisements')
      .select('id, title, end_date, auto_renew, payment_status, ad_package_id, status')
      .eq('created_by', userId)
      .eq('auto_renew', true);

    if (adsError) throw adsError;

    const now = new Date();
    const expiredAds = (ads || []).filter((ad: any) => {
      if (!ad.end_date) return false;
      const end = new Date(ad.end_date);
      return end.getTime() < now.getTime();
    });

    const packageIds = Array.from(new Set(expiredAds.map((ad: any) => ad.ad_package_id).filter(Boolean)));
    const { data: packages } = packageIds.length
      ? await supabaseAdmin.from('ad_packages').select('id, duration_days').in('id', packageIds)
      : { data: [] };

    const packageMap = new Map((packages || []).map((pkg: any) => [pkg.id, pkg.duration_days]));
    const renewed: string[] = [];
    const pendingPayment: string[] = [];

    for (const ad of expiredAds) {
      if (ad.payment_status === 'approved') {
        const durationDays = packageMap.get(ad.ad_package_id) || 7;
        const newEndDate = new Date(now);
        newEndDate.setDate(newEndDate.getDate() + durationDays);
        await supabaseAdmin
          .from('advertisements')
          .update({
            start_date: now.toISOString(),
            end_date: newEndDate.toISOString(),
            status: 'active',
            updated_at: now.toISOString(),
          })
          .eq('id', ad.id);
        renewed.push(ad.id);
      } else {
        await supabaseAdmin
          .from('advertisements')
          .update({
            status: 'pending',
            payment_status: 'pending',
            admin_notes: 'Auto-renew requested by user',
            updated_at: now.toISOString(),
          })
          .eq('id', ad.id);
        pendingPayment.push(ad.id);
      }
    }

    return new Response(JSON.stringify({ renewed, pendingPayment }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


