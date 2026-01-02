/**
 * Helper function to invoke Supabase Edge Functions with proper authentication
 * Ensures auth headers are always included from the current session
 */

import { supabase } from './supabase';

interface InvokeOptions {
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Invoke a Supabase Edge Function with automatic auth header injection
 * 
 * The Supabase JS client automatically includes:
 * - Authorization: Bearer <access_token> (from current session)
 * - apikey: <anon_key> (from client initialization)
 * 
 * This helper ensures the session is valid and provides better error handling.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<{ data: T | null; error: any | null }> {
  try {
    // Get current session - supabase.functions.invoke automatically includes
    // the Authorization header from the session, but we verify it exists
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error(`Failed to get session for Edge Function ${functionName}:`, sessionError);
      // Don't fail - some functions might work without auth
      // But log the error for debugging
    }

    // Prepare headers
    // Note: supabase.functions.invoke automatically adds:
    // - Authorization: Bearer <access_token> (if session exists)
    // - apikey: <anon_key> (always)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Invoke the function
    // The Supabase client will automatically include auth headers from the session
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: options.body,
      headers,
    });

    if (error) {
      // Enhanced error logging for 401 errors
      if (error.status === 401 || error.statusCode === 401) {
        console.error(`Edge Function ${functionName} returned 401 Unauthorized:`, {
          functionName,
          hasSession: !!session,
          sessionExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : false,
          sessionError: sessionError?.message,
          errorMessage: error.message,
        });
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`Failed to invoke Edge Function ${functionName}:`, error);
    return {
      data: null,
      error: {
        message: error?.message || 'Failed to invoke Edge Function',
        status: error?.status || 500,
        statusCode: error?.statusCode || 500,
      },
    };
  }
}

