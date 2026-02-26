# Supplier Applications – Audit and Fixes

## 1) Bugs found and root causes

| # | Bug | Root cause |
|---|-----|------------|
| 1 | Application stays **draft** after user taps Submit | **Race:** Autosave timer (800ms debounce) could fire after submit mutation ran, calling `upsertDraftMutation` which always sets `status: 'draft'`, overwriting the row. |
| 2 | Submission not guaranteed **submitted** in DB | Client used direct `UPDATE` with `.in('status', ['draft','needs_info'])`. No server-side guarantee; RLS allowed user UPDATE so a later autosave could revert. |
| 3 | **Duplicate applications** per user | No unique constraint on `owner_user_id`; wizard could INSERT multiple drafts; "Start new" deleted one and created another. |
| 4 | No single source of truth for "my application" | Different queries for draft vs "my application" (status filters); no get-or-create, so wizard and My Application could see different rows. |
| 5 | User could **update submitted/pending** row | RLS "Users update own draft" allowed any UPDATE by owner; no restriction that only draft/needs_info are editable by user. |
| 6 | No **My Application** screen | User had no place to see status, admin note, requested fields, or CTAs (Continue / Withdraw / Re-apply / Go to Dashboard). |
| 7 | **Stale UI** after admin actions | No cache invalidation key for "single application" in some flows; user had to refetch manually. |
| 8 | **Declined** flow unclear | No re-apply path; user could not edit and resubmit after decline. |
| 9 | **Submitted/pending** editable in wizard | Wizard did not redirect when status was already submitted; user could edit and trigger autosave on non-draft row (RLS would block after fix #5, but UX was wrong). |

---

## 2) DB migration

**File:** `database/supplier_applications_fixes.sql`

- **UNIQUE(owner_user_id)** so at most one row per user.  
  If you have existing duplicates, dedupe first (e.g. keep one row per `owner_user_id` by `updated_at`), then run the migration.
- **RPC `get_or_create_supplier_application()`**  
  Returns the single row for `auth.uid()`; inserts one with `status='draft'` if none (uses `ON CONFLICT (owner_user_id) DO UPDATE SET updated_at = NOW()`).
- **RPC `submit_supplier_application(p_application_id, p_payload, p_denormalized)`**  
  Checks ownership and status in (`draft`, `needs_info`), validates required fields (business name, email, accept_supplier_rules), sets `status='submitted'`, `submitted_at=NOW()`, updates payload and denormalized columns, returns row.
- **RPC `withdraw_supplier_application(p_application_id)`**  
  Sets `status='draft'` when current status is `submitted` or `pending`.
- **RPC `reapply_supplier_application(p_application_id)`**  
  Sets `status='draft'` when current status is `declined` (re-apply flow).
- **RLS**  
  Replaced "Users update own draft" with **"Users update own draft or needs_info"**: `USING (auth.uid() = owner_user_id AND status IN ('draft', 'needs_info'))`. Submit is done only via RPC (SECURITY DEFINER), so users never need to UPDATE a row to `submitted`.

---

## 3) Code fixes (wizard + submission + autosave)

- **Wizard**
  - Uses **`useOrCreateSupplierApplication`** (get_or_create RPC) as single source of truth; no separate draft query that could create a second row.
  - On load: if status is **submitted/pending** → redirect to **My Application**; if **approved** → redirect to **Supplier Dashboard**; if **declined** → redirect to **My Application** (user taps "Edit & Re-apply" there); if **draft/needs_info** → set `draftApplicationId` and hydrate from payload.
  - **Removed** "Start new draft" (delete row); one application per user, no deletes.
  - **Submit:** clear autosave timer at start of submit; use **`applicationId = draftApplicationId ?? singleApplication?.id`** so we never INSERT when we already have the row; call **submit RPC** instead of client UPDATE.
- **Hooks**
  - **Submit** uses `supabase.rpc('submit_supplier_application', ...)` and maps RPC errors to user messages (e.g. ALREADY_SUBMITTED, validation).
  - **getMySupplierApplication** returns the single row by `owner_user_id` (any status); no status filter.
  - **getOrCreateSupplierApplication** + **useOrCreateSupplierApplication** for wizard load.
  - **useWithdrawSupplierApplication** and **useReapplySupplierApplication** call the new RPCs and invalidate `supplier-application-draft`, `supplier-application-mine`, `supplier-application-or-create`.
  - All mutations invalidate **supplier-application-or-create** so the wizard and My Application stay in sync.

---

## 4) My Application page + routing + menu

- **Screen:** `app/suppliers-marketplace/my-application.tsx`
  - Shows: status, submitted_at, reviewed_at, admin_note, admin_requested_fields.
  - CTAs by status:
    - **Draft:** "Continue & Submit" → wizard.
    - **Submitted/Pending:** "View application" + "Withdraw (return to draft)".
    - **Needs info:** "Update & Resubmit" → wizard.
    - **Declined:** "Edit & Re-apply" → RPC then wizard.
    - **Approved:** "Go to Supplier Dashboard" → `/supplier`.
- **Routing:** `app/suppliers-marketplace/_layout.tsx` – added `Stack.Screen name="my-application"`.
- **Menu:** More → Suppliers → **"My Application"** (above "Become a Supplier").

---

## 5) Manual test checklist

- [ ] **One application per user**
  - Log in as user A, open "Become a Supplier", complete step 1 and save. Check DB: one row for A.
  - Open "My Application" – same status/id. No duplicate rows for A.
- [ ] **Submit → submitted**
  - Start application, fill required fields (business name, country, email, terms), go to Review, tap Submit.
  - Check DB: `status = 'submitted'`, `submitted_at` set.
  - UI shows success; "My Application" shows "Submitted" / "Pending review".
- [ ] **No draft after submit**
  - Submit as above. Immediately open "My Application" and/or re-open wizard. Status must stay submitted (or redirect to My Application), never back to draft.
- [ ] **Withdraw**
  - From My Application with status Submitted, tap "Withdraw". Status becomes draft; wizard opens for editing.
- [ ] **Needs info**
  - Admin sets application to "Needs info" with requested fields. User opens My Application – sees note and requested fields; "Update & Resubmit" opens wizard; after edit and submit, status goes back to submitted.
- [ ] **Declined → Re-apply**
  - Admin declines. User opens My Application, taps "Edit & Re-apply". Status becomes draft; wizard opens; user can edit and submit again.
- [ ] **Approved**
  - Admin approves. User sees "Approved" on My Application; "Go to Supplier Dashboard" works. Opening "Become a Supplier" redirects to Supplier Dashboard.
- [ ] **RLS**
  - As user, try to UPDATE a row with status submitted (e.g. from another client or script) – should be blocked. Submit only via RPC.
- [ ] **Admin**
  - Approve / Decline / Needs info set `reviewed_at` and (for needs_info) `admin_requested_fields`. User is notified and sees updated status on My Application after refresh.

---

## Run order

1. Apply `database/supplier_applications.sql` (if not already).
2. If you have duplicate rows per user, dedupe `supplier_applications` (keep one per `owner_user_id`).
3. Run `database/supplier_applications_fixes.sql`.
4. Deploy app changes (wizard, hooks, My Application page, menu, layout).
