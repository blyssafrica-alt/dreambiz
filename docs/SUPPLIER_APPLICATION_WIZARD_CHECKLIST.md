# Supplier application wizard – test checklist

## Setup
- Run `database/supplier_applications.sql` after `supplier_marketplace_schema.sql` so the `supplier_applications` table exists.
- Ensure feature `supplier-marketplace` is enabled and storage bucket `supplier_assets` exists with path `supplier-applications/{id}/` allowed.

## Access rules
- [ ] **Owner**: More → Become a Supplier is visible and opens the wizard.
- [ ] **Employee**: More → Become a Supplier is hidden (or disabled). If the route is opened directly, the screen shows an access message and does not allow applying.
- [ ] **Feature off**: When `supplier-marketplace` is disabled, the wizard is not accessible (or shows upgrade/feature message).

## Draft and resume
- [ ] Start the application, fill Step 1 (business name, country, city), tap **Save & Exit**. Reopen Become a Supplier: prompt **"Continue where you left off?"** with Continue / Start over.
- [ ] Tap **Continue**: step and form data are restored.
- [ ] Tap **Start over**: draft is cleared and wizard starts from Step 0.
- [ ] Autosave: change a field and wait ~800ms (or move to next step); draft is saved (no need to tap Save & Exit for progress to persist).

## Submission (new flow with supplier_applications)
- [ ] Complete all required steps including Step 0 checkboxes and Review. Tap **Submit application**.
- [ ] Success message and redirect (or “Application submitted” with next steps).
- [ ] User receives an in-app (or push) confirmation that the application was submitted.
- [ ] Admin: **Admin → Suppliers → New applications** shows the new application (status submitted/pending).

## Admin review
- [ ] Open an application from the list. Applicant info and payload are visible.
- [ ] **Approve**: Confirm; application status becomes approved, a row is created in `supplier_marketplace_profiles` (status approved), and the applicant is notified.
- [ ] **Decline**: Add optional admin note; applicant is notified; application status declined.
- [ ] **Request more info**: Enter requested fields and/or note; status set to `needs_info`; applicant is notified. Applicant can reopen the wizard and resubmit (if you support editing needs_info applications).

## Notifications
- [ ] On **submit**: Applicant sees success; admin queue shows the application.
- [ ] On **approve**: Applicant receives notification (e.g. “Your supplier application for X has been approved…”).
- [ ] On **decline** / **needs_info**: Applicant receives notification with reason or requested info.

## Legacy (no supplier_applications table)
- [ ] If the migration has not been run, the wizard still works: submission creates a row in `supplier_marketplace_profiles` with status `pending` (existing behavior). Admin continues to use **Admin → Suppliers** (profiles list) to approve/decline.

## UX
- [ ] Step progress (e.g. “Step 2 of 8”) and progress bar update correctly.
- [ ] Back / Continue / Save & Exit work; validation prevents moving forward when required fields are missing (with clear message).
- [ ] Keyboard-safe layout on mobile; form usable on web.
- [ ] Translations: Switch app language; wizard strings use the selected language (e.g. English / Shona / Ndebele).
