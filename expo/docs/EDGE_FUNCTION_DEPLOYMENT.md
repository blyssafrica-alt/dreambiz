# Deploy PDF Processing Edge Function

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Supabase Dashboard → Settings → General)

## Deploy the Function

1. Navigate to your project root:
   ```bash
   cd /path/to/dreambiz
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy process-pdf
   ```

3. The function will be deployed and available at:
   ```
   https://your-project-ref.supabase.co/functions/v1/process-pdf
   ```

## Verify Deployment

1. Go to Supabase Dashboard → Edge Functions
2. You should see `process-pdf` in the list
3. Check the logs to ensure it's working

## Test the Function

You can test it using curl or from the Supabase Dashboard:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/process-pdf \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pdfUrl": "https://example.com/sample.pdf",
    "bookId": "book-uuid-here"
  }'
```

## Environment Variables

The function automatically uses:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for database access)

These are set automatically by Supabase when the function runs.

## Troubleshooting

### Function Not Found
- Make sure you've deployed the function: `supabase functions deploy process-pdf`
- Check that you're using the correct project ref

### CORS Errors
- The function includes CORS headers
- Make sure you're calling it from an allowed origin

### PDF Processing Not Working
- The current implementation is a placeholder
- For full PDF processing, integrate a PDF library or external API
- See `docs/PDF_PROCESSING_SETUP.md` for more details

## Next Steps

1. **For Production PDF Processing:**
   - Integrate a PDF parsing library (pdf.js, pdf-parse)
   - Or use an external API (Google Document AI, AWS Textract)
   - Update the `extractTextFromPDF` function in `supabase/functions/process-pdf/index.ts`

2. **Manual Entry Fallback:**
   - The frontend already supports manual chapter entry
   - This works immediately without any backend setup

