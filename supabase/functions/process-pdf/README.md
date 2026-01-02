# Process PDF Edge Function

This Edge Function processes PDF documents uploaded to Supabase Storage and extracts chapter information.

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy process-pdf
   ```

2. **Set environment variables in Supabase Dashboard:**
   - Go to Project Settings → Edge Functions
   - The function will automatically use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment

## Usage

The function accepts a POST request with:
```json
{
  "pdfUrl": "https://your-storage-url/path/to/book.pdf",
  "bookId": "uuid-of-book"
}
```

## Response

**Success:**
```json
{
  "success": true,
  "data": {
    "chapters": [
      { "number": 1, "title": "Chapter 1 Title", "content": "..." },
      { "number": 2, "title": "Chapter 2 Title", "content": "..." }
    ],
    "totalChapters": 2
  }
}
```

**Manual Entry Required:**
```json
{
  "success": false,
  "message": "Automatic chapter extraction not available. Please use manual entry.",
  "requiresManualEntry": true
}
```

## Note

Currently, this function uses a placeholder for PDF text extraction. To enable full PDF processing:

1. **Option A:** Use an external PDF processing API (Google Document AI, AWS Textract, etc.)
2. **Option B:** Integrate a Deno-compatible PDF library
3. **Option C:** Use a PDF processing service and call it from this function

The function will return `requiresManualEntry: true` if automatic extraction is not available, allowing the frontend to fall back to manual entry.

