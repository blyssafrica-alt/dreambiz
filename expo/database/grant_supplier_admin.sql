-- ============================================
-- Make a user an admin so they can see Supplier Applications (RLS)
-- Run in Supabase SQL Editor. Replace YOUR_EMAIL@example.com with your admin user's email.
-- ============================================

-- Ensure role column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT;
UPDATE public.users SET role = COALESCE(role, 'user') WHERE role IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'moderator', 'admin', 'super_admin'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure is_super_admin exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create or update the user: copy from auth.users if missing, then set admin
-- Replace YOUR_EMAIL@example.com with your actual email
INSERT INTO public.users (id, email, name, role, is_super_admin)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'User'),
  'admin',
  true
FROM auth.users au
WHERE au.email = 'YOUR_EMAIL@example.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_super_admin = true;

-- If your project's users table has no ON CONFLICT (id), run this instead after the INSERT (and remove INSERT above):
-- UPDATE public.users SET role = 'admin', is_super_admin = true WHERE email = 'YOUR_EMAIL@example.com';

-- Verify (uncomment and run):
-- SELECT id, email, name, role, is_super_admin FROM public.users WHERE email = 'YOUR_EMAIL@example.com';
