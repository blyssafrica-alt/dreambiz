// Supabase Edge Function: Currency Onyx
// Fetches current exchange rates or currency conversion data

/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />

// @ts-ignore - Deno std library import (works at runtime in Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore - ESM import for Supabase client (works at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface CurrencyRequest {
  from?: string;
  to?: string;
  amount?: number;
  date?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    const apikeyHeader = req.headers.get('apikey');
    
    // Log for debugging (remove sensitive data in production)
    console.log('Currency Onyx request received:', {
      method: req.method,
      hasAuth: !!authHeader,
      hasApikey: !!apikeyHeader,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? apikeyHeader ?? '';
    
    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Supabase URL not configured',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    // For Edge Functions, we use service role key for database operations
    // But we can also verify user auth if token is provided
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Use service role key for database access (bypasses RLS if needed)
    // Or use anon key with user's auth token for RLS-protected queries
    const supabaseClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey) // Service role - full access
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: authHeader ? { Authorization: authHeader } : {},
          },
        }); // Anon key with user token - RLS applies

    // Parse request body
    let requestData: CurrencyRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch (jsonError) {
        console.error('Failed to parse request JSON:', jsonError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid JSON in request body',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user ID from auth token if available
    let userId: string | null = null;
    if (authHeader) {
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (!userError && user) {
          userId = user.id;
        }
      } catch (error) {
        console.warn('Could not get user from auth token:', error);
        // Continue without user - function can work with or without auth
      }
    }

    // Get latest exchange rate from database
    let exchangeRate = null;
    if (userId) {
      try {
        const { data, error } = await supabaseClient
          .from('exchange_rates')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          exchangeRate = {
            usdToZwl: Number(data.usd_to_zwl),
            createdAt: data.created_at,
          };
        }
      } catch (error) {
        console.warn('Could not fetch exchange rate from database:', error);
      }
    }

    // Default exchange rate if not found in database
    if (!exchangeRate) {
      exchangeRate = {
        usdToZwl: 25000, // Default ZWL rate
        createdAt: new Date().toISOString(),
      };
    }

    // Handle currency conversion if requested
    const { from, to, amount } = requestData;
    let convertedAmount: number | null = null;
    
    if (from && to && amount !== undefined) {
      if (from === 'USD' && to === 'ZWL') {
        convertedAmount = amount * exchangeRate.usdToZwl;
      } else if (from === 'ZWL' && to === 'USD') {
        convertedAmount = amount / exchangeRate.usdToZwl;
      } else if (from === to) {
        convertedAmount = amount;
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          exchangeRate: exchangeRate.usdToZwl,
          exchangeRateDate: exchangeRate.createdAt,
          ...(convertedAmount !== null && {
            conversion: {
              from,
              to,
              originalAmount: amount,
              convertedAmount: Number(convertedAmount.toFixed(2)),
            },
          }),
        },
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Error in currency-onyx function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Failed to process currency request',
      }),
      { 
        status: 200, // Always return 200, use success field for status
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

