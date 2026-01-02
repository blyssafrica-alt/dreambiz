# PDF Processing Timeout Fix - Deployment Instructions

## 📋 Prerequisites Checklist

- [ ] Supabase project configured
- [ ] Supabase CLI installed (optional, for function deployment)
- [ ] Access to Supabase Dashboard
- [ ] Database access (SQL Editor)

---

## ✅ Task 1: Run SQL Migration

### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://app.supabase.com
   - Navigate to **SQL Editor**

2. **Run Migration**
   - Copy the contents of `database/create_pdf_processing_jobs.sql`
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

3. **Verify Table Created**
   - Go to **Table Editor**
   - Look for `pdf_processing_jobs` table
   - Verify columns: `id`, `book_id`, `pdf_url`, `status`, `progress`, `error_message`, `result_data`, `created_at`, `started_at`, `completed_at`, `user_id`

### Option B: Using Supabase CLI

```bash
# Connect to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push database/create_pdf_processing_jobs.sql
```

### Verification

Run this query in SQL Editor to verify:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'pdf_processing_jobs'
ORDER BY ordinal_position;
```

Expected result: 11 columns with proper types.

---

## ✅ Task 2: Deploy Edge Function

### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **Edge Functions**

2. **Create/Update Function**
   - Click **Create a new function** or find `process-pdf`
   - Name: `process-pdf`
   - Copy the entire contents of `supabase/functions/process-pdf/index.ts`
   - Paste into the function editor

3. **Set Environment Variables**
   - Go to **Project Settings** → **Edge Functions**
   - Verify these environment variables are set:
     - `SUPABASE_URL` (auto-set)
     - `SUPABASE_ANON_KEY` (auto-set)
     - `SUPABASE_SERVICE_ROLE_KEY` (required for RLS bypass)

4. **Deploy**
   - Click **Deploy** or **Update**

### Option B: Using Supabase CLI (If Installed)

```bash
# Install Supabase CLI (if not installed)
# Windows: https://github.com/supabase/cli/releases
# macOS: brew install supabase/tap/supabase
# Linux: See https://supabase.com/docs/guides/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy process-pdf
```

### Verification

1. **Check Function Logs**
   - Go to **Edge Functions** → `process-pdf` → **Logs**
   - Should show "listening to localhost" or similar

2. **Test Function**
   - Go to **Edge Functions** → `process-pdf` → **Invoke**
   - Use this test payload:
     ```json
     {
       "pdfUrl": "https://example.com/test.pdf",
       "bookId": null
     }
     ```
   - Should return: `{ "success": true, "jobId": "...", "status": "pending" }`

---

## ✅ Task 3: Test End-to-End

### Test PDF Processing Flow

1. **Open Admin Panel**
   - Navigate to **Admin** → **Books**
   - Click **Add Book** or edit existing book

2. **Upload PDF**
   - Go to Step 2: Upload Document
   - Upload a PDF file
   - Wait for upload to complete

3. **Process PDF**
   - Click **Process PDF Document** button
   - Should see:
     - Processing indicator
     - Progress updates (if visible in UI)
     - Success message with extracted data

4. **Verify Job Record**
   - Go to Supabase Dashboard → **Table Editor** → `pdf_processing_jobs`
   - Should see a job record with:
     - `status`: `completed` or `processing`
     - `progress`: 0-100
     - `result_data`: Contains chapters, page count, etc.

### Expected Behavior

✅ **Success Case:**
- Function returns job ID in < 2 seconds
- No timeout errors
- Job status updates from `pending` → `processing` → `completed`
- Frontend receives extracted data (chapters, page count)

❌ **Failure Case:**
- Job marked as `failed` with error message
- Frontend shows error alert
- Manual entry option available

---

## 🔧 Troubleshooting

### Issue: "Table pdf_processing_jobs does not exist"

**Solution:**
- Run the SQL migration again
- Check SQL Editor for errors
- Verify you're in the correct project/database

### Issue: "Edge Function not found" or 404 error

**Solution:**
- Verify function is deployed
- Check function name is exactly `process-pdf`
- Verify project is linked correctly

### Issue: "Invalid JWT" or 401 error

**Solution:**
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function env vars
- Verify user is logged in
- Check JWT token is valid (try signing out and back in)

### Issue: "Heartbeat timed out" (still occurring)

**Solution:**
- Verify the updated Edge Function code is deployed
- Check function logs for execution time
- Ensure job-based pattern is being used (check for job ID in response)

### Issue: Jobs stuck in "processing" status

**Solution:**
- Check Edge Function logs for errors
- Verify `processPDFAsync` function is executing
- Check Supabase Storage access for PDF URLs
- Manually update job status if needed:
  ```sql
  UPDATE pdf_processing_jobs
  SET status = 'failed',
      error_message = 'Manual intervention required',
      completed_at = NOW()
  WHERE status = 'processing' AND created_at < NOW() - INTERVAL '10 minutes';
  ```

---

## 📊 Monitoring

### Check Job Status

```sql
-- View all jobs
SELECT 
  id,
  status,
  progress,
  created_at,
  completed_at,
  error_message
FROM pdf_processing_jobs
ORDER BY created_at DESC
LIMIT 10;

-- View failed jobs
SELECT *
FROM pdf_processing_jobs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- View jobs in progress
SELECT *
FROM pdf_processing_jobs
WHERE status = 'processing'
ORDER BY started_at DESC;
```

### Check Function Logs

1. Go to **Edge Functions** → `process-pdf` → **Logs**
2. Look for:
   - `[Job <id>] Starting PDF processing`
   - `[Job <id>] Extracted X pages`
   - `[Job <id>] ✅ Completed`
   - `[Job <id>] ❌ Processing failed`

---

## ✅ Deployment Checklist

- [ ] SQL migration executed successfully
- [ ] `pdf_processing_jobs` table exists with all columns
- [ ] RLS policies created correctly
- [ ] Edge Function deployed
- [ ] Environment variables set (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Function logs show no errors
- [ ] Test PDF processing works end-to-end
- [ ] Job records created in database
- [ ] No timeout errors in console/logs

---

## 📝 Next Steps

After deployment:

1. **Monitor First Few Jobs**
   - Watch logs for first few PDF processing requests
   - Verify jobs complete successfully
   - Check for any errors

2. **Optimize if Needed**
   - Adjust poll interval if too slow/fast
   - Adjust timeout limits based on average PDF size
   - Add more progress updates if needed

3. **Document for Team**
   - Share deployment guide with team
   - Document any custom configurations
   - Add monitoring alerts if needed

---

## 🆘 Support

If issues persist:

1. Check Supabase Status: https://status.supabase.com
2. Review Edge Function logs in Dashboard
3. Check browser console for frontend errors
4. Verify all environment variables are set
5. Test with a small PDF first

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** ☐ Ready  ☐ Testing  ☐ Complete

