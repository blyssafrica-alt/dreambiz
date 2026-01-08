# 📚 How Book Content is Stored and How Alerts Reference Chapters

## Overview

When you add a book as a super admin, the system automatically extracts and stores **the entire book content page-by-page** from the PDF. Alerts then reference specific chapters by their **number and title**, allowing users to see relevant guidance when business metrics trigger warnings.

---

## 📊 How Book Content is Stored

### Database Structure: `books` Table

When you upload a book PDF, the system stores content in **two main ways**:

#### 1. **Chapter Metadata** (`chapters` column - JSONB)
```json
[
  {
    "number": 1,
    "title": "Introduction to Business",
    "description": "Getting started with your business",
    "pageStart": 1,
    "pageEnd": 15,
    "content": "First few lines of chapter content..."
  },
  {
    "number": 2,
    "title": "Pricing for Profit",
    "description": "How to price your products",
    "pageStart": 16,
    "pageEnd": 30,
    "content": "Content of chapter 2..."
  }
]
```

**What this stores:**
- Chapter number, title, and description
- Page range (where chapter starts and ends)
- Preview content (first portion of chapter text)

#### 2. **Full PDF Text** (`extracted_chapters_data` column - JSONB)
```json
{
  "fullText": "--- Page 1 ---\nChapter 1: Introduction...\n[Complete page 1 content]\n\n--- Page 2 ---\n[Complete page 2 content]\n\n...",
  "extractedAt": "2026-01-15T10:30:00Z",
  "pageCount": 150,
  "metadata": {
    "title": "Start Your Business",
    "author": "Author Name"
  }
}
```

**What this stores:**
- **Complete page-by-page text** from the entire PDF
- Every page is marked with `--- Page X ---`
- All text content is preserved in order
- PDF metadata (title, author, etc.)

**Key Point:** The `fullText` contains the **entire book content**, page by page. This allows the app to:
- Search within the book
- Reference specific pages
- Display chapter content when users tap alerts

---

## 🔄 The Process: How Content is Extracted

### Step 1: Super Admin Uploads PDF

1. Go to **Admin → Manage Books**
2. Create new book or edit existing
3. Upload PDF document file
4. Click "Process PDF Document"

### Step 2: Automatic PDF Processing

When you click "Process PDF", the system:

1. **Uploads PDF to Supabase Storage** (`book-documents` bucket)
2. **Calls Edge Function** (`process-pdf`) with PDF URL and book ID
3. **Extracts Text** from PDF using PDF.js:
   - Extracts all text from every page
   - Marks each page with `--- Page X ---`
   - Stores complete text in `fullText`

4. **Extracts Chapters** using pattern matching:
   - Searches for patterns like "Chapter 1", "Chapter 2", "CHAPTER 3", etc.
   - Extracts chapter titles
   - Determines which pages belong to each chapter
   - Creates chapter objects with `pageStart` and `pageEnd`

5. **Stores in Database**:
   ```sql
   UPDATE books SET
     chapters = '[{chapter objects}]',
     extracted_chapters_data = '{"fullText": "...", "pageCount": 150}',
     page_count = 150,
     total_chapters = 12
   WHERE id = 'book-id'
   ```

### Step 3: Automatic Fallback

If pattern matching fails to find chapters:
- System estimates chapters (~12 pages per chapter)
- Creates chapter entries automatically
- Divides book into equal sections
- Each chapter gets page range and generic title

**Result:** You always get chapters, even if PDF structure is unusual.

---

## 🔔 How Alerts Reference Chapters

### Alert Rules Structure

Alert rules are stored in the `alert_rules` table with a `book_reference` field:

```sql
INSERT INTO alert_rules (
  name,
  type,
  condition_type,
  threshold_percentage,
  message_template,
  action_template,
  book_reference,  -- This references your book!
  is_active,
  priority
) VALUES (
  'Low Cash Position Warning',
  'warning',
  'cash_position',
  500.00,
  'Warning: Your cash position is ${value}, which may not cover unexpected expenses.',
  'Build up your cash reserve. Review Chapter 6 of "Start Your Business" for cash management tips.',
  '{
    "book": "start-your-business",      -- Book slug
    "chapter": 6,                       -- Chapter number
    "chapterTitle": "Managing Cash Flow" -- Chapter title
  }'::jsonb,
  true,
  8
);
```

