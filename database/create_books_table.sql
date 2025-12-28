-- Create books table for DreamBig books management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  slug TEXT UNIQUE NOT NULL, -- e.g., 'start-your-business', 'grow-your-business'
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cover_image TEXT, -- Base64 or URI for book cover
  
  -- Pricing
  price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  sale_price DECIMAL(15, 2),
  sale_start_date TIMESTAMP WITH TIME ZONE,
  sale_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Content
  total_chapters INTEGER DEFAULT 0,
  chapters JSONB DEFAULT '[]'::jsonb, -- [{number: 1, title: "Chapter 1", description: "..."}]
  
  -- Metadata
  author TEXT,
  isbn TEXT,
  publication_date DATE,
  page_count INTEGER,
  
  -- Status & Visibility
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  -- Sales & Analytics
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_display_order ON books(display_order);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super Admins can do everything
CREATE POLICY "Super admins can manage all books"
  ON books
  FOR ALL
  USING (public.is_super_admin());

-- Regular users can only view published books
CREATE POLICY "Users can view published books"
  ON books
  FOR SELECT
  USING (status = 'published');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_books_updated_at();

-- Insert default DreamBig books
INSERT INTO books (slug, title, subtitle, description, price, status, display_order, total_chapters) VALUES
  ('start-your-business', 'Start Your Business', 'Turn your idea into reality', 'A comprehensive guide to starting your business from scratch', 0, 'published', 1, 10),
  ('grow-your-business', 'Grow Your Business', 'Scale and expand successfully', 'Learn how to grow and scale your business effectively', 0, 'published', 2, 12),
  ('manage-your-money', 'Manage Your Money', 'Financial management for entrepreneurs', 'Master your business finances and cash flow', 0, 'published', 3, 8),
  ('hire-and-lead', 'Hire and Lead', 'Build and lead your team', 'Learn to hire, manage, and lead your team effectively', 0, 'published', 4, 9),
  ('marketing-mastery', 'Marketing Mastery', 'Market your business effectively', 'Master marketing strategies to grow your customer base', 0, 'published', 5, 11),
  ('scale-up', 'Scale Up', 'Take your business to the next level', 'Advanced strategies for scaling your business', 0, 'published', 6, 10)
ON CONFLICT (slug) DO NOTHING;

