-- ============================================
-- Template: Create Alert Rules for Your Book
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Find your book slug: SELECT slug, title FROM books WHERE status = 'published' ORDER BY created_at DESC;
-- 2. Find your chapters: SELECT chapters FROM books WHERE slug = 'your-book-slug';
-- 3. Replace 'YOUR-BOOK-SLUG' below with your actual book slug
-- 4. Replace chapter numbers (1, 2, 3) with your actual chapter numbers
-- 5. Replace chapter titles with your actual chapter titles
-- 6. Run this SQL in Supabase SQL Editor
--
-- ============================================

-- SET YOUR BOOK SLUG HERE (replace 'YOUR-BOOK-SLUG' with your actual slug)
-- Example: 'start-your-business', 'my-new-book', etc.

-- ============================================
-- PROFIT MARGIN ALERTS
-- ============================================
-- Replace chapter number and title with chapters about pricing/profit

INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Low Profit Margin Warning',
    'warning',
    'profit_margin',
    10.00,
    'Your profit margin is {percentage}%, which is below the recommended 15% minimum.',
    'Review your pricing strategy. Consider raising prices or reducing costs. Check Chapter 1 for pricing guidance.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 1, "chapterTitle": "Chapter 1 Title"}'::jsonb,
    true,
    8
  ),
  (
    'Critical Profit Margin Alert',
    'danger',
    'profit_margin',
    5.00,
    'CRITICAL: Your profit margin is only {percentage}%. Your business may not be sustainable at this rate.',
    'URGENT: Review all costs and pricing immediately. Consider consulting Chapter 1 for emergency pricing strategies.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 1, "chapterTitle": "Chapter 1 Title"}'::jsonb,
    true,
    10
  ),
  (
    'Negative Profit Margin',
    'danger',
    'profit_margin',
    0.00,
    'WARNING: Your business is operating at a loss with a {percentage}% profit margin.',
    'Immediate action required: Your expenses exceed revenue. Review all costs, consider price increases, or reduce expenses. See Chapter 1.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 1, "chapterTitle": "Chapter 1 Title"}'::jsonb,
    true,
    10
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- CASH FLOW ALERTS
-- ============================================
-- Replace chapter number and title with chapters about cash flow/finances

INSERT INTO alert_rules (name, type, condition_type, threshold_value, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Negative Cash Position',
    'danger',
    'cash_position',
    0.00,
    'CRITICAL: Your cash position is negative. You have ${value} in cash.',
    'URGENT: You are running out of money. Review expenses immediately, collect outstanding invoices, or secure additional funding. See Chapter 2 for cash flow management.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Chapter 2 Title"}'::jsonb,
    true,
    10
  ),
  (
    'Low Cash Reserve',
    'warning',
    'cash_position',
    1000.00,
    'Warning: Your cash position is ${value}, which may not cover unexpected expenses.',
    'Build up your cash reserve. Aim to have at least 3 months of operating expenses saved. Review Chapter 2 for cash management tips.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Chapter 2 Title"}'::jsonb,
    true,
    7
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- SPENDING ALERTS
-- ============================================
-- Replace chapter number and title with chapters about expense management

INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'High Expense Ratio',
    'warning',
    'high_expenses',
    80.00,
    'Warning: Your expenses are {percentage}% of revenue, which is above the recommended 70% maximum.',
    'Review your expenses and identify areas to cut costs. Check Chapter 2 for expense management strategies.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Chapter 2 Title"}'::jsonb,
    true,
    7
  ),
  (
    'Overspending Alert',
    'danger',
    'overspending',
    100.00,
    'EMERGENCY: Your expenses exceed your revenue. You are spending more than you earn.',
    'IMMEDIATE ACTION REQUIRED: Stop all non-essential spending. Review every expense. Your business cannot continue at this rate. Consult Chapter 2 immediately.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 2, "chapterTitle": "Chapter 2 Title"}'::jsonb,
    true,
    10
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- SALES ALERTS
-- ============================================
-- Replace chapter number and title with chapters about sales/marketing

INSERT INTO alert_rules (name, type, condition_type, threshold_days, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'No Sales for 3 Days',
    'warning',
    'no_sales',
    3,
    'You haven''t made any sales in the last {days} days.',
    'Review your sales strategy. Consider running promotions, reaching out to customers, or improving your marketing. Check Chapter 3 for sales tips.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 3, "chapterTitle": "Chapter 3 Title"}'::jsonb,
    true,
    6
  ),
  (
    'No Sales for 7 Days',
    'danger',
    'no_sales',
    7,
    'CRITICAL: You haven''t made any sales in {days} days. This is a serious concern.',
    'URGENT: Take immediate action. Review your product/service, pricing, and marketing. Consider consulting Chapter 3 for emergency sales strategies.',
    '{"book": "YOUR-BOOK-SLUG", "chapter": 3, "chapterTitle": "Chapter 3 Title"}'::jsonb,
    true,
    9
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- TO VERIFY YOUR ALERT RULES WERE CREATED:
-- ============================================
-- SELECT name, type, book_reference FROM alert_rules 
-- WHERE book_reference->>'book' = 'YOUR-BOOK-SLUG'
-- ORDER BY priority DESC;

