# Supplier Network – End-to-end verification checklist

Use this to confirm flows work after deploying schema and app.

## Prerequisites

1. **Database**: Run `database/supplier_marketplace_schema.sql` in Supabase (after existing migrations: customers/suppliers, premium, roles).
2. **Storage**: Create bucket `supplier_assets` in Supabase Storage (for become-a-supplier and My Store logos/covers). Optional: ensure `payment_proofs` has path `supplier_subscription_proofs/` and `supplier_complaint_evidence/` allowed if you use strict policies.
3. **Feature flags**: Schema seeds 12 supplier features in `feature_config` (category `suppliers`). Ensure they exist and are enabled for the right plans/users.
4. **Admin**: At least one user has `user_is_admin(id) = true` (e.g. super admin) to approve suppliers and verify subscriptions.

## Flows to test

### 1. More → Suppliers

- **Find Suppliers** → `/suppliers-marketplace` (requires `supplier-marketplace` or permission).
- **My Suppliers** → `/(tabs)/suppliers` (requires `supplier-section` or `suppliers`).
- **Become a Supplier** → `/suppliers-marketplace/become-a-supplier`.
- **Supplier Store** → `/suppliers-marketplace`.
- **Supplier Dashboard** → `/supplier` (requires `supplier-sell`; redirects to become-a-supplier if no approved profile).

### 2. Marketplace

- Open `/suppliers-marketplace`: list of approved suppliers.
- Tap a supplier → storefront `[supplierId]`: profile, contact (Call/Email/WhatsApp), trust score, reviews, products, “Add to My Suppliers”, “Report a problem”.
- Tap a product → `/suppliers-marketplace/product/[productId]`: product detail (and `product_view` event).
- **Profile view** and **contact_click** events are recorded when viewing storefront and tapping contact.

### 3. Become a supplier

- Submit form with business name, email, location, description, optional logo/cover.
- Submits to `supplier_marketplace_profiles` with `status: 'pending'`.
- If already applied: approved → link to dashboard; pending → “under review”; declined/suspended → message.

### 4. Admin – Supplier applications

- **Admin Dashboard** → **Supplier Applications** → `/admin/suppliers` (requires `supplier-admin`).
- **Quick links**: Categories, Plans, Subscriptions, Reviews, Complaints (same admin section).
- List by status (pending/approved/declined/suspended/all). Tap row → `/admin/suppliers/[id]`.
- **Detail**: Admin notes (save), **Approve** / **Decline** / **Suspend** (and “Approve again” if declined/suspended). Audit log + push to supplier’s `user_id` if send-notification allows admin→user.

### 5. Supplier dashboard (approved supplier)

- **Supplier Dashboard** → `/supplier` (only with approved profile).
- **My Store** → edit profile (branding, business, location, contact).
- **My Products** → list, add, edit, **Publish** / **Unpublish** (publish uses `supplier_can_publish`).
- **Subscription** → list plans, upload proof, submit; status pending until admin verifies.
- **Ads** → list linked ads, create ad (inserts `advertisements` + `supplier_ads`).
- **Analytics** → event counts (profile_view, product_view, contact_*) for 7/30 days.
- **Subcategories** → placeholder.

### 6. Admin – Subscriptions, Reviews, Complaints, Categories, Plans

- **Subscriptions** → filter pending/active/all; **Verify & activate** (sets active, expires_at) or **Cancel**; optional notification to supplier.
- **Reviews** → filter all/visible/hidden; **Hide** / **Show**.
- **Complaints** → filter by status; **Mark in review**, **Resolve**, **Dismiss**; view evidence links.
- **Categories** → CRUD `supplier_marketplace_categories` (name, slug, description, display_order, is_active).
- **Plans** → CRUD `supplier_subscription_plans` (name, price, duration_days, product_limit, etc.); delete blocked if plan has subscriptions.

### 7. My Suppliers ↔ Marketplace

- From storefront: **Add to My Suppliers** → creates row in `suppliers` with `marketplace_supplier_id` (via `addSupplierFromMarketplace`).
- In **My Suppliers** (tabs): card shows “Marketplace” badge if `marketplaceSupplierId` set; detail has **View Supplier Store** → `/suppliers-marketplace/[marketplaceSupplierId]`.

### 8. Reviews and complaints

- **Reviews**: Storefront shows non-hidden reviews; signed-in user can **Write a review** / **Edit your review** (one per user per supplier). Admin can hide/show.
- **Complaints**: Signed-in user can **Report a problem** (subject, description, optional order ref, evidence images). Admin sees queue and can resolve/dismiss.

## Common issues

- **Suppliers section not visible in More**: Enable feature `supplier-section` or `supplier-marketplace` (and category `suppliers` in `feature_config`).
- **Supplier Dashboard says “Apply to become a supplier”**: User has no row in `supplier_marketplace_profiles` with `status = 'approved'`. Approve from Admin → Supplier Applications.
- **Cannot publish product**: `supplier_can_publish(profile_id)` is false (no active subscription or product limit reached). Create/verify a subscription and plan in Admin.
- **Ad create fails**: Check RLS on `advertisements` (user insert with `created_by = auth.uid()`, `status = 'pending'`) and `supplier_ads` (supplier can insert for own profile).
- **Notifications not received**: Edge function `send-notification` must allow admin to send to another user (e.g. `userId` when `user_is_admin(auth.uid())`).