### How It Works

1. **Alert Evaluator** (`lib/alert-evaluator.ts`):
   - Checks business metrics (cash position, profit margin, etc.)
   - If threshold is met, creates alert
   - Includes `bookReference` object from alert rule

2. **Dashboard Display** (`app/(tabs)/index.tsx`):
   - Shows alert with warning message
   - Displays action message: "Review Chapter 6..."
   - Shows button: "Managing Cash Flow (Ch. 6)"

3. **User Taps Alert**:
   - App looks up book by slug: `getBookBySlug("start-your-business")`
   - Gets chapter info from `book.chapters` array
   - Can display chapter content from `book.extracted_chapters_data.fullText`

---

## 📝 Step-by-Step: Adding a New Book as Super Admin

### 1. Create the Book Entry

```
Admin → Manage Books → Add New Book
```

Fill in:
- **Slug**: `my-new-book` (unique identifier)
- **Title**: "My New Business Book"
- **Description**: Book description
- **Cover Image**: Upload cover
- **Price**: Set price
- **Chapters**: (Leave empty - will be auto-populated)

### 2. Upload PDF Document

- Click "Upload Document" button
- Select PDF file
- Wait for upload to complete

### 3. Process PDF

- Click "Process PDF Document" button
- System will:
  - Extract all text (page by page)
  - Find chapters automatically
  - Store in database
- Progress bar shows: 0% → 100%
- When done, you'll see:
  - Page count populated
  - Chapters array populated
  - Status: "Processing Complete"

### 4. Verify Chapters Were Extracted

Check the book details:
```sql
SELECT 
  slug,
  title,
  page_count,
  total_chapters,
  chapters,
  extracted_chapters_data->>'pageCount' as extracted_pages
FROM books 
WHERE slug = 'my-new-book';
```

You should see:
- `page_count`: Total pages (e.g., 150)
- `total_chapters`: Number of chapters found (e.g., 12)
- `chapters`: JSON array with chapter objects
- `extracted_chapters_data.fullText`: Complete book text

### 5. Create Alert Rules for Your Book

Now create alerts that reference your book:

```sql
INSERT INTO alert_rules (
  name,
  type,
  condition_type,
  threshold_value,
  message_template,
  action_template,
  book_reference,
  is_active,
  priority
) VALUES (
  'Low Cash - My Book',
  'warning',
  'cash_position',
  500.00,
  'Warning: Your cash position is ${value}, which may not cover unexpected expenses.',
  'Build up your cash reserve. Review Chapter 2 of "My New Business Book" for cash management tips.',
  '{
    "book": "my-new-book",
    "chapter": 2,
    "chapterTitle": "Managing Cash Flow"
  }'::jsonb,
  true,
  8
);
```

**Important:** 
- Use the **book slug** (`my-new-book`), not the title
- Use the **chapter number** from the extracted chapters (check `chapters` array)
- Use the **exact chapter title** from the extracted chapters

### 6. Find Chapter Information

To find chapter numbers and titles from your book:

```sql
-- Get all chapters for a book
SELECT 
  jsonb_array_elements(chapters) AS chapter
FROM books 
WHERE slug = 'my-new-book';

-- Or see as formatted JSON
SELECT 
  slug,
  title,
  total_chapters,
  chapters
FROM books 
WHERE slug = 'my-new-book';
```

This returns:
```json
[
  {"number": 1, "title": "Introduction", "pageStart": 1, "pageEnd": 15},
  {"number": 2, "title": "Managing Cash Flow", "pageStart": 16, "pageEnd": 30},
  {"number": 3, "title": "Pricing Strategy", "pageStart": 31, "pageEnd": 45}
]
```

---

## 🎯 How Alerts Know What's in the Book

### The Magic: Book Reference by Slug

Alerts don't store the actual book content. Instead:

1. **Alert stores reference:**
   ```json
   {
     "book": "start-your-business",  // Slug identifier
     "chapter": 6,                   // Chapter number
     "chapterTitle": "Managing Cash Flow"  // Chapter title
   }
   ```

