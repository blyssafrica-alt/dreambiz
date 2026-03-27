# Supplier Network Upgrade – Implementation Plan

## Scope (priority order)

1. **Messaging + RFQ** – Conversations exist; add RFQ + quotes, inbox entry, notifications
2. **Trust Score + Verification** – Expand RPC, verification_tier, ranking, admin controls
3. **Product Standardization** – sku, unit_type, MOQ, lead_time_days, price_type, tier_prices, Compare UI
4. **Complaint/Dispute** – supplier_response, supplier_evidence_urls, status supplier_response, admin warn/suspend/ban + audit
5. **Category governance** – subcategory status pending/approved, admin approve/merge
6. **Buyer retention** – saved supplier, follow supplier, saved product, recently viewed; notify followers
7. **Response SLA** – track first reply time, badges, ranking filters

## Where things live (existing)

| Area | Location |
|------|----------|
| Marketplace browse | `app/suppliers-marketplace/index.tsx`, `[supplierId].tsx` |
| Conversation (buyer) | `app/suppliers-marketplace/conversation/[supplierId].tsx` |
| Supplier inbox | `app/supplier/inbox.tsx`, `inbox/[conversationId].tsx` |
| Products | `app/supplier/products/*`, `suppliers-marketplace/product/[productId].tsx` |
| Admin suppliers | `app/admin/suppliers/*`, `supplier-applications/*`, `supplier-complaints.tsx`, `supplier-categories.tsx` |
| Schema | `database/supplier_marketplace_schema.sql` |
| Types | `types/supplier-marketplace.ts` |
| Notifications | `lib/notifications.ts` |

## Feature flags (to add/use)

- **Buyer:** supplier-marketplace, supplier-storefront, supplier-rfq, supplier-messaging, supplier-compare, supplier-follow
- **Supplier:** supplier-sell, supplier-inbox, supplier-rfq-respond, supplier-analytics

## DB migration (supplier_network_upgrade.sql) – DONE

- **New tables:** supplier_rfqs, supplier_quotes, buyer_saved_suppliers, buyer_followed_suppliers, buyer_saved_products, buyer_recently_viewed_products
- **Alter:** supplier_marketplace_profiles (verification_tier, avg_response_hours), supplier_marketplace_products (sku, unit_type, lead_time_days, price_type, tier_prices), supplier_marketplace_complaints (supplier_response, supplier_evidence_urls, supplier_responded_at, status + supplier_response), supplier_marketplace_subcategories (status), supplier_conversations (first_supplier_reply_at)
- **RPC:** get_supplier_trust_score (extended), log_supplier_admin_action; triggers: first_supplier_reply_at, set_rfq_quoted_on_quote
- **RLS:** RFQs, quotes, buyer retention tables; supplier read/update complaints; subcategories read approved or own pending

## Implementation order

1. **Database** – Run supplier_network_upgrade.sql (migration file)
2. **Types + hooks** – RFQ, quotes, saved/follow/recent, trust score
3. **UI – Messaging + RFQ** – RFQ form on profile/product, supplier RFQ list + quote form, notifications
4. **UI – Trust + verification** – Badges in lists, ranking by trust_score, admin set verification_tier
5. **UI – Products** – New fields in create/edit, Compare suppliers page
6. **Complaints** – Supplier response flow, admin resolve with action + audit
7. **Subcategories** – status, admin approve/merge UI
8. **Buyer retention** – Save/follow buttons, saved/recent pages, follower notifications
9. **Response SLA** – first_supplier_reply_at, badge "Replies within X hours", filter
10. **Admin** – RFQ monitor, dispute view, verification mgmt, subcategory tool, featured controls
11. **Translations** – en/sn/nd for all new strings
12. **Testing checklist + seed data**
