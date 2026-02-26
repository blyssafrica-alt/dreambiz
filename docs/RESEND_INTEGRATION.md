# Resend Integration (DreamBiz)

## dreambig.org.za Setup Process

### 1. Resend Dashboard – Add domain

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter `dreambig.org.za`
4. Resend will show the DNS records to add (MX, SPF, DKIM, etc.)

### 2. DNS – Add records at your registrar

In your domain DNS (e.g. Cloudflare, Namecheap, GoDaddy):

- Add the MX records Resend shows
- Add the TXT record for SPF
- Add the CNAME records for DKIM
- Wait for DNS propagation (often 5–15 minutes; can take up to 48 hours)

### 3. Verify in Resend

1. In Resend → Domains, open `dreambig.org.za`
2. Click **Verify**
3. Wait until status is **Verified**

### 4. Set Supabase Edge Function secrets

From your project root (with Supabase CLI):

```bash
supabase secrets set RESEND_API_KEY=re_YOUR_API_KEY
supabase secrets set RESEND_FROM="DreamBiz <support@dreambig.org.za>"
```

Replace `re_YOUR_API_KEY` with your actual Resend API key.

### 5. Deploy the mailing functions

```bash
supabase functions deploy admin-mailing-send-test
supabase functions deploy admin-mailing-send-campaign
```

### 6. Test

1. Open Admin → Mailing → New campaign
2. Create a campaign and go to step 4 (Review & send)
3. Enter your email in “Send test to”
4. Click **Send test email**

---

## Quick Setup (generic)

1. Sign up at [resend.com](https://resend.com) and get an API key from **API Keys**
2. Add a domain in Resend (or use `onboarding@resend.dev` for testing only)
3. Set Supabase secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set RESEND_FROM="DreamBiz <onboarding@resend.dev>"
```

For production, use your verified domain: `RESEND_FROM="DreamBiz <notifications@yourdomain.com>"`

4. Redeploy the mailing functions: `supabase functions deploy admin-mailing-send-test admin-mailing-send-campaign`

## Where Resend Config Lives

**Environment variables** (set in Supabase Edge Function secrets for production; `.env` for local dev — see `.env.example`):
- `RESEND_API_KEY` — Resend API key (never exposed to client; server-side only)
- `RESEND_FROM` — Sender string, e.g. `DreamBiz <notifications@your-domain.com>`

**Files that use Resend (all server-side, Edge Functions):**
- `supabase/functions/send-notification/index.ts` — push + optional email
- `supabase/functions/admin-mailing-send-campaign/index.ts` — campaign sends
- `supabase/functions/admin-mailing-send-test/index.ts` — test emails

**Reference:** `.env.example`, `env.example`

## Where Resend Is Used

All email sending is **server-side only** via Supabase Edge Functions:

| Function | Purpose |
|----------|---------|
| `send-notification` | Push + optional email notifications (title + text) |
| `process-ad-renewals-cron` | Ad expiry/renewal emails |
| `admin-mailing-*` | Admin mailing system (campaigns, templates, HTML) |

## Send Pattern (Reused)

Each Edge Function that sends email uses this pattern:

```ts
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFrom = Deno.env.get('RESEND_FROM');
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${resendApiKey}`,
  },
  body: JSON.stringify({
    from: resendFrom,  // or override with campaign-specific from_name/from_email
    to: [email],
    subject: subject,
    html: htmlContent,  // or text: plainText
  }),
});
```

**Admin mailing extras** (Edge Function secrets):
- `MAILING_UNSUBSCRIBE_SECRET` — Secret for signing unsubscribe tokens (any random string, e.g. 32 chars)

**Webhook:** Configure in Resend Dashboard → Webhooks: `https://<PROJECT_REF>.supabase.co/functions/v1/admin-mailing-webhook` with events: `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`.

**Important:** Do NOT send emails from the client. Never expose `RESEND_API_KEY` to the app.
