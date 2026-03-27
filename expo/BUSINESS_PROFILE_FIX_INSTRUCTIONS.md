# Business Profile Error Fix Instructions

## Problem Summary
You're experiencing errors when creating a business profile during onboarding:
- "query returned more than one row"
- "Failed to create business profile"
- Multiple duplicate business profiles

## Root Cause
1. The database RPC function `create_business_profile` doesn't exist or is incorrectly configured
2. Duplicate business profiles exist in the database
3. System was using old approach that couldn't handle multiple businesses per user

## Solution

### Step 1: Run the Database Fix Script

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **"New Query"**
4. **IMPORTANT**: In the dropdown at the top right, select **"No limit"** (NOT "1000 rows")
5. Open the file: `database/FIX_BUSINESS_PROFILES_COMPLETE.sql`
6. Copy the **entire contents** of the file
7. Paste into the SQL Editor
8. Click **"Run"**
9. Wait for the script to complete (you should see success messages)

### Step 2: Verify the Fix

After running the script, you should see these messages:
- ✅ Both RPC functions created successfully
- ✅ Unique constraint removed (multi-business support enabled)
- ✅ No duplicate business profiles found
- 🎉 Setup complete!

### Step 3: Test the App

1. **Refresh your app** (close and reopen or hard refresh)
2. Try creating a business during onboarding
3. The error should be resolved

## What Was Fixed

1. **Database Functions**: Created proper `create_business_profile` and `update_business_profile` RPC functions
2. **Duplicate Cleanup**: Removed all duplicate business profiles (kept only the most recent one per user)
3. **Multi-Business Support**: Removed incorrect unique constraint to allow multiple businesses per user (based on their subscription plan)
4. **Error Handling**: Improved error messages in the app to guide users when database issues occur

## How It Works Now

### During Onboarding
- User fills in business details
- App calls `create_business_profile` RPC function
- Database checks subscription plan limits (Free plan = 1 business)
- Creates new business profile
- User proceeds to the app

### After Login
- Users can create additional businesses (if their plan allows)
- Each business is tracked separately
- App automatically selects the most recent business

## If You Still Have Issues

### Error: "Database setup required"
- You didn't run the SQL script yet
- Or you selected "1000 rows" instead of "No limit"
- Solution: Follow Step 1 again carefully

### Error: "Business limit reached"
- You're on the Free plan (1 business allowed)
- You already have a business profile
- Solution: This is correct behavior - upgrade plan or use existing business

### Error: "User profile not found"
- Rare issue with user authentication
- Solution: Sign out and sign in again

## Technical Details

### Files Changed
1. `database/FIX_BUSINESS_PROFILES_COMPLETE.sql` - Complete database fix script
2. `contexts/BusinessContext.tsx` - Improved error handling
3. No other files need to be changed

### Database Changes
- Created `create_business_profile()` function
- Created `update_business_profile()` function
- Removed `business_profiles_user_id_unique` constraint
- Cleaned up duplicate records

### Features Enabled
- ✅ One business during onboarding (Free plan)
- ✅ Multiple businesses per user (Premium plans)
- ✅ Proper subscription plan enforcement
- ✅ Clear error messages
- ✅ No more "query returned more than one row" errors

## Support

If you continue to experience issues after following these instructions:
1. Check the Supabase SQL Editor logs for any error messages
2. Verify the "No limit" option was selected
3. Make sure the entire SQL script was copied (check for any truncation)
4. Try running the script again

The fix is comprehensive and should resolve all business profile creation issues permanently.
