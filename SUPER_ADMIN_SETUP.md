# 🔐 Super Admin Account Setup

## Problem

The super admin account login is failing because the account needs to be created in **Supabase Auth** (not just the `users` table).

## Solution

### Option 1: Run the Setup Script (Recommended)

1. Make sure you have Node.js installed
2. Run the script:

```bash
node scripts/create-super-admin.js
```

Or with bun:

```bash
bun run scripts/create-super-admin.js
```

This script will:
- Create the user in Supabase Auth
- Create/update the user profile in the `users` table
- Set `is_super_admin = true`

### Option 2: Create Manually in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** > **Users**
4. Click **"Add User"** or **"Invite User"**
5. Enter:
   - **Email**: `nashiezw@gmail.com`
   - **Password**: `@12345678`
   - **Auto Confirm User**: ✅ (check this)
6. Click **"Create User"**
7. Go to **Table Editor** > **users** table
8. Find the user with email `nashiezw@gmail.com`
9. Edit the row and set `is_super_admin = true`
10. Save

### Option 3: Use Supabase SQL Editor

1. Go to Supabase Dashboard > **SQL Editor**
2. Run this SQL:

```sql
-- First, create the user in Auth (you'll need to do this via the dashboard or API)
-- Then update the users table:
UPDATE users 
SET is_super_admin = true 
WHERE email = 'nashiezw@gmail.com';

-- If the user doesn't exist in users table yet, insert it:
-- (Replace USER_ID with the actual UUID from auth.users)
INSERT INTO users (id, email, name, password_hash, is_super_admin) 
VALUES (
  'USER_ID_FROM_AUTH', 
  'nashiezw@gmail.com', 
  'Super Admin', 
  '', 
  true
)
ON CONFLICT (email) DO UPDATE SET is_super_admin = true;
```

## Verify Setup

After creating the account:

1. **Check Supabase Auth**:
   - Go to Authentication > Users
   - Verify `nashiezw@gmail.com` exists

2. **Check Users Table**:
   - Go to Table Editor > users
   - Verify `is_super_admin = true` for the user

3. **Test Login**:
   - Open the app
   - Sign in with:
     - Email: `nashiezw@gmail.com`
     - Password: `@12345678`

## Troubleshooting

### "User already registered" Error

If you see this error when running the script:
- The user already exists in Supabase Auth
- The script will try to sign in to verify the password
- If password is wrong, reset it in Supabase Dashboard

### "Invalid credentials" Error

Possible causes:
1. **Wrong password**: Reset it in Supabase Dashboard > Authentication > Users
2. **User not confirmed**: Make sure "Auto Confirm User" was checked when creating
3. **Email not verified**: Check user settings in Supabase Dashboard

### Reset Password

1. Go to Supabase Dashboard > Authentication > Users
2. Find `nashiezw@gmail.com`
3. Click the three dots menu
4. Select "Reset Password"
5. Or manually set a new password

## Super Admin Credentials

- **Email**: `nashiezw@gmail.com`
- **Password**: `@12345678`
- **Super Admin**: `true`

⚠️ **Important**: Change the password after first login in production!

