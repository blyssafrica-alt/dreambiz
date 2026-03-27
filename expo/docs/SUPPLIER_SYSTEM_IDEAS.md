# Supplier system: differentiation & future ideas

## Menu differentiation (current)

| Item | Purpose | Route |
|------|---------|--------|
| **Find Suppliers** | Search and discover new suppliers on the marketplace. | `/suppliers-marketplace` |
| **My Supplier Stores** | Quick access to marketplace storefronts of suppliers you’ve already saved in My Suppliers. | `/suppliers-marketplace/my-stores` |
| **My Suppliers** | Your private supplier contacts (CRM-style list). | `/(tabs)/suppliers` |
| **Become a Supplier** | Apply to sell on the marketplace (step-by-step form). | `/suppliers-marketplace/become-a-supplier` |
| **Supplier Dashboard** | Manage your own store, products, subscription, ads (for approved suppliers). | `/supplier` |

So: **Find** = discover new; **My Supplier Stores** = your saved suppliers’ stores; **My Suppliers** = your contact list.

---

## Alternative ways to differentiate (if you change direction later)

- **Find Suppliers** – Keep as discovery (search, categories, filters).
- **Supplier Store** alternatives:
  - **Featured / trending** – Same route with `?featured=1` or a “Featured stores” tab.
  - **View my store** (suppliers only) – For approved suppliers, link to their own public storefront; hide or show different copy for non-suppliers.
  - **By category** – “Browse by category” with big category tiles instead of search-first (complement to Find).

---

## What more you can add to the supplier system

### Buyer / discovery

- **Saved / favourite suppliers** – Heart or “Save” on a storefront, list under My Supplier Stores or a “Saved” tab.
- **Compare suppliers** – Side-by-side (categories, trust score, location, product count).
- **Filters** – Country, category, min trust score, verified only.
- **Request for quote (RFQ)** – Send an enquiry or RFQ from a storefront; supplier responds; track in “My enquiries”.
- **Order / enquiry history** – List of orders or enquiries with marketplace suppliers (link to documents if you have orders).

### Supplier (seller) experience

- **Inbox / enquiries** – Suppliers see and reply to messages/RFQs from buyers.
- **Store hours / response time** – Optional fields and badges (“Usually responds within 24h”).
- **Multiple contacts** – Sales, support, billing with different labels.
- **Catalog import** – CSV/Excel upload for products instead of only manual add.
- **Bulk actions** – Publish/unpublish or edit multiple products.
- **Store themes** – Simple layout or colour options for their storefront.

### Trust & operations

- **Verification tiers** – e.g. “Verified business”, “Verified documents”, “Verified bank” with badges.
- **Contract / terms per supplier** – Optional PDF or link to terms; show “Terms” on storefront.
- **SLA or delivery expectations** – Lead time, minimum order, delivery regions.
- **Insurance / compliance** – Optional fields for admin (e.g. insurance expiry); not necessarily public.

### Admin

- **Bulk approve / decline** – Select multiple applications and set status.
- **Export** – Suppliers, applications, or products to CSV.
- **Categories per supplier** – Allow multiple categories per profile; filter by category in admin.
- **Featured rotation** – Schedule which suppliers are “featured” and when.

### Analytics & growth

- **Supplier-side analytics** – Views per product, store visits, top referrers (you have basics; can extend).
- **Buyer-side** – “Suppliers you might like” or “Recently viewed stores”.
- **Notifications** – “New supplier in Electronics”, “Your saved supplier added new products”.

---

## Summary

- **Find Suppliers** = discover new suppliers.
- **My Supplier Stores** = quick access to stores of suppliers already in My Suppliers (no duplicate with Find).
- Use the table and alternatives above to keep the menu clear; use the “what more” list to prioritise next features.
