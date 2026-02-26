# Admin Mailing System — QA Checklist

## Setup

1. **Database**: Run `database/admin_mailing_schema.sql` in Supabase SQL Editor
2. **Extensions**: Run `database/admin_mailing_extensions.sql` (manual_list, supplier presets, email_unsubscribes)
3. **Feature config**: Run `database/admin_mailing_feature_config.sql`
4. **Seed templates** (optional): Run `database/admin_mailing_seed_templates.sql`
5. **Resend**: Set in Supabase Edge Function secrets:
   - `RESEND_API_KEY`
   - `RESEND_FROM` (e.g. `DreamBiz <notifications@your-domain.com>`)
   - `MAILING_UNSUBSCRIBE_SECRET` (for unsubscribe token signing)
6. **Deploy Edge Functions**:
   - `supabase functions deploy admin-mailing-send-test`
   - `supabase functions deploy admin-mailing-send-campaign`
   - `supabase functions deploy admin-mailing-unsubscribe`
   - `supabase functions deploy admin-mailing-webhook`
7. **Resend webhook** (optional): In Resend Dashboard → Webhooks, add endpoint:
   - URL: `https://<PROJECT_REF>.supabase.co/functions/v1/admin-mailing-webhook`
   - Events: `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`

## Checklist

### Access & Visibility

- [ ] Admin Mailing link appears on admin dashboard (when feature enabled and user is admin)
- [ ] Non-admins cannot access `/admin/mailing`
- [ ] Edge functions return 403 for non-admin users

### Campaign Creation

- [ ] Create draft campaign (name, subject, preview, from name)
- [ ] Audience step: Segment vs Paste emails (manual list)
- [ ] Audience step: choose Suppliers / Owners / Both (mixed)
- [ ] Audience step: supplier profile_status (approved/pending)
- [ ] Audience step: “Approved, no products” preset
- [ ] Audience step: trial ending within (days)
- [ ] Audience step: joined_within_days filter
- [ ] Audience step: paste emails for manual list
- [ ] Estimate audience returns count (segment and manual list)
- [ ] Content step: template picker loads templates
- [ ] Content step: HTML body with variables {{first_name}}, {{business_name}}, {{unsubscribe_url}}, etc.
- [ ] Save draft persists campaign

### Supplier Segments

- [ ] Segment “Suppliers” + approved: returns approved supplier count
- [ ] Segment “Suppliers” + approved + no products: returns approved with 0 products
- [ ] Segment “Suppliers” + trial ending: returns trial ending within X days
- [ ] Segment “Owners”: returns business owner count
- [ ] Segment “Both” (mixed): returns suppliers + owners
- [ ] Manual list: paste emails, estimate returns count
- [ ] Resolve audience returns correct recipients (emails, names)

### Send Test

- [ ] Send test email to admin address
- [ ] Test email arrives via Resend
- [ ] Variables are replaced in test (e.g. {{first_name}} → Test)

### Send Campaign

- [ ] Send campaign creates email_recipients rows
- [ ] Emails are sent via Resend (RESEND_API_KEY, RESEND_FROM)
- [ ] Recipient status updates (delivered/failed)
- [ ] Campaign status changes to “sent”
- [ ] Respects email_preferences: users with marketing_opt_in=false are skipped
- [ ] Respects email_unsubscribes for manual-list recipients
- [ ] List-Unsubscribe header present in sent emails
- [ ] {{unsubscribe_url}} is replaced with signed token URL

### Unsubscribe

- [ ] Unsubscribe link in templates works
- [ ] Visiting unsubscribe URL updates email_preferences.marketing_opt_in, unsubscribed_at (for users)
- [ ] For manual-list recipients (no user_id), adds to email_unsubscribes
- [ ] Unsubscribe page shows confirmation

### Webhook

- [ ] Resend webhook receives events
- [ ] email.delivered, email.bounced, email.complained update email_recipients
- [ ] email.complained updates preferences / email_unsubscribes

### Templates

- [ ] Default supplier templates are seeded (if seed run)
- [ ] Templates list loads in /admin/mailing/templates
- [ ] Campaign wizard: template picker shows templates, selecting loads HTML

### Segments

- [ ] Saved segments list loads in /admin/mailing/segments
- [ ] Quick links on mailing index: Templates, Segments

### User Email Preferences (Settings)

- [ ] Marketing emails toggle
- [ ] Transactional updates toggle
- [ ] Supplier promos toggle
- [ ] Email language preference (en/sn/nd)

## Known Limitations

- Schedule send uses cron (not yet wired)
- Saved segment “use in campaign” requires loading segment_config into wizard (segmentId param)
- RLS for email_unsubscribes: no user policies (service role only)
