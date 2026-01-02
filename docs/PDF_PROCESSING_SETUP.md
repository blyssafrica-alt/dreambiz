# PDF Processing Setup Guide

## Overview

The book management system now supports PDF document uploads and chapter extraction. However, full PDF text extraction requires a backend service since React Native cannot directly process PDFs.

## Current Implementation

### What's Working
- ✅ PDF document upload to Supabase Storage
- ✅ Manual chapter entry
- ✅ Feature selection for books
- ✅ Chapter display and management
- ✅ Book-to-feature linking

### What Requires Backend Setup
- ⚠️ Automatic PDF text extraction
- ⚠️ Automatic chapter detection from PDF
- ⚠️ Content search within PDFs

## Recommended Solution: Supabase Edge Function

### Step 1: Create Edge Function

Create a new Supabase Edge Function to process PDFs:

```typescript
// supabase/functions/process-pdf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { pdfUrl, bookId } = await req.json()

    // Fetch PDF from URL
    const pdfResponse = await fetch(pdfUrl)
    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Use pdf-parse or similar library
    // Note: You'll need to find a Deno-compatible PDF parser
    // or use a service like PDF.js
    
    // Extract text and chapters
    const extractedData = await extractPDFContent(pdfBuffer)

    // Update book in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('books')
      .update({
        chapters: extractedData.chapters,
        total_chapters: extractedData.chapters.length,
        extracted_chapters_data: extractedData.fullContent,
      })
      .eq('id', bookId)

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 2: Alternative - Use External PDF Processing API

You can also use external services:

1. **Adobe PDF Services API**
2. **Google Cloud Document AI**
3. **AWS Textract**
4. **Azure Form Recognizer**

### Step 3: Update Frontend to Call Edge Function

Update `app/admin/books.tsx` to call the Edge Function:

```typescript
const processPDFDocument = async () => {
  if (!formData.documentFileUrl || !editingId) {
    Alert.alert('No Document', 'Please upload a PDF document first');
    return;
  }

  try {
    setIsProcessingPDF(true);
    
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: {
        pdfUrl: formData.documentFileUrl,
        bookId: editingId,
      },
    });

    if (error) throw error;

    if (data.success) {
      // Update form with extracted chapters
      setFormData({
        ...formData,
        chapters: data.data.chapters,
        totalChapters: data.data.chapters.length,
      });
      Alert.alert('Success', 'PDF processed successfully! Chapters extracted.');
    }
  } catch (error: any) {
    console.error('Failed to process PDF:', error);
    Alert.alert('Processing Error', error.message || 'Failed to process PDF');
  } finally {
    setIsProcessingPDF(false);
  }
};
```

## Manual Chapter Entry (Current Workaround)

Until backend PDF processing is set up, admins can:

1. Upload the PDF document
2. Click "Process PDF & Extract Chapters"
3. Choose "Enter Chapters Manually"
4. Enter the number of chapters
5. Edit chapter titles after saving

## Database Schema

The following columns have been added to the `books` table:

- `enabled_features` (TEXT[]) - Array of feature IDs this book enables
- `extracted_chapters_data` (JSONB) - Full chapter content for search/reference

Run the migration:
```sql
-- See database/add_book_features_column.sql
```

## Feature Linking

When a book is saved with `enabled_features`, the system automatically:

1. Updates the `books.enabled_features` array
2. Updates `feature_config.access.requiresBook` for each selected feature
3. Ensures features are visible to users who have the book

## Next Steps

1. Set up Supabase Edge Function for PDF processing
2. Test PDF upload and processing
3. Verify chapter extraction accuracy
4. Implement content search within PDFs
5. Add chapter content preview in alerts/warnings

