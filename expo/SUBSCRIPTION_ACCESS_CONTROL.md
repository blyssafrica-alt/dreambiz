# Subscription-Based Access Control

## Overview

Access is **role-based** (super admin bypass) plus **package-based** (subscription plan). The same upgrade flow is reused everywhere; the modal shows current plan, required plan(s), and key benefits. Admin changes to user packages or feature assignments reflect immediately via real-time subscriptions.

---

## Access Control Logic

### Frontend (UX)

- **FeatureContext** `isFeatureVisible(featureId)`:
  - Super admins: always `true`.
  - Feature must exist and be enabled.
  - If `feature.premiumPlanIds` is set: user must have one of those plans (`currentPlan.id` in list); otherwise denied.
  - If `feature.isPremium` but no `premiumPlanIds`: user must have active premium and `checkFeatureAccess(featureId)` (plan’s `features` array or `*`).
  - Then book/business/access rules apply.

- **PremiumContext**:
  - Loads active subscription or trial (no caching; refetches on open and via real-time).
  - `checkFeatureAccess(featureId)`: uses `currentPlan.features` (or `*`).
  - Real-time on `user_subscriptions`, `premium_trials`, `subscription_plans` so admin updates apply immediately.

### Backend (Security)

- **Database**: `user_has_feature_access(user_uuid, feature_id_param)` in `ensure_premium_features_working.sql`.
- **RLS**: Tables (e.g. subscription, plans) are protected; users only see their own data; super admins have full access.
- **Optional server-side check**: Use `checkFeatureAccessBackend(userId, featureId)` or `useFeatureAccessBackend(featureId)` from `lib/feature-access.ts` before sensitive operations.

---

## Upgrade Prompt & Modal

- **When**: User taps a locked feature (e.g. Financial Tools hub) or hits a route guarded by `FeatureAccessGuard`.
- **Behavior**: Access is blocked and the **PremiumUpgradeModal** opens (no redirect).
- **Modal**:
  - **Current plan**: “Your current plan” (if any).
  - **Required plan**: “Required plan to unlock” + list of plan names that include the feature (from `feature.premiumPlanIds`).
  - **Compare plans**: All plans listed; plans that unlock the feature show an “Unlocks this feature” badge.
  - **CTAs**: Upgrade (primary), Maybe Later / Close.
  - Reuses existing payment flow (proof upload, verification); on success calls `refreshPremiumStatus()` then closes so the feature unlocks without reload.

---

## Subscription Flow Integration

- One flow only: **PremiumUpgradeModal** → select plan → payment method → proof upload → submit.
- Uses existing `subscription_payments` insert and backend verification.
- After successful submit: `refreshPremiumStatus()` then `onClose()`. UI re-renders with new plan and unlocks the feature.

---

## Edge Cases

| Case | Handling |
|------|----------|
| **Expired subscription** | Only active subscriptions (and trials) are loaded; expired = no `currentPlan` → feature locked. |
| **Downgraded plan** | Admin update → real-time → `refreshPremiumStatus()` → new plan; features not in new plan become locked. |
| **Pending payment** | Subscription exists only after admin creates `user_subscriptions`; until then user has no plan. |
| **Admin override** | Super admin always has access in `FeatureContext`; admin can assign/change user plans. |

---

## Files

- **Contexts**: `contexts/FeatureContext.tsx`, `contexts/PremiumContext.tsx`
- **Components**: `components/FeatureAccessGuard.tsx`, `components/PremiumUpgradeModal.tsx`
- **Backend check**: `lib/feature-access.ts` (`checkFeatureAccessBackend`, `useFeatureAccessBackend`)
- **Screens**: `app/financial-tools/index.tsx` (show all tools, lock + modal on tap), individual tools wrapped with `FeatureAccessGuard`

---

## Extending (New Packages / Features)

1. **New plan**: Add row in `subscription_plans`; modal loads plans automatically.
2. **New feature**: Add/update row in `feature_config` with `premium_plan_ids` (and optionally `is_premium`). Real-time updates UI.
3. **New protected screen**: Wrap content with `<FeatureAccessGuard featureId="your-feature-id">` or gate by `isFeatureVisible('your-feature-id')` and show the same modal on lock (e.g. pass `featureId` so modal can show required plans).
