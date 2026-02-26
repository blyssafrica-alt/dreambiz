/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />
/**
 * Admin Mailing: Unsubscribe handler
 * Verifies signed token and updates email_preferences (or email_unsubscribes for email-only).
 * No auth required - token is signed with MAILING_UNSUBSCRIBE_SECRET.
 * Set in Supabase Edge Function secrets.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function verifyToken(token: string): Promise<{ uid: string | null; email: string } | null> {
  const secret = Deno.env.get('MAILING_UNSUBSCRIBE_SECRET');
  if (!secret || !token || !token.includes('.')) return null;
  const [payloadB64, sigHex] = token.split('.');
  if (!payloadB64 || !sigHex) return null;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
    const expectedHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (sigHex.toLowerCase() !== expectedHex.toLowerCase()) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.email || (payload.exp && payload.exp < Math.floor(Date.now() / 1000))) return null;
    return { uid: payload.uid || null, email: payload.email };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || (await req.json().catch(() => ({}))).token;
    if (!token) {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribe</title></head><body><p>Invalid or missing token.</p></body></html>',
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribe</title></head><body><p>Invalid or expired token.</p></body></html>',
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response('Server error', { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    if (payload.uid) {
      const { data: existing } = await supabaseAdmin
        .from('email_preferences')
        .select('user_id')
        .eq('user_id', payload.uid)
        .single();
      if (existing) {
        await supabaseAdmin
          .from('email_preferences')
          .update({ marketing_opt_in: false, unsubscribed_at: now, updated_at: now })
          .eq('user_id', payload.uid);
      } else {
        await supabaseAdmin
          .from('email_preferences')
          .upsert(
            { user_id: payload.uid, marketing_opt_in: false, unsubscribed_at: now, updated_at: now },
            { onConflict: 'user_id' }
          );
      }
    } else {
      await supabaseAdmin
        .from('email_unsubscribes')
        .upsert({ email: payload.email.toLowerCase(), unsubscribed_at: now }, { onConflict: 'email' });
    }

    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head><body style="font-family:sans-serif;max-width:480px;margin:2rem auto;padding:1rem;"><h1>Unsubscribed</h1><p>You have been unsubscribed from marketing emails.</p><p>You may still receive transactional emails about your account.</p></body></html>',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (e) {
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head><body><p>An error occurred. Please try again later.</p></body></html>',
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});
