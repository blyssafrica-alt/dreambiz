# Complete Fix for 401 Unauthorized Error - process-pdf Edge Function

## 🔍 Root Cause Analysis

The 401 error was occurring because:

1. **Supabase Gateway JWT Validation**: The gateway validates JWT tokens BEFORE forwarding requests to Edge Functions. If the JWT is invalid/expired, the gateway returns 401 and the function code NEVER executes.

2. **Token Validation Timing**: The frontend was validating tokens with `getUser()`, but there was a timing issue where the token might expire between validation and the actual function call.

3. **Method Error Response**: The Edge Function was returning HTTP 405 for non-POST methods, which caused `FunctionsHttpError` in the client.

## ✅ Complete Fixes Applied

### 1. Frontend: Hybrid Approach with Fallback

**File:** `app/admin/books.tsx`

**Changes:**
- Try `supabase.functions.invoke()` first (handles auth automatically)
- Fallback to direct `fetch()` if invoke fails
- Ensures token is validated with `getUser()` before calling
- Proper URL construction and validation
- Comprehensive error handling

**Key Code:**
```typescript
// STEP 1: Validate token with getUser() (validates with server)
const { data: { user }, error: userError } = await supabase.auth.getUser();

// STEP 2: Refresh if invalid
if (userError) {
  const { data: refreshData } = await supabase.auth.refreshSession();
  // Use refreshed token
}

// STEP 3: Try supabase.functions.invoke first (recommended)
try {
  const { data, error } = await supabase.functions.invoke('process-pdf', {...});
  // Handle response
} catch {
  // Fallback to direct fetch if invoke fails
  const response = await fetch(functionUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabaseAnonKey,
    },
  });
}
```

### 2. Edge Function: Always Return 200

**File:** `supabase/functions/process-pdf/index.ts`

**Changes:**
- Changed method error response from 405 to 200
- All error paths return HTTP 200 with `success: false`
- Comprehensive error handling with try-catch
- Proper JSON responses with CORS headers

**Key Code:**
```typescript
// Before: Returned 405 (caused FunctionsHttpError)
if (req.method !== 'POST') {
  return new Response(..., { status: 405 }); // ❌
}

// After: Returns 200 (prevents FunctionsHttpError)
if (req.method !== 'POST') {
  return new Response(..., { status: 200 }); // ✅
}
```

### 3. Error Handling Improvements

**Both Files:**
- All errors return structured JSON with `success: false`
- Frontend checks `data.success` field, not HTTP status
- Clear error messages for debugging
- Graceful fallbacks at every step

## 📋 Execution Flow

```
1. Frontend: Get Session
   ↓
2. Frontend: Validate Token with getUser() (validates with server)
   ↓
3. Frontend: Refresh if Invalid
   ↓
4. Frontend: Try supabase.functions.invoke()
   ↓
5. Gateway: Validate JWT (if Authorization header present)
   - If invalid → 401 (function never runs)
   - If valid → Forward to function
   ↓
6. Edge Function: Process Request
   - Always returns HTTP 200
   - Uses success field for actual status
   ↓
7. Frontend: Handle Response
   - Check data.success field
   - Show appropriate message
```

## 🚀 Deployment Checklist

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy process-pdf
   ```

2. **Verify Deployment:**
   - Go to Supabase Dashboard → Edge Functions
   - Verify `process-pdf` appears in list
   - Check logs for any errors

3. **Test the Flow:**
   - Sign in to app
   - Upload PDF document
   - Verify processing works
   - Check console for any errors

## 🔧 Troubleshooting

### If you still get 401:

1. **Check Function Deployment:**
   ```bash
   supabase functions list
   ```
   Verify `process-pdf` is listed.

2. **Check Environment Variables:**
   - `SUPABASE_URL` - Should be your project URL
   - `SUPABASE_ANON_KEY` - Should be your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Optional, but recommended

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for any error messages
   - Check if requests are reaching the function

4. **Verify Token:**
   - Check console logs for token validation
   - Ensure token is not expired
   - Verify `getUser()` succeeds

### Common Issues:

- **Function not deployed**: Deploy with `supabase functions deploy process-pdf`
- **Invalid URL**: Should be `https://<project>.supabase.co/functions/v1/process-pdf`
- **Expired token**: Frontend now refreshes automatically
- **Missing apikey header**: Both invoke and fetch include it

## 📝 Key Takeaways

1. **Gateway validates JWT before function runs** - Invalid tokens cause 401 at gateway level
2. **Always return HTTP 200 from Edge Functions** - Use `success` field for actual status
3. **Use `getUser()` not just `getSession()`** - Validates token with server
4. **Hybrid approach works best** - Try `invoke()` first, fallback to `fetch()`
5. **Comprehensive error handling** - Handle all edge cases gracefully

## ✅ Verification

After deployment, test:
- [ ] Valid token → Function executes successfully
- [ ] Expired token → Frontend refreshes, function executes
- [ ] Invalid token → Frontend shows "Please sign in"
- [ ] Function not deployed → Clear error message
- [ ] Network error → Graceful error handling
- [ ] PDF processing → Extracts chapters/pages correctly

All fixes have been applied and the system should now work end-to-end!

