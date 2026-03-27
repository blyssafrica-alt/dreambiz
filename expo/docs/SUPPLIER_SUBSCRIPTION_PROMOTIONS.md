# How subscription promotions work for suppliers

## Short answer

- **Promotions do not apply automatically.** When you create a promotion in admin, it just sits in the list until an admin uses it.
- **Suppliers do not choose or see promotions** in the app. They subscribe as usual (pick a plan, upload payment proof).
- **An admin applies the promotion** when verifying the supplier’s payment in **Admin → Supplier Subscriptions** (Verify → “Apply promotion”).
- So promotions are **admin-driven**, not automatic and not visible in the supplier dashboard as a “promotion” to select.

---

## Step-by-step flow

### 1. Admin creates a promotion

- **Admin → Subscription Promotions** → Create promotion.
- You set: name, type (free trial / % discount / fixed discount), dates, target group, optional max redemptions.
- **Target group** only affects **who is allowed** to get this promotion when an admin applies it:
  - **Manual:** only supplier profiles you add to the promotion’s “manual targets” can get it.
  - **Recent signups:** only suppliers who signed up in the last X days (e.g. 14).
  - **Inactive:** only suppliers whose subscription has been expired for X days (e.g. 30).

Creating the promotion does **not** send it to any supplier or change any subscription by itself.

### 2. Supplier subscribes (no promotion yet)

- Supplier goes to **Supplier dashboard → Subscription**.
- Sees plans (from `supplier_subscription_plans`), picks one, uploads proof of payment, submits.
- A row is created in `supplier_subscriptions` with status **`pending_payment`**.
- The supplier sees: “An admin will verify and activate your plan.”  
- At this point **no promotion is applied**; the supplier has no way to pick or see promotions.

### 3. Admin verifies and (optionally) applies a promotion

- **Admin → Supplier Subscriptions** → filter e.g. “Pending”.
- Admin opens a pending subscription, checks proof of payment.
- Admin can click **“Apply promotion”** and choose one of the active promotions (only those the supplier is eligible for, based on target group and dates).
- Admin then verifies (Approve). That calls `applyPromotionToSubscription(subscriptionId, promotionId)`:
  - Sets `promotion_id`, `base_price`, `final_price`, `trial_ends_at` or `discount_ends_at`, and status (e.g. `trial` or `active`).
  - Records a redemption so the same promotion can’t be reused beyond `max_redemptions` (and for free trial, one trial per supplier is enforced).

So the promotion **only** gets applied when an admin explicitly applies it during verification.

### 4. What the supplier sees after that

- The supplier’s subscription becomes **active** or **trial** (and may show a discounted price).
- In the **Supplier dashboard → Subscription** screen they see:
  - “Current plan” and **Expires {date}**.
  - The app does **not** currently show a line like “You’re on a trial until …” or “Discount until …”, so the promotion is “invisible” except that their plan is active (and possibly at a lower price / with a trial period).

---

## Why promotions don’t “show” in the supplier dashboard

- There is **no screen** in the supplier app that lists “Available promotions” or “Use this promo code”.
- The only place promotions are used is **Admin → Supplier Subscriptions → Verify → Apply promotion**.
- So:
  - **When created:** they don’t automatically apply to anyone.
  - **Who does something:** the **admin** (by applying a promotion when verifying).
  - **Supplier:** subscribes as normal; they don’t do anything special for promotions.
  - **Why it doesn’t show in the supplier dashboard:** the supplier never selects a promotion; they only benefit from it after the admin applies it. The subscription screen could be improved to show “Trial until …” or “Discount until …” when those fields are set.

---

## Optional: “Promo code” or “Apply promotion at signup” for suppliers

Right now there is **no** flow where a supplier enters a code or clicks “I have a promotion.” The codebase has `createSubscriptionWithPromotion(supplierProfileId, planId, promotionId)` which could support that, but:

- The supplier **Subscription** screen does not call it; it only inserts a `pending_payment` row.
- So any “promo code at signup” would require new UI (e.g. promo code field) and logic that resolves the code to a promotion and either applies it at signup or flags the pending subscription for the admin to apply that promotion when verifying.

---

## Summary table

| Question | Answer |
|----------|--------|
| When I create a promotion, does it auto-apply to suppliers? | No. It just exists for admins to use. |
| Does the supplier have to do something to get a promotion? | No. They just subscribe as usual (plan + payment proof). |
| Who applies the promotion? | An admin, in **Supplier Subscriptions** → Verify → **Apply promotion**. |
| Why doesn’t it show in the supplier dashboard? | Suppliers don’t see or select promotions; they only see “Current plan” and expiry. Showing “Trial until …” / “Discount until …” would require adding that to the Subscription screen. |
