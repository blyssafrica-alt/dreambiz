# PDF Processing 401 Error - Complete Fix Guide

## 🔍 Root Cause

The 401 error is happening at **Supabase's gateway level** before the function code even runs. This means:
- Supabase infrastructure is rejecting the request
- Function code never executes
- This is different from function-level errors

## ✅ Complete Fix

### 1. **Deploy the Function** (CRITICAL)

The function **MUST** be deployed for it to work:

```bash
supabase functions deploy process-pdf
```

**Or via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the sidebar
4. Find `process-pdf` function
5. Click **Deploy** or **Redeploy**

**Verify Deployment:**
- Function should appear in the list
- Status should be "Active" or "Deployed"
- Check logs for any deployment errors

### 2. **Check Session Validity**

The function now automatically refreshes sessions, but verify:

```typescript
// In browser console or app
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', {
  exists: !!session,
  expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
  isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : false,
});
```

**If session is expired:**
```typescript
// Refresh session
const { data, error } = await supabase.auth.refreshSession();
console.log('Refresh result:', { data, error });
```

### 3. **Verify Function is Called Correctly**

The code now uses `invokeEdgeFunction` helper which:
- ✅ Verifies session exists
- ✅ Refreshes session if expiring soon
- ✅ Explicitly adds Authorization header
- ✅ Handles errors properly

### 4. **Check Supabase Project Settings**

1. Go to Supabase Dashboard → **Settings** → **API**
2. Verify:
   - **Project URL** is correct
   - **anon/public key** matches your `.env` file
   - **service_role key** is set (for Edge Functions)

### 5. **Test Function Directly**

Test if the function is deployed and accessible:

```bash
# Get your function URL
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/process-pdf \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pdfUrl": "https://example.com/test.pdf"}'
```

## 🚨 Common Issues

### Issue 1: Function Not Deployed
**Symptom:** 401 error immediately
**Fix:** Deploy the function (see step 1 above)

### Issue 2: Expired Session
**Symptom:** 401 error, session exists but expired
**Fix:** Code now auto-refreshes, but you can manually refresh:
```typescript
await supabase.auth.refreshSession();
```

### Issue 3: Wrong Project/Keys
**Symptom:** 401 error, function deployed
**Fix:** Check `.env` file matches Supabase Dashboard settings

### Issue 4: Function Name Mismatch
**Symptom:** 404 or 401 error
**Fix:** Function name must be exactly `process-pdf` (case-sensitive)

## 📋 Deployment Checklist

- [ ] Function is deployed in Supabase Dashboard
- [ ] Function status is "Active"
- [ ] User is signed in (session exists)
- [ ] Session is not expired
- [ ] `.env` file has correct Supabase URL and keys
- [ ] Function name is exactly `process-pdf`

## 🔧 Manual Test

After deployment, test in browser console:

```javascript
// 1. Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session valid:', !!session && !session.expires_at || new Date(session.expires_at * 1000) > new Date());

// 2. Test function call
const { data, error } = await supabase.functions.invoke('process-pdf', {
  body: { pdfUrl: 'https://example.com/test.pdf' }
});
console.log('Function result:', { data, error });
```

## ⚠️ Important Notes

1. **Supabase Edge Functions require authentication by default** - You cannot bypass this
2. **Function must be deployed** - Local code changes don't affect deployed function
3. **Session must be valid** - Expired sessions cause 401 errors
4. **Function name is case-sensitive** - Must be exactly `process-pdf`

## 🎯 Expected Behavior After Fix

- ✅ Function call succeeds (no 401 error)
- ✅ Function processes PDF and extracts data
- ✅ Returns success response with chapters/page count
- ✅ Or returns graceful error with `requiresManualEntry: true`

