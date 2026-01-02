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
 * Includes request deduplication to prevent infinite retries.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<{ data: T | null; error: any | null }> {
  // Create cache key for request deduplication
  const cacheKey = `${functionName}-${JSON.stringify(options.body || {})}`;
  const cached = functionCallCache.get(cacheKey);
  
  // Return cached promise if it's still valid (prevents infinite retries)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.promise;
  }
  
  const invokePromise = (async () => {
    try {
      // Get current session - supabase.functions.invoke automatically includes
      // the Authorization header from the session, but we verify it exists
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`Failed to get session for Edge Function ${functionName}:`, sessionError);
        // Return error instead of continuing - prevents 401 errors
        return {
          data: null,
          error: {
            message: 'Authentication required. Please sign in.',
            status: 401,
            statusCode: 401,
          },
        };
      }

      if (!session) {
        // No session - return error instead of calling function
        return {
          data: null,
          error: {
            message: 'No active session. Please sign in.',
            status: 401,
            statusCode: 401,
          },
        };
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
            hint: 'Function may not be deployed or session expired. Check Supabase Dashboard → Edge Functions.',
          });
        }
        // Don't retry on 401 - return error immediately
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
  })();
  
  // Cache the promise to prevent duplicate calls
  functionCallCache.set(cacheKey, { promise: invokePromise, timestamp: Date.now() });
  
  // Clean up old cache entries
  if (functionCallCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of functionCallCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        functionCallCache.delete(key);
      }
    }
  }
  
  return invokePromise;
}

