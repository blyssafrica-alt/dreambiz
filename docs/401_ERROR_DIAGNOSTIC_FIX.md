# 401 Unauthorized Error - Diagnostic & Fix Guide

## 🔍 Quick Diagnostic

If you're still seeing 401 errors, follow this checklist:

### Step 1: Check Function Deployment

**❓ Is the Edge Function deployed?**

1. Go to Supabase Dashboard → **Edge Functions**
2. Look for `process-pdf` function
3. Check status:
   - ✅ **Deployed/Active** → Function is deployed
   - ❌ **Not Found** → Function not deployed
   - ⚠️ **Error** → Deployment failed

**If not deployed:**
```bash
# Option 1: Via CLI
supabase functions deploy process-pdf

# Option 2: Via Dashboard
# 1. Go to Edge Functions
# 2. Create new function or update existing
# 3. Copy code from supabase/functions/process-pdf/index.ts
# 4. Deploy
```

### Step 2: Check Database Table

**❓ Does the `pdf_processing_jobs` table exist?**

1. Go to Supabase Dashboard → **Table Editor**
2. Look for `pdf_processing_jobs` table
3. Check if it exists:
   - ✅ **Exists** → Table is created
   - ❌ **Not Found** → Table not created

**If not created:**
1. Go to **SQL Editor**
2. Copy contents of `database/create_pdf_processing_jobs.sql`
3. Paste and execute
4. Verify table is created

### Step 3: Check Environment Variables

**❓ Are Edge Function environment variables set?**

1. Go to Supabase Dashboard → **Edge Functions** → `process-pdf`
2. Click **Settings** or **Environment Variables**
3. Verify these are set:
   - ✅ `SUPABASE_URL` (usually auto-set)
   - ✅ `SUPABASE_ANON_KEY` (usually auto-set)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` (REQUIRED - must be set manually)

**If `SUPABASE_SERVICE_ROLE_KEY` is missing:**
1. Go to **Settings** → **API**
2. Copy **service_role** key (secret)
3. Go to **Edge Functions** → `process-pdf` → **Settings**
4. Add environment variable:
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste service_role key)

### Step 4: Check Function Logs

**❓ Are there any logs in Supabase?**

1. Go to Supabase Dashboard → **Edge Functions** → `process-pdf` → **Logs**
2. Check for:
   - ✅ **"Job created: ..."** → Function is working
   - ❌ **"CRITICAL: pdf_processing_jobs table does not exist"** → Run SQL migration
   - ❌ **"CRITICAL: Permission error"** → Check service role key
   - ❌ **No logs** → Gateway rejected before function ran (401 is gateway issue)

**If no logs appear:**
- Gateway is rejecting the request before it reaches the function
- This means the 401 is a gateway authentication issue
- See "Gateway Authentication Fix" below

---

## 🔧 Gateway Authentication Fix

If logs show "No logs" or you see 401 before any function logs:

### Issue: Gateway Rejecting JWT Token

The Supabase gateway validates JWT tokens BEFORE forwarding to the function. If the gateway rejects, the function never runs.

### Fix Steps:

#### 1. **Verify User Session**

Open browser console and run:
```javascript
// Check session
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', {
  exists: !!session,
  expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
  isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : false,
});

// If expired or missing, refresh
if (!session || (session.expires_at && new Date(session.expires_at * 1000) < new Date())) {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  console.log('Refresh result:', refreshData, refreshError);
}
```

#### 2. **Test Token with getUser()**

```javascript
// Validate token with server
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('User validation:', {
  valid: !userError && !!user,
  error: userError?.message,
});
```

#### 3. **Sign Out and Sign Back In**

If session is invalid:
1. Sign out completely
2. Sign back in
3. Try processing PDF again

#### 4. **Check Project Configuration**

Verify your Supabase project settings match your frontend:

1. Go to **Settings** → **API**
2. Verify:
   - **Project URL** matches your `.env` file
   - **anon/public key** matches your `.env` file
   - You're using the correct project (not a different environment)

---

## 🚨 Common Issues & Solutions

### Issue 1: "Database table not found"

**Error in logs:** `CRITICAL: pdf_processing_jobs table does not exist`

**Solution:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Run `database/create_pdf_processing_jobs.sql`
3. Verify table is created
4. Try again

### Issue 2: "Permission denied"

**Error in logs:** `CRITICAL: Permission error`

**Solution:**
1. Check `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function env vars
2. Verify RLS policies in SQL migration are created
3. Try again

### Issue 3: "No logs, but 401 error"

**Symptom:** 401 error, but no logs in Supabase Dashboard

**Solution:**
- Gateway is rejecting (authentication issue)
- Follow "Gateway Authentication Fix" steps above
- Sign out and sign back in
- Verify project configuration

### Issue 4: "Function not found" or 404

**Error:** Function doesn't exist

**Solution:**
1. Deploy the function (see Step 1 above)
2. Verify function name is exactly `process-pdf`
3. Check function is listed in Edge Functions

### Issue 5: "Old function code still running"

**Symptom:** Function deployed but behaves like old code

**Solution:**
1. Verify you deployed the latest code from `supabase/functions/process-pdf/index.ts`
2. Redeploy the function
3. Clear browser cache
4. Try again

---

## ✅ Verification Checklist

After following the fixes above, verify:

- [ ] Edge Function `process-pdf` is deployed and active
- [ ] `pdf_processing_jobs` table exists in database
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function env vars
- [ ] User session is valid (not expired)
- [ ] `getUser()` validation succeeds
- [ ] Function logs appear when calling the function
- [ ] No 401 errors in console

---

## 📞 Still Having Issues?

If you've completed all steps and still see 401 errors:

1. **Check Supabase Status:** https://status.supabase.com
2. **Review Function Logs:** Look for any error messages
3. **Test with Simple Request:** Try calling function with minimal payload
4. **Check Network Tab:** Inspect request/response headers in browser DevTools
5. **Verify Project Match:** Ensure frontend and Edge Function are using same Supabase project

---

## 🎯 Expected Behavior After Fix

**Success Case:**
1. Frontend calls function → ✅
2. Function logs appear in Supabase → ✅
3. Function returns job ID in < 2 seconds → ✅
4. Job is created in `pdf_processing_jobs` table → ✅
5. Frontend polls job status → ✅
6. Job completes → ✅
7. Extracted data returned → ✅

**If any step fails, check the diagnostic above for that specific step.**

