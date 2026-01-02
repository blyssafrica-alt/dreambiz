-- Add features column to books table
-- This stores which features each book enables (array of feature IDs)

DO $$ 
BEGIN
  -- Add enabled_features column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'enabled_features') THEN
    ALTER TABLE books ADD COLUMN enabled_features TEXT[] DEFAULT ARRAY[]::TEXT[];
    COMMENT ON COLUMN books.enabled_features IS 'Array of feature IDs that this book enables (e.g., ["products", "customers", "reports"])';
  END IF;
  
  -- Add extracted_chapters_data column if it doesn't exist (stores full chapter content from PDF)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'extracted_chapters_data') THEN
    ALTER TABLE books ADD COLUMN extracted_chapters_data JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN books.extracted_chapters_data IS 'Full chapter content extracted from PDF for search and reference purposes';
  END IF;
END $$;

