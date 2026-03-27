# 📊 DreamBig Business OS - Complete Database Documentation

## 🗂️ Database Schema Overview

### Core Architecture

```
users (Authentication & Profiles)
├── business_profiles (1:1 relationship)
│   ├── transactions (1:many)
│   ├── documents (1:many)
│   ├── business_plans (1:many)
│   └── viability_calculations (1:many)
├── exchange_rates (1:many)
├── app_settings (1:1)
├── alerts (1:many)
└── user_books (many:many with books)
```

---

## 📋 Table Structures

### **users**
Primary authentication and profile table.

```sql
id                UUID PRIMARY KEY
email             TEXT UNIQUE NOT NULL
name              TEXT NOT NULL
password_hash     TEXT NOT NULL
is_super_admin    BOOLEAN DEFAULT FALSE
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

**Relationships:**
- 1:1 with business_profiles
- 1:1 with app_settings
- 1:many with transactions, documents, exchange_rates, alerts
- many:many with books (via user_books)

---

### **business_profiles**
Core business information for each user.

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users → UNIQUE
name        TEXT NOT NULL
type        TEXT (enum: retail, services, manufacturing, etc.)
stage       TEXT (enum: idea, running, growing)
location    TEXT NOT NULL
capital     DECIMAL(15,2) NOT NULL
currency    TEXT (enum: USD, ZWL)
owner       TEXT NOT NULL
phone       TEXT
email       TEXT
address     TEXT
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

**Business Types:**
- retail, services, manufacturing, agriculture
- restaurant, salon, construction, transport, other

**Business Stages:**
- idea, running, growing

---

### **transactions**
All sales and expenses tracking.

```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users
business_id   UUID REFERENCES business_profiles
type          TEXT (enum: sale, expense)
amount        DECIMAL(15,2) NOT NULL
currency      TEXT (enum: USD, ZWL)
description   TEXT NOT NULL
category      TEXT NOT NULL
date          DATE NOT NULL
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()
```

**Indexes:**
- user_id, business_id, date, type

**Categories (Dynamic):**
- Sales: Retail, Services, Online, etc.
- Expenses: Rent, Inventory, Salaries, Marketing, etc.

---

### **documents**
Invoices, receipts, and quotations.

```sql
id               UUID PRIMARY KEY
user_id          UUID REFERENCES users
business_id      UUID REFERENCES business_profiles
type             TEXT (enum: invoice, receipt, quotation)
document_number  TEXT NOT NULL (auto-generated)
customer_name    TEXT NOT NULL
customer_phone   TEXT
items            JSONB NOT NULL
subtotal         DECIMAL(15,2) NOT NULL
tax              DECIMAL(15,2)
total            DECIMAL(15,2) NOT NULL
currency         TEXT (enum: USD, ZWL)
date             DATE NOT NULL
notes            TEXT
created_at       TIMESTAMP DEFAULT NOW()
updated_at       TIMESTAMP DEFAULT NOW()
```

**Items Structure (JSONB):**
```json
[
  {
    "id": "uuid",
    "description": "Product/Service name",
    "quantity": 2,
    "unitPrice": 10.50,
    "total": 21.00
  }
]
```

**Document Number Format:**
- Invoices: `INV-0001`, `INV-0002`, ...
- Receipts: `REC-0001`, `REC-0002`, ...
- Quotations: `QUO-0001`, `QUO-0002`, ...

---

### **exchange_rates**
Historical USD to ZWL exchange rates.

```sql
id           UUID PRIMARY KEY
user_id      UUID REFERENCES users
usd_to_zwl   DECIMAL(15,4) NOT NULL
created_at   TIMESTAMP DEFAULT NOW()
```

**Note:** Each update creates a new record for historical tracking.

---

### **books**
DreamBig book catalog.

```sql
id           UUID PRIMARY KEY
title        TEXT NOT NULL
description  TEXT
category     TEXT NOT NULL
image_url    TEXT
features     JSONB DEFAULT []
created_at   TIMESTAMP DEFAULT NOW()
```

**Sample Books:**
1. Starting Your Business
2. Financial Management
3. Marketing & Sales
4. Business Growth

**Features (JSONB):**
```json
[
  "Business plan templates",
  "Registration guide",
  "Financial planning",
  "Market research"
]
```

---

### **user_books**
Junction table for books owned by users.

```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES users
book_id       UUID REFERENCES books
purchased_at  TIMESTAMP DEFAULT NOW()
access_code   TEXT
UNIQUE(user_id, book_id)
```

---

### **business_plans**
Generated business plans.

```sql
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES users
business_id             UUID REFERENCES business_profiles
title                   TEXT NOT NULL
executive_summary       TEXT
market_analysis         TEXT
financial_projections   JSONB
content                 JSONB
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()
```

---

### **viability_calculations**
Business viability assessments.

```sql
id                        UUID PRIMARY KEY
user_id                   UUID REFERENCES users
business_id               UUID REFERENCES business_profiles
capital                   DECIMAL(15,2) NOT NULL
monthly_expenses          DECIMAL(15,2) NOT NULL
price_per_unit            DECIMAL(15,2) NOT NULL
cost_per_unit             DECIMAL(15,2) NOT NULL
expected_sales_per_month  INTEGER NOT NULL
currency                  TEXT (enum: USD, ZWL)
break_even_units          INTEGER
break_even_revenue        DECIMAL(15,2)
monthly_profit            DECIMAL(15,2)
months_to_recover_capital DECIMAL(10,2)
verdict                   TEXT (enum: viable, risky, not-viable)
warnings                  JSONB DEFAULT []
profit_margin             DECIMAL(10,2)
created_at                TIMESTAMP DEFAULT NOW()
```

---

### **app_settings**
User-specific app preferences.

```sql
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES users → UNIQUE
theme                   TEXT (enum: light, dark) DEFAULT 'light'
notifications_enabled   BOOLEAN DEFAULT TRUE
currency_preference     TEXT (enum: USD, ZWL) DEFAULT 'USD'
language                TEXT DEFAULT 'en'
created_at              TIMESTAMP DEFAULT NOW()
updated_at              TIMESTAMP DEFAULT NOW()
```

---

### **alerts**
System-generated warnings and notifications.

```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users
type        TEXT (enum: warning, danger, info)
message     TEXT NOT NULL
action      TEXT
is_read     BOOLEAN DEFAULT FALSE
created_at  TIMESTAMP DEFAULT NOW()
```

**Alert Types:**
- **warning**: Low profit margin, cash running low
- **danger**: Expenses exceed sales, negative cash position
- **info**: Cost optimization suggestions

---

## 🔒 Security: Row Level Security (RLS)

### Overview
All tables have RLS enabled to ensure users can only access their own data.

### Policy Examples

**Users Table:**
```sql
SELECT: auth.uid() = id
UPDATE: auth.uid() = id
```

**Transactions Table:**
```sql
SELECT: auth.uid() = user_id
INSERT: auth.uid() = user_id
UPDATE: auth.uid() = user_id
DELETE: auth.uid() = user_id
```

**Books Table:**
```sql
SELECT: TRUE (public read)
```

---

## 📈 Analytics Views

### **monthly_sales_summary**
```sql
SELECT 
  user_id,
  business_id,
  month,
  currency,
  transaction_count,
  total_sales,
  average_sale