2. **When alert is displayed:**
   - App loads alert rule with `book_reference`
   - App looks up book: `getBookBySlug("start-your-business")`
   - Gets full book object including:
     - `chapters` array (chapter metadata)
     - `extracted_chapters_data.fullText` (complete page-by-page content)

3. **When user taps alert:**
   - App finds chapter 6 in `book.chapters` array
   - Gets page range: `pageStart: 85, pageEnd: 100`
   - Can extract chapter content from `fullText`:
     ```javascript
     const chapter = book.chapters.find(c => c.number === 6);
     const chapterText = extractChapterFromFullText(
       book.extracted_chapters_data.fullText,
       chapter.pageStart,
       chapter.pageEnd
     );
     ```

### Why This Works

- **Alerts are flexible:** You can reference any chapter without storing content
- **Content is stored once:** Full book text stored in `extracted_chapters_data`
- **Quick lookup:** Find book by slug, then find chapter by number
- **Page-by-page access:** Full text has page markers, so you can extract specific pages

---

## 📋 Summary

### What Gets Stored:

1. **Chapter Metadata** (`chapters` JSONB):
   - Chapter numbers, titles, descriptions
   - Page ranges (start/end)
   - Preview content

2. **Full Book Text** (`extracted_chapters_data.fullText`):
   - **Complete page-by-page content**
   - Every page marked: `--- Page X ---`
   - All text preserved in order

### How Alerts Work:

1. Alert rules have `book_reference` with:
   - Book slug (identifier)
   - Chapter number
   - Chapter title

2. When alert triggers:
   - App looks up book by slug
   - Gets chapter info from `chapters` array
   - Can extract chapter content from `fullText` using page ranges

### For Super Admin:

1. Upload PDF → System extracts all text automatically
2. Chapters auto-detected (or auto-created if detection fails)
3. Create alert rules → Reference book by slug + chapter number
4. Users see alerts → Can access chapter content when they tap

---

## 🔍 Verification Queries

### Check if book content is stored:

```sql
-- See page count and chapter count
SELECT 
  slug,
  title,
  page_count,
  total_chapters,
  jsonb_array_length(chapters) as chapters_count
FROM books 
WHERE slug = 'your-book-slug';

-- See full text length (should be > 0 if extracted)
SELECT 
  slug,
  title,
  LENGTH(extracted_chapters_data->>'fullText') as text_length,
  extracted_chapters_data->>'pageCount' as pages_extracted
FROM books 
WHERE slug = 'your-book-slug';

-- See all chapters
SELECT 
  jsonb_array_elements(chapters) AS chapter
FROM books 
WHERE slug = 'your-book-slug';
```

### Check alert rules for your book:

```sql
SELECT 
  name,
  condition_type,
  message_template,
  action_template,
  book_reference
FROM alert_rules
WHERE book_reference->>'book' = 'your-book-slug'
AND is_active = true;
```

---

## ✏️ Editing Chapters After Processing

### If Chapter Extraction is Wrong

Sometimes the automatic extraction might:
- Miss some chapters
- Extract wrong chapter titles
- Set incorrect page ranges

**You can manually edit chapters:**

1. **Via Admin Interface:**
   - Go to **Admin → Manage Books**
   - Edit the book
   - Scroll to "Chapters" section
   - Edit chapter titles, descriptions, or page ranges
   - Save changes

2. **Via SQL (Direct Database Update):**
   ```sql
   -- Update a specific chapter
   UPDATE books
   SET chapters = jsonb_set(
     chapters,
     '{0}',  -- Index of chapter (0 = first chapter)
     '{"number": 1, "title": "Corrected Title", "pageStart": 1, "pageEnd": 20}'::jsonb
   )
   WHERE slug = 'your-book-slug';

   -- Or replace entire chapters array
   UPDATE books
   SET chapters = '[
     {"number": 1, "title": "Introduction", "pageStart": 1, "pageEnd": 15},
     {"number": 2, "title": "Getting Started", "pageStart": 16, "pageEnd": 30}
   ]'::jsonb,
   total_chapters = 2
   WHERE slug = 'your-book-slug';
   ```

### Re-Processing PDF

