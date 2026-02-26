# Promotion Engine – Production Readiness Checklist

## ✅ Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Database schema** | ✅ Done | `database/promotion_engine_schema.sql` – tables, RLS, RPC |
| **Types** | ✅ Done | `types/promotion.ts` |
| **Service layer** | ✅ Done | CRUD, eligibility, apply, price calculator |
| **Edge function** | ✅ Done | `expire-promotion-subscriptions` |
| **Admin UI – Promotions** | ✅ Done | Create, edit, list, soft delete |
| **Admin UI – Apply to subscriptions** | ✅ Done | Verify with promo, apply to active |
| **Dashboard link** | ✅ Done | Quick action + Suppliers quick link |

---

## 🚀 Before Going Live

### 1. Run Database Migration

```bash
# Apply the promotion engine schema to your Supabase project
psql $DATABASE_URL -f database/promotion_engine_schema.sql
# Or via Supabase Dashboard: SQL Editor → paste & run promotion_engine_schema.sql
```

### 2. Deploy Edge Function

```bash
supabase functions deploy expire-promotion-subscriptions
```

### 3. Schedule the Cron Job

**Option A – Supabase pg_cron** (if enabled):

```sql
SELECT cron.schedule(
  'expire-promotion-subscriptions',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-promotion-subscriptions',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**Option B – GitHub Actions** (create `.github/workflows/expire-promotions.yml`):

```yaml
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  expire:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-promotion-subscriptions
```

**Option C – Vercel Cron / External scheduler** – Hit the function URL hourly.

### 4. Verify RLS

Ensure `user_is_admin(auth.uid())` exists and returns true for admin users. The schema uses it for promotion policies.

### 5. Test End-to-End

- [ ] Create a promotion (manual target)
- [ ] Apply promotion when verifying a pending subscription
- [ ] Apply promotion to an active subscription
- [ ] Verify trial/discount dates and pricing
- [ ] Run the expire function manually and confirm trials/discounts expire correctly

---

## 📋 Production Considerations

| Item | Recommendation |
|------|----------------|
| **Cron frequency** | Run at least every hour |
| **Manual targets** | Consider a supplier picker UI instead of pasting UUIDs |
| **Redemption limits** | Monitor `max_redemptions`; deactivate when reached |
| **Audit** | `subscription_promotion_audit` table exists but is not yet written to – add logging in service if needed |
| **Error handling** | UI shows alerts; consider toast notifications for non-blocking feedback |

---

## 🔗 Quick Links

- **Architecture**: `docs/PROMOTION_ENGINE_ARCHITECTURE.md`
- **Schema**: `database/promotion_engine_schema.sql`
- **Admin Promotions**: `/admin/subscription-promotions`
- **Admin Subscriptions**: `/admin/supplier-subscriptions` (Tag icon → Promotions)
