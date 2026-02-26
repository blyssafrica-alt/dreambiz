# Supplier Network Upgrade – Testing Checklist

## Prerequisites
- Run `database/supplier_marketplace_schema.sql`, then `supplier_applications.sql`, then `supplier_network_upgrade.sql`.
- Feature flags: ensure `supplier-marketplace`, `supplier-rfq`, `supplier-messaging`, `supplier-follow`, `supplier-inbox`, `supplier-rfq-respond` exist and are enabled as needed.
- At least one approved supplier profile and one buyer (user) for E2E tests.

---

## 1) Messaging + RFQ
- [ ] **Buyer:** From supplier profile, open “Message” → conversation created; send message; see it in thread.
- [ ] **Supplier:** Inbox shows conversation; reply; buyer sees reply. `first_supplier_reply_at` set on first reply.
- [ ] **Buyer:** From profile or product, “Request quote” → RFQ form (quantity, unit, delivery, needed_by, notes, attachments); submit.
- [ ] **Supplier:** Inbox/RFQ list shows new RFQ; respond with quote (unit_price, currency, lead_time_days, MOQ, terms, validity_days); submit. RFQ status becomes `quoted`.
- [ ] **Buyer:** Sees quote on RFQ; can accept/decline (if UI implemented).
- [ ] **Notifications:** New message, new RFQ, quote response trigger in-app (or push) notifications.

## 2) Trust score + verification
- [ ] **Profile:** `verification_tier` (basic/verified/premium/manufacturer/distributor) and `trust_score` (0–100) visible in admin and on profile/storefront.
- [ ] **Ranking:** Marketplace list sorts by trust_score (or offers sort by “Trust”).
- [ ] **Admin:** Can set verification_tier and featured on supplier profile; changes reflect in list and detail.
- [ ] **RPC:** `get_supplier_trust_score(profile_id)` returns value consistent with reviews, complaints, responsiveness, account age.

## 3) Product standardization
- [ ] **Product create/edit:** Fields sku, unit_type, MOQ (min_order_qty), lead_time_days, availability_status, price_type (fixed/negotiable), tier_prices (if UI added) save and display.
- [ ] **Compare suppliers:** “Compare” from category/product opens compare view for same category/subcategory (or product name); shows multiple suppliers/products.

## 4) Complaint lifecycle
- [ ] **Buyer:** Submits complaint (open).
- [ ] **Admin:** Puts complaint in_review; supplier can see complaint.
- [ ] **Supplier:** Submits supplier_response + supplier_evidence_urls; status becomes supplier_response.
- [ ] **Admin:** Resolves with resolved/dismissed; optional admin_action (warn/suspend/ban); entry in supplier_admin_audit_log.
- [ ] **Notifications:** User and supplier notified on status changes.

## 5) Category governance
- [ ] **Supplier:** Creates subcategory → status pending; visible only on their store (or hidden globally until approved).
- [ ] **Admin:** Subcategory list shows pending; approve/merge/rename; slug rules, no duplicates.
- [ ] **Public:** Only approved subcategories appear in global category browse (if applicable).

## 6) Buyer retention
- [ ] **Save supplier:** Button on profile; saved list (e.g. “Saved suppliers”) shows saved.
- [ ] **Follow supplier:** Follow button; “Following” list; (optional) notify followers when supplier publishes new product or promotion.
- [ ] **Save product:** Button on product; saved products list.
- [ ] **Recently viewed:** Product views recorded; “Recently viewed” list (e.g. last 20).

## 7) Response SLA
- [ ] **Data:** first_supplier_reply_at populated when supplier sends first message in conversation.
- [ ] **Badge:** “Replies within X hours” (or similar) on profile/list when avg_response_hours ≤ threshold.
- [ ] **Filter:** Marketplace or search can filter by “Fast response” (or similar).

## 8) Admin
- [ ] **RFQ monitoring:** List of RFQs (optional screen); filter by status/supplier.
- [ ] **Complaints/disputes:** Dispute view shows complaints with supplier_response; admin resolve + audit log.
- [ ] **Verification:** Set verification_tier and featured; audit log for changes.
- [ ] **Subcategories:** Pending list; approve/merge/rename.
- [ ] **Featured:** Featured suppliers/products controlled from admin; visible on marketplace.

## 9) RLS & security
- [ ] Buyer sees only own RFQs and quotes; supplier sees only RFQs for own profile.
- [ ] Buyer retention tables: user can only CRUD own rows.
- [ ] Complaints: buyer sees own; supplier sees complaints for their profile; admin sees all.
- [ ] Subcategories: approved visible to all; pending visible to profile owner (and admin).

## 10) Translations
- [ ] New strings (RFQ, quote, trust, verification, compare, follow, saved, recent, complaint response, etc.) in en/sn/nd; UI respects app language.
