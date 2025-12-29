-- Create help_content table for managing Help & Support content
-- This allows admins to edit FAQs and support options

CREATE TABLE IF NOT EXISTS help_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Content Type
  content_type TEXT NOT NULL CHECK (content_type IN ('faq', 'support_option', 'quick_tip')),
  
  -- FAQ Fields
  faq_id TEXT, -- Unique identifier for FAQ (e.g., 'getting-started')
  faq_question TEXT,
  faq_answer TEXT,
  
  -- Support Option Fields
  support_id TEXT, -- Unique identifier for support option (e.g., 'email', 'whatsapp', 'books')
  support_title TEXT,
  support_description TEXT,
  support_icon TEXT, -- Icon name (e.g., 'Mail', 'MessageCircle', 'Book')
  support_action_type TEXT CHECK (support_action_type IN ('email', 'url', 'whatsapp', 'internal')),
  support_action_value TEXT, -- Email address, URL, or internal route
  
  -- Quick Tip Fields
  tip_text TEXT,
  
  -- Display Order
  display_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_help_content_type ON help_content(content_type);
CREATE INDEX IF NOT EXISTS idx_help_content_active ON help_content(is_active);
CREATE INDEX IF NOT EXISTS idx_help_content_display_order ON help_content(display_order);

-- Enable RLS
ALTER TABLE help_content ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active content
CREATE POLICY "Anyone can read active help content"
  ON help_content
  FOR SELECT
  USING (is_active = TRUE);

-- Policy: Only super admins can insert/update/delete
CREATE POLICY "Super admins can manage help content"
  ON help_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = TRUE
    )
  );

-- Insert default FAQ items
INSERT INTO help_content (content_type, faq_id, faq_question, faq_answer, display_order, is_active)
VALUES
  ('faq', 'getting-started', 'How do I get started?', 'After signing in, complete the onboarding wizard to set up your business profile. Select your DreamBig book, business type, and enter your financial information. The app will then unlock features based on your book selection.', 1, TRUE),
  ('faq', 'documents', 'How do I create invoices and receipts?', 'Go to the Documents tab and tap the + button. Select the document type (Invoice, Receipt, Quotation, etc.), fill in customer details, add items, and save. Documents are automatically numbered and can be exported as PDF.', 2, TRUE),
  ('faq', 'budgets', 'How do I create a budget?', 'Go to the Budgets tab and tap the + button. You can create a custom budget or use a template based on your business type. Set your total budget, dates, and optionally add category budgets.', 3, TRUE),
  ('faq', 'products', 'How do I manage inventory?', 'Go to the Products tab to add, edit, or delete products. Track stock levels, set prices, and view low stock alerts. The app will warn you when products are running low.', 4, TRUE),
  ('faq', 'reports', 'How do I view my financial reports?', 'Go to the Reports tab to see profit & loss statements, sales trends, expense breakdowns, and more. You can filter by date range and export reports.', 5, TRUE),
  ('faq', 'book-features', 'Why are some features hidden?', 'Features are unlocked based on your selected DreamBig book. Each book provides access to specific tools and templates. To access all features, select the appropriate book during onboarding.', 6, TRUE)
ON CONFLICT DO NOTHING;

-- Insert default support options
INSERT INTO help_content (content_type, support_id, support_title, support_description, support_icon, support_action_type, support_action_value, display_order, is_active)
VALUES
  ('support_option', 'email', 'Email Support', 'Send us an email for assistance', 'Mail', 'email', 'support@dreambig.co.zw', 1, TRUE),
  ('support_option', 'whatsapp', 'WhatsApp Support', 'Chat with us on WhatsApp', 'MessageCircle', 'whatsapp', 'https://wa.me/263771234567', 2, TRUE),
  ('support_option', 'books', 'DreamBig Books', 'Learn more about our books', 'Book', 'internal', '/books', 3, TRUE)
ON CONFLICT DO NOTHING;

-- Insert default quick tips
INSERT INTO help_content (content_type, tip_text, display_order, is_active)
VALUES
  ('quick_tip', '💡 Use budget templates to quickly set up budgets based on your business type', 1, TRUE),
  ('quick_tip', '📊 Check the dashboard regularly to monitor your business health score', 2, TRUE),
  ('quick_tip', '🔔 Set up low stock alerts to never run out of inventory', 3, TRUE),
  ('quick_tip', '📄 Export documents as PDF for professional presentation', 4, TRUE)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE help_content IS 'Stores Help & Support content including FAQs, support options, and quick tips. Admins can edit this content.';

