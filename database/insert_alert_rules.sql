-- Insert Alert Rules
-- These rules help prevent common business mistakes by alerting users to potential issues

-- Profit Margin Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Low Profit Margin Warning',
    'warning',
    'profit_margin',
    10.00,
    'Your profit margin is {percentage}%, which is below the recommended 15% minimum.',
    'Review your pricing strategy. Consider raising prices or reducing costs. Check Chapter 4 of "Start Your Business" for pricing guidance.',
    '{"book": "start-your-business", "chapter": 4, "chapterTitle": "Pricing for Profit"}'::jsonb,
    true,
    8
  ),
  (
    'Critical Profit Margin Alert',
    'danger',
    'profit_margin',
    5.00,
    'CRITICAL: Your profit margin is only {percentage}%. Your business may not be sustainable at this rate.',
    'URGENT: Review all costs and pricing immediately. Consider consulting Chapter 4 of "Start Your Business" for emergency pricing strategies.',
    '{"book": "start-your-business", "chapter": 4, "chapterTitle": "Pricing for Profit"}'::jsonb,
    true,
    10
  ),
  (
    'Negative Profit Margin',
    'danger',
    'profit_margin',
    0.00,
    'WARNING: Your business is operating at a loss with a {percentage}% profit margin.',
    'Immediate action required: Your expenses exceed revenue. Review all costs, consider price increases, or reduce expenses. See Chapter 4 of "Start Your Business".',
    '{"book": "start-your-business", "chapter": 4, "chapterTitle": "Pricing for Profit"}'::jsonb,
    true,
    10
  );

-- Cash Position Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_value, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Negative Cash Position',
    'danger',
    'cash_position',
    0.00,
    'CRITICAL: Your cash position is negative. You have ${value} in cash.',
    'URGENT: You are running out of money. Review expenses immediately, collect outstanding invoices, or secure additional funding. See Chapter 6 of "Start Your Business" for cash flow management.',
    '{"book": "start-your-business", "chapter": 6, "chapterTitle": "Managing Cash Flow"}'::jsonb,
    true,
    10
  ),
  (
    'Low Cash Reserve',
    'warning',
    'cash_position',
    1000.00,
    'Warning: Your cash position is ${value}, which may not cover unexpected expenses.',
    'Build up your cash reserve. Aim to have at least 3 months of operating expenses saved. Review Chapter 6 of "Start Your Business" for cash management tips.',
    '{"book": "start-your-business", "chapter": 6, "chapterTitle": "Managing Cash Flow"}'::jsonb,
    true,
    7
  );

-- Sales Activity Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_days, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'No Sales for 3 Days',
    'warning',
    'no_sales',
    3,
    'You haven''t made any sales in the last {days} days.',
    'Review your sales strategy. Consider running promotions, reaching out to customers, or improving your marketing. Check Chapter 5 of "Start Your Business" for sales tips.',
    '{"book": "start-your-business", "chapter": 5, "chapterTitle": "Making Your First Sales"}'::jsonb,
    true,
    6
  ),
  (
    'No Sales for 7 Days',
    'danger',
    'no_sales',
    7,
    'CRITICAL: You haven''t made any sales in {days} days. This is a serious concern.',
    'URGENT: Take immediate action. Review your product/service, pricing, and marketing. Consider consulting Chapter 5 of "Start Your Business" for emergency sales strategies.',
    '{"book": "start-your-business", "chapter": 5, "chapterTitle": "Making Your First Sales"}'::jsonb,
    true,
    9
  ),
  (
    'No Sales for 14 Days',
    'danger',
    'no_sales',
    14,
    'EMERGENCY: No sales recorded for {days} days. Your business may be at risk.',
    'IMMEDIATE ACTION REQUIRED: Your business needs urgent attention. Review everything - product, pricing, marketing, customer service. Seek advice from Chapter 5 of "Start Your Business".',
    '{"book": "start-your-business", "chapter": 5, "chapterTitle": "Making Your First Sales"}'::jsonb,
    true,
    10
  );

-- Stock Management Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_value, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Low Stock Alert',
    'warning',
    'low_stock',
    10.00,
    'Warning: You have products with stock levels below {value} units.',
    'Consider restocking soon to avoid running out of inventory. Review your inventory management in Chapter 7 of "Start Your Business".',
    '{"book": "start-your-business", "chapter": 7, "chapterTitle": "Inventory Management"}'::jsonb,
    true,
    5
  ),
  (
    'Out of Stock Alert',
    'danger',
    'low_stock',
    0.00,
    'CRITICAL: Some products are out of stock. You may be losing sales.',
    'Restock immediately to avoid losing customers. See Chapter 7 of "Start Your Business" for inventory management best practices.',
    '{"book": "start-your-business", "chapter": 7, "chapterTitle": "Inventory Management"}'::jsonb,
    true,
    8
  );

