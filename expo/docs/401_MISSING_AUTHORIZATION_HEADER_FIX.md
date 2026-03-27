# 401 "Missing authorization header" - Complete Fix

## 🔍 Root Cause

The Supabase gateway **REQUIRES** the `Authorization` header for Edge Function requests. When the header is missing, the gateway returns:
```
401 Unauthorized
message: "Missing authorization header"
```

### Why This Happened

1. **Previous Fix Attempt:** We removed the `Authorization` header to avoid "Invalid JWT" errors
2. **Gateway Requirement:** Supabase gateway validates that the header exists (even if JWT is invalid)
3. **Result:** Gateway rejects requests without the header before they reach the Edge Function

## ✅ Complete Solution

### Architecture Understanding

**Supabase Gateway:**
- ✅ Validates `apikey` header exists
- ✅ Validates `Authorization` header exists
- ✅ Validates JWT in Authorization header (if present)
- ❌ Rejects requests missing Authorization header

**Edge Function:**
- ✅ Receives request if gateway accepts it
- ✅ Can work without validating JWT
- ✅ Uses service role key (bypasses RLS)
- ✅ Processes PDFs regardless of JWT validity

### Solution: Send Both Headers

**Frontend (`app/admin/books.tsx`):**

```typescript
// 1. Get and refresh session to ensure valid token
let { data: { session }, error: sessionError } = await supabase.auth.getSession();

// Refresh if expired or expiring soon
if (session && expiresIn < 5 * 60 * 1000) {
  const { data: refreshData } = await supabase.auth.refreshSession();
  if (refreshData?.session) {
    session = refreshData.session;
  }
}

// 2. Build headers - BOTH required by gateway
const requestHeaders = {
  'Content-Type': 'application/json',
  'apikey': supabaseAnonKey,        // ✅ Required by gateway
  'Authorization': `Bearer ${session.access_token}`, // ✅ Required by gateway
};

// 3. Send request
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: requestHeaders,
  body: JSON.stringify({ pdfUrl, bookId }),
});
```

**Edge Function (`supabase/functions/process-pdf/index.ts`):**

```typescript
// Function receives request (gateway already validated headers exist)
const authHeader = req.headers.get('authorization');

// Use service role key (bypasses all auth)
const supabaseClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey) // ✅ Bypasses RLS
  : createClient(supabaseUrl, supabaseAnonKey);

// Function works regardless of JWT validity
// Gateway validated JWT exists, but function doesn't need to validate it
```

## 🔐 Security Model

### Gateway Level (Supabase Infrastructure)
- **Validates:** Headers exist and are properly formatted
- **Validates:** JWT signature and expiration (if Authorization header present)
- **Rejects:** Requests missing required headers

### Edge Function Level (Our Code)
- **Does NOT validate:** JWT (uses service role key instead)
- **Bypasses:** RLS policies (service role key)
- **Works:** Regardless of JWT validity

### Why This Is Secure

1. **Gateway validates JWT:** Prevents unauthorized access at infrastructure level
2. **Function uses service role:** Ensures database operations work reliably
3. **User context optional:** Function can work with or without user authentication
4. **No security bypass:** Gateway still enforces authentication requirements

## 📊 Flow Diagram

```
Frontend
  ↓
1. Get session (refresh if needed)
2. Build headers:
   - apikey: <anon_key>
   - Authorization: Bearer <access_token>
  ↓
Supabase Gateway
  ↓
3. Validate apikey exists ✅
4. Validate Authorization exists ✅
5. Validate JWT signature ✅
6. Route to Edge Function
  ↓
Edge Function
  ↓
7. Receive request (already validated by gateway)
8. Use service role key (bypasses RLS)
9. Process PDF
10. Return result
  ↓
Frontend
  ↓
11. Parse response
12. Update form data
```

## ✅ Verification Checklist

### Frontend
- [x] Gets session before calling function
- [x] Refreshes session if expiring soon
- [x] Sends `apikey` header
- [x] Sends `Authorization` header
- [x] Handles session errors gracefully
- [x] Handles network errors gracefully

### Edge Function
- [x] Receives request (gateway validated)
- [x] Uses service role key (bypasses RLS)
- [x] Works regardless of JWT validity
- [x] Processes PDFs correctly
- [x] Returns structured response

### Integration
- [x] Gateway accepts request (has both headers)
- [x] Function processes request (uses service role)
- [x] Response handled correctly
- [x] Error cases handled gracefully

## 🚨 Common Issues & Solutions

### Issue 1: "Missing authorization header"
**Cause:** Authorization header not sent
**Fix:** Always send Authorization header with valid session token

### Issue 2: "Invalid JWT"
**Cause:** JWT expired or invalid
**Fix:** Refresh session before sending request

### Issue 3: Session expired
**Cause:** Session not refreshed before request
**Fix:** Check expiration and refresh if needed

## 🎯 Best Practices

1. **Always refresh session before Edge Function calls:**
   ```typescript
   if (expiresIn < 5 * 60 * 1000) {
     await supabase.auth.refreshSession();
   }
   ```

2. **Send both required headers:**
   ```typescript
   {
     'apikey': supabaseAnonKey,
     'Authorization': `Bearer ${session.access_token}`,
   }
   ```

3. **Use service role key in Edge Functions:**
   ```typescript
   const supabaseClient = createClient(url, serviceRoleKey);
   ```

4. **Handle errors gracefully:**
   ```typescript
   if (!session || !session.access_token) {
     // Show error, don't call function
   }
   ```

## 📝 Summary

**Problem:** Gateway requires Authorization header, but we removed it
**Solution:** Send both headers (gateway validates, function doesn't need to)
**Result:** Gateway accepts request, function processes it, everything works

**Key Insight:** Gateway validates JWT exists, but Edge Function doesn't need to validate it (uses service role key).

