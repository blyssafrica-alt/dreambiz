-- Add document_file_url column to books table for PDF/Word document storage
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
  -- Add document_file_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'books' AND column_name = 'document_file_url') THEN
    ALTER TABLE books ADD COLUMN document_file_url TEXT;
    COMMENT ON COLUMN books.document_file_url IS 'URL to the PDF or Word document file stored in Supabase storage';
  END IF;
END $$;

