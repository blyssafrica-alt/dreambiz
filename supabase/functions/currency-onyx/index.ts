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

    // Parse request body first (before auth check)
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
            message: 'Invalid request format',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Extract and verify JWT token from Authorization header
    let userId: string | null = null;
    let userEmail: string | null = null;
    let isAuthenticated = false;
    
    if (authHeader) {
      try {
        // Extract Bearer token
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        
        if (!token) {
          console.warn('Authorization header present but no token found');
        } else {
          // Create a client with anon key and user's token to verify auth
          // This is the correct way to verify user identity in Edge Functions
          const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
              headers: {
                Authorization: authHeader,
                apikey: supabaseAnonKey,
              },
            },
          });
          
          // Verify the user by calling getUser() - this validates the JWT
          const { data: { user }, error: userError } = await userClient.auth.getUser();
          
          if (userError) {
            console.error('JWT verification failed:', {
              error: userError.message,
              code: userError.status,
              hint: 'Token may be expired, invalid, or malformed',
            });
            
            // Return proper 401 error with details
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Authentication failed',
                message: userError.message || 'Invalid or expired authentication token',
                code: 'AUTH_ERROR',
                details: {
                  status: userError.status || 401,
                  hint: 'Please sign in again or refresh your session',
                },
              }),
              { 
                status: 200, // Always 200, use success field
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          if (user) {
            userId = user.id;
            userEmail = user.email || null;
            isAuthenticated = true;
            console.log('User authenticated:', { userId, email: userEmail });
          }
        }
      } catch (authError: any) {
        console.error('Error verifying authentication:', {
          error: authError?.message || authError,
          stack: authError?.stack,
        });
        
        // Return proper error response
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Authentication verification failed',
            message: authError?.message || 'Could not verify authentication token',
            code: 'AUTH_VERIFICATION_ERROR',
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // No auth header - function can still work with default values
      console.log('No authorization header - using default exchange rate');
    }

    // Create Supabase client for database operations
    // Use service role key for database access (bypasses RLS)
    // But we already verified user identity above
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey);

    // Get latest exchange rate from database (only if user is authenticated)
    let exchangeRate = null;
    if (isAuthenticated && userId) {
      try {
        const { data, error } = await supabaseClient
          .from('exchange_rates')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching exchange rate from database:', {
            error: error.message,
            code: error.code,
            hint: 'RLS policy may be blocking access or table may not exist',
          });
        } else if (data) {
          exchangeRate = {
            usdToZwl: Number(data.usd_to_zwl),
            createdAt: data.created_at,
          };
          console.log('Fetched user-specific exchange rate:', exchangeRate);
        }
      } catch (error: any) {
        console.warn('Exception fetching exchange rate:', {
          error: error?.message || error,
          hint: 'Database query failed',
        });
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

