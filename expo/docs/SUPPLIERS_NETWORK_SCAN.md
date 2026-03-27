# Suppliers Network – Codebase Scan (Exact Paths)

## A) Exact paths for integration

### More tab screen
- **`app/(tabs)/more.tsx`** – Main More screen. Menu sections are a single array `menuSections`; **DreamBig Resources** is the section at index with `title: 'DreamBig Resources'`. Insert the new **Suppliers** section **immediately before** that section (i.e. before the object with `title: 'DreamBig Resources'`).

### Existing Suppliers (private / Operations)
- **`app/(tabs)/suppliers.tsx`** – Private “My Suppliers” list and detail. Uses `useBusiness()` → `suppliers`, `addSupplier`, `updateSupplier`, `deleteSupplier`. Renders list + detail modal; no tabs. Route: `/(tabs)/suppliers`.
- **`app/(tabs)/_layout.tsx`** – Tab layout; `suppliers` is a hidden tab: `<Tabs.Screen name="suppliers" options={{ href: null }} />`.
- **Context:** `contexts/BusinessContext.tsx` – Loads suppliers from `suppliers` table (by `user_id` + `business_id`), exposes `suppliers`, `addSupplier`, `updateSupplier`, `deleteSupplier`.
- **Types:** `types/business.ts` – `Supplier` interface (id, name, email, phone, address, contactPerson, notes, totalPurchases, lastPurchaseDate, paymentTerms, createdAt, updatedAt).
- **DB:** `database/add_customers_suppliers.sql` – Table `suppliers` (id, user_id, business_id, name, email, phone, address, contact_person, notes, total_purchases, last_purchase_date, payment_terms, created_at, updated_at). RLS: user can CRUD own rows (auth.uid() = user_id).

### Admin features management
- **`app/admin/features.tsx`** – Feature Management. Loads `feature_config`, `subscription_plans`; toggles enabled, is_premium, premium_plan_ids. Uses `useFeatures().refreshFeatures`. Route: `/admin/features`.
- **`app/admin/_layout.tsx`** – Registers Stack screens for all admin routes (features, products, ads, payment-verification, etc.). Add new supplier admin screens here.

### Ads flow
- **User-facing:** `app/my-ads.tsx` – List/create/edit ads; payment proof upload (image), reference, notes; status (pending/active). Uses `advertisements` table, `uploadBase64ToStorage` for proof. Route: `/my-ads`.
- **Context:** `contexts/AdContext.tsx` – Loads ads, filters by placement/targeting; `getAdsForLocation`, `trackImpression`, `trackClick`. Uses `advertisements`, `ad_sets`, etc.
- **Admin:** `app/admin/ads.tsx`, `app/admin/ad-settings.tsx`, `app/admin/ad-packages.tsx`, `app/admin/ad-campaigns.tsx`, `app/admin/ad-sets.tsx`, `app/admin/ad-analytics.tsx` – Full ad management.

### Payment flow (subscription / proof upload)
- **Subscription screen:** `app/subscription.tsx` – Lists `subscription_plans`, opens payment modal: `payment_methods`, reference, notes, proof image upload via `uploadBase64ToStorage` → `payment_proofs` bucket; submits to `subscription_payments` (or equivalent); admin verifies elsewhere.
- **Admin verification:** `app/admin/payment-verification.tsx` – Tabs: documents / subscriptions / books; approves/rejects payments; uses `subscription_payments`, `book_purchases`, etc. Calls `refreshAds()` after approval.
- **Upload helper:** `lib/upload-utils.ts` – `buildAssetFileName`, `getBase64FromAsset`, `uploadBase64ToStorage`.

### Feature gating
- **Context:** `contexts/FeatureContext.tsx` – Loads `feature_config`, `subscription_plans` (via usePremium); exposes `isFeatureVisible(featureId)`, `shouldShowAsTab(featureId)`, `enabledFeatureIds`, `refreshFeatures`. Logic: super admin bypass; then plan + premium + book/type/stage rules.
- **Backend check:** `lib/feature-access.ts` – `checkFeatureAccessBackend(userId, featureId)` calls Supabase RPC `user_has_feature_access(user_uuid, feature_id_param)`; hook `useFeatureAccessBackend(featureId)`.
- **DB:** `database/ensure_premium_features_working.sql` – Defines `user_has_feature_access`. Feature flags are rows in `feature_config` (feature_id, is_premium, premium_plan_ids, enabled, access, etc.).

### Employee permissions
- **Types:** `types/employee-permissions.ts` – `PermissionCode` union (e.g. `pos:view`, `products:view`, `documents:view`, `suppliers` not present; add e.g. `suppliers:view_marketplace` for marketplace browse).
- **Usage:** `app/(tabs)/more.tsx` – `hasPermission(required)` from `employeePermissions`; items use `disabled: isEmployee && !hasPermission([...])`. `app/(tabs)/_layout.tsx` – tab visibility uses `hasPermission` for finances, documents, pos, etc.

### Admin dashboard (quick links)
- **`app/admin/dashboard.tsx`** – Stat cards and quick action buttons that `router.push('/admin/...')` to features, product-categories, products, ad-settings, templates, budget-templates, alerts, books, payment-verification, users, premium, businesses, etc. Add Supplier Network quick actions and stats here.

### Auth / admin check
- **Frontend:** `contexts/AuthContext.tsx` – `useAuth()` → `user`, `isSuperAdmin`, `isAdmin`, `isModerator` (derived from profile.role / isSuperAdmin). `app/admin/_layout.tsx` – allows access if `isSuperAdmin || isAdmin || isModerator` (or employee-roles for business owners).
- **DB:** `database/add_user_roles.sql` – `is_super_admin()` returns `has_role('super_admin')`; `has_role(required_role)` uses `current_user_role()`. No `user_is_admin(uuid)` RPC yet; can add one that checks `users.role IN ('super_admin','admin','moderator')` or `is_super_admin()` for current user.

---

## Summary table

| Purpose | Exact path |
|--------|------------|
| More tab | `app/(tabs)/more.tsx` |
| Private Suppliers screen | `app/(tabs)/suppliers.tsx` |
| Tab layout (hide suppliers tab) | `app/(tabs)/_layout.tsx` |
| BusinessContext (suppliers state) | `contexts/BusinessContext.tsx` |
| Supplier type | `types/business.ts` (Supplier) |
| Suppliers table schema | `database/add_customers_suppliers.sql` |
| Admin features | `app/admin/features.tsx` |
| Admin layout (all admin routes) | `app/admin/_layout.tsx` |
| Admin dashboard | `app/admin/dashboard.tsx` |
| My Ads (user ads + proof) | `app/my-ads.tsx` |
| AdContext | `contexts/AdContext.tsx` |
| Subscription (plans + payment modal) | `app/subscription.tsx` |
| Payment verification (admin) | `app/admin/payment-verification.tsx` |
| Upload utils | `lib/upload-utils.ts` |
| FeatureContext | `contexts/FeatureContext.tsx` |
| Feature access backend | `lib/feature-access.ts` |
| user_has_feature_access RPC | `database/ensure_premium_features_working.sql` |
| Employee permissions types | `types/employee-permissions.ts` |
| Auth (admin flags) | `contexts/AuthContext.tsx` |
| is_super_admin / has_role | `database/add_user_roles.sql` |
