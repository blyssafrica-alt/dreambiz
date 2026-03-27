# Book & Chapter Data Flow - Complete Guide

## 📊 Database Storage

### 1. `books` Table

**Location:** `database/create_books_table.sql`

**Key Columns for Chapter Data:**

```sql
-- Chapter information (array of chapter objects)
chapters JSONB DEFAULT '[]'::jsonb
-- Example: [{number: 1, title: "Chapter 1", description: "...", content: "...", pageStart: 1, pageEnd: 10}]

-- Full extracted PDF data
extracted_chapters_data JSONB DEFAULT '{}'::jsonb
-- Example: {
--   "fullText": "Full PDF text content...",
--   "extractedAt": "2026-01-02T12:00:00Z",
--   "pageCount": 150,
--   "metadata": {"title": "Book Title", "author": "Author Name"}
-- }

-- Page count
page_count INTEGER

-- Total number of chapters
total_chapters INTEGER DEFAULT 0
```

### 2. `alert_rules` Table

**Location:** `database/insert_alert_rules.sql`

**Book Reference Column:**

```sql
book_reference JSONB
-- Example: {
--   "book": "start-your-business",  -- Book slug
--   "chapter": 4,                   -- Chapter number
--   "chapterTitle": "Pricing for Profit"  -- Chapter title
-- }
```

## 🔄 Data Flow

### Step 1: PDF Upload & Processing

**File:** `app/admin/books.tsx` → `processPDFDocument()`

1. User uploads PDF document
2. PDF stored in Supabase Storage (`book-documents` bucket)
3. Edge Function `process-pdf` called with `pdfUrl` and `bookId`

### Step 2: PDF Extraction (Edge Function)

**File:** `supabase/functions/process-pdf/index.ts` → `processPDFAsync()`

**What Gets Extracted:**
- ✅ Page count (from PDF structure)
- ✅ Full text (from PDF.js)
- ✅ PDF metadata (title, author, etc.)
- ✅ Chapters (from text pattern matching)

**What Gets Stored:**

```typescript
// In books table:
{
  chapters: JSON.stringify([
    {number: 1, title: "Chapter 1", content: "...", pageStart: 1, pageEnd: 10},
    {number: 2, title: "Chapter 2", content: "...", pageStart: 11, pageEnd: 20},
    // ... more chapters
  ]),
  total_chapters: 10,
  page_count: 150,
  extracted_chapters_data: {
    fullText: "Complete PDF text...",
    extractedAt: "2026-01-02T12:00:00Z",
    pageCount: 150,
    metadata: {title: "Book Title", author: "Author"}
  }
}
```

**Code Location:** `supabase/functions/process-pdf/index.ts:586-620`

```typescript
if (bookId) {
  const updateData: any = {
    extracted_chapters_data: {
      fullText: extractedText,
      extractedAt: new Date().toISOString(),
      pageCount: pageCount,
      metadata: pdfMetadata || null,
    },
  };

  if (pageCount > 0) {
    updateData.page_count = pageCount;
  }

  if (chapters.length > 0) {
    updateData.chapters = JSON.stringify(chapters);
    updateData.total_chapters = chapters.length;
  }

  await supabaseClient
    .from('books')
    .update(updateData)
    .eq('id', bookId);
}
```

### Step 3: Alert Rule Creation

**File:** `database/insert_alert_rules.sql`

Alert rules reference books by **slug**, not ID:

```sql
INSERT INTO alert_rules (..., book_reference) VALUES (
  ...,
  '{"book": "start-your-business", "chapter": 4, "chapterTitle": "Pricing for Profit"}'::jsonb
);
```

### Step 4: Alert Evaluation

**File:** `lib/alert-evaluator.ts` → `evaluateAlertRules()`

1. Fetches active alert rules from `alert_rules` table
2. Evaluates rules against business metrics
3. Includes `bookReference` in evaluated alerts:

```typescript
alerts.push({
  id: rule.id,
  type: rule.type,
  message: message,
  action: rule.actionTemplate,
  bookReference: {
    book: ref.book,              // Book slug (e.g., "start-your-business")
    chapter: ref.chapter,        // Chapter number (e.g., 4)
    chapterTitle: ref.chapterTitle  // Chapter title (e.g., "Pricing for Profit")
  },
});
```

### Step 5: Alert Display

**File:** `app/(tabs)/index.tsx` → Dashboard Screen

1. Gets metrics including alerts: `getDashboardMetrics()`
2. Displays alerts with book references
3. When user taps book reference, shows alert with chapter info:

```typescript
const handleBookReferencePress = (bookReference) => {
  RNAlert.alert(
    'DreamBig Book Reference',
    `Chapter ${bookReference.chapter}: ${bookReference.chapterTitle}\n\nThis chapter in your DreamBig book contains relevant guidance for this alert.`,
    [
      { text: 'OK' },
      { text: 'View Book', onPress: () => router.push('/insights') }
    ]
  );
};
```

## 🔍 How to Access Chapter Data

### Get Book by Slug

**File:** `lib/book-service.ts` → `getBookBySlug()`

```typescript
const book = await getBookBySlug("start-your-business");
// book.chapters contains array of chapter objects
// book.extracted_chapters_data contains full PDF text
```

### Get Specific Chapter

**File:** `lib/book-service.ts` → `getChapterFromBook()`

```typescript
const chapter = getChapterFromBook(book, 4);
// Returns: {number: 4, title: "Pricing for Profit", content: "...", ...}
```

## 📝 Summary

**Where Data is Stored:**
- ✅ **Chapters array:** `books.chapters` (JSONB)
- ✅ **Full PDF text:** `books.extracted_chapters_data.fullText` (JSONB)
- ✅ **Page count:** `books.page_count` (INTEGER)
- ✅ **Alert book references:** `alert_rules.book_reference` (JSONB with book slug)

**How It Works:**
1. PDF uploaded → Edge Function extracts chapters → Stored in `books.chapters`
2. Alert rules created with `book_reference` containing book slug + chapter number
3. Alerts evaluated → Include `bookReference` object
4. Dashboard displays alerts → User can tap to see chapter info
5. App can look up full book by slug to get chapter content

**Note:** Alerts reference books by **slug** (e.g., "start-your-business"), not ID. To get full chapter content, use `getBookBySlug(slug)` to fetch the complete book object.

