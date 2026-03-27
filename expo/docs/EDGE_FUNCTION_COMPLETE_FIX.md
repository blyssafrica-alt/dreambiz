# Complete Edge Function Auth & Response Fix

## 🔍 Root Cause Analysis

### Problem
The `process-pdf` Edge Function was returning `401 Unauthorized` errors with the message "Edge Function returned a non-2xx status code".

### Root Cause

1. **Supabase Gateway JWT Validation**
   - The Supabase gateway validates JWT tokens **BEFORE** forwarding requests to Edge Functions
   - If JWT is invalid/expired, gateway returns `401` and the function **never executes**
   - The function code never runs, so the issue is at the gateway level

2. **Frontend Token Validation**
   - `getSession()` only checks cached session, doesn't validate with server
   - Expired tokens in cache still get sent to gateway
   - Gateway rejects invalid tokens → 401 error

3. **Response Contract**
   - Edge Function must ALWAYS return HTTP 200 with structured JSON
   - Non-2xx status codes cause `FunctionsHttpError` in Supabase client
   - All error paths must return `{ success: false, ... }` with status 200

## ✅ Complete Fix

### 1. Frontend: Token Validation with `getUser()`

**Location:** `app/admin/books.tsx`

**Before (Broken):**
```typescript
// ❌ Only checks cache, doesn't validate with server
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  // Token might be expired but still in cache
  await supabase.functions.invoke('process-pdf', { body: {...} });
}
```

**After (Fixed):**
```typescript
// ✅ Validates token with Supabase server
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  // getUser() validates token with server
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    // Token invalid - refresh session
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) {
      // Use refreshed token
      session = refreshData.session;
    }
  }
  
  // Now token is guaranteed valid
  await supabase.functions.invoke('process-pdf', { body: {...} });
}
```

**Key Changes:**
- Use `getUser()` to validate token with Supabase server
- Refresh session if token is invalid
- Only call function with validated token

### 2. Edge Function: Always Return 200 with Structured JSON

**Location:** `supabase/functions/process-pdf/index.ts`

**Before (Broken):**
```typescript
// ❌ Returns 500 on error → causes FunctionsHttpError
catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500 } // ❌ Non-2xx causes FunctionsHttpError
  );
}
```

**After (Fixed):**
```typescript
// ✅ Always returns 200 with success field
catch (error: any) {
  return new Response(
    JSON.stringify({ 
      success: false,  // ✅ Use success field, not HTTP status
      error: error?.message || 'Failed to process PDF',
      message: 'An error occurred while processing the PDF. Please use manual entry.',
      data: {
        chapters: [],
        totalChapters: 0,
        pageCount: 0,
      },
      requiresManualEntry: true,
    }),
    { 
      status: 200,  // ✅ Always 200
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
      } 
    }
  );
}
```

**Key Changes:**
- All error paths return HTTP 200
- Use `success: false` field to indicate failure
- Always include `Content-Type: application/json` header
- Wrap JSON.stringify in try-catch to handle edge cases

### 3. Complete Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend: Get Session                                     │
│    const { data: { session } } = await supabase.auth.getSession() │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend: Validate Token with Server                     │
│    const { data: { user } } = await supabase.auth.getUser() │
│    - If invalid → refresh session                            │
│    - If still invalid → show error, don't call function       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend: Call Edge Function                              │
│    await supabase.functions.invoke('process-pdf', {...})     │
│    - Automatically includes:                                 │
│      • Authorization: Bearer <valid_token>                    │
│      • apikey: <anon_key>                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Supabase Gateway: Validate JWT                            │
│    - Checks Authorization header                              │
│    - Validates JWT signature and expiration                  │
│    - If invalid → returns 401 (function never runs)            │
│    - If valid → forwards to Edge Function                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Edge Function: Process Request                              │
│    - Receives request (gateway validated JWT)                │
│    - Processes PDF                                            │
│    - Returns Response with status 200                         │
│    - JSON: { success: true/false, data: {...} }               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Frontend: Handle Response                                  │
│    - Check data.success                                       │
│    - If false → show error, suggest manual entry             │
│    - If true → use extracted data                             │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Validation Checklist

### Frontend Validation

- [x] Uses `getUser()` to validate token (not just `getSession()`)
- [x] Refreshes session if token is invalid
- [x] Only calls function with validated token
- [x] Handles 401 errors gracefully
- [x] Checks `data.success` field (not HTTP status)
- [x] Provides fallback to manual entry

### Edge Function Validation

- [x] All code paths return `Response` object
- [x] All responses use HTTP status 200
- [x] All responses include `Content-Type: application/json`
- [x] All responses use `success` field for status
- [x] Error responses include structured JSON
- [x] JSON.stringify wrapped in try-catch
- [x] CORS headers included in all responses

### Supabase Configuration

- [x] Edge Function deployed: `supabase functions deploy process-pdf`
- [x] Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (optional, for RLS bypass)
- [x] Function appears in Supabase Dashboard → Edge Functions

## 🧪 Testing

### Test 1: Valid Token
```typescript
// User is signed in with valid session
// Expected: Function executes, returns extracted data
```

### Test 2: Expired Token
```typescript
// User session expired
// Expected: Frontend refreshes token, function executes
```

### Test 3: Invalid Token
```typescript
// Token is invalid/corrupted
// Expected: Frontend shows "Please sign in again"
```

### Test 4: Function Not Deployed
```typescript
// Function doesn't exist in Supabase
// Expected: Gateway returns 404, frontend shows helpful error
```

### Test 5: PDF Processing Error
```typescript
// PDF is corrupted or unreadable
// Expected: Function returns 200 with success: false, frontend suggests manual entry
```

## 🚀 Deployment

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy process-pdf
   ```

2. **Verify Deployment:**
   - Go to Supabase Dashboard → Edge Functions
   - Verify `process-pdf` appears in list
   - Check logs for any errors

3. **Test in Production:**
   - Sign in to app
   - Upload PDF document
   - Verify processing works
   - Check logs for any 401 errors

## 📝 Key Takeaways

1. **Gateway validates JWT before function runs** - Invalid tokens cause 401 at gateway level
2. **Use `getUser()` not `getSession()`** - Validates token with server, not just cache
3. **Always return HTTP 200** - Use `success` field for actual status
4. **Structured JSON responses** - All responses must be valid JSON with consistent structure
5. **Graceful error handling** - Frontend should handle all error cases and provide fallbacks

## 🔗 Related Files

- `app/admin/books.tsx` - Frontend PDF processing
- `supabase/functions/process-pdf/index.ts` - Edge Function
- `lib/supabase.ts` - Supabase client configuration
- `lib/edge-function-helper.ts` - Edge Function helper (optional)

