# How to Create Alert Rules for Your Uploaded Book

This guide shows you how to create alert rules that reference chapters from your uploaded book, similar to the alerts shown in the app that reference "Start Your Business".

## Overview

Alert rules connect business metrics (like profit margin, cash flow, sales) to specific chapters in your books. When a business metric triggers an alert, users see a message with a link to the relevant chapter.

## Step 1: Find Your Book Slug

The book slug is a unique identifier for your book (e.g., `start-your-business`, `my-new-book`).

**Option A: From the Admin Interface**
1. Go to Admin → Manage Books
2. Find your book in the list
3. Click Edit
4. The slug is shown in the "Slug" field

**Option B: From SQL**
```sql
SELECT slug, title, total_chapters, chapters 
FROM books 
WHERE status = 'published' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Option C: From the Database**
Look at the `slug` field in the `books` table for your book.

## Step 2: Find Chapter Information

You need to know:
- Chapter numbers (1, 2, 3, etc.)
- Chapter titles (e.g., "Pricing for Profit", "Managing Cash Flow")

**From SQL:**
```sql
SELECT 
  slug,
  title,
  total_chapters,
  chapters
FROM books 
WHERE slug = 'your-book-slug';
```

The `chapters` column contains JSON like:
```json
[
  {"number": 1, "title": "Chapter 1 Title", "pageStart": 1, "pageEnd": 10},
  {"number": 2, "title": "Chapter 2 Title", "pageStart": 11, "pageEnd": 20}
]
```

## Step 3: Create Alert Rules

### Using the SQL Template

1. Open `database/create_alert_rules_for_book.sql` in your SQL editor
2. Replace `'your-book-slug'` with your actual book slug
3. Replace chapter numbers (1, 2, 3) with actual chapter numbers
4. Replace chapter titles with actual chapter titles from your book
5. Adjust alert messages to match your book's content
6. Run the SQL in Supabase SQL Editor

### Example: Creating a Profit Margin Alert

```sql
INSERT INTO alert_rules (
  name,
  type,
  condition_type,
  threshold_percentage,
  message_template,
  action_template,
  book_reference,
  is_active,
  priority
) VALUES (
  'Low Profit Margin - My Book',
  'warning',
  'profit_margin',
  10.00,
  'Your profit margin is {percentage}%, which is below the recommended 15% minimum.',
  'Review your pricing strategy. Check Chapter 4 of "My Book Title" for pricing guidance.',
  '{"book": "my-book-slug", "chapter": 4, "chapterTitle": "Pricing for Profit"}'::jsonb,
  true,
  8
);
```

### Alert Rule Fields Explained

- **name**: Unique name for the alert rule (shown in admin interface)
- **type**: Alert severity - `'warning'`, `'danger'`, `'info'`, or `'success'`
- **condition_type**: What metric to check - `'profit_margin'`, `'cash_position'`, `'no_sales'`, `'high_expenses'`, `'overspending'`, `'low_revenue'`, `'low_stock'`, `'overdue_invoice'`
- **threshold_percentage**: Percentage threshold (use for `profit_margin`, `high_expenses`, `overspending`, `low_revenue`)
- **threshold_value**: Absolute value threshold (use for `cash_position`, `low_stock`)
- **threshold_days**: Days threshold (use for `no_sales`, `overdue_invoice`)
- **message_template**: Alert message with placeholders: `{percentage}`, `{value}`, or `{days}`
- **action_template**: Action message shown below the alert (references your book chapter)
- **book_reference**: JSONB object with:
  - `book`: Your book slug (e.g., `"my-book-slug"`)
  - `chapter`: Chapter number (e.g., `4`)
  - `chapterTitle`: Chapter title (e.g., `"Pricing for Profit"`)
- **is_active**: `true` to enable, `false` to disable
- **priority**: Number 0-10, higher = shown first

## Step 4: Match Chapters to Business Metrics

Here are common mappings between business metrics and chapter topics:

| Metric | Typical Chapter Topics |
|--------|----------------------|
| `profit_margin` | Pricing, Cost Management, Profit Strategies |
| `cash_position` | Cash Flow, Financial Management, Budgeting |
| `high_expenses` / `overspending` | Expense Control, Cost Cutting, Budgeting |
| `no_sales` / `low_revenue` | Sales, Marketing, Customer Acquisition |
| `low_stock` | Inventory Management, Stock Control |
| `overdue_invoice` | Accounts Receivable, Payment Collection |

**Example Mapping for Your Book:**
If your book has:
- Chapter 1: "Getting Started"
- Chapter 2: "Pricing Your Products"
- Chapter 3: "Managing Cash Flow"
- Chapter 4: "Marketing Your Business"

You might create:
- Profit margin alerts → Chapter 2
- Cash flow alerts → Chapter 3
- Sales alerts → Chapter 4

## Step 5: Test Your Alert Rules

After creating alert rules:

1. Go to Admin → Manage Alerts
2. You should see your new alert rules in the list
3. Make sure `is_active` is `true`
4. In the app, trigger the condition (e.g., set profit margin below threshold)
5. Check the Alerts screen - you should see the alert with a link to your book chapter

## Common Alert Rule Examples

### Profit Margin Below 5%
```sql
INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
(
  'Critical Profit Margin - My Book',
  'danger',
  'profit_margin',
  5.00,
  'CRITICAL: Your profit margin is only {percentage}%. Your business may not be sustainable.',
  'URGENT: Review all costs and pricing immediately. Consult Chapter 2 of "My Book" for pricing strategies.',
  '{"book": "my-book-slug", "chapter": 2, "chapterTitle": "Pricing Strategies"}'::jsonb,
  true,
  10
);
```

### Expenses Exceed Revenue
```sql
INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
(
  'Overspending - My Book',
  'danger',
  'overspending',
  100.00,
  'EMERGENCY: Your expenses exceed your revenue. You are spending more than you earn.',
  'IMMEDIATE ACTION REQUIRED: Stop all non-essential spending. Consult Chapter 3 of "My Book" immediately.',
  '{"book": "my-book-slug", "chapter": 3, "chapterTitle": "Managing Expenses"}'::jsonb,
  true,
  10
);
```

### No Sales for 7 Days
```sql
INSERT INTO alert_rules (name, type, condition_type, threshold_days, message_template, action_template, book_reference, is_active, priority) VALUES
(
  'No Sales for 7 Days - My Book',
  'danger',
  'no_sales',
  7,
  'CRITICAL: You haven''t made any sales in {days} days.',
  'URGENT: Review your sales strategy. See Chapter 4 of "My Book" for sales tips.',
  '{"book": "my-book-slug", "chapter": 4, "chapterTitle": "Sales Strategies"}'::jsonb,
  true,
  9
);
```

## Using the Admin Interface (Alternative)

You can also create alert rules through the Admin interface:

1. Go to Admin → Manage Alerts
2. Click "Add New Alert"
3. Fill in the form:
   - Name, Type, Condition Type
   - Threshold (percentage, value, or days)
   - Message Template (with `{percentage}`, `{value}`, or `{days}`)
   - Action Template (references your book chapter)
   - Book Reference: Select your book and chapter
4. Save

**Note:** The admin interface for book reference selection may need to be enhanced to show your uploaded books.

## Troubleshooting

**Alert not showing up:**
- Check `is_active` is `true`
- Verify the threshold is being met
- Check that `book_reference` JSON is valid: `{"book": "slug", "chapter": 1, "chapterTitle": "Title"}`
- Ensure book slug matches exactly (case-sensitive)

**Wrong chapter referenced:**
- Double-check chapter number matches your book's chapters
- Verify chapter title matches exactly
- Check book slug is correct

**Alert shows but chapter link doesn't work:**
- Verify book slug exists in `books` table
- Check book status is `'published'`
- Ensure chapter number exists in `books.chapters` JSON array

## Next Steps

After creating alert rules:
1. Test them by triggering the conditions
2. Verify alerts show with correct book references
3. Confirm chapter links work in the app
4. Adjust thresholds and messages based on feedback
5. Create more alert rules for different business metrics

## See Also

- `database/insert_alert_rules.sql` - Example alert rules for "Start Your Business"
- `database/create_alert_rules_for_book.sql` - Template for creating your own alert rules
- `docs/BOOK_CHAPTER_DATA_FLOW.md` - How book and chapter data flows through the system
- `lib/alert-evaluator.ts` - How alert rules are evaluated

