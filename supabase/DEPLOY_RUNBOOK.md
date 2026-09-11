# EventRally — Security Hardening Deploy Runbook

This release moves payment/registration trust to the server and closes several
security holes. The frontend changes are already live-safe (they gracefully fall
back to the old behavior until the backend is deployed). **The backend pieces in
this runbook must be deployed to actually enforce the new security.**

Live project ref: **`edpnvsakkudorleqqhxv`** (https://edpnvsakkudorleqqhxv.supabase.co)

---

## 0. What changed and why

| Area | Before | After |
|------|--------|-------|
| Paid registration | Browser inserted `status:'completed'` + client-supplied `amount_paid`. Anyone could forge a paid ticket without paying. | `complete-registration` edge function verifies the payment against Paystack (secret key, server-side) and records the verified amount. |
| Guest ticket rows | RLS `SELECT` had `user_id IS NULL` → **every guest's name/email/phone was world-readable**. | Clause removed. Guests read their ticket via the `get-ticket` function; logged-in users see rows matching their email/uid; organisers/admins as appropriate. |
| Public INSERT | `WITH CHECK (true)` — anyone could insert any registration row (a forged "paid" ticket, or a free ticket to a paid event). | Narrowed to **free-only**: the public may insert a registration only when the ticket price is 0 and `amount_paid` is 0. Paid registration flows through the service-role function, which verifies payment first. |
| **Signup role** | `handle_new_user()` honored `raw_user_meta_data->>'role'` → **anyone could sign up as `admin`** via the public anon key. | Trigger hardened: `admin` can never be self-assigned; first-user bootstrap preserved. |
| Ticket lookup | `.or('id.eq.${id},payment_reference.eq.${id}')` — string-injectable filter. | Exact-match `.eq()` (UUID → id, else payment_reference), server-side in `get-ticket`. |
| Admin dashboards | No admin-wide `SELECT` policies → admin lists silently returned only the admin's own rows. | Added admin `SELECT` on `events`, `profiles`, `user_roles`. |

---

## 1. Prerequisites (once)

```bash
supabase login
supabase link --project-ref edpnvsakkudorleqqhxv
```

### Required secret — paid checkout will not work without it
```bash
# Your Paystack SECRET key (sk_live_... in production, sk_test_... in sandbox).
# This lives ONLY as a Supabase Edge secret. Never put it in .env or the frontend.
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are injected
automatically into Edge Functions — do **not** set them manually.

`RESEND_API_KEY` (optional): only if you want the `send-ticket` function to send
real email. Without it, that function mocks success (existing behavior).

---

## 2. Deploy

> The SQL migration is safe to run on its own — **free** events keep working
> immediately (a narrow free-only INSERT policy stays open). **Paid** checkout
> and guest ticket links move to the edge functions, so deploy those too.
> Order no longer matters for free events; paid checkout fails closed (no forged
> tickets) until `complete-registration` is live.

```bash
# 2a. Edge functions (enables paid checkout + guest ticket links)
supabase functions deploy complete-registration
supabase functions deploy get-ticket

# 2b. The RLS migration.
#     Preferred (safe, idempotent, transactional): paste the contents of
#     supabase/migrations/20260910120000_security_hardening.sql into the
#     Supabase Dashboard → SQL Editor and run it.
#
#     OR, if you manage schema via the migrations folder:
supabase db push
```

*Why SQL Editor is suggested:* this repo's base schema lives in
`supabase/00_combined_migrations.sql` (outside the `migrations/` folder), so the
CLI migration history may not match. Running the single hardening file directly
avoids any assumption about prior migration state. The file is wrapped in a
`BEGIN/COMMIT` transaction and uses `DROP POLICY IF EXISTS` throughout, so it is
safe to run and re-run.

---

## 3. Verify after deploy

1. **Privilege escalation is closed** — in SQL Editor:
   ```sql
   -- Attempt to read the trigger definition; confirm the admin-block branch exists.
   SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
   ```
   Then try a throwaway signup passing `role: 'admin'` in metadata and confirm the
   new user lands in `user_roles` as `organiser`, **not** `admin`.

2. **Guest PII is no longer world-readable** — while logged out (anon), querying
   another user's guest registration returns nothing. The ticket link still works
   because `get-ticket` serves it via the service role.

3. **Free registration** — register for a free event; confirm a row is created and
   the ticket renders.

4. **Paid registration** — complete a real (or sandbox) payment; confirm:
   - the registration's `amount_paid` matches the Paystack-verified amount, and
   - submitting the same payment reference again returns the **same** ticket (no duplicate).

5. **Admin dashboards** — as an admin, confirm Organisers / all-events / transactions
   lists populate (they rely on the new admin `SELECT` policies).

---

## 4. Rollback

- **Functions:** redeploying is forward-only; to disable, remove the function or
  point the client back to the legacy path. The client already falls back to the
  direct insert on any function error, so simply *deleting* the functions reverts
  behavior **only if** the migration has not been applied.
- **Migration:** to revert the RLS lockdown, re-create the old policies:
  ```sql
  CREATE POLICY "Public and attendees can register for events"
    ON public.registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
  -- and restore the previous SELECT policy WITH the "user_id IS NULL" clause.
  ```
  (Not recommended — that re-opens the forgery and PII holes.)

---

## 5. Frontend environment (build)

The app reads these at build time (Vite). All are **public by design** (they ship
in the browser bundle):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`  (anon/publishable key — protected by RLS, not secrecy)
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_PAYSTACK_PUBLIC_KEY`  (optional; the Super Admin → Settings page can also set it)

---

## 6. Housekeeping (low priority)

- **`.env` is tracked in git.** It currently contains **only** the public `VITE_*`
  values above — no server secrets — so this is **not** a credential leak and no
  rotation is required. As hygiene (to prevent a future secret from being
  committed), you may untrack it:
  ```bash
  git rm --cached .env
  git commit -m "chore: stop tracking .env (kept public VITE_* values in .env.example)"
  ```
  Keep a committed `.env.example` documenting the variable names (no values).

---

## 7. Known / deferred items (not in this release)

- **Coupon underpayment:** the server records the true Paystack-verified amount and
  logs any payment below list price, but cannot yet *reject* an underpayment because
  discount codes are computed client-side with no server-side coupon table. Closing
  this fully needs a `coupons` table the function can consult. Underpayments are
  currently visible (correct `amount_paid`) rather than hidden.
- **Email via Resend from the browser:** the admin Settings page and checkout still
  call Resend directly from the client using an admin-entered key. This is
  admin-scoped, but for defense-in-depth the send path should move fully server-side
  into `send-ticket`. Not changed here to avoid disrupting a working flow.
- **Optional DB hardening** (commented at the bottom of the migration): require real
  email verification (drop the auto-confirm trigger), and a unique index on
  `payment_reference`. Enable deliberately — see the migration comments.
- **Admin Disputes / payout figures** remain UI mocks (not DB-backed); no policy
  work was needed and none was done. **Organiser Campaigns is now DB-backed** —
  see `supabase/CAMPAIGN_STUDIO_RUNBOOK.md` for its migration + secrets.
