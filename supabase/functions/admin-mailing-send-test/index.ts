/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />
/**
 * Admin Mailing: Send Test Email
 * Reuses Resend config: RESEND_API_KEY, RESEND_FROM (see docs/RESEND_INTEGRATION.md)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendEmailViaResend(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}): Promise<{ id?: string; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFrom = Deno.env.get('RESEND_FROM');
  if (!resendApiKey || !resendFrom) {
    return { error: 'Resend not configured (RESEND_API_KEY, RESEND_FROM)' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: opts.from ?? resendFrom,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html ?? opts.text,
      text: opts.text,
      reply_to: opts.replyTo,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.message || res.statusText || 'Send failed' };
  return { id: data.id };
}

function applyVariables(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{${k}}}`, 'gi'), v ?? '');
  }
  return out;
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return jsonResponse({ success: false, error: 'Missing config' }, 200);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader, apikey: supabaseAnonKey } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 200);
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { user_uuid: user.id });
    if (!isAdmin) {
      return jsonResponse({ success: false, error: 'Admin only' }, 200);
    }

    const body = await req.json() as { campaign_id?: string; test_email?: string };
    const campaignId = body?.campaign_id;
    const testEmail = body?.test_email;
    if (!campaignId || !testEmail) {
      return jsonResponse({ success: false, error: 'campaign_id and test_email required' }, 200);
    }

    const { data: campaign, error: campError } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, name, subject, preview_text, from_name, from_email, reply_to, template_id, html_content')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      return jsonResponse({ success: false, error: 'Campaign not found' }, 200);
    }

    const resendFrom = Deno.env.get('RESEND_FROM');
    if (!resendFrom) {
      return jsonResponse({
        success: false,
        error: 'Resend not configured. Add RESEND_FROM and RESEND_API_KEY to Edge Function secrets. See docs/RESEND_INTEGRATION.md',
      }, 200);
    }
    const fromStr = campaign.from_name && campaign.from_email
      ? `${campaign.from_name} <${campaign.from_email}>`
      : (campaign.from_email || resendFrom);

    let html: string;
    if ((campaign as any)?.html_content) {
      html = (campaign as any).html_content;
    } else if ((campaign as any)?.template_id) {
      const { data: tpl } = await supabaseAdmin
        .from('email_templates')
        .select('html')
        .eq('id', (campaign as any).template_id)
        .single();
      html = (tpl as any)?.html || `<h1>${campaign.name}</h1><p>${campaign.subject}</p>`;
    } else {
      html = `<h1>${campaign.name}</h1><p>${campaign.subject}</p><p>Test email. Variables: {{first_name}}, {{business_name}}, {{supplier_store}}</p>`;
    }

    const vars: Record<string, string> = {
      first_name: 'Test',
      business_name: 'Test Business',
      supplier_store: 'Test Store',
      plan_name: 'Pro',
      days_left: '7',
      unsubscribe_url: '#unsubscribe',
    };
    html = applyVariables(html, vars);

    const result = await sendEmailViaResend({
      to: testEmail,
      subject: campaign.subject,
      html,
      from: fromStr,
      replyTo: campaign.reply_to ?? undefined,
    });

    if (result.error) {
      return jsonResponse({ success: false, error: result.error }, 200);
    }
    return jsonResponse({ success: true, messageId: result.id }, 200);
  } catch (e) {
    return jsonResponse({ success: false, error: (e as Error).message }, 200);
  }
});
