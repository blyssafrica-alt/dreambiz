/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />
/**
 * Admin Mailing: Send Campaign
 * Reuses Resend: RESEND_API_KEY, RESEND_FROM (see docs/RESEND_INTEGRATION.md)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BATCH_SIZE = 100;
const MAX_RECIPIENTS = 50000;

async function sendEmailViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  listUnsubscribe?: string;
}): Promise<{ id?: string; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFrom = Deno.env.get('RESEND_FROM');
  if (!resendApiKey || !resendFrom) {
    return { error: 'Resend not configured' };
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${resendApiKey}`,
  };
  if (opts.listUnsubscribe) {
    headers['List-Unsubscribe'] = `<${opts.listUnsubscribe}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: opts.from ?? resendFrom,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.message || res.statusText || 'Send failed' };
  return { id: data.id };
}

async function buildUnsubscribeToken(uid: string | null, email: string): Promise<string> {
  const secret = Deno.env.get('MAILING_UNSUBSCRIBE_SECRET');
  if (!secret) return '';
  const exp = Math.floor(Date.now() / 1000) + 86400 * 365;
  const payload = JSON.stringify({ uid: uid || null, email, exp });
  const payloadB64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${payloadB64}.${sigHex}`;
}

function applyVariables(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{${k}}}`, 'gi'), v ?? '');
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing config' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader, apikey: supabaseAnonKey } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { user_uuid: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json() as { campaign_id?: string };
    const campaignId = body?.campaign_id;
    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: campaign, error: campError } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, name, subject, from_name, from_email, reply_to, status, audience_mode, segment_config, template_id, html_content')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if ((campaign as any).status !== 'draft' && (campaign as any).status !== 'scheduled') {
      return new Response(JSON.stringify({ error: 'Campaign already sent or cancelled' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resendFrom = Deno.env.get('RESEND_FROM');
    const fromStr = (campaign as any).from_name && (campaign as any).from_email
      ? `${(campaign as any).from_name} <${(campaign as any).from_email}>`
      : ((campaign as any).from_email || resendFrom);

    let html: string;
    if ((campaign as any)?.html_content) {
      html = (campaign as any).html_content;
    } else if ((campaign as any)?.template_id) {
      const { data: tpl } = await supabaseAdmin
        .from('email_templates')
        .select('html')
        .eq('id', (campaign as any).template_id)
        .single();
      html = (tpl as any)?.html || `<h1>${(campaign as any).name}</h1><p>${(campaign as any).subject}</p>`;
    } else {
      return new Response(JSON.stringify({ error: 'Campaign has no content (add template or HTML)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const config = (campaign as any).segment_config || {};
    const { data: resolveResult } = await supabaseAdmin.rpc('resolve_segment_audience', {
      p_config: config,
      p_limit: MAX_RECIPIENTS,
      p_offset: 0,
    });

    const parsed = resolveResult as { ok?: boolean; error?: string; recipients?: Array<{ user_id: string; email: string; name?: string; metadata?: Record<string, unknown> }> };
    if (!parsed?.ok || !parsed.recipients?.length) {
      return new Response(JSON.stringify({ error: parsed?.error || 'No recipients found for segment' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const recipients = parsed.recipients.slice(0, MAX_RECIPIENTS);

    const { data: prefsRows } = await supabaseAdmin
      .from('email_preferences')
      .select('user_id')
      .eq('marketing_opt_in', false);

    let unsubscribedEmails = new Set<string>();
    try {
      const { data: unsubEmails } = await supabaseAdmin.from('email_unsubscribes').select('email');
      unsubscribedEmails = new Set((unsubEmails || []).map((r: { email: string }) => (r.email || '').toLowerCase()));
    } catch {
      // Table may not exist if admin_mailing_extensions.sql not run yet
    }

    const optedOut = new Set((prefsRows || []).map((r: { user_id: string }) => r.user_id));

    const toSend = recipients.filter((r) => {
      if (r.user_id) return !optedOut.has(r.user_id);
      return !unsubscribedEmails.has(r.email);
    });

    await supabaseAdmin.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId);

    const recipientRows = toSend.map((r) => ({
      campaign_id: campaignId,
      user_id: r.user_id,
      email: r.email,
      name: r.name || null,
      metadata: r.metadata || null,
      status: 'queued',
    }));

    const { error: insErr } = await supabaseAdmin.from('email_recipients').insert(recipientRows);
    if (insErr) {
      await supabaseAdmin.from('email_campaigns').update({ status: 'draft' }).eq('id', campaignId);
      return new Response(JSON.stringify({ error: 'Failed to create recipients: ' + insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: queued } = await supabaseAdmin
      .from('email_recipients')
      .select('id, email, user_id, name, metadata')
      .eq('campaign_id', campaignId)
      .eq('status', 'queued')
      .order('id');

    let sent = 0;
    let failed = 0;
    const q = queued || [];
    const funcBase = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

    for (let i = 0; i < q.length; i += BATCH_SIZE) {
      const batch = q.slice(i, i + BATCH_SIZE);
      for (const rec of batch) {
        const r = rec as { id: string; email: string; user_id?: string; name?: string; metadata?: Record<string, unknown> };
        const token = await buildUnsubscribeToken(r.user_id || null, r.email);
        const unsubscribeUrl = token ? `${funcBase}/admin-mailing-unsubscribe?token=${encodeURIComponent(token)}` : '';
        const vars: Record<string, string> = {
          first_name: (r.name || '').split(' ')[0] || 'there',
          business_name: (r.metadata as any)?.business_name || r.name || '',
          supplier_store: (r.metadata as any)?.business_name || r.name || '',
          plan_name: 'Pro',
          days_left: '7',
          unsubscribe_url: unsubscribeUrl || '#',
        };
        const personalizedHtml = applyVariables(html, vars);

        const result = await sendEmailViaResend({
          to: r.email,
          subject: (campaign as any).subject,
          html: personalizedHtml,
          from: fromStr,
          replyTo: (campaign as any).reply_to ?? undefined,
          listUnsubscribe: unsubscribeUrl || undefined,
        });

        if (result.id) {
          await supabaseAdmin
            .from('email_recipients')
            .update({ status: 'delivered', provider_message_id: result.id, sent_at: new Date().toISOString() })
            .eq('id', r.id);
          sent++;
        } else {
          await supabaseAdmin
            .from('email_recipients')
            .update({ status: 'failed', fail_reason: result.error })
            .eq('id', r.id);
          failed++;
        }
      }
    }

    await supabaseAdmin.from('email_campaigns').update({ status: 'sent' }).eq('id', campaignId);

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      skipped_opt_out: recipients.length - toSend.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
