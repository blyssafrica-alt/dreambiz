# Cross-Device Sync Implementation Guide

## Overview
All features that need to sync across devices are now stored in the backend (Supabase) and fetched from there. This ensures consistency across all user devices.

## ✅ What's Already Syncing

### 1. **Images & Media (Supabase Storage)**
- ✅ **Ad Images**: Stored in `ad_images` bucket, URLs in `advertisements.image_url`
- ✅ **Product Images**: Stored in `product_images` bucket, URLs array in `platform_products.images`
- ✅ **Book Documents**: Stored in `book-documents` bucket, URLs in `books.document_file_url`
- ✅ **Book Cover Images**: Stored in `book_covers` bucket, URLs in `books.cover_image`
- ⚠️ **Business Logos**: Should be stored in `business_logos` bucket (needs implementation)

### 2. **Data Tables (Supabase Database)**
- ✅ **Books**: All book data in `books` table
- ✅ **Advertisements**: All ad data in `advertisements` table
- ✅ **Products**: All product data in `platform_products` table
- ✅ **Document Templates**: All templates in `document_templates` table
- ✅ **Alert Rules**: All rules in `alert_rules` table
- ✅ **Premium Plans**: All plans in `subscription_plans` table
- ✅ **User Subscriptions**: All subscriptions in `user_subscriptions` table
- ✅ **Payment Methods**: All methods in `payment_methods` table
- ✅ **Business Profiles**: All business data in `business_profiles` table
- ✅ **Transactions**: All transactions in `transactions` table
- ✅ **Documents**: All documents in `documents` table

### 3. **Contexts Fetching from Backend**
- ✅ `AdContext`: Fetches from `advertisements` table
- ✅ `ProductContext`: Fetches from `platform_products` table
- ✅ `BusinessContext`: Fetches from `business_profiles`, `transactions`, `documents` tables
- ✅ `FeatureContext`: Fetches from `feature_config` table
- ✅ `PremiumContext`: Fetches from subscription tables

## 🔧 Setup Required

### 1. Create Storage Buckets
Create these buckets in Supabase Storage UI:
- `book_covers` (public read)
- `book-documents` (public read)
- `ad_images` (public read)
- `product_images` (public read)
- `business_logos` (public read)

### 2. Run SQL Migrations
```sql
-- Run these in order:
1. database/ensure_storage_sync.sql
2. database/setup_storage_buckets.sql (for policies)
```

### 3. Verify All Images Use Storage URLs
- ✅ Ads: Already using storage URLs
- ✅ Products: Already using storage URLs
- ✅ Books: Cover images now upload to storage
- ⚠️ Business Logos: Need to implement storage upload

## 📋 Checklist

- [x] All images stored in Supabase Storage (not base64)
- [x] All data tables in Supabase Database
- [x] All contexts fetch from backend
- [x] Book cover images upload to storage
- [x] Product images upload to storage
- [x] Ad images upload to storage
- [ ] Business logos upload to storage (TODO)
- [x] Document templates in database
- [x] Alert rules in database
- [x] Premium plans in database
- [x] All admin features store in backend

## 🚀 Benefits

1. **Cross-Device Sync**: All data syncs automatically across devices
2. **Centralized Management**: Admin can manage everything from one place
3. **Scalability**: Storage handles large files efficiently
4. **Performance**: URLs load faster than base64
5. **Consistency**: Single source of truth in backend

## 📝 Notes

- AsyncStorage is only used for:
  - Theme preference (user-specific, device-specific)
  - Ad session ID (temporary, device-specific)
  - These don't need cross-device sync

- All business data, admin features, and media are stored in Supabase for cross-device sync.

