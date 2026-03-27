-- ============================================
-- DOCUMENT FOLDERS TABLE
-- ============================================
-- Allows users to organize documents into custom folders

-- STEP 1: Ensure is_super_admin() function exists
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id::text = auth.uid()::text 
    AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#0066CC', -- Hex color for folder icon/badge
  icon TEXT DEFAULT 'folder', -- Icon name (folder, archive, star, etc.)
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id, name) -- Prevent duplicate folder names per business
);

-- Add folder_id column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_user_business ON document_folders(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_business ON document_folders(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);

-- RLS Policies for document_folders
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own folders
CREATE POLICY "Users can view their own document folders"
  ON document_folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own folders
CREATE POLICY "Users can insert their own document folders"
  ON document_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own folders
CREATE POLICY "Users can update their own document folders"
  ON document_folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own folders
CREATE POLICY "Users can delete their own document folders"
  ON document_folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Super admins can view all folders
CREATE POLICY "Super admins can view all document folders"
  ON document_folders FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_document_folders_updated_at();

