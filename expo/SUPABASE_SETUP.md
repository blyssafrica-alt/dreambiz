# DreamBig Business OS - Supabase Setup Guide

## Complete Database Setup Instructions

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Enter project details:
   - **Name**: DreamBig Business OS
   - **Database Password**: Create a strong password (save it securely)
   - **Region**: Choose closest to Zimbabwe (e.g., eu-west-1 or af-south-1)
5. Click "Create new project" and wait for initialization (takes ~2 minutes)

### Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Open the file `database/schema.sql` in this project
4. Copy ALL the SQL content from that file
5. Paste it into the SQL Editor
6. Click **RUN** button (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

### Step 3: Configure Environment Variables

1. In Supabase dashboard, go to **Project Settings** (gear icon in sidebar)
2. Click on **API** section
3. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

4. In your project root, create a file named `.env`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

5. Replace with your actual values from step 3

### Step 4: Enable Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled (it should be by default)
3. Go to **Authentication** > **Email Templates**
4. Customize email templates if needed (optional)

### Step 5: Verify Database Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - ✅ users
   - ✅ books
   - ✅ user_books
   - ✅ business_profiles
   - ✅ transactions
   - ✅ documents
   - ✅ exchange_rates
   - ✅ business_plans
   - ✅ viability_calculations
   - ✅ app_settings
   - ✅ alerts

### Step 6: Verify Super Admin Account

1. Go to **Table Editor** > **users** table
2. Look for the user with email: `nashiezw@gmail.com`
3. Verify that `is_super_admin` column is `true`
4. If not found, the schema creation didn't complete properly - re-run the SQL

### Step 7: Test the App

1. Restart your development server:
```bash
npm start
# or
bun start
```

2. Clear app cache if needed:
```bash
npm start -- --clear
```

3. Open the app and try signing in with:
   - **Email**: nashiezw@gmail.com
   - **Password**: @12345678

4. If login succeeds, Supabase is properly configured! 🎉

## Database Schema Overview

### Core Tables

#### **users**
Stores user accounts with authentication details
- Linked to Supabase Auth
- Includes super admin flag

#### **business_profiles**
One business profile per user
- Business details (name, type, stage)
- Financial starting point (capital)
- Contact information

#### **transactions**
All sales and expenses
- Linked to user and business
- Categorized and dated
- Supports USD and ZWL currencies

#### **documents**
Invoices, receipts, and quotations
- Auto-generated document numbers
- Line items stored as JSONB
- Professional document structure

#### **exchange_rates**
Historical USD to ZWL exchange rates
- User-specific rates
- Tracks rate history

#### **books**
DreamBig book catalog
- Available to all users
- Links to features and tools

#### **user_books**
Books owned by users
- Access control for premium features
- Purchase tracking

#### **business_plans**
Generated business plans
- Structured content
- Financial projections

#### **viability_calculations**
Business viability assessments
- Break-even analysis
- Profit projections
- Risk assessments

#### **app_settings**
User preferences
- Theme (light/dark)
- Notifications
- Currency preference

#### **alerts**
System-generated alerts and warnings
- Mistake prevention system
- Business health warnings

### Security Features

**Row Level Security (RLS)** is enabled on all tables:
- Users can only access their own data
- Books are publicly readable
- Super admins have no special database access (handled in app logic)

### Indexes

Optimized indexes for:
- User lookups
- Transaction queries by date
- Document searches
- Alert filtering

### Views

Pre-built analytics views:
- `monthly_sales_summary`
- `monthly_expenses_summary`
- `business_health_dashboard`

## Troubleshooting

### Error: "Invalid API key"
- Double-check your `.env` file
- Ensure keys are copied correctly (no extra spaces)
- Restart development server after changing `.env`

### Error: "relation does not exist"
- SQL schema wasn't run or failed
- Go back to Step 2 and re-run the schema
- Check for error messages in SQL Editor

### Error: "row level security policy violation"
- User is not properly authenticated
- Check that user exists in `users` table
- Verify user_id matches in related tables

### Login fails for super admin
- Check if user exists in `users` table
- Password might not be set correctly
- Try creating account through the app instead
- Then manually set `is_super_admin = true` in database

### Data not syncing
- Check internet connection
- Verify Supabase project is not paused (free tier pauses after 1 week inactivity)
- Check browser console for error messages
- Verify RLS policies are correct

## Backup and Export

### Export Database
1. Go to **Database** > **Backups** in Supabase
2. Click "Create Backup"
3. Download when ready

### Export Data as CSV
1. Go to **Table Editor**
2. Select table
3. Click three dots menu > "Export to CSV"

## Upgrading

When adding new features that require database changes:
1. Create migration SQL file
2. Test locally first
3. Apply to production Supabase
4. Update app code
5. Test thoroughly

## Support

For issues specific to:
- **Supabase Platform**: [https://supabase.com/docs](https://supabase.com/docs)
- **DreamBig App**: Contact app support

---

**🎯 Important Notes**

1. **Super Admin Login**: 
   - Email: nashiezw@gmail.com
   - Password: @12345678
   - Change password immediately after first login!

2. **Free Tier Limits**:
   - 500MB database space
   - 2GB bandwidth per month
   - Pauses after 1 week of inactivity
   - Up to 50,000 monthly active users

3. **Data Privacy**:
   - All user data is encrypted in transit
   - RLS policies ensure data isolation
   - Regular backups recommended for production

4. **Development vs Production**:
   - Use separate Supabase projects for dev and prod
   - Never share production credentials
   - Test schema changes in dev first
