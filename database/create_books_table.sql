-- Create or update books table for DreamBig books management
-- Run this in Supabase SQL Editor

-- First, check if books table exists and drop it if it has old structure
-- (This is safe if you want to start fresh)
-- DROP TABLE IF EXISTS books CASCADE;

-- Create books table with all required columns
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

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add slug column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'slug') THEN
    ALTER TABLE books ADD COLUMN slug TEXT UNIQUE;
  END IF;

  -- Add subtitle column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'subtitle') THEN
    ALTER TABLE books ADD COLUMN subtitle TEXT;
  END IF;

  -- Add cover_image column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'cover_image') THEN
    ALTER TABLE books ADD COLUMN cover_image TEXT;
  END IF;

  -- Add price column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'price') THEN
    ALTER TABLE books ADD COLUMN price DECIMAL(15, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'currency') THEN
    ALTER TABLE books ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
  END IF;

  -- Add sale_price column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'sale_price') THEN
    ALTER TABLE books ADD COLUMN sale_price DECIMAL(15, 2);
  END IF;

  -- Add sale_start_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'sale_start_date') THEN
    ALTER TABLE books ADD COLUMN sale_start_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add sale_end_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'sale_end_date') THEN
    ALTER TABLE books ADD COLUMN sale_end_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add total_chapters column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'total_chapters') THEN
    ALTER TABLE books ADD COLUMN total_chapters INTEGER DEFAULT 0;
  END IF;

  -- Add chapters column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'chapters') THEN
    ALTER TABLE books ADD COLUMN chapters JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add author column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'author') THEN
    ALTER TABLE books ADD COLUMN author TEXT;
  END IF;

  -- Add isbn column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'isbn') THEN
    ALTER TABLE books ADD COLUMN isbn TEXT;
  END IF;

  -- Add publication_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'publication_date') THEN
    ALTER TABLE books ADD COLUMN publication_date DATE;
  END IF;

  -- Add page_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'page_count') THEN
    ALTER TABLE books ADD COLUMN page_count INTEGER;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'status') THEN
    ALTER TABLE books ADD COLUMN status TEXT DEFAULT 'draft';
    -- Add check constraint
    ALTER TABLE books ADD CONSTRAINT books_status_check 
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;

  -- Add is_featured column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'is_featured') THEN
    ALTER TABLE books ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add display_order column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'display_order') THEN
    ALTER TABLE books ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;

  -- Add total_sales column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'total_sales') THEN
    ALTER TABLE books ADD COLUMN total_sales INTEGER DEFAULT 0;
  END IF;

  -- Add total_revenue column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'total_revenue') THEN
    ALTER TABLE books ADD COLUMN total_revenue DECIMAL(15, 2) DEFAULT 0;
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'created_by') THEN
    ALTER TABLE books ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'updated_at') THEN
    ALTER TABLE books ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Make category nullable if it exists (old schema had it as NOT NULL, but we don't need it)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'books' AND column_name = 'category' AND is_nullable = 'NO') THEN
    ALTER TABLE books ALTER COLUMN category DROP NOT NULL;
  END IF;

  -- Update slug for existing books if they don't have one
  UPDATE books 
  SET slug = LOWER(REPLACE(REPLACE(title, ' ', '-'), '''', ''))
  WHERE slug IS NULL OR slug = '';

  -- Make slug NOT NULL after updating existing rows
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'books' AND column_name = 'slug' AND is_nullable = 'YES') THEN
    ALTER TABLE books ALTER COLUMN slug SET NOT NULL;
  END IF;

  -- Add unique constraint on slug if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'books_slug_key'
  ) THEN
    ALTER TABLE books ADD CONSTRAINT books_slug_key UNIQUE (slug);
  END IF;

END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_display_order ON books(display_order);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Super admins can manage all books" ON books;
DROP POLICY IF EXISTS "Users can view published books" ON books;

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

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_books_updated_at ON books;
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_books_updated_at();

-- Insert default DreamBig books (only if they don't exist)
-- Include category field if it exists in the table to avoid NOT NULL constraint errors
INSERT INTO books (slug, title, subtitle, description, price, status, display_order, total_chapters, category) 
SELECT 
  'start-your-business', 'Start Your Business', 'Turn your idea into reality', 
  'A comprehensive guide to starting your business from scratch', 0, 'published', 1, 10, 'business'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE slug = 'start-your-business')
UNION ALL
SELECT 
  'grow-your-business', 'Grow Your Business', 'Scale and expand successfully', 
  'Learn how to grow and scale your business effectively', 0, 'published', 2, 12, 'business'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE slug = 'grow-your-business')
UNION ALL
SELECT 
  'manage-your-money', 'Manage Your Money', 'Financial management for entrepreneurs', 
  'Master your business finances and cash flow', 0, 'published', 3, 8, 'finance'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE slug = 'manage-your-money')
UNION ALL
SELECT 
  'hire-and-lead', 'Hire and Lead', 'Build and lead your team', 
  'Learn to hire, manage, and lead your team effectively', 0, 'published', 4, 9, 'management'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE slug = 'hire-and-lead')
UNION ALL
SELECT 
  'marketing-mastery', 'Marketing Mastery', 'Market your business effectively', 
  'Master marketing strategies to grow your customer base', 0, 'published', 5, 11, 'marketing'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE slug = 'marketing-mastery')
UNION ALL
SELECT 
  'scale-up', 'Scale Up', 'Take your business to the next level', 
  'Advanced strategies for scaling your business', 0, 'published', 6, 10, 'business'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE slug = 'scale-up');

-- Add comment for documentation
COMMENT ON COLUMN books.slug IS 'Unique identifier for the book (used in URLs and references)';
COMMENT ON COLUMN books.cover_image IS 'Base64 encoded image or URI for the book cover';
COMMENT ON COLUMN books.chapters IS 'JSON array of chapter information';
