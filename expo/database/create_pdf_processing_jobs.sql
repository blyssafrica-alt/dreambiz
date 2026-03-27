-- PDF Processing Jobs Table
-- This table stores asynchronous PDF processing jobs to prevent Edge Function timeouts

CREATE TABLE IF NOT EXISTS public.pdf_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  result_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_status ON public.pdf_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_book_id ON public.pdf_processing_jobs(book_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_user_id ON public.pdf_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_created_at ON public.pdf_processing_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE public.pdf_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own PDF processing jobs" ON public.pdf_processing_jobs;
DROP POLICY IF EXISTS "Users can create their own PDF processing jobs" ON public.pdf_processing_jobs;
DROP POLICY IF EXISTS "Users can update their own PDF processing jobs" ON public.pdf_processing_jobs;
DROP POLICY IF EXISTS "Service role can manage all PDF processing jobs" ON public.pdf_processing_jobs;

-- Users can view their own jobs
CREATE POLICY "Users can view their own PDF processing jobs" ON public.pdf_processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create their own PDF processing jobs" ON public.pdf_processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs (for status polling)
CREATE POLICY "Users can update their own PDF processing jobs" ON public.pdf_processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Function)
CREATE POLICY "Service role can manage all PDF processing jobs" ON public.pdf_processing_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