-- Invoice Management Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_days, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Overdue Invoices',
    'warning',
    'overdue_invoice',
    7,
    'You have invoices that are {days} days overdue.',
    'Follow up with customers to collect payment. Review Chapter 8 of "Start Your Business" for accounts receivable management.',
    '{"book": "start-your-business", "chapter": 8, "chapterTitle": "Managing Accounts Receivable"}'::jsonb,
    true,
    6
  ),
  (
    'Severely Overdue Invoices',
    'danger',
    'overdue_invoice',
    30,
    'CRITICAL: You have invoices that are {days} days overdue. This affects your cash flow.',
    'URGENT: Take immediate action to collect these payments. Consider payment plans or collection services. See Chapter 8 of "Start Your Business".',
    '{"book": "start-your-business", "chapter": 8, "chapterTitle": "Managing Accounts Receivable"}'::jsonb,
    true,
    9
  );

-- Spending Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'High Expense Ratio',
    'warning',
    'high_expenses',
    80.00,
    'Warning: Your expenses are {percentage}% of revenue, which is above the recommended 70% maximum.',
    'Review your expenses and identify areas to cut costs. Check Chapter 6 of "Start Your Business" for expense management strategies.',
    '{"book": "start-your-business", "chapter": 6, "chapterTitle": "Managing Cash Flow"}'::jsonb,
    true,
    7
  ),
  (
    'Critical Expense Ratio',
    'danger',
    'high_expenses',
    90.00,
    'CRITICAL: Your expenses are {percentage}% of revenue. Your business may not be sustainable.',
    'URGENT: Immediately review and reduce expenses. Your profit margin is too thin. See Chapter 6 of "Start Your Business" for emergency cost-cutting strategies.',
    '{"book": "start-your-business", "chapter": 6, "chapterTitle": "Managing Cash Flow"}'::jsonb,
    true,
    9
  ),
  (
    'Overspending Alert',
    'danger',
    'overspending',
    100.00,
    'EMERGENCY: Your expenses exceed your revenue. You are spending more than you earn.',
    'IMMEDIATE ACTION REQUIRED: Stop all non-essential spending. Review every expense. Your business cannot continue at this rate. Consult Chapter 6 of "Start Your Business" immediately.',
    '{"book": "start-your-business", "chapter": 6, "chapterTitle": "Managing Cash Flow"}'::jsonb,
    true,
    10
  );

-- Revenue Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Declining Revenue',
    'warning',
    'low_revenue',
    -20.00,
    'Warning: Your revenue has declined by {percentage}% compared to the previous period.',
    'Review your sales strategy and marketing efforts. Consider new approaches to attract customers. Check Chapter 5 of "Start Your Business" for sales growth strategies.',
    '{"book": "start-your-business", "chapter": 5, "chapterTitle": "Making Your First Sales"}'::jsonb,
    true,
    6
  ),
  (
    'Severe Revenue Decline',
    'danger',
    'low_revenue',
    -50.00,
    'CRITICAL: Your revenue has declined by {percentage}%. This is a serious concern.',
    'URGENT: Take immediate action to reverse this trend. Review your business model, pricing, and marketing. See Chapter 5 of "Start Your Business" for emergency sales recovery strategies.',
    '{"book": "start-your-business", "chapter": 5, "chapterTitle": "Making Your First Sales"}'::jsonb,
    true,
    9
  );

-- Success/Positive Alerts
INSERT INTO alert_rules (name, type, condition_type, threshold_percentage, message_template, action_template, book_reference, is_active, priority) VALUES
  (
    'Healthy Profit Margin',
    'success',
    'profit_margin',
    20.00,
    'Great! Your profit margin is {percentage}%, which is above the recommended 15% minimum.',
    'Keep up the good work! Consider reinvesting profits for growth. Review Chapter 9 of "Start Your Business" for growth strategies.',
    '{"book": "start-your-business", "chapter": 9, "chapterTitle": "Growing Your Business"}'::jsonb,
    true,
    3
  ),
  (
    'Strong Cash Position',
    'info',
    'cash_position',
    10000.00,
    'Excellent! You have a strong cash position of ${value}.',
    'Consider investing in growth opportunities or building an emergency fund. See Chapter 9 of "Start Your Business" for investment strategies.',
    '{"book": "start-your-business", "chapter": 9, "chapterTitle": "Growing Your Business"}'::jsonb,
    true,
    2
  );

