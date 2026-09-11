# EventRally — Campaign Studio (Email & SMS Marketing) Runbook

This release turns the organiser **Campaigns** screen from a mock into a real,
server-backed email marketing tool, and lays the (switched-off) foundation for
prepaid SMS. Live project ref: **`edpnvsakkudorleqqhxv`**.

## What shipped

| Piece | Status |
|-------|--------|
| DB schema: `campaigns`, `campaign_recipients`, `email_unsubscribes`, `organiser_wallets`, `wallet_transactions`, `organiser_email_usage` (+ RLS) | **In this migration — you apply it (step 1)** |
| `send-campaign` edge function (JWT-required; sends email via Resend, enforces freemium cap, records per-recipient status) | **Deployed** ✅ |
| `unsubscribe` edge function (public one-click opt-out → suppression list) | **Deployed** ✅ |
| Campaigns UI: compose, send, live usage meter, wallet display, real history | **Live in the app build** ✅ |
| Actual email delivery | **Needs `RESEND_API_KEY` (step 2)** — until then it fails closed (never fakes a send) |
| SMS sending + wallet funding | **On hold** (needs an SMS provider + Paystack). Tables exist; funding UI is disabled. |

---

## Business model (as built)

- **Email = freemium.** Each organiser gets **100 free marketing emails per
  calendar month** (`FREE_EMAIL_MONTHLY_LIMIT`, tunable — see step 2). Kept small
  on purpose: at launch we're on Resend's **free** plan, whose monthly quota is
  shared platform-wide with transactional (ticket) email. **We pay for nothing on
  day one.** The counter resets each month (`organiser_email_usage.period`).
- **Pro plan** removes the monthly email cap (and is where analytics will live).
  Payment is Paystack-gated (on hold), so for now grant Pro manually (step 4).
- **SMS = prepaid, always paid** (new revenue stream). Priced per message,
  separate from the free email allowance, funded from the organiser wallet.
  Switched off until an SMS provider (Termii / Africa's Talking) and Paystack
  funding are wired.

---

## 1. Apply the database migration (required)

Paste the contents of
`supabase/migrations/20260911120000_campaigns_marketing.sql` into the
**Supabase Dashboard → SQL Editor** and run it. It is wrapped in `BEGIN/COMMIT`,
uses `IF NOT EXISTS` / `DROP POLICY IF EXISTS` throughout, and is safe to re-run.

The Campaign Studio screen reads these tables immediately after this step (the
usage meter, wallet, and history will populate; sending still needs step 2).

## 2. Enable email delivery (required to actually send)

The `send-campaign` function is already deployed but will return
`email_not_configured` until a Resend key exists. Set these as **Edge Function
secrets** (Dashboard → Project Settings → Edge Functions → Secrets, or
`npx supabase secrets set ...`). **Do not paste the key into any chat or commit it.**

| Secret | Required | Purpose |
|--------|----------|---------|
| `RESEND_API_KEY` | **Yes** | Your Resend API key (`re_...`). Held only here, server-side. |
| `CAMPAIGN_FROM_EMAIL` | Recommended | Sender, e.g. `EventRally <news@yourdomain.com>`. **Must be a Resend-verified domain**, or sends fail. Defaults to `EventRally <news@eventrally.com>`. |
| `CAMPAIGN_REPLY_TO` | Optional | Reply-to address for campaign email. |
| `FREE_EMAIL_MONTHLY_LIMIT` | Optional | Overrides the default `100`/organiser/month without a redeploy. If you change it, also update `FREE_EMAIL_MONTHLY_LIMIT` in `src/lib/campaignConstants.ts` so the UI meter matches. |

> Marketing email should send from a **different subdomain** than transactional
> ticket email (e.g. `news@` or `go.` vs `tickets@`) to protect the deliverability
> of ticket emails if a campaign ever draws spam complaints.

## 3. Verify (SQL Editor, after step 1)

```sql
-- (a) All six tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaigns','campaign_recipients','email_unsubscribes',
                     'organiser_wallets','wallet_transactions','organiser_email_usage')
ORDER BY table_name;   -- expect 6 rows

-- (b) RLS is enabled on all of them:
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('campaigns','campaign_recipients','email_unsubscribes',
                    'organiser_wallets','wallet_transactions','organiser_email_usage')
ORDER BY tablename;    -- rowsecurity = true for every row
```

Then, in the app: open **Dashboard → Campaigns** as an organiser, compose an
email to one of your events, and send. With `RESEND_API_KEY` set you'll get a
real delivery + a `sent` row in history; without it you'll get a clear
"email not configured" message and a `failed` row (never a fake success).

## 4. Operate while Paystack is on hold (manual grants via SQL)

**Grant an organiser the Pro plan** (uncaps their monthly email):
```sql
INSERT INTO public.organiser_wallets (organiser_id, plan)
VALUES ('<ORGANISER_USER_UUID>', 'pro')
ON CONFLICT (organiser_id) DO UPDATE SET plan = 'pro', updated_at = now();
```

**Manually credit SMS wallet** (for testing; real funding comes via Paystack):
```sql
INSERT INTO public.organiser_wallets (organiser_id, sms_balance)
VALUES ('<ORGANISER_USER_UUID>', 2000)
ON CONFLICT (organiser_id)
  DO UPDATE SET sms_balance = public.organiser_wallets.sms_balance + 2000,
                updated_at = now();

INSERT INTO public.wallet_transactions (organiser_id, type, amount, balance_after, description)
SELECT organiser_id, 'grant', 2000, sms_balance, 'Manual test credit'
FROM public.organiser_wallets WHERE organiser_id = '<ORGANISER_USER_UUID>';
```

**Reset an organiser's monthly email counter** (e.g. for support):
```sql
UPDATE public.organiser_email_usage
SET sent_count = 0, updated_at = now()
WHERE organiser_id = '<ORGANISER_USER_UUID>' AND period = to_char(now(), 'YYYY-MM');
```

---

## Compliance (built in — do not remove)

- **Own-audience only.** Campaigns send *only* to people who registered for the
  organiser's own events (resolved server-side from `registrations`). No uploaded
  or purchased lists — this is the single most important anti-spam guardrail.
- **Working unsubscribe.** Every email carries a footer unsubscribe link **and** a
  `List-Unsubscribe` / one-click header. Opt-outs land in `email_unsubscribes`
  (per-organiser) and are honoured automatically on every future send.
- **No delivery faking.** With no Resend key the function refuses and records the
  failure; it never marks unsent mail as sent.
- **Server-enforced limits.** The freemium cap and campaign ownership are enforced
  in the JWT-authenticated function, not the browser — a client can't bypass them.

## Deferred (next increments)

- SMS provider integration (Termii / Africa's Talking) + per-message wallet debit.
- Paystack wallet funding + Pro-plan purchase (blocked on Paystack, which is on hold).
- Campaign analytics (opens/clicks) — needs Resend webhooks; the Pro flag already gates it.
- Bounce/complaint monitoring + auto-suspend.
- Regenerate `src/integrations/supabase/types.ts` (`supabase gen types`) so the new
  tables are typed; the UI currently uses an untyped handle for them.
