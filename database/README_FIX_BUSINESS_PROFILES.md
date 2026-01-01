# Business Profile Error Fix Guide

## Problem Overview

You're experiencing these errors when creating a business during onboarding:
- ❌ Error code: **P0003**
- ❌ Error message: **"query returned more than one row"**
- ❌ HTTP Status: **400** or **500**

These errors occur because:
1. The database function is missing or outdated
2. There are duplicate business profiles in the database
3. The old function doesn't support multiple businesses per user properly

## Solution

Run the comprehensive fix script that will:
✅ Clean up all duplicate business profiles  
✅ Remove old/conflicting functions  
✅ Create new RPC functions that support multiple businesses  
✅ Set up proper subscription plan limits  
✅ Prevent future "query returned more than one row" errors  

## How to Fix (Step-by-Step)

### Step 1: Open Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **"New Query"** button

### Step 2: Select "No limit"

⚠️ **IMPORTANT**: Before running the script:
- Look for the dropdown at the top of the SQL editor
- Change it from the default to **"No limit"**
- This ensures the entire script runs without timeouts

### Step 3: Copy and Run the Script

1. Open the file: `database/COMPLETE_FIX_BUSINESS_PROFILES.sql`
2. Copy the **ENTIRE** contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl/Cmd + Enter)

### Step 4: Wait for Completion

You'll see progress messages like:
```
🧹 Starting cleanup...
✅ Cleaned up old functions and constraints
🔍 Checking for duplicate business profiles...
✅ Removed duplicate business profiles
🔧 Creating new RPC function...
✅ Created function: create_business_profile
✅ Created function: update_business_profile
✅ All RPC functions created successfully
🎉 Setup complete!
```

### Step 5: Refresh Your App

1. Close and reopen your app
2. Or refresh your browser if using web version
3. Try creating a business again
4. ✅ The error should be gone!

## What This Fix Does

### 1. Cleanup Phase
- Removes all old/conflicting database functions
- Removes duplicate business profiles (keeps most recent)
- Removes unique constraint that prevented multiple businesses

### 2. Function Creation Phase
- Creates `create_business_profile` - Creates new businesses with plan limits
- Creates `update_business_profile` - Updates existing businesses
- Creates `get_user_business_limit` - Checks subscription limits

### 3. Verification Phase
- Verifies all functions are created correctly
- Checks for remaining duplicates
- Confirms multi-business support is enabled

## Features After Fix

✅ **Multiple Businesses per User**
- Free plan: 1 business
- Paid plans: Multiple businesses (based on plan limits)
- No more "duplicate" errors

✅ **Proper Error Handling**
- Clear error messages
- Specific error codes (P0001, P0002, etc.)
- Business limit enforcement

✅ **No More "Query Returned More Than One Row"**
- Functions use `LIMIT 1` to prevent this error
- Always returns exactly one business
- Proper duplicate cleanup

## Troubleshooting

### If you still see errors after running the script:

**Error: "Function does not exist"**
- Solution: Make sure you selected "No limit" before running
- Solution: Copy the ENTIRE script, not just part of it

**Error: "Permission denied"**
- Solution: Make sure you're logged in as the project owner
- Solution: Check your role has SQL Editor permissions

**Error: "Syntax error"**
- Solution: Make sure you copied the complete script
- Solution: Don't modify the script

### Still having issues?

1. Check the console logs in your app for detailed error messages
2. Try signing out and signing in again
3. Contact support with:
   - The error message
   - The error code
   - When the error occurs (during onboarding, creating 2nd business, etc.)

## Database Schema Changes

This fix makes these changes to your database:

### Tables Modified
- `business_profiles` - Removed unique constraint on `user_id`

### Functions Created/Updated
- `create_business_profile(...)` - Main function for creating businesses
- `update_business_profile(...)` - Function for updating businesses
- `get_user_business_limit(user_id)` - Helper function for subscription limits

### Functions Removed
- Old `create_or_update_business_profile` (conflicted with new system)
- Old `safe_upsert_business_profile` (no longer needed)
- Any other old business profile functions

## Prevention

To prevent this issue in the future:
1. Keep your database schema up to date
2. Run this fix script if you see similar errors
3. Don't manually edit business_profiles table
4. Use the app's UI to manage businesses

## Success Indicators

You'll know the fix worked when:
- ✅ You can create a business during onboarding
- ✅ No "P0003" or "query returned more than one row" errors
- ✅ You can create multiple businesses (if on a paid plan)
- ✅ The app loads without database errors

---

**Last Updated**: 2026-01-01  
**Script Version**: 2.0 (Complete Fix)  
**Compatibility**: Expo SDK 54+, Supabase PostgreSQL
