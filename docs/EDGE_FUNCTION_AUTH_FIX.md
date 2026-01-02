# Edge Function Authentication Fix

## Problem

Edge Functions were returning `401 Unauthorized` errors because:
1. Functions were being called without valid authentication headers
2. Session tokens weren't being passed correctly
3. Functions weren't deployed or didn't exist

## Root Cause Analysis

### How Supabase.functions.invoke Works

The Supabase JS client's `functions.invoke()` method **automatically** includes:
- `Authorization: Bearer <access_token>` - From the current user session
- `apikey: <anon_key>` - From the client initialization

**However**, this only works if:
1. A valid session exists in the client
2. The session hasn't expired
3. The client was initialized with the correct anon key

## Solution

### 1. Created Edge Function Helper (`lib/edge-function-helper.ts`)

**Before:**
```typescript
// Direct call - relies on automatic auth (may fail silently)
const { data, error } = await supabase.functions.invoke('currency-onyx', {
  body: { from: 'USD', to: 'ZWL', amount: 100 },
});
```

**After:**
```typescript
import { invokeEdgeFunction } from '@/lib/edge-function-helper';

// Helper ensures session exists and provides better error handling
const { data, error } = await invokeEdgeFunction('currency-onyx', {
  body: { from: 'USD', to: 'ZWL', amount: 100 },
});

if (error) {
  // Error includes detailed auth information
  console.error('Function call failed:', error);
}
```

### 2. Created Currency Onyx Edge Function

**Location:** `supabase/functions/currency-onyx/index.ts`

**Features:**
- Accepts authenticated users (uses user's exchange rate from database)
- Works without auth (falls back to default rate)
- Always returns 200 status (uses `success` field for status)
- Proper CORS headers
- Handles missing auth gracefully

### 3. Updated Existing Function Calls

**Before:**
```typescript
const { data, error } = await supabase.functions.invoke('process-pdf', {
  body: { pdfUrl, bookId },
});
```

**After:**
```typescript
// Verify session exists before calling
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('No active session. Please sign in.');
}

const { data, error } = await supabase.functions.invoke('process-pdf', {
  body: { pdfUrl, bookId },
});
```

## Edge Function Auth Handling

### Currency Onyx Function

**Accepts:**
- Authenticated users (with valid `Authorization: Bearer <token>` header)
- Unauthenticated requests (uses default exchange rate)

**Auth Flow:**
```typescript
// 1. Get auth header from request
const authHeader = req.headers.get('authorization');

// 2. Create Supabase client
// - If service role key exists: use it (bypasses RLS)
// - Otherwise: use anon key with user's auth token (RLS applies)
const supabaseClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

// 3. Get user from token (optional)
if (authHeader) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  // Use user.id for user-specific data
}
```

## Deployment

### Deploy Currency Onyx Function

```bash
supabase functions deploy currency-onyx
```

### Verify Deployment

1. Go to Supabase Dashboard → Edge Functions
2. Verify `currency-onyx` appears in the list
3. Check logs for any errors

## Testing

### Test with Authenticated User

```typescript
import { invokeEdgeFunction } from '@/lib/edge-function-helper';

// Ensure user is signed in
const { data, error } = await invokeEdgeFunction('currency-onyx', {
  body: { from: 'USD', to: 'ZWL', amount: 100 },
});

console.log('Exchange rate:', data?.exchangeRate);
console.log('Conversion:', data?.conversion);
```

### Test Direct Call (for debugging)

```typescript
// Direct call - Supabase client automatically adds auth headers
const { data: { session } } = await supabase.auth.getSession();
console.log('Session exists:', !!session);
console.log('Access token:', session?.access_token?.substring(0, 20) + '...');

const { data, error } = await supabase.functions.invoke('currency-onyx', {
  body: {},
});
```

## Common Issues

### Issue 1: 401 Unauthorized

**Cause:** Function not deployed or session expired

**Fix:**
1. Deploy the function: `supabase functions deploy currency-onyx`
2. Check session: `await supabase.auth.getSession()`
3. Refresh session if expired: `await supabase.auth.refreshSession()`

### Issue 2: Function Not Found (404)

**Cause:** Function name mismatch or not deployed

**Fix:**
1. Verify function name matches exactly (case-sensitive)
2. Check Supabase Dashboard → Edge Functions
3. Redeploy if needed

### Issue 3: Auth Headers Not Sent

**Cause:** Session doesn't exist or client not initialized correctly

**Fix:**
1. Ensure user is signed in: `await supabase.auth.getSession()`
2. Verify Supabase client is initialized with correct anon key
3. Use `invokeEdgeFunction` helper which validates session

## Best Practices

1. **Always verify session before calling functions:**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) {
     // Handle unauthenticated state
   }
   ```

2. **Use the helper function for better error handling:**
   ```typescript
   import { invokeEdgeFunction } from '@/lib/edge-function-helper';
   ```

3. **Handle 401 errors gracefully:**
   ```typescript
   if (error?.status === 401) {
     // Prompt user to sign in
     // Or refresh session
   }
   ```

4. **Edge Functions should always return 200 status:**
   ```typescript
   // Use success field instead of HTTP status
   return new Response(
     JSON.stringify({ success: false, error: '...' }),
     { status: 200, headers: corsHeaders }
   );
   ```