FROM monthly_sales_summary
WHERE user_id = auth.uid();
```

### **monthly_expenses_summary**
```sql
SELECT 
  user_id,
  business_id,
  month,
  currency,
  category,
  transaction_count,
  total_expenses
FROM monthly_expenses_summary
WHERE user_id = auth.uid();
```

### **business_health_dashboard**
```sql
SELECT 
  business_id,
  business_name,
  total_sales,
  total_expenses,
  net_profit,
  current_cash_position,
  total_transactions
FROM business_health_dashboard
WHERE user_id = auth.uid();
```

---

## 🚀 Performance Optimizations

### Indexes Created

1. **users**: email
2. **business_profiles**: user_id
3. **transactions**: user_id, business_id, date, type
4. **documents**: user_id, business_id, type
5. **exchange_rates**: user_id
6. **user_books**: user_id
7. **alerts**: user_id, is_read

### Query Optimization Tips

1. **Date Ranges**: Always filter by date first
   ```sql
   WHERE date >= '2024-01-01' AND date <= '2024-12-31'
   ```

2. **User Isolation**: RLS automatically filters by user_id
   ```sql
   SELECT * FROM transactions; -- Only returns user's data
   ```

3. **Ordering**: Use indexed columns
   ```sql
   ORDER BY date DESC, created_at DESC
   ```

---

## 🔄 Triggers & Automation

### **updated_at Trigger**
Automatically updates `updated_at` timestamp on row updates.

**Tables with trigger:**
- users
- business_profiles
- transactions
- documents
- business_plans
- app_settings

---

## 💾 Backup & Export

### Manual Backup
1. Supabase Dashboard → Database → Backups
2. Click "Create Backup"
3. Download when ready

### Automated Backups (Production)
- Daily automated backups (Pro plan)
- Point-in-time recovery
- 7-day retention

### CSV Export
1. Table Editor → Select Table
2. Three dots menu → Export to CSV

---

## 🔧 Maintenance

### Regular Tasks

1. **Monitor Storage**
   - Check database size monthly
   - Archive old transactions if needed

2. **Review Indexes**
   - Analyze slow queries
   - Add indexes for frequently queried columns

3. **Clean Old Data**
   ```sql
   -- Archive transactions older than 2 years
   DELETE FROM transactions 
   WHERE date < NOW() - INTERVAL '2 years';
   ```

4. **Review RLS Policies**
   - Audit access patterns
   - Update policies as needed

---

## 🐛 Debugging

### Check User's Data
```sql
-- See all user's transactions
SELECT * FROM transactions 
WHERE user_id = 'user-uuid-here'
ORDER BY date DESC;
```

### Find Missing Relationships
```sql
-- Transactions without business
SELECT t.* FROM transactions t
LEFT JOIN business_profiles b ON t.business_id = b.id
WHERE b.id IS NULL;
```

### Check RLS Policy
```sql
-- Test if user can access data
SELECT * FROM transactions WHERE id = 'transaction-uuid';
-- If empty and transaction exists, RLS is blocking
```

---

## 📊 Data Models

### Transaction Flow
```
User Sign Up
  → Create User Profile
  → (Optional) Complete Onboarding
    → Create Business Profile
      → Start Adding Transactions
      → Generate Documents
      → Calculate Viability
