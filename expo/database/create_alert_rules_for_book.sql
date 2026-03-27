-- ============================================
-- Create Alert Rules for a Specific Book
-- ============================================
-- 
-- This template shows how to create alert rules that reference
-- specific chapters from your uploaded book.
--
-- USAGE:
-- 1. Replace 'YOUR-BOOK-SLUG' with your actual book slug (find it below)
-- 2. Replace chapter numbers (1, 2, 3, etc.) with actual chapter numbers from your book
-- 3. Replace chapter titles with actual chapter titles from your book
-- 4. Adjust alert conditions and messages to match your book's content
--
-- To find your book slug, run this first:
-- SELECT slug, title, total_chapters FROM books WHERE status = 'published' ORDER BY created_at DESC;
-- ============================================

-- REPLACE 'YOUR-BOOK-SLUG' BELOW with your actual book slug
-- Example: 'start-your-business', 'my-new-book', etc.

-- ============================================
-- PROFIT MARGIN ALERTS
-- ============================================
-- These alerts reference chapters about pricing, costs, and profit
-- Replace chapter number and title with your actual chapter about pricing

INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Low Profit Margin Warning - Your Book',
    'warning',
    'profit_margin',
    10.00,
    'Your profit margin is {percentage}%, which is below the recommended 15% minimum.',
    'Review your pricing strategy. Consider raising prices or reducing costs. Check Chapter 1 of your book for pricing guidance.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 1, "chapterTitle": "Your Chapter 1 Title"}'::jsonb,
    true,
    8
  ),
  (
    'Critical Profit Margin Alert - Your Book',
    'danger',
    'profit_margin',
    5.00,
    'CRITICAL: Your profit margin is only {percentage}%. Your business may not be sustainable at this rate.',
    'URGENT: Review all costs and pricing immediately. Consider consulting Chapter 1 of your book for emergency pricing strategies.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 1, "chapterTitle": "Your Chapter 1 Title"}'::jsonb,
    true,
    10
  ),
  (
    'Negative Profit Margin - Your Book',
    'danger',
    'profit_margin',
    0.00,
    'WARNING: Your business is operating at a loss with a {percentage}% profit margin.',
    'Immediate action required: Your expenses exceed revenue. Review all costs, consider price increases, or reduce expenses. See Chapter 1 of your book.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 1, "chapterTitle": "Your Chapter 1 Title"}'::jsonb,
    true,
    10
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- CASH FLOW ALERTS
-- ============================================
-- These alerts reference chapters about cash management

INSERT INTO alert_rules (name, type, condition_type, threshold_value, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Negative Cash Position - Your Book',
    'danger',
    'cash_position',
    0.00,
    'CRITICAL: Your cash position is negative. You have ${value} in cash.',
    'URGENT: You are running out of money. Review expenses immediately, collect outstanding invoices, or secure additional funding. See Chapter 2 of your book for cash flow management.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Your Chapter 2 Title"}'::jsonb,
    true,
    10
  ),
  (
    'Low Cash Reserve - Your Book',
    'warning',
    'cash_position',
    1000.00,
    'Warning: Your cash position is ${value}, which may not cover unexpected expenses.',
    'Build up your cash reserve. Aim to have at least 3 months of operating expenses saved. Review Chapter 2 of your book for cash management tips.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Your Chapter 2 Title"}'::jsonb,
    true,
    7
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- SPENDING ALERTS
-- ============================================
-- These alerts reference chapters about expense management

INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'High Expense Ratio - Your Book',
    'warning',
    'high_expenses',
    80.00,
    'Warning: Your expenses are {percentage}% of revenue, which is above the recommended 70% maximum.',
    'Review your expenses and identify areas to cut costs. Check Chapter 2 of your book for expense management strategies.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Your Chapter 2 Title"}'::jsonb,
    true,
    7
  ),
  (
    'Overspending Alert - Your Book',
    'danger',
    'overspending',
    100.00,
    'EMERGENCY: Your expenses exceed your revenue. You are spending more than you earn.',
    'IMMEDIATE ACTION REQUIRED: Stop all non-essential spending. Review every expense. Your business cannot continue at this rate. Consult Chapter 2 of your book immediately.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Your Chapter 2 Title"}'::jsonb,
    true,
    10
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- SALES ALERTS
-- ============================================
-- These alerts reference chapters about sales and marketing

INSERT INTO alert_rules (name, type, condition_type, threshold_days, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'No Sales for 3 Days - Your Book',
    'warning',
    'no_sales',
    3,
    'You haven''t made any sales in the last {days} days.',
    'Review your sales strategy. Consider running promotions, reaching out to customers, or improving your marketing. Check Chapter 3 of your book for sales tips.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 3, "chapterTitle": "Your Chapter 3 Title"}'::jsonb,
    true,
    6
  ),
  (
    'No Sales for 7 Days - Your Book',
    'danger',
    'no_sales',
    7,
    'CRITICAL: You haven''t made any sales in {days} days. This is a serious concern.',
    'URGENT: Take immediate action. Review your product/service, pricing, and marketing. Consider consulting Chapter 3 of your book for emergency sales strategies.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 3, "chapterTitle": "Your Chapter 3 Title"}'::jsonb,
    true,
    9
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- QUICK TEMPLATE: How to Create More Alert Rules
-- ============================================
-- 
-- Basic structure:
-- INSERT INTO alert_rules (
--   name,                      -- Unique name for the alert rule
--   type,                      -- 'warning', 'danger', 'info', or 'success'
--   condition_type,            -- 'profit_margin', 'cash_position', 'no_sales', etc.
--   threshold_percentage,      -- OR threshold_value OR threshold_days (use one)
--   message_template,          -- Message with {percentage}, {value}, or {days} placeholders
--   action_template,           -- Action message referencing your book chapter
--   book_reference,            -- JSONB with book slug, chapter number, and chapter title
--   is_active,                 -- true to enable, false to disable
--   priority                   -- Higher number = shown first (0-10)
-- ) VALUES (
--   'Alert Name',
--   'warning',
--   'profit_margin',
--   10.00,
--   'Your profit margin is {percentage}%',
--   'Check Chapter X of your book for guidance',
--   '{"book": "your-book-slug", "chapter": X, "chapterTitle": "Chapter Title"}'::jsonb,
--   true,
--   8
-- );
--
-- ============================================
-- To see what chapters are available in your book:
-- ============================================
-- SELECT 
--   slug,
--   title,
--   total_chapters,
--   chapters->>0 as first_chapter_sample
-- FROM books 
-- WHERE slug = 'your-book-slug';
--
-- To see all chapters as JSON:
-- SELECT chapters FROM books WHERE slug = 'your-book-slug';
--

