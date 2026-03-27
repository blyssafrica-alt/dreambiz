# 401 Unauthorized Error - Root Cause Analysis & Fix

## 🔍 Root Cause

The 401 Unauthorized error occurred because:

### 1. **JWT Verification Failure in Edge Function**

**Problem:**
- The Edge Function was using `supabaseClient.auth.getUser()` with a **service role key client**
- Service role keys bypass RLS but **don't have user context**
- Calling `getUser()` on a service role client **always fails** because there's no user session

**Before (Broken):**
```typescript
// ❌ WRONG: Service role client has no user context
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const { data: { user } } = await supabaseClient.auth.getUser(); // Always fails!
```

**After (Fixed):**
```typescript
// ✅ CORRECT: Create separate client with anon key + user token
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Authorization: authHeader, // User's JWT token
      apikey: supabaseAnonKey,
    },
  },
});
const { data: { user } } = await userClient.auth.getUser(); // Works!
```

### 2. **Missing Authorization Header**

**Problem:**
- The client-side code relied on `supabase.functions.invoke()` to automatically add auth headers
- If session was null or expired, no Authorization header was sent
- Edge Function received request without `Authorization: Bearer <token>` header

**Before (Broken):**
```typescript
// ❌ WRONG: Relies on automatic header injection (may fail silently)
const { data, error } = await supabase.functions.invoke('currency-onyx', {
  body: {},
});
```

**After (Fixed):**
```typescript
// ✅ CORRECT: Explicitly verify session and add header
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return { data: null, error: { status: 401 } };
}

const headers = {
  'Authorization': `Bearer ${session.access_token}`, // Explicit header
  'Content-Type': 'application/json',
};

const { data, error } = await supabase.functions.invoke('currency-onyx', {
  body: {},
  headers,
});
```

### 3. **Generic Error Responses**

**Problem:**
- Edge Function returned generic errors without details
- Client couldn't distinguish between "no auth" vs "invalid token" vs "expired token"
- Errors showed as `[object Object]` in console

**Before (Broken):**
```typescript
// ❌ WRONG: Generic error
return new Response(
  JSON.stringify({ success: false, error: 'Failed' }),
  { status: 401 } // Wrong status code
);
```

**After (Fixed):**
```typescript
// ✅ CORRECT: Detailed error with proper status
return new Response(
  JSON.stringify({
    success: false,
    error: 'Authentication failed',
    message: userError.message || 'Invalid or expired token',
    code: 'AUTH_ERROR',
    details: {
      status: 401,
      hint: 'Please sign in again',
    },
  }),
  { status: 200 } // Always 200, use success field
);
```

## ✅ Fixes Applied

### 1. **Edge Function: Proper JWT Verification**

**File:** `supabase/functions/currency-onyx/index.ts`

**Changes:**
- Extract JWT from `Authorization: Bearer <token>` header
- Create separate client with **anon key + user token** to verify user
- Use **service role key** only for database operations (after user verified)
- Return detailed JSON errors instead of generic failures
- Always return HTTP 200 (use `success` field for status)

**Key Code:**
```typescript
// Extract Bearer token
const token = authHeader.replace(/^Bearer\s+/i, '').trim();

// Create client with anon key + user token (for auth verification)
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Authorization: authHeader,
      apikey: supabaseAnonKey,
    },
  },
});

// Verify user (this validates the JWT)
const { data: { user }, error: userError } = await userClient.auth.getUser();

if (userError) {
  // Return detailed error
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Authentication failed',
      message: userError.message,
      code: 'AUTH_ERROR',
    }),
    { status: 200 }
  );
}
```

### 2. **Client: Explicit Authorization Header**

**File:** `lib/edge-function-helper.ts`

**Changes:**
- Verify session exists before calling function
- Explicitly add `Authorization: Bearer <token>` header
- Log auth details in development for debugging
- Return proper error if session is missing

**Key Code:**
```typescript
// Verify session
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (!session) {
  return {
    data: null,
    error: {
      message: 'No active session. Please sign in.',
      status: 401,
    },
  };
}

// Explicitly add Authorization header
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${session.access_token}`, // Explicit!
  ...options.headers,
};

// Invoke function
const { data, error } = await supabase.functions.invoke(functionName, {
  body: options.body,
  headers,
});
```

### 3. **RLS Policies: Ensure Access**

**File:** `database/fix_exchange_rates_rls.sql`

**Changes:**
- Ensure RLS is enabled on `exchange_rates` table
- Create/update policies for SELECT, INSERT, UPDATE, DELETE
- Policies use `auth.uid() = user_id` to match authenticated user

**Key SQL:**
```sql
-- Users can view their own exchange rates
CREATE POLICY "Users can view their own exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (auth.uid()::text = user_id::text);
```

## 📋 What Was Missing

1. **JWT Verification:** Edge Function wasn't properly extracting and verifying the JWT token
2. **User Context:** Using service role key for `getUser()` doesn't work (no user context)
3. **Explicit Headers:** Client wasn't explicitly adding Authorization header
4. **Error Details:** Generic errors made debugging impossible
5. **RLS Policies:** Policies existed but Edge Function wasn't using user context correctly

## 🎯 Result

- ✅ JWT is properly extracted from Authorization header
- ✅ User identity is verified before database access
- ✅ Authorization header is explicitly sent from client
- ✅ Detailed error messages help debugging
- ✅ RLS policies work correctly with authenticated users
- ✅ No security shortcuts (still uses RLS, no service role on client)

## 🚀 Deployment

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy currency-onyx
   ```

2. **Run SQL Fix:**
   ```sql
   -- Run database/fix_exchange_rates_rls.sql
   ```

3. **Test:**
   - Sign in to app
   - Call currency-onyx function
   - Should work without 401 errors

## ⚠️ Important Notes

- **Never use service role key on client** - Always use anon key
- **Always verify JWT in Edge Functions** - Don't trust headers blindly
- **Use separate clients** - One for auth verification (anon + token), one for DB (service role)
- **Return 200 status** - Use `success` field to indicate actual status (prevents FunctionsHttpError)

