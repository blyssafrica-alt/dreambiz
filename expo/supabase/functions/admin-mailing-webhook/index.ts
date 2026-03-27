/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />
/**
 * Admin Mailing: Resend webhook handler
 * Receives email.delivered, email.bounced, email.complained, email.opened, email.clicked
 * Updates email_recipients and email_events. On complaint: opts out user.
 * Configure webhook URL in Resend Dashboard: https://<project>.supabase.co/functions/v1/admin-mailing-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    [key: string]: unknown;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const body = (await req.json()) as WebhookEvent;
    const eventType = body?.type;
    const emailId = body?.data?.email_id;
    const toEmails = body?.data?.to;

    if (!eventType || !emailId) {
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Config missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: recipients } = await supabaseAdmin
      .from('email_recipients')
      .select('id, campaign_id, user_id, email')
      .eq('provider_message_id', emailId);

    const rec = Array.isArray(recipients) && recipients.length > 0 ? recipients[0] : null;
    if (!rec) {
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const statusMap: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
    };
    const newStatus = statusMap[eventType];

    if (newStatus) {
      await supabaseAdmin
        .from('email_recipients')
        .update({ status: newStatus })
        .eq('id', rec.id);

      await supabaseAdmin.from('email_events').insert({
        campaign_id: rec.campaign_id,
        recipient_id: rec.id,
        event_type: eventType,
        event_data: body.data || {},
      });
    }

    if (eventType === 'email.complained') {
      const now = new Date().toISOString();
      if (rec.user_id) {
        const { data: existing } = await supabaseAdmin.from('email_preferences').select('user_id').eq('user_id', rec.user_id).single();
        if (existing) {
          await supabaseAdmin.from('email_preferences').update({ marketing_opt_in: false, unsubscribed_at: now, updated_at: now }).eq('user_id', rec.user_id);
        } else {
          await supabaseAdmin.from('email_preferences').upsert({ user_id: rec.user_id, marketing_opt_in: false, unsubscribed_at: now, updated_at: now }, { onConflict: 'user_id' });
        }
      } else if (rec.email) {
        await supabaseAdmin.from('email_unsubscribes').upsert({ email: rec.email.toLowerCase(), unsubscribed_at: now }, { onConflict: 'email' });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
