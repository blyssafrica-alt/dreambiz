# Suppliers Network – Minimal-Change Integration Plan

## 1. Data & backend (no change to existing private suppliers)

- Add new tables only: `supplier_marketplace_*`, `supplier_subscription_*`, `supplier_admin_audit_log`, `supplier_analytics_events`. No rename of `suppliers`.
- Extend `suppliers` with one nullable column: `marketplace_supplier_id UUID REFERENCES supplier_marketplace_profiles(id)`. Migration script adds column + index; RLS unchanged for existing policies.
- New RPCs: `user_is_admin(uuid)` (or use existing `is_super_admin()` + role where needed), `supplier_can_publish(supplier_profile_id)`, `get_supplier_trust_score(supplier_profile_id)`. Reuse `user_has_feature_access` for buyer/seller feature gating.

## 2. Feature flags (feature_config)

- Insert new rows in `feature_config` for: supplier-section, supplier-marketplace, supplier-storefront, supplier-reviews, supplier-complaints, supplier-search-products, supplier-sell, supplier-list-products, supplier-subcategories, supplier-ads, supplier-analytics, supplier-admin. Admin manages them like existing features (admin/features.tsx unchanged in pattern).

## 3. More tab (single, minimal edit)

- In `app/(tabs)/more.tsx`, in the `menuSections` array, **insert one new section object** immediately **before** the section whose `title === 'DreamBig Resources'`.
- New section title: `"Suppliers"`. Items: Find Suppliers (route marketplace home), My Suppliers (existing `/(tabs)/suppliers`), Become a Supplier (owner-only, route become-a-supplier), Supplier Store (marketplace home). Visibility: section visible if `isFeatureVisible('supplier-section') || isFeatureVisible('suppliers')`; Find Suppliers if `supplier-marketplace`; Become a Supplier if owner and `supplier-marketplace`; employees need permission for Find Suppliers (e.g. suppliers:view_marketplace when added).
- No change to DreamBig Resources or any other section.

## 4. Private Suppliers (extend, don’t duplicate)

- **Suppliers screen** (`app/(tabs)/suppliers.tsx`): Keep as single screen. Option A: add a small top tab or segmented control “My Suppliers | Find Suppliers” that either shows current list or navigates to marketplace home. Option B: keep as-is; “Find Suppliers” only from More. Prefer B for minimal change; “My Suppliers” stays here; “Add to My Suppliers” from marketplace will call BusinessContext.addSupplier (with optional link to marketplace profile) or a new method `linkMarketplaceSupplier(privateSupplierId, marketplaceSupplierId)` that only updates `marketplace_supplier_id` on existing `suppliers` row.
- **BusinessContext**: Extend `addSupplier` (or add `updateSupplierMarketplaceLink`) to accept optional `marketplace_supplier_id`; ensure DB column exists and is written. When loading suppliers, include `marketplace_supplier_id` in select and in `Supplier` type.
- **Supplier type** (`types/business.ts`): Add optional `marketplaceSupplierId?: string` to `Supplier`. List/detail in suppliers.tsx: show “Marketplace” badge and “View Supplier Store” when `marketplaceSupplierId` is set.

## 5. New routes (add only)

- **Marketplace:** `app/suppliers-marketplace/index.tsx`, `app/suppliers-marketplace/[supplierId].tsx`, `app/suppliers-marketplace/product/[productId].tsx`, `app/suppliers-marketplace/become-a-supplier.tsx`.
- **Supplier dashboard:** `app/supplier/_layout.tsx`, `app/supplier/index.tsx`, `app/supplier/store.tsx`, `app/supplier/products/index.tsx` (and new/edit if needed), `app/supplier/subcategories.tsx`, `app/supplier/subscription.tsx`, `app/supplier/ads.tsx`, `app/supplier/analytics.tsx`.
- **Admin:** `app/admin/suppliers/index.tsx`, `app/admin/suppliers/[id].tsx`, `app/admin/supplier-categories.tsx`, `app/admin/supplier-products.tsx`, `app/admin/supplier-reviews.tsx`, `app/admin/supplier-complaints.tsx`, `app/admin/supplier-subscription-plans.tsx`, `app/admin/supplier-subscriptions.tsx`. Optional: `app/admin/supplier-featured.tsx`.
- Register all in `app/admin/_layout.tsx` and, for supplier dashboard, add a layout under `app/supplier/`.

## 6. Hooks & data (new, no change to existing contexts)

- New hooks (e.g. under `hooks/` or next to marketplace): `useMarketplaceSuppliers`, `useMarketplaceProducts`, `useSupplierProfile`, `useSupplierProducts`, `useProduct`, `useCreateSupplierApplication`, `useAddToMySuppliers`, `useReviews`, `useCreateReview`, `useComplaints`, `useCreateComplaint`, `useSupplierSubscriptionStatus`. Use React Query where appropriate; Supabase client from `@/lib/supabase`. No changes to FeatureContext or PremiumContext internals; only call `isFeatureVisible` / `checkFeatureAccessBackend` from new code.

## 7. Ads & payments (reuse)

- **Supplier subscriptions:** New tables `supplier_subscription_plans`, `supplier_subscriptions`; flow mirrors app subscription: select plan → payment method + reference + proof upload → admin verification screen (new tab or new admin screen) → set status active and expires_at. Reuse `payment_methods`, same upload pattern as `app/subscription.tsx`.
- **Supplier ads:** New table `supplier_ads` (ad_id, supplier_id, product_id optional, placement). Supplier dashboard “Ads” creates a row linking to existing `advertisements` (or create ad with a type “supplier”). Reuse existing ad approval and placement logic; add placement keys for supplier marketplace home/profile/product. No duplicate ad creation UI; extend existing or add thin wrapper.

## 8. Access control (consistent with existing)

- **UI:** All new screens check `isFeatureVisible('...')` and, for employee, `hasPermission(['suppliers:view_marketplace'])` where applicable. “Become a Supplier” only for non-employee (owner). Supplier dashboard only if `supplier-sell` and user is owner of an approved supplier profile.
- **Backend:** RLS on all new tables: read approved/published for authenticated users with feature (or broad read and gate in app); write own profile/products for supplier owner; admin-only for status, featured, categories, moderation. Use `is_super_admin()` / role for admin; call `user_has_feature_access` in RPC where needed. Sensitive actions (publish product, create ad) call `supplier_can_publish(supplier_profile_id)`.

## 9. Order of implementation

1. DB migrations (tables, RLS, RPC, indexes); add `marketplace_supplier_id` to `suppliers`; seed feature_config rows and optional seed categories/plans.
2. More tab: add Suppliers section above DreamBig Resources.
3. Marketplace screens + hooks (home, storefront, product detail, become-a-supplier).
4. Supplier dashboard (store, products, subcategories, subscription, ads, analytics).
5. Admin screens (applications, categories, products, reviews, complaints, plans, subscriptions, audit log); payment verification for supplier subscriptions.
6. Integrate “Add to My Suppliers” and private supplier link (marketplace_supplier_id, badge, View Store).
7. Employee permission `suppliers:view_marketplace` + any role seeding; optional ads placement for supplier ads.

This keeps existing “My Suppliers” and all existing flows intact; adds a single new section in More and new routes/tables/hooks that follow existing patterns.
