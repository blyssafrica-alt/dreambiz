# DreamBig Business OS - Complete Setup Guide

## 🎯 Quick Start (5 Steps)

### Step 1: Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to initialize (2-3 minutes)
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. **IMPORTANT**: Change the dropdown from "RLS disabled" to **"No limit"**
6. Copy and paste the contents of `database/COMPLETE_SCHEMA.sql`
7. Click **Run** (or press Ctrl+Enter)
8. Wait for success message ✅

### Step 2: Set Up User Profile Trigger

1. In Supabase SQL Editor, click **New Query**
2. Select **"No limit"** from the dropdown
3. Copy and paste the contents of `database/create_user_profile_trigger.sql`
4. Click **Run**
5. Wait for success message ✅

### Step 3: Configure Environment Variables

1. In Supabase, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. Create a file named `.env` in the project root (if it doesn't exist)
4. Add these variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Install Dependencies

```bash
npm install
# or
bun install
```

### Step 5: Start the App

```bash
npm start
# or
bun start
```

---

## ✅ Verification Checklist

After setup, verify these are working:

### Database Tables Created ✓
- [ ] users
- [ ] business_profiles (with dream_big_book field)
- [ ] transactions
- [ ] documents
- [ ] products
- [ ] customers
- [ ] suppliers
- [ ] budgets
- [ ] cashflow_projections
- [ ] tax_rates
- [ ] employees
- [ ] projects
- [ ] project_tasks
- [ ] exchange_rates

### Triggers & Functions Working ✓
- [ ] handle_new_user() trigger on auth.users
- [ ] sync_existing_users() function
- [ ] sync_user_profile(UUID) RPC function
- [ ] update_updated_at_column() triggers

### App Features Accessible ✓
- [ ] Sign up / Sign in working
- [ ] Onboarding flow (4 steps) working
- [ ] Dashboard showing metrics
- [ ] Can add transactions (sales/expenses)
- [ ] Can create documents (invoices/receipts)
- [ ] Can view all tabs based on book selection

---

## 📱 App Structure

### Core Screens (Always Visible)
1. **Dashboard** - Metrics, alerts, top categories
2. **Finances** - Sales & expense tracking
3. **Documents** - Invoices, receipts, quotations
4. **Calculator** - Viability engine with scenarios
5. **Settings** - Business profile, theme

### Book-Dependent Screens
6. **Products** - Product catalog (Start Your Business, Grow, Scale Up)
7. **Customers** - Customer management (Start, Grow, Marketing, Scale Up)
8. **Suppliers** - Supplier management (Grow, Scale Up)
9. **Reports** - P&L, analytics (Most books)
10. **Budgets** - Budget planning (Start, Manage Your Money, Scale Up)
11. **Cashflow** - Cashflow projections (Manage Your Money, Scale Up)
12. **Tax** - Tax rate management (Manage Your Money, Scale Up)
13. **Employees** - Employee management (Hire and Lead, Scale Up)
14. **Projects** - Project tracking (Grow, Hire and Lead, Marketing, Scale Up)

### Utility Screens
15. **Business Plan** - Auto-generated business plan
16. **Onboarding** - 4-step business setup wizard
17. **Sign In/Up** - Authentication
18. **Landing** - Welcome screen

---

## 🔑 Features Implemented

### ✅ 1. Book-Based Onboarding
- 4-step wizard with book selection
- Tabs show/hide based on book ownership
- 6 DreamBig books + "No Book" option
- Book unlocks stored in database

### ✅ 2. Document Automation System
- Invoices with auto-numbering (INV-0001)
- Receipts with auto-numbering (REC-0001)
- Quotations with auto-numbering (QUO-0001)
- Auto-filled from business profile
- Status tracking (draft, sent, paid, cancelled)
- Professional layouts

### ✅ 3. Financial Tracking Engine
- Sales and expense tracking
- Category management
- Automatic profit calculation
- Daily/weekly/monthly summaries
- Profit & Loss overview
- Cashflow visibility
- Clear "Am I making money?" answer

### ✅ 4. Business Viability Engine
- Break-even calculator
- Profit timeline projections
- Risk assessment (Viable/Risky/Not Viable)
- **NEW:** Best-case/worst-case scenarios (+20%/-20%)
- **NEW:** Inflation awareness and warnings
- Manual exchange rate input

### ✅ 5. Smart Business Dashboard
- Today's sales, expenses, profit
- Monthly summary
- Cash position indicator
- Top categories visualization
- **NEW:** Alerts with book chapter references
- Animated metric cards
- Real-time status indicators

### ✅ 6. Mistake Prevention System
- Detects pricing too low
- Warns about overspending
- Cash depletion alerts
- Low profit margin warnings
- No sales warnings
- **NEW:** Book chapter references (e.g., "See Chapter 4: Pricing for Profit")
- Clear consequences and alternatives

### ✅ 7. Products Management
- Product catalog with cost/selling prices
- Quantity tracking
- Category management
- Active/inactive status
- Profit margin calculations

### ✅ 8. Customers & Suppliers
- Customer management with contact details
- Supplier management with payment terms
- Purchase history tracking
- Notes and relationship data

### ✅ 9. Advanced Financial Tools
- Budget management (weekly, monthly, quarterly, yearly)
- Budget vs actual tracking
- Cashflow projections by month
- Tax rate management (VAT, sales tax, income tax)
- Default tax selection

### ✅ 10. Employee Management
- Employee profiles
- Salary tracking
- Hire date tracking
- Role and position management
- Active/inactive status

### ✅ 11. Project Management
- Project creation and tracking
- Status management (planning, active, on hold, completed, cancelled)
- Progress tracking (0-100%)
- Budget management per project
- Project tasks with priorities

### ✅ 12. Reports & Analytics
- Profit & Loss reports
- Category breakdown analysis
- Invoice status tracking
- Outstanding invoices tracking
- Period filtering (today, week, month, quarter, year)
- Export functionality (summary and detailed)

### ✅ 13. Business Plan Generator
- Auto-generated 9-section business plans
- Based on live business data
- Downloadable/shareable
- Professional formatting

### ✅ 14. Multi-Currency Support
- USD and ZWL currencies
- Exchange rate tracking
- Manual exchange rate updates
- **NEW:** Inflation rate tracking
- Currency selection per transaction

### ✅ 15. Deep Book Integration
- Books tracked in database
- Book selection in onboarding
- **NEW:** Smart tab visibility per book
- **NEW:** Chapter references in alerts (40+ chapters mapped)
- Book metadata (colors, unlocks)

---

## 🎨 Design Features

### Mobile-First
- Android-first optimization
- Touch-optimized controls
- Native mobile feel
- SafeAreaView handling
- Beautiful, non-generic UI

### Theme System
- Light/Dark theme support
- Consistent color palette
- Theme context provider
- Smooth theme transitions

### Animations
- Animated metric cards
- Smooth transitions
- Micro-interactions
- Loading states

---

## 🔐 Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Policies for SELECT, INSERT, UPDATE, DELETE

### Authentication
- Supabase Auth integration
- Email/password authentication
- Email confirmation
- Super admin support (nashiezw@gmail.com)

### User Profile Management
- Automatic profile creation trigger
- Profile sync functions
- Foreign key constraints
- Data integrity checks

---

## 🚨 Common Issues & Solutions

### Issue 1: "User profile does not exist in database"

**Solution:**
1. Make sure you ran `database/create_user_profile_trigger.sql`
2. In Supabase SQL Editor (with "No limit" selected), run:
```sql
SELECT public.sync_existing_users();
```

### Issue 2: "Foreign key constraint violation"

**Solution:**
This means the user profile wasn't created. Run:
```sql
SELECT public.sync_user_profile('YOUR_USER_ID_HERE'::UUID);
```
Replace `YOUR_USER_ID_HERE` with your actual user ID from auth.users.

### Issue 3: Tables not found

**Solution:**
Make sure you ran `database/COMPLETE_SCHEMA.sql` with "No limit" selected.

### Issue 4: Super admin not working

**Solution:**
After creating the user account, run:
```sql
UPDATE public.users 
SET is_super_admin = true 
WHERE email = 'nashiezw@gmail.com';
```

---

## 📊 Database Structure

### Core Tables
- **users** - User profiles (linked to auth.users)
- **business_profiles** - Business information (1 per user)

### Transaction Tables
- **transactions** - Sales and expenses
- **documents** - Invoices, receipts, quotations
- **exchange_rates** - USD/ZWL rates and inflation

### Master Data Tables
- **products** - Product catalog
- **customers** - Customer management
- **suppliers** - Supplier management

### Planning Tables
- **budgets** - Budget templates
- **cashflow_projections** - Cashflow planning
- **tax_rates** - Tax rate configuration

### HR & Projects
- **employees** - Employee management
- **projects** - Project tracking
- **project_tasks** - Project task management

---

## 🎯 Testing the App

### Test Flow 1: New User Onboarding
1. Sign up with a new email
2. Complete 4-step onboarding
3. Select a DreamBig book (e.g., "Start Your Business")
4. Verify dashboard loads
5. Check that only relevant tabs are visible

### Test Flow 2: Financial Tracking
1. Go to Finances tab
2. Add a sale (e.g., $100, "Product Sale")
3. Add an expense (e.g., $30, "Supplies")
4. Go back to Dashboard
5. Verify metrics show: Sales $100, Expenses $30, Profit $70

### Test Flow 3: Document Creation
1. Go to Documents tab
2. Create a new invoice
3. Add items, customer info
4. Save and verify document number (INV-0001)

### Test Flow 4: Viability Calculator
1. Go to Calculator tab
2. Enter:
   - Capital: $1000
   - Monthly Expenses: $200
   - Price per Unit: $10
   - Cost per Unit: $5
   - Expected Sales: 50 units/month
3. Click Calculate
4. Verify scenarios show optimistic, realistic, pessimistic

### Test Flow 5: Book-Based Features
1. Go to Settings
2. Change business profile to different book
3. Go to tabs
4. Verify tabs change based on book selection

---

## 🔄 App Architecture

### State Management
- **@nkzw/create-context-hook** for business state
- **React Context** for auth and theme
- **Local state (useState)** for component-level data

### Data Flow
1. User authenticates → AuthContext
2. User profile created → users table
3. Business profile created → business_profiles table
4. All other data linked to user_id and business_id

### Provider Hierarchy
```
App
└── QueryClientProvider (react-query)
    └── AuthContext
        └── ThemeContext
            └── ProviderContext
                └── BusinessContext
                    └── App Content
```

---

## 📦 Dependencies

### Core
- expo (SDK 54+)
- react-native
- expo-router (file-based routing)
- @supabase/supabase-js

### UI & Icons
- lucide-react-native (icons)
- expo-linear-gradient (gradients)
- react-native-safe-area-context

### State & Data
- @nkzw/create-context-hook
- @tanstack/react-query

---

## 🎉 Success Criteria

Your app is working correctly if:

✅ Sign up creates a user profile automatically  
✅ Onboarding completes without errors  
✅ Dashboard shows metrics  
✅ Transactions can be added  
✅ Documents can be created  
✅ Tabs change based on book selection  
✅ Alerts show book chapter references  
✅ Calculator shows 3 scenarios  
✅ All CRUD operations work  
✅ No console errors  

---

## 🚀 Ready to Use!

Your DreamBig Business OS is now complete and ready for users. The app delivers on the core promise:

> "DreamBig didn't just teach me business—they gave me the tools to run it."

### What Makes This Special

1. **Book-First Design** - Features unlock based on user's book
2. **Context-Aware Guidance** - Alerts reference specific book chapters
3. **Mistake Prevention** - Proactive warnings before problems occur
4. **Zimbabwean-First** - Built for USD/ZWL volatility and inflation
5. **Execution-Focused** - Tools over content
6. **Smart Simplicity** - Features appear when needed

---

## 📞 Support

If you encounter issues:

1. Check the Common Issues section above
2. Verify all SQL scripts ran successfully
3. Check Supabase logs for errors
4. Verify environment variables are correct

---

**Built with ❤️ for DreamBig customers**  
**Last Updated: December 2025**
