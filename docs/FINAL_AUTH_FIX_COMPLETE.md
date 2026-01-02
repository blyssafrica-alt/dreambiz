# Final Auth Fix - Complete Solution

## 🔍 ROOT CAUSE IDENTIFIED

**The codebase was mixing two incompatible call paths:**
1. `supabase.functions.invoke()` - Automatic auth handling ✅
2. Manual `fetch()` - No auth header ❌

This resulted in:
- Logs showing `invoke()` was called
- But actual request was using `fetch()` without Authorization header
- Edge Function responding with `{"code":401,"message":"Missing authorization header"}`

## ✅ COMPLETE FIX APPLIED

### 1. Removed ALL Manual `fetch()` Calls

**Removed:**
- ❌ `buildEdgeFunctionUrl()` function (no longer needed)
- ❌ All manual `fetch()` calls with explicit headers
- ❌ All URL construction logic
- ❌ All public access fallback paths
- ❌ All retry logic with fetch

**Now uses ONLY:**
- ✅ `supabase.functions.invoke()` for function calls
- ✅ `supabase.functions.invoke()` for status checks
- ✅ Automatic auth injection by Supabase client

### 2. Edge Function Configuration

**File:** `supabase/config.toml`

```toml
[functions.process-pdf]
verify_jwt = true
```

**Changed from:** `verify_jwt = false` (public access)
**Changed to:** `verify_jwt = true` (requires authentication)

### 3. Edge Function Code

**File:** `supabase/functions/process-pdf/index.ts`

**Key Changes:**
- ✅ Expects authenticated users (gateway validates JWT)
- ✅ Validates Authorization header is present
- ✅ Uses service role key for database operations (bypasses RLS)
- ✅ Extracts user ID from validated JWT for logging

**Auth Logic:**
```typescript
// Gateway validates JWT BEFORE forwarding
// If we reach here, JWT is VALID
const authHeader = req.headers.get('authorization');

if (!authHeader) {
  // This should never happen - gateway would reject first
  return new Response(JSON.stringify({
    success: false,
    error: 'Missing authorization header',
  }), { status: 200 });
}

// Use service role key for database operations
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
```

### 4. Frontend Code

**File:** `app/admin/books.tsx`

**Final Implementation:**
```typescript
// STEP 1-6: Validate session and refresh if needed (existing logic)
// ... session validation code ...

// STEP 7: Call Edge Function using invoke() ONLY
const { data, error } = await supabase.functions.invoke('process-pdf', {
  body: {
    pdfUrl: formData.documentFileUrl,
    bookId: editingId || null,
  },
});

if (error) {
  // Handle error (including 401)
  if (error.status === 401) {
    Alert.alert('Authentication Failed', 'Please sign out and sign back in.');
    return;
  }
}

// Use data.jobId to poll for status
const jobId = data.jobId;

// Poll status using invoke() ONLY
const { data: statusData } = await supabase.functions.invoke('process-pdf', {
  body: { jobId },
});
```

## 📊 EXECUTION PATH (FIXED)

```
Frontend
  ↓
1. Validate session with getUser()
2. Refresh if needed
3. Call supabase.functions.invoke('process-pdf', { body: {...} })
   - Supabase client automatically injects Authorization header
   - Supabase client handles URL construction
  ↓
Supabase Gateway
  ↓
4. Receives request with Authorization header (auto-injected)
5. Validates JWT signature and expiration
6. If valid → forwards to Edge Function
7. If invalid → returns 401 (never reaches function)
  ↓
Edge Function
  ↓
8. Receives request (JWT already validated by gateway)
9. Extracts user ID from JWT for logging
10. Uses service role key for database operations
11. Creates job record
12. Returns job ID immediately
13. Processes PDF asynchronously
  ↓
Frontend
  ↓
14. Receives job ID
15. Polls status using supabase.functions.invoke()
16. Gets results when ready
```

## ✅ VALIDATION CHECKLIST

After deployment:

- [ ] `supabase/config.toml` has `verify_jwt = true`
- [ ] Function deployed: `supabase functions deploy process-pdf`
- [ ] Frontend uses ONLY `supabase.functions.invoke()`
- [ ] No `fetch()` calls to Edge Functions
- [ ] No `buildEdgeFunctionUrl()` function
- [ ] Gateway validates JWT (if invalid, returns 401 before function)
- [ ] Edge Function receives validated JWT
- [ ] Function uses service role key for database
- [ ] Function returns `{"success": true, "jobId": "..."}`
- [ ] No "Missing authorization header" errors
- [ ] No "Invalid JWT" errors

## 🔧 CALL PATH REMOVED

**Removed Path (WRONG):**
```typescript
// ❌ REMOVED
const functionUrl = buildEdgeFunctionUrl('process-pdf');
const headers = {
  'Content-Type': 'application/json',
  'apikey': anonKey,
  // NO Authorization header → 401 Missing authorization header
};
const response = await fetch(functionUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify({ pdfUrl, bookId }),
});
```

**Current Path (CORRECT):**
```typescript
// ✅ CURRENT
const { data, error } = await supabase.functions.invoke('process-pdf', {
  body: { pdfUrl, bookId },
});
// Authorization header automatically injected
// URL automatically constructed
// Auth automatically handled
```

## 🚀 DEPLOYMENT REQUIRED

```bash
supabase functions deploy process-pdf
```

This deploys the function with `verify_jwt = true`, requiring authentication.

## 📝 SUMMARY

**Root Cause:** Mixed call paths - `invoke()` logged but `fetch()` executed without auth

**Solution:** Use ONLY `supabase.functions.invoke()` - removes all manual auth handling

**Result:** Single call path, automatic auth injection, no missing header errors

---

**Status:** ✅ COMPLETE FIX - Deploy function and test