If extraction completely failed or you want to re-extract:
1. Go to **Admin → Manage Books**
2. Edit the book
3. Click "Process PDF Document" again
4. System will re-extract and overwrite existing chapters

**Note:** Re-processing will replace existing chapter data, so make sure to back up any manual edits if needed.

---

## 👤 How Users View Chapter Content

### When Users Tap on Alert Book References

Currently, when a user taps a book reference in an alert:

1. **Alert Dialog Shows:**
   - Chapter number and title
   - Message: "This chapter contains relevant guidance"
   - "View Book" button

2. **User Taps "View Book":**
   - Navigates to `/insights` or book detail page
   - Can access full book content

### Accessing Full Book Content

Users can access book content through:
- **My Library** screen (`app/my-library.tsx`)
- **Book Detail** screen (`app/books/[id].tsx`)
- **Book Reader** screen (`app/books/read/[id].tsx`)

The app uses `getBookBySlug()` to fetch:
- Chapter metadata from `chapters` array
- Full text from `extracted_chapters_data.fullText`
- Can extract specific chapter content using page ranges

### Extracting Chapter Content from FullText

The app can extract specific chapter content:

```typescript
// Example function (conceptual)
function extractChapterContent(
  fullText: string,
  pageStart: number,
  pageEnd: number
): string {
  // Find page markers in fullText
  const pagePattern = /---\s*Page\s+(\d+)\s+---/g;
  let currentPage = 0;
  let chapterText = '';
  let inChapter = false;
  
  const lines = fullText.split('\n');
  for (const line of lines) {
    const pageMatch = line.match(/---\s*Page\s+(\d+)\s+---/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      inChapter = (currentPage >= pageStart && currentPage <= pageEnd);
    } else if (inChapter) {
      chapterText += line + '\n';
    }
  }
  
  return chapterText.trim();
}
```

---

## 🔍 Troubleshooting Common Issues

### Issue 1: No Chapters Extracted

**Symptoms:**
- `total_chapters` is 0
- `chapters` array is empty
- PDF processed but no chapters found

**Solutions:**
1. **Check PDF Structure:**
   - PDF might be image-based (scanned pages)
   - PDF might be encrypted
   - PDF might not have text layer

2. **Check Extraction Logs:**
   ```sql
   SELECT * FROM pdf_processing_jobs 
   WHERE book_id = 'your-book-id' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   Look for `error_message` or `result_data`

3. **Manual Fallback:**
   - System should auto-create chapters from page count
   - If not, manually enter chapter count in admin interface

### Issue 2: Wrong Chapter Titles

**Symptoms:**
- Chapters extracted but titles are wrong
- Chapter numbers are correct but titles are generic

**Solutions:**
1. **Edit Manually:**
   - Go to Admin → Manage Books
   - Edit book → Edit chapters
   - Update titles manually

2. **Check PDF:**
   - Open PDF and verify chapter headings format
   - System looks for patterns like "Chapter 1", "CHAPTER 1", etc.
   - If PDF uses different format, extraction might fail

### Issue 3: Empty FullText

**Symptoms:**
- `extracted_chapters_data.fullText` is empty or very short
- Page count is correct but no text extracted

**Possible Causes:**
- **Image-based PDF:** PDF contains only scanned images, no text layer
- **Encrypted PDF:** PDF is password-protected
- **Corrupted PDF:** PDF file is damaged

**Solutions:**
1. **Check PDF in PDF viewer:**
   - Try to select/copy text
   - If you can't, it's image-based

2. **For Image-based PDFs:**
   - Use OCR (Optical Character Recognition) tool first
   - Convert to text-based PDF
   - Then upload to system

3. **For Encrypted PDFs:**
   - Remove password protection
   - Then upload

### Issue 4: Chapters Not Matching Page Numbers

**Symptoms:**
- Chapter page ranges don't match actual PDF pages
- `pageStart` and `pageEnd` are incorrect

**Solutions:**
1. **Verify in PDF:**
   - Open PDF and check actual page numbers
   - Note where each chapter starts/ends

2. **Update Manually:**
   ```sql
   -- Update chapter page range
   UPDATE books
   SET chapters = jsonb_set(
     chapters,
     '{5}',  -- Chapter index (0-based)
     (jsonb_array_elements(chapters)::jsonb || 
      '{"pageStart": 85, "pageEnd": 100}'::jsonb)::jsonb
   )
   WHERE slug = 'your-book-slug';
   ```

### Issue 5: Processing Takes Too Long

**Symptoms:**
- PDF processing never completes
- Progress bar stuck

**Solutions:**
1. **Check PDF Size:**
   - Large PDFs (>50MB) take longer
   - Very large PDFs (>100MB) might timeout

2. **Check Edge Function Logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for errors or timeouts

3. **Split Large PDFs:**
   - If PDF is very large, consider splitting into parts
   - Process separately if needed

---

## 🔄 Updating Alert Rules After Chapter Changes

If you update chapter titles or numbers, you may need to update alert rules:

```sql
-- Find all alert rules for a book
SELECT id, name, book_reference
FROM alert_rules
WHERE book_reference->>'book' = 'your-book-slug';

