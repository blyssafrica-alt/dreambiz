# Promotion Engine – Architecture & Implementation

## Overview

The Promotion Engine layers promotions on top of subscription plans **without modifying base plans**. Promotions are applied dynamically, and the base plan price is never changed.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                                  │
│  (Create promotions, assign targets, view redemptions)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER (lib/promotion-engine/)               │
│  promotion.service.ts        - CRUD, resolve targets                     │
│  subscription-promotion.service.ts - eligibility, apply, create sub      │
│  price-calculator.ts         - pure price calculation (no side effects)  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                   │
│  subscription_promotions, subscription_promotion_targets,                │
│  subscription_promotion_redemptions, supplier_subscriptions (extended)   │
│  resolve_promotion_target_suppliers() RPC                                │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION (CRON)                                  │
│  expire-promotion-subscriptions - expire trials & discounts              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Separation of Concerns

| Layer | Responsibility | No logic for |
|-------|----------------|--------------|
| **Plans** | Base pricing, product limits, duration | Promotions, discounts, trials |
| **Promotions** | Discount rules, targeting, validity | Plan pricing |
| **Subscriptions** | Store base_price, final_price, promotion_id | Calculate effective price |
| **Price Calculator** | Compute effective price from plan + promotion | Persistence |
| **Service** | Orchestration, eligibility, apply promotion | UI |

## Key Files

| File | Purpose |
|------|---------|
| `database/promotion_engine_schema.sql` | Tables, RLS, RPC, migration |
| `types/promotion.ts` | Types & enums |
| `lib/promotion-engine/price-calculator.ts` | Pure price calculation |
| `lib/promotion-engine/promotion.service.ts` | Promotion CRUD, resolve targets |
| `lib/promotion-engine/subscription-promotion.service.ts` | Eligibility, apply, create subscription |
| `supabase/functions/expire-promotion-subscriptions/index.ts` | Cron: expire trials & discounts |

## Business Rules

1. **Base plan price never modified** – stored in `base_price`, `final_price` is computed.
2. **One free trial per supplier ever** – checked via `subscription_promotion_redemptions`.
3. **Trial expiration** – cron sets `status = 'expired'` when `trial_ends_at < NOW()`.
4. **Discount expiration** – cron resets `final_price = base_price`, clears `discount_ends_at` and `promotion_id`.
5. **Date validity** – promotions apply only within `start_date` and `end_date`.
6. **Max redemptions** – promotion invalid when `redemption_count >= max_redemptions`.

## Target Groups (Dynamic Queries)

| Target | Definition |
|--------|------------|
| `manual` | Suppliers in `subscription_promotion_targets` |
| `recent_signups` | Approved profiles with `created_at >= NOW() - recent_days_definition` |
| `inactive` | Expired subscriptions past `inactive_days_definition`, no active subscription |

## Cron Setup

The `expire-promotion-subscriptions` edge function must run periodically (e.g. every hour).

### Option A: Supabase pg_cron (if available)

```sql
SELECT cron.schedule(
  'expire-promotion-subscriptions',
  '0 * * * *',  -- every hour
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/expire-promotion-subscriptions',
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  );
  $$
);
```

### Option B: External Cron (GitHub Actions, Vercel Cron, etc.)

```yaml
# .github/workflows/expire-promotions.yml
on:
  schedule:
    - cron: '0 * * * *'  # every hour
jobs:
  expire:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://<project-ref>.supabase.co/functions/v1/expire-promotion-subscriptions
```

### Option C: Manual / Ad-hoc

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://<project-ref>.supabase.co/functions/v1/expire-promotion-subscriptions
```

## Optional Improvements

| Improvement | Status | Notes |
|-------------|--------|-------|
| Auto-reactivation campaigns | Planned | Apply promotion to inactive target group |
| Promotion stacking rules | Not implemented | Single promotion per subscription |
| Audit logging | Implemented | `subscription_promotion_audit` table |
| Promotion usage tracking | Implemented | `subscription_promotion_redemptions` |
| Admin dashboard | Pending | UI for CRUD, targets, redemptions |

## Integration Points

- **New supplier verification** – Admin can apply a promotion when approving a subscription.
- **Existing admin subscription flow** – Use `subscription-promotion.service.applyPromotionToSubscription()` before or after verification.
- **Display price** – Use `price-calculator.calculateEffectivePrice()` for UI; subscription stores `final_price` for billing.
