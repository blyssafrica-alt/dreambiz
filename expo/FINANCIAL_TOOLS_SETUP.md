# Financial Tools Feature Setup Guide

## Overview
The Financial Tools feature has been fully integrated into the premium/subscription system. This guide explains how to set it up and manage it.

## Features Included
1. **Break-Even Calculator** - Calculate break-even point
2. **Pricing Calculator** - Determine optimal pricing
3. **Profit Margin Analyzer** - Analyze profit margins
4. **Business Markup Calculator** - Calculate markup percentages
5. **Business ROI Calculator** - Calculate return on investment
6. **Profit & Loss Statement** - Monthly and yearly P&L reports
7. **Cash Flow Statement** - Track cash inflows and outflows
8. **Balance Sheet** - Statement of financial position

## Database Setup

### Step 1: Run the Migration
Execute the following SQL file in your Supabase SQL Editor:
```sql
database/add_financial_tools_feature.sql
```

This will:
- Add the `financial-tools` feature to `feature_config` table
- Set it as enabled by default (but can be disabled by admin)
- Set it as free by default (admin can make it premium)
- Configure proper visibility and access settings

### Step 2: Enable Real-Time (if not already enabled)
1. Go to Supabase Dashboard → Database → Replication
2. Ensure `feature_config` table is enabled for real-time
3. This ensures changes sync instantly across all devices

## Admin Configuration

### Making Financial Tools Premium
1. Go to **Admin → Features**
2. Find "Financial Tools" in the list
3. Click "Make Premium" or "Edit Premium Settings"
4. Select which subscription plans should include this feature
5. Save changes

### Assigning to Subscription Plans
1. Go to **Admin → Premium → Plans**
2. Edit or create a subscription plan
3. In the "Features Included" section, select "Financial Tools"
4. Save the plan

## Feature Visibility

The feature is controlled by:
- **Feature Config**: Admin can enable/disable globally
- **Premium Status**: Can be made premium and assigned to specific plans
- **User Subscription**: Only users with active premium subscriptions (or assigned plans) can access
- **Real-Time Sync**: Changes reflect instantly across all devices

## User Experience

### For Free Users
- If feature is free: Full access to all calculators and statements
- If feature is premium: Feature is hidden from menu

### For Premium Users
- Full access to all calculators and statements
- All data is synced in real-time across devices
- Calculations use actual business data (transactions, products, etc.)

## Integration Points

### Data Sources
- **Transactions**: Used for P&L, Cash Flow, and Balance Sheet
- **Products**: Used for pricing and markup calculations
- **Business Profile**: Used for currency and capital information
- **Documents**: Used for accounts receivable in Balance Sheet

### Real-Time Sync
- Feature visibility changes sync instantly
- Subscription status changes sync instantly
- All calculations use live data from database

## Testing Checklist

- [ ] Feature appears in More menu when enabled
- [ ] Feature is hidden when disabled by admin
- [ ] Premium users can access all tools
- [ ] Free users see premium gate if feature is premium
- [ ] Calculations pull from real transaction data
- [ ] Changes to feature config sync across devices
- [ ] Changes to subscription plans sync across devices
- [ ] All calculators work correctly
- [ ] All financial statements generate correctly

## Troubleshooting

### Feature Not Showing
1. Check if feature is enabled in Admin → Features
2. Check if user has required subscription (if premium)
3. Check real-time is enabled for `feature_config` table

### Calculations Not Working
1. Ensure user has transactions/data in the system
2. Check business profile is set up correctly
3. Verify currency settings match

### Real-Time Not Syncing
1. Verify real-time is enabled in Supabase Dashboard
2. Check network connectivity
3. Verify user is authenticated

## Support

For issues or questions, check:
- Feature Context: `contexts/FeatureContext.tsx`
- Premium Context: `contexts/PremiumContext.tsx`
- Database Schema: `database/add_financial_tools_feature.sql`