```

### Document Generation Flow
```
Create Document (Invoice/Receipt/Quotation)
  → Auto-generate Document Number
  → Calculate Totals
  → Store Items as JSONB
  → Link to Business Profile
  → Available for PDF Export
```

---

## 🎯 Best Practices

### Data Entry
1. **Always use transactions**: Wrap multi-table updates in transactions
2. **Validate before insert**: Check data in app before database insert
3. **Use appropriate data types**: DECIMAL for money, DATE for dates

### Query Patterns
1. **Batch operations**: Use array operations when possible
2. **Minimize round trips**: Fetch related data in single query
3. **Use views**: Leverage pre-built analytics views

### Security
1. **Never expose RLS**: Don't build admin features that bypass RLS
2. **Validate permissions**: Check in app logic too
3. **Audit logs**: Monitor suspicious activity

---

## 📞 Support Resources

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **SQL Reference**: PostgreSQL 14 syntax
- **RLS Guide**: [https://supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎉 Summary

Your DreamBig Business OS database includes:

✅ **11 tables** with complete schema
✅ **Row Level Security** on all tables
✅ **Optimized indexes** for performance
✅ **3 analytics views** for reporting
✅ **Automated timestamps** via triggers
✅ **Super admin account** pre-configured
✅ **Sample books** data included

**Total Database Objects:**
- 11 Tables
- 13 Indexes
- 20+ RLS Policies
- 3 Views
- 6 Triggers
- 1 Function

Ready for production! 🚀
