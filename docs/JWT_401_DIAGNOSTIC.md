# 401 "Invalid JWT" Error - Diagnostic Guide

## 🔍 Current Status

Despite comprehensive fixes, you're still getting 401 "Invalid JWT" errors. This guide will help identify the root cause.

## ✅ What We've Fixed

1. **Proactive session refresh** (15 minutes before expiration)
2. **Server-side token validation** using `getUser()`
3. **JWT expiration checking** by decoding token
4. **Fresh token retrieval** right before the call
5. **Using `supabase.functions.invoke()`** for automatic auth handling
6. **Multiple validation checks** before calling the function

## 🔎 Diagnostic Steps

### Step 1: Verify Function is Deployed

**Check in Supabase Dashboard:**
1. Go to Supabase Dashboard → Edge Functions
2. Look for `process-pdf` in the list
3. Check if it shows as "Deployed" or "Active"

**If not deployed, deploy it:**
```bash
supabase functions deploy process-pdf
```

**If deployment fails, check:**
- Supabase CLI is installed and authenticated
- You're in the correct project directory
- Environment variables are set correctly

### Step 2: Verify Supabase Project Configuration

**Check that client and function use the same project:**

1. **Client Configuration** (`lib/supabase.ts`):
   - URL: `https://oqcgerfjjiozltkmmkxf.supabase.co`
   - Anon Key: `sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp`

2. **Edge Function Environment Variables:**
   - `SUPABASE_URL`: Should be `https://oqcgerfjjiozltkmmkxf.supabase.co`
   - `SUPABASE_ANON_KEY`: Should match the anon key above
   - `SUPABASE_SERVICE_ROLE_KEY`: Should be set (for RLS bypass)

**Verify in Supabase Dashboard:**
- Go to Settings → API
- Compare the Project URL and anon public key
- Ensure they match what's in your code

### Step 3: Check Token Validity

**The code now:**
- Decodes JWT to check expiration
- Refreshes if expired
- Validates with `getUser()` before calling
- Gets fresh session right before call

**If still getting 401, check:**
1. **Are you signed in?** - The error means gateway received a token but rejected it
2. **Is the token for the correct project?** - Token must match the project URL
3. **Try signing out and back in** - This generates a completely fresh token

### Step 4: Verify Edge Function Auth Settings

**Check Edge Function configuration:**

The function should be set to accept authenticated requests. Check:
- Function is deployed
- Function accepts POST requests
- Function has proper CORS headers

**Verify in Supabase Dashboard:**
- Go to Edge Functions → `process-pdf`
- Check the function settings
- Look at the function logs for incoming requests

### Step 5: Check Browser/Network Issues

**Possible issues:**
- Browser caching old tokens
- Network proxy interfering with headers
- CORS issues (though this would be different error)

**Try:**
- Clear browser cache
- Try in incognito/private mode
- Check browser console for network errors

## 🚨 Most Likely Causes

### Cause 1: Function Not Deployed (Most Common)
**Symptoms:** 401 error, function logs show no requests
**Fix:** Deploy the function: `supabase functions deploy process-pdf`

### Cause 2: Project Configuration Mismatch
**Symptoms:** Token validates locally but gateway rejects it
**Fix:** Ensure client URL/key matches function project

### Cause 3: Stale/Cached Token
**Symptoms:** Token appears valid but gateway rejects it
**Fix:** Sign out and sign back in to get fresh token

### Cause 4: Token from Different Project
**Symptoms:** Token works for other operations but not Edge Functions
**Fix:** Ensure you're signed into the correct Supabase project

## 🔧 Immediate Fix to Try

**If you're still getting 401 errors, try this:**

1. **Sign out completely:**
   ```typescript
   await supabase.auth.signOut();
   ```

2. **Clear any cached sessions:**
   - Close the app completely
   - Clear app data/cache (if possible)

3. **Sign back in:**
   ```typescript
   await supabase.auth.signInWithPassword({ email, password });
   ```

4. **Try the function call again**

## 📊 Debug Information to Collect

When reporting the error, include:

1. **Console logs:**
   - Token validation logs
   - Token expiration check logs
   - Function response logs

2. **Supabase Dashboard:**
   - Edge Functions → `process-pdf` → Logs
   - Look for incoming requests
   - Check if requests are reaching the function

3. **Token Information:**
   - User ID
   - Token expiration time
   - Whether token was refreshed

## 🎯 Expected Behavior

**When everything is working:**
1. Session is refreshed if expiring soon
2. Token is validated with `getUser()`
3. Token expiration is checked
4. Fresh session is retrieved
5. Function is called with valid token
6. Gateway accepts token and forwards to function
7. Function processes request and returns result

**If you see 401, it means:**
- Gateway received the request
- Gateway validated the token
- Gateway rejected the token (invalid/expired)
- Function never receives the request

## 🔐 Security Note

The fixes maintain security:
- ✅ Tokens are validated with server
- ✅ No service role keys exposed to client
- ✅ Proper authentication flow
- ✅ Token refresh when needed

## 📝 Next Steps

1. **Deploy the function** (if not deployed)
2. **Verify project configuration** matches
3. **Try signing out and back in**
4. **Check Supabase logs** for detailed error messages
5. **Report back** with the debug information collected

If the error persists after these steps, there may be a deeper configuration issue that needs investigation.

