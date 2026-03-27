# Complete Fix for 401 "Invalid JWT" Error - process-pdf Edge Function

## 🔍 Root Cause Analysis

The 401 "Invalid JWT" error occurs because:

1. **Supabase Gateway JWT Validation**: The gateway validates JWT tokens **BEFORE** forwarding requests to Edge Functions. If the JWT is invalid/expired, the gateway returns 401 and the function code **NEVER executes**.

2. **Token Timing Issues**: Even if a token is validated, it can expire between validation and the actual fetch call.

3. **Stale Token Usage**: Using cached tokens that may have expired.

4. **Missing Header Validation**: Not ensuring headers are properly formatted before sending.

## ✅ Complete Fix Applied

### 1. Frontend: Comprehensive Auth Flow

**File:** `app/admin/books.tsx`

**Key Changes:**

#### Before (Problematic):
```typescript
// ❌ Gets session once, might expire before use
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
// ... later uses token (might be expired)
```

#### After (Fixed):
```typescript
// ✅ Step 1: Get session
let { data: { session } } = await supabase.auth.getSession();

// ✅ Step 2: Refresh proactively if expiring soon (< 15 minutes)
if (expiresIn < 15 * 60 * 1000) {
  const { data: refreshData } = await supabase.auth.refreshSession();
  session = refreshData.session;
}

// ✅ Step 3: Validate token with server using getUser()
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Retry refresh and validation
}

// ✅ Step 4: Get FRESH session right before the call
const { data: { session: finalSession } } = await supabase.auth.getSession();
accessToken = finalSession.access_token;

// ✅ Step 5: Validate headers before sending
const requestHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken.trim()}`, // Validated, non-null
  'apikey': supabaseAnonKey.trim(), // Validated, non-null
};
```

**Improvements:**
- ✅ Proactive session refresh (15 minutes before expiration)
- ✅ Server-side token validation with `getUser()`
- ✅ Retry logic if validation fails
- ✅ Fresh token retrieval right before fetch
- ✅ Header validation (no null/undefined values)
- ✅ JWT format validation (3 parts: header.payload.signature)

### 2. Edge Function: Auth Handling

**File:** `supabase/functions/process-pdf/index.ts`

**Current Implementation:**
- ✅ Works with or without authentication
- ✅ Uses service role key when available (bypasses RLS)
- ✅ Validates user if Authorization header present (optional)
- ✅ Always returns HTTP 200 (uses `success` field for status)

**No changes needed** - The Edge Function correctly handles authentication. The issue is at the gateway level.

## 📋 Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend: Get Session                                    │
│    const { data: { session } } = await supabase.auth.getSession() │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend: Check Expiration & Refresh Proactively         │
│    if (expiresIn < 15 minutes) {                           │
│      await supabase.auth.refreshSession()                   │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend: Validate Token with Server                     │
│    const { data: { user } } = await supabase.auth.getUser() │
│    - If fails → retry refresh and validation                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend: Get Fresh Session Right Before Call            │
│    const { data: { session: finalSession } } = await ...    │
│    accessToken = finalSession.access_token                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend: Validate Headers                                │
│    - Ensure accessToken is not null/undefined               │
│    - Ensure apikey is not null/undefined                    │
│    - Trim whitespace                                         │
│    - Validate JWT format (3 parts)                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Frontend: Make Request                                    │
│    fetch(functionUrl, {                                      │
│      headers: {                                              │
│        'Authorization': `Bearer ${accessToken}`,             │
│        'apikey': supabaseAnonKey,                            │
│      }                                                       │
│    })                                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Supabase Gateway: Validate JWT                           │
│    - Checks Authorization header exists                      │
│    - Validates JWT signature and expiration                 │
│    - If invalid → returns 401 (function never runs)         │
│    - If valid → forwards to Edge Function                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Edge Function: Process Request                           │
│    - Receives request (gateway validated JWT)                │
│    - Uses service role key (bypasses RLS)                   │
│    - Processes PDF                                           │
│    - Returns HTTP 200 with { success: true/false }           │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Key Fixes

### Fix 1: Proactive Session Refresh
```typescript
// Refresh if expiring in less than 15 minutes (not just when expired)
if (expiresIn < 15 * 60 * 1000) {
  await supabase.auth.refreshSession();
}
```

### Fix 2: Server-Side Token Validation
```typescript
// Validate token with server (not just cache)
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Retry refresh and validation
}
```

### Fix 3: Fresh Token Right Before Call
```typescript
// Get session one more time right before fetch
const { data: { session: finalSession } } = await supabase.auth.getSession();
accessToken = finalSession.access_token;
```

### Fix 4: Header Validation
```typescript
// Ensure no null/undefined values
if (!accessToken || typeof accessToken !== 'string') {
  throw new Error('Invalid access token');
}
requestHeaders['Authorization'] = `Bearer ${accessToken.trim()}`;
```

## ✅ Verification Checklist

### Frontend
- [x] Gets session before calling function
- [x] Refreshes session proactively (15 min before expiration)
- [x] Validates token with server using `getUser()`
- [x] Retries refresh if validation fails
- [x] Gets fresh session right before fetch
- [x] Validates headers (no null/undefined)
- [x] Validates JWT format (3 parts)
- [x] Sends both `Authorization` and `apikey` headers
- [x] Trims whitespace from headers

### Edge Function
- [x] Works with or without authentication
- [x] Uses service role key (bypasses RLS)
- [x] Always returns HTTP 200
- [x] Uses `success` field for actual status
- [x] Proper CORS headers

### Gateway
- [x] Validates `apikey` header exists
- [x] Validates `Authorization` header exists (if sent)
- [x] Validates JWT signature and expiration
- [x] Forwards to function if valid

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid JWT"
**Cause:** Token expired or invalid
**Fix:** Proactive refresh + server validation + fresh token before call

### Issue 2: Token expires between validation and call
**Cause:** Time gap between validation and fetch
**Fix:** Get fresh session right before fetch call

### Issue 3: Null/undefined token
**Cause:** Session doesn't have access_token
**Fix:** Validate token exists and is string before using

### Issue 4: Stale token from cache
**Cause:** Using cached session
**Fix:** Get fresh session right before call

## 📝 Summary

**Problem:** Gateway rejects requests with "Invalid JWT" before function runs
**Root Cause:** Token expired, stale, or invalid between validation and fetch
**Solution:** 
1. Proactive session refresh (15 min before expiration)
2. Server-side token validation with `getUser()`
3. Fresh token retrieval right before fetch
4. Header validation (no null/undefined)
5. Retry logic if validation fails

**Result:** Token is always fresh, valid, and properly formatted when sent to gateway.