-- Update a specific alert rule's chapter reference
UPDATE alert_rules
SET book_reference = jsonb_set(
  book_reference,
  '{chapterTitle}',
  '"New Chapter Title"'::jsonb
)
WHERE id = 'alert-rule-id';
```

---

## 📱 User Experience: Reading Books

### Book Reader Screen

Users can read full book content through:
- **Book Detail Page** → "Read Book" button
- **My Library** → Tap on book → "Read"

The reader:
- Loads full text from `extracted_chapters_data.fullText`
- Displays page by page
- Allows navigation between chapters
- Can search within book content

### Search Within Books

The app can search within book content:
```typescript
// Conceptual search function
function searchInBook(
  fullText: string,
  searchTerm: string
): { page: number; snippet: string }[] {
  // Search fullText for term
  // Return matching pages and snippets
}
```

This uses the `fullText` stored in `extracted_chapters_data`.

---

## 🎯 Best Practices

### For Super Admins:

1. **Verify After Processing:**
   - Always check extracted chapters
   - Verify page counts match PDF
   - Review chapter titles for accuracy

2. **Test Alert Rules:**
   - Create test alert rules
   - Verify they reference correct chapters
   - Test that users can access content

3. **Document Chapter Topics:**
   - Note which chapters cover which topics
   - This helps when creating alert rules
   - Example: "Chapter 6 = Cash Flow Management"

4. **Keep PDFs Accessible:**
   - Store original PDFs for reference
   - Can re-process if needed
   - Useful for verifying chapter content

### For Alert Rules:

1. **Use Exact Chapter Numbers:**
   - Verify chapter numbers in database
   - Use exact numbers from `chapters` array

2. **Use Exact Chapter Titles:**
   - Copy titles exactly from database
   - Case-sensitive matching

3. **Test Before Publishing:**
   - Create alert rule
   - Trigger alert in test environment
   - Verify book reference works

---

## 📊 Additional Verification

### Check Processing Job Status

```sql
-- See all processing jobs for a book
SELECT 
  id,
  status,
  progress,
  error_message,
  result_data,
  created_at,
  completed_at
FROM pdf_processing_jobs
WHERE book_id = 'your-book-id'
ORDER BY created_at DESC;
```

### Check Full Text Quality

```sql
-- See sample of extracted text
SELECT 
  slug,
  title,
  LEFT(extracted_chapters_data->>'fullText', 500) as text_sample,
  LENGTH(extracted_chapters_data->>'fullText') as total_length
FROM books
WHERE slug = 'your-book-slug';

-- Check if text extraction worked
SELECT 
  slug,
  CASE 
    WHEN LENGTH(extracted_chapters_data->>'fullText') > 1000 
    THEN 'Good - Text extracted'
    WHEN LENGTH(extracted_chapters_data->>'fullText') > 0 
    THEN 'Partial - Some text extracted'
    ELSE 'Failed - No text extracted'
  END as extraction_status
FROM books
WHERE slug = 'your-book-slug';
```

---

**Key Takeaway:** The system stores the **entire book page-by-page** in `extracted_chapters_data.fullText`. Chapters are metadata that point to page ranges. Alerts reference books by slug and chapter number, then the app looks up the actual content when needed. You can always edit chapters manually if automatic extraction isn't perfect.

