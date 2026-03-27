# 🚀 DreamBig Business OS - Database Quick Start

## ⚡ 5-Minute Setup

### Step 1: Create Supabase Project (2 min)

1. Visit [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `DreamBig Business OS`
   - **Database Password**: (create & save it)
   - **Region**: Choose closest to Zimbabwe
4. Click **"Create new project"** → Wait 2 minutes

### Step 2: Run Database Schema (1 min)

1. Open **SQL Editor** in Supabase (left sidebar)
2. Click **"New Query"**
3. Copy **ALL content** from `database/schema.sql`
4. Paste into SQL Editor
5. Click **"RUN"** (or Ctrl+Enter)
6. ✅ Wait for "Success. No rows returned"

### Step 3: Configure App (1 min)

1. In Supabase, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...`

3. Open `.env` file in project root
4. Replace with your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Start App (1 min)

```bash
npm start -- --clear
```

### Step 5: Test Login

**Super Admin Account** (already created):
- **Email**: `nashiezw@gmail.com`
- **Password**: `@12345678`

---

## ✅ Verification Checklist

After setup, verify these tables exist in **Table Editor**:

- ✅ users
- ✅ business_profiles
- ✅ transactions
- ✅ documents
- ✅ exchange_rates
- ✅ books
- ✅ user_books
- ✅ business_plans
- ✅ viability_calculations
- ✅ app_settings
- ✅ alerts

---

## 🎯 What's Included in Database

### Super Admin
- **Email**: nashiezw@gmail.com
- **Password**: @12345678
- **Super Admin**: Yes

### Sample Books
- Starting Your Business
- Financial Management
- Marketing & Sales
- Business Growth

### Features Enabled
- ✅ Row Level Security (RLS)
- ✅ User data isolation
- ✅ Automatic timestamps
- ✅ Optimized indexes
- ✅ Analytics views

---

## 🔧 Common Issues

### "Invalid API key"
→ Check `.env` file, restart server

### "relation does not exist"
→ Re-run SQL schema in Supabase

### Super admin can't login
→ Check users table, verify email exists

### Data not syncing
→ Check internet, verify Supabase project is active

---

## 📚 Full Documentation

For detailed setup guide, see: **`SUPABASE_SETUP.md`**

---

## 🎉 You're Ready!

Your database is now set up with:
- ✅ Complete schema
- ✅ Super admin account
- ✅ Sample data
- ✅ Security policies
- ✅ Optimized performance

Start building! 🚀
