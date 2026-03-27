/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const sendExpoPush = async (tokens: string[], payload: { title: string; body: string; data?: Record<string, unknown> }) => {
  if (tokens.length === 0) return;
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  });
};

const sendEmailViaResend = async (email: string, title: string, message: string) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFrom = Deno.env.get('RESEND_FROM');
  if (!resendApiKey || !resendFrom) {
    return;
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: title,
      text: message,
    }),
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase service role config' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const expiringDate = new Date(now);
    expiringDate.setDate(expiringDate.getDate() + 3);

    const { data: expiringAds } = await supabaseAdmin
      .from('advertisements')
      .select('id, title, end_date, created_by, auto_renew, status, payment_status, ad_package_id')
      .eq('status', 'active')
      .lte('end_date', expiringDate.toISOString());

    const { data: expiredAds } = await supabaseAdmin
      .from('advertisements')
      .select('id, title, end_date, created_by, auto_renew, status, payment_status, ad_package_id')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('end_date', now.toISOString());

    const allAds = [...(expiringAds || []), ...(expiredAds || [])];
    const adIds = Array.from(new Set(allAds.map((ad: any) => ad.id)));
    const userIds = Array.from(new Set(allAds.map((ad: any) => ad.created_by)));

    const { data: logRows } = adIds.length
      ? await supabaseAdmin.from('ad_notification_log').select('ad_id, user_id, type').in('ad_id', adIds)
      : { data: [] };
    const logSet = new Set((logRows || []).map((row: any) => `${row.ad_id}:${row.user_id}:${row.type}`));

    const { data: appSettings } = userIds.length
      ? await supabaseAdmin.from('app_settings').select('user_id, notifications_enabled').in('user_id', userIds)
      : { data: [] };
    const notificationsMap = new Map((appSettings || []).map((row: any) => [row.user_id, row.notifications_enabled]));

    const { data: emailPrefs } = userIds.length
      ? await supabaseAdmin
          .from('user_integration_preferences')
          .select('user_id, integration_id, is_enabled')
          .in('user_id', userIds)
          .eq('integration_id', 'email')
      : { data: [] };
    const emailPrefsMap = new Map((emailPrefs || []).map((row: any) => [row.user_id, row.is_enabled]));

    const { data: userEmails } = userIds.length
      ? await supabaseAdmin.from('users').select('id, email').in('id', userIds)
      : { data: [] };
    const emailMap = new Map((userEmails || []).map((row: any) => [row.id, row.email]));

    const { data: tokensData } = userIds.length
      ? await supabaseAdmin.from('user_push_tokens').select('user_id, expo_push_token').in('user_id', userIds)
      : { data: [] };
    const tokensByUser = new Map<string, string[]>();
    (tokensData || []).forEach((row: any) => {
      const list = tokensByUser.get(row.user_id) || [];
      list.push(row.expo_push_token);
      tokensByUser.set(row.user_id, list);
    });

    const packageIds = Array.from(new Set((expiredAds || []).map((ad: any) => ad.ad_package_id).filter(Boolean)));
    const { data: packages } = packageIds.length
      ? await supabaseAdmin.from('ad_packages').select('id, duration_days').in('id', packageIds)
      : { data: [] };
    const packageMap = new Map((packages || []).map((pkg: any) => [pkg.id, pkg.duration_days]));

    // Expiring soon notifications
    for (const ad of expiringAds || []) {
      if (!ad.end_date) continue;
      const diffDays = Math.ceil((new Date(ad.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays > 3) continue;
      const logKey = `${ad.id}:${ad.created_by}:expiring_soon`;
      if (logSet.has(logKey)) continue;

      const notificationsEnabled = notificationsMap.get(ad.created_by) ?? true;
      const emailEnabled = emailPrefsMap.get(ad.created_by) ?? true;
      const tokens = tokensByUser.get(ad.created_by) || [];
      const email = emailMap.get(ad.created_by);

      if (notificationsEnabled) {
        await sendExpoPush(tokens, {
          title: 'Ad expiring soon',
          body: `Your ad "${ad.title}" expires soon. Renew to keep it running.`,
          data: { adId: ad.id, actionRoute: '/my-ads' },
        });
      }
      if (emailEnabled && email) {
        await sendEmailViaResend(email, 'Ad expiring soon', `Your ad "${ad.title}" expires soon. Renew to keep it running.`);
      }

      await supabaseAdmin.from('ad_notification_log').insert({
        ad_id: ad.id,
        user_id: ad.created_by,
        type: 'expiring_soon',
      });
    }

    // Auto-renew processing
    for (const ad of expiredAds || []) {
      const notificationsEnabled = notificationsMap.get(ad.created_by) ?? true;
      const emailEnabled = emailPrefsMap.get(ad.created_by) ?? true;
      const tokens = tokensByUser.get(ad.created_by) || [];
      const email = emailMap.get(ad.created_by);

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

        const logKey = `${ad.id}:${ad.created_by}:auto_renewed`;
        if (!logSet.has(logKey)) {
          if (notificationsEnabled) {
            await sendExpoPush(tokens, {
              title: 'Ad auto-renewed',
              body: `Your ad "${ad.title}" has been auto-renewed.`,
              data: { adId: ad.id, actionRoute: '/my-ads' },
            });
          }
          if (emailEnabled && email) {
            await sendEmailViaResend(email, 'Ad auto-renewed', `Your ad "${ad.title}" has been auto-renewed.`);
          }
          await supabaseAdmin.from('ad_notification_log').insert({
            ad_id: ad.id,
            user_id: ad.created_by,
            type: 'auto_renewed',
          });
        }
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

        const logKey = `${ad.id}:${ad.created_by}:auto_renew_pending`;
        if (!logSet.has(logKey)) {
          if (notificationsEnabled) {
            await sendExpoPush(tokens, {
              title: 'Auto-renew pending payment',
              body: `Your ad "${ad.title}" needs payment to renew.`,
              data: { adId: ad.id, actionRoute: '/my-ads' },
            });
          }
          if (emailEnabled && email) {
            await sendEmailViaResend(email, 'Auto-renew pending payment', `Your ad "${ad.title}" needs payment to renew.`);
          }
          await supabaseAdmin.from('ad_notification_log').insert({
            ad_id: ad.id,
            user_id: ad.created_by,
            type: 'auto_renew_pending',
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, expiring: expiringAds?.length || 0, expired: expiredAds?.length || 0 }), {
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

