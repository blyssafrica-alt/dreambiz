# Quick Fix for 401 Errors - Make It Work Now

## 🚨 The Problem

You're seeing 401 errors because:
1. **Edge Function is not deployed** (most likely)
2. **Database table doesn't exist** (`pdf_processing_jobs`)
3. **Environment variables not set** (`SUPABASE_SERVICE_ROLE_KEY`)

## ✅ Quick Fix (5 minutes)

### Step 1: Deploy Edge Function (2 minutes)

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to https://app.supabase.com
2. Select your project
3. Click **Edge Functions** in left sidebar
4. Find or create `process-pdf` function
5. Copy ALL code from: `supabase/functions/process-pdf/index.ts`
6. Paste into function editor
7. Click **Deploy** or **Update**

**Option B: Via CLI**
```bash
supabase functions deploy process-pdf
```

### Step 2: Create Database Table (2 minutes)

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy ALL contents of: `database/create_pdf_processing_jobs.sql`
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Verify table exists: Go to **Table Editor** → Look for `pdf_processing_jobs`

### Step 3: Set Environment Variable (1 minute)

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (secret key, not anon key)
3. Go to **Edge Functions** → `process-pdf` → **Settings** or **Environment Variables**
4. Add new variable:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (paste service_role key)
5. Save

### Step 4: Test

1. Refresh your app
2. Try processing a PDF again
3. Should work now! ✅

---

## 🔍 Verify It's Working

**Check Function Logs:**
1. Go to **Edge Functions** → `process-pdf` → **Logs**
2. Should see: `"Job created: ..."` when you process a PDF
3. If you see logs, function is working!

**Check Database:**
1. Go to **Table Editor** → `pdf_processing_jobs`
2. Should see job records when processing PDFs
3. Status should change: `pending` → `processing` → `completed`

---

## ❌ Still Not Working?

### If you still see 401 errors:

1. **Sign out and sign back in** (refresh session)
2. **Check function is deployed:**
   - Edge Functions list should show `process-pdf`
   - Status should be "Active" or "Deployed"
3. **Check environment variable:**
   - `SUPABASE_SERVICE_ROLE_KEY` must be set
   - Must be the **service_role** key (not anon key)
4. **Check table exists:**
   - Run SQL migration again if needed
   - Verify in Table Editor

### If you see "Database table not found":

- Run Step 2 again (SQL migration)
- Make sure you're in the correct project/database

### If you see "Permission denied":

- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify it's the service_role key, not anon key

---

## 📝 What Changed in Code

✅ **Fixed React Error:** Conditional text rendering now uses ternary operators
✅ **Fixed Infinite Loop:** 401 errors stop immediately, no retries
✅ **Better Error Messages:** Clear instructions on what to do
✅ **Duplicate Call Guard:** Prevents multiple simultaneous calls

---

## 🎯 Expected Behavior After Fix

**Before (Broken):**
- ❌ 401 errors in console
- ❌ Infinite retry loop
- ❌ React text node errors
- ❌ No error alerts shown

**After (Fixed):**
- ✅ Function deploys successfully
- ✅ Jobs created in database
- ✅ PDF processing works
- ✅ Clear error messages if something fails
- ✅ No infinite loops

---

**Total Time:** ~5 minutes
**Difficulty:** Easy
**Result:** PDF processing will work! 🎉

