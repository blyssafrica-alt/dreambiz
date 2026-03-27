/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type NotificationRequest = {
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels?: {
    push?: boolean;
    email?: boolean;
  };
  userId?: string;
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

    const body = (await req.json()) as NotificationRequest;
    if (!body?.title || !body?.message) {
      return new Response(JSON.stringify({ error: 'Missing title or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetUserId = body.userId || authData.user.id;
    if (targetUserId !== authData.user.id) {
      const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { user_id: authData.user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const channels = body.channels || { push: true, email: false };
    const { data: tokensData } = await supabaseAdmin
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', targetUserId);

    const tokens = (tokensData || []).map((row: any) => row.expo_push_token).filter(Boolean);

    if (channels.push) {
      await sendExpoPush(tokens, { title: body.title, body: body.message, data: body.data as any });
    }

    if (channels.email) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .single();

      if (userData?.email) {
        await sendEmailViaResend(userData.email, body.title, body.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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


