# Gateway 401 vs Function 401 - Understanding the Difference

## 🔍 Critical Distinction

**"Edge Function returned non-2xx (401)"** is a MISLEADING error message.

### What Actually Happens:

1. **Frontend calls function** → `supabase.functions.invoke('process-pdf', {...})`
2. **Request goes to Supabase Gateway** (NOT directly to function)
3. **Gateway validates JWT**:
   - ✅ If valid → Forwards to Edge Function
   - ❌ If invalid → Returns 401 **BEFORE function runs**
4. **Supabase client receives 401** → Throws "Edge Function returned non-2xx"
5. **Function code NEVER executes** if gateway rejects

### The Error Message is Misleading:

The error says "Edge Function returned non-2xx" but it's actually:
- **Gateway returned 401** (not the function)
- **Function never received the request**
- **Function code never executed**

## ✅ Edge Function Verification

**Our `process-pdf` function:**
- ✅ NEVER returns 401
- ✅ Always returns HTTP 200
- ✅ Uses `success` field for actual status
- ✅ Works with or without authentication
- ✅ Uses service role key (bypasses RLS)

**Proof - All Response Paths:**

```typescript
// Method error → 200
if (req.method !== 'POST') {
  return new Response(..., { status: 200 }); // ✅
}

// JSON parse error → 200
catch (jsonError) {
  return new Response(..., { status: 200 }); // ✅
}

// Missing pdfUrl → 200
if (!pdfUrl) {
  return new Response(..., { status: 200 }); // ✅
}

// Success → 200
return new Response(..., { status: 200 }); // ✅

// Error catch → 200
catch (error) {
  return new Response(..., { status: 200 }); // ✅
}
```

**Conclusion:** The function NEVER returns 401. All error paths return 200.

## 🔍 Root Cause of 401 Error

The 401 error is coming from the **Supabase Gateway**, not the function.

**Why Gateway Rejects:**

1. **JWT is expired** - Even if validated on frontend, it expired before reaching gateway
2. **JWT is invalid** - Token signature doesn't match
3. **JWT is for wrong project** - Token from different Supabase project
4. **Function requires auth** - Gateway configured to require authenticated requests
5. **Anon key mismatch** - `apikey` header doesn't match project

## 🛠️ How to Verify

### Check Function Logs:

1. Go to Supabase Dashboard → Edge Functions → `process-pdf` → Logs
2. If you see **NO logs** for your request → Gateway rejected it (401 at gateway)
3. If you see **logs starting with "Process PDF request received"** → Function received request (401 not from function)

### Check Gateway Configuration:

The function might be configured to require authentication. Check:
- Supabase Dashboard → Edge Functions → `process-pdf` → Settings
- Look for "Require Authentication" or similar setting
- If enabled, gateway will reject unauthenticated requests

## ✅ Solution

The fix must be on the **frontend** to ensure:
1. Token is fresh and valid
2. Token matches the correct project
3. Both `Authorization` and `apikey` headers are sent correctly

The Edge Function code is correct - it never returns 401.

