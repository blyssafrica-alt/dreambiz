# PDF Processing Timeout Fix - Job-Based Async Pattern

## 🔍 Problem Diagnosis

**Issue:** Edge Function `process-pdf` was timing out with "Heartbeat timed out, closing connection (~67s)" because:

1. **Long synchronous operations**: PDF processing (fetch, parse, extract text, extract chapters) took 60+ seconds
2. **Supabase Edge Function limits**: Functions have ~60s timeout, any longer causes heartbeat timeout
3. **Retry storms**: Frontend would retry failed requests infinitely
4. **Blocking HTTP response**: Function waited for entire PDF processing before returning

## ✅ Solution: Job-Based Async Processing

### Architecture

```
Frontend                Edge Function              Database
   |                         |                        |
   |--(1) Create Job-------->|                        |
   |                         |--(2) Store Job-------->|
   |<--(3) Return Job ID-----|                        |
   |                         |                        |
   |                         |--(4) Start Async------>|
   |                         |    Processing          |
   |                         |                        |
   |--(5) Poll Status------->|                        |
   |                         |--(6) Check Job-------->|
   |<--(7) Job Status--------|                        |
   |                         |                        |
   |     (Repeat 5-7)        |                        |
   |                         |                        |
   |                         |--(8) Update Job------->|
   |                         |    (completed)         |
   |<--(9) Final Status------|                        |
```

### Key Changes

#### 1. Database Schema (`database/create_pdf_processing_jobs.sql`)

- Created `pdf_processing_jobs` table to track async jobs
- Fields: `id`, `book_id`, `pdf_url`, `status`, `progress`, `error_message`, `result_data`
- RLS policies for user isolation
- Indexes for performance

#### 2. Edge Function (`supabase/functions/process-pdf/index.ts`)

**Before:**
```typescript
// Synchronous - blocks until complete (60+ seconds)
const result = await extractTextFromPDF(pdfUrl);
const chapters = extractChaptersFromText(result.text);
// Update database...
return Response.json({ success: true, data: { chapters, ... } });
```

**After:**
```typescript
// 1. Create job record (< 1 second)
const job = await supabaseClient.from('pdf_processing_jobs').insert({...});

// 2. Return job ID immediately (< 2 seconds total)
return Response.json({ success: true, jobId: job.id, status: 'pending' });

// 3. Process async (fire and forget)
processPDFAsync(job.id, pdfUrl, bookId, supabaseClient).catch(...);
```

**New Function: `processPDFAsync()`**
- Processes PDF without blocking HTTP response
- Updates job progress (10%, 20%, 60%, 70%, 90%, 100%)
- Updates job status (`pending` → `processing` → `completed`/`failed`)
- Handles errors gracefully

#### 3. Frontend (`app/admin/books.tsx`)

**Before:**
```typescript
// Single call, waits for result (times out after 60s)
const { data } = await supabase.functions.invoke('process-pdf', {...});
if (data.success) { /* use data */ }
```

**After:**
```typescript
// 1. Create job (returns immediately)
const { data } = await supabase.functions.invoke('process-pdf', {
  body: { pdfUrl, bookId }
});

// 2. Poll job status (with retry limits)
const jobId = data.jobId;
let attempts = 0;
while (attempts < MAX_POLL_ATTEMPTS) {
  await sleep(POLL_INTERVAL);
  const { data: status } = await supabase.functions.invoke('process-pdf', {
    body: { jobId }
  });
  
  if (status.job.status === 'completed') {
    // Use result
    break;
  }
  if (status.job.status === 'failed') {
    // Show error
    break;
  }
  attempts++;
}
```

**Retry Guards:**
- `MAX_RETRIES = 3` - Maximum job creation retries
- `MAX_POLL_ATTEMPTS = 60` - Maximum status poll attempts
- `POLL_INTERVAL = 2000` - 2 seconds between polls
- `TIMEOUT_MS = 120000` - 2 minutes total timeout
- Exponential backoff for retries

### Benefits

1. **No Timeouts**: Function returns in < 2 seconds, avoids heartbeat timeout
2. **Scalable**: Can process large PDFs without hitting function limits
3. **Progress Tracking**: Users see progress updates (10%, 20%, etc.)
4. **Error Recovery**: Failed jobs can be retried, status is tracked
5. **No Retry Storms**: Frontend has retry limits, won't spam requests
6. **Better UX**: Users get immediate feedback, can see processing status

### Execution Flow

1. **Request** (< 2s)
   - Frontend calls `process-pdf` with `pdfUrl` and `bookId`
   - Function creates job record
   - Function returns job ID immediately

2. **Processing** (async, background)
   - Function starts async processing
   - Updates progress: 10% → 20% → 60% → 70% → 90% → 100%
   - Extracts PDF text, chapters, metadata
   - Updates database with results

3. **Polling** (frontend)
   - Frontend polls job status every 2 seconds
   - Shows progress to user
   - Handles `completed` or `failed` status
   - Times out after 2 minutes

4. **Completion**
   - Job status updated to `completed` with result data
   - Frontend receives final status
   - Form updated with extracted data

### Error Handling

- **Job Creation Failed**: Returns error, user can retry (max 3 times)
- **Processing Failed**: Job marked as `failed` with error message
- **Timeout**: Frontend stops polling after 2 minutes, user can check later
- **Network Errors**: Poll errors are logged but polling continues

### Deployment

1. **Run SQL migration:**
   ```sql
   \i database/create_pdf_processing_jobs.sql
   ```

2. **Deploy Edge Function:**
   ```bash
   supabase functions deploy process-pdf
   ```

3. **Verify:**
   - Check Supabase Dashboard → Edge Functions
   - Test PDF upload in admin panel
   - Monitor logs for job creation and processing

### Monitoring

- **Job Status**: Query `pdf_processing_jobs` table
- **Function Logs**: Supabase Dashboard → Edge Functions → `process-pdf` → Logs
- **Frontend Logs**: Check browser console for polling status

### Future Improvements

- Webhook notifications when job completes (instead of polling)
- Background worker for processing (separate from Edge Function)
- Queue system (Redis/BullMQ) for better scalability
- Progress notifications (WebSocket or Server-Sent Events)

