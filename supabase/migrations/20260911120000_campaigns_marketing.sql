-- supabase/migrations/20260911120000_campaigns_marketing.sql
--
-- EventRally — Email & SMS marketing (Campaign Studio) backend.
--
-- ============================================================================
-- DEPLOY NOTE — this SQL is safe to run on its own, and safe to re-run.
--   It is wrapped in BEGIN/COMMIT, creates tables with IF NOT EXISTS, and uses
--   DROP POLICY IF EXISTS before every CREATE POLICY. Apply it by pasting into
--   the Supabase Dashboard -> SQL Editor and running, OR via `supabase db push`.
--
--   The Campaign Studio UI reads these tables immediately. Actual EMAIL sending
--   is performed by the `send-campaign` edge function, which needs a Resend key:
--       supabase secrets set RESEND_API_KEY=re_xxxxxxxx
--   Without that secret the function fails closed (returns email_not_configured)
--   and records nothing as "sent" — it never fakes delivery.
--
--   SMS sending stays switched OFF until a provider (Termii / Africa's Talking)
--   and wallet funding (Paystack) are wired. The wallet tables below exist so
--   balances/plans can be modelled and granted now, but no money moves yet.
-- ============================================================================
--
-- Ownership model matches the rest of the schema: an organiser owns a row when
-- `organiser_id = auth.uid()` (events.organiser_id is auth.uid() directly; there
-- is no separate organisers table). Admin override via public.has_role().
--
-- SECURITY POSTURE:
--   * campaigns              — organiser has full CRUD on their own rows (they
--                              compose drafts client-side). Admin read-all.
--   * campaign_recipients    — organiser/admin READ-ONLY. Rows are written only
--                              by the service-role edge function.
--   * email_unsubscribes     — organiser/admin READ-ONLY (see who opted out).
--                              Written only by the public `unsubscribe` function
--                              (service role). A recipient can never be re-added
--                              by a client.
--   * organiser_wallets      — READ-ONLY to the owner. Balance and plan are
--     wallet_transactions      mutated ONLY by service-role functions (funding
--     organiser_email_usage    via Paystack, SMS debits, admin grants, usage
--                              counters). This is deliberate: a client must not
--                              be able to credit its own wallet, upgrade its own
--                              plan, or reset its own email usage counter.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. campaigns — one row per broadcast an organiser composes/sends.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id    uuid NOT NULL,
  event_id        uuid REFERENCES public.events(id) ON DELETE SET NULL, -- NULL = all of the organiser's events
  channel         text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  subject         text,                                                 -- email subject; ignored for sms
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count      integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_campaigns_organiser ON public.campaigns (organiser_id, created_at DESC);

DROP POLICY IF EXISTS "Organisers can manage their own campaigns" ON public.campaigns;
CREATE POLICY "Organisers can manage their own campaigns"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING (auth.uid() = organiser_id)
  WITH CHECK (auth.uid() = organiser_id);

DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.campaigns;
CREATE POLICY "Admins can view all campaigns"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------------------------------------------
-- 2. campaign_recipients — per-recipient delivery record for a campaign.
--    Written only by the service-role edge function; clients read for stats.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  registration_id   uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  contact           text NOT NULL,                        -- email address or phone number
  name              text,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error             text,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_token ON public.campaign_recipients (unsubscribe_token);

DROP POLICY IF EXISTS "Organisers can view recipients of their campaigns" ON public.campaign_recipients;
CREATE POLICY "Organisers can view recipients of their campaigns"
  ON public.campaign_recipients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_recipients.campaign_id
        AND c.organiser_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ----------------------------------------------------------------------------
-- 3. email_unsubscribes — per-organiser suppression list (compliance).
--    A recipient who unsubscribes from one organiser is not opted out globally.
--    Written only by the public `unsubscribe` edge function (service role).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL,
  email        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organiser_id, email)
);
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organisers can view their unsubscribes" ON public.email_unsubscribes;
CREATE POLICY "Organisers can view their unsubscribes"
  ON public.email_unsubscribes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));
-- (No client INSERT/UPDATE/DELETE policy: suppression is written server-side.)

-- ----------------------------------------------------------------------------
-- 4. organiser_wallets — prepaid SMS balance + marketing plan flag.
--    READ-ONLY to the owner. Balance/plan mutated only by service-role funcs.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organiser_wallets (
  organiser_id uuid PRIMARY KEY,
  sms_balance  numeric(12,2) NOT NULL DEFAULT 0,   -- naira available for SMS sends
  plan         text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organiser_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organisers can view their own wallet" ON public.organiser_wallets;
CREATE POLICY "Organisers can view their own wallet"
  ON public.organiser_wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));
-- (No client write policy: crediting/plan changes go through service-role funcs.)

-- ----------------------------------------------------------------------------
-- 5. wallet_transactions — append-only ledger of wallet movements.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id  uuid NOT NULL,
  type          text NOT NULL CHECK (type IN ('fund', 'debit', 'grant', 'refund')),
  amount        numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  reference     text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_organiser ON public.wallet_transactions (organiser_id, created_at DESC);

DROP POLICY IF EXISTS "Organisers can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Organisers can view their own wallet transactions"
  ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));
-- (No client write policy: ledger entries are written server-side.)

-- ----------------------------------------------------------------------------
-- 6. organiser_email_usage — monthly free-tier email counter (freemium gate).
--    period is 'YYYY-MM'. READ-ONLY to the owner; incremented server-side.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organiser_email_usage (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL,
  period       text NOT NULL,                       -- 'YYYY-MM'
  sent_count   integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organiser_id, period)
);
ALTER TABLE public.organiser_email_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organisers can view their own email usage" ON public.organiser_email_usage;
CREATE POLICY "Organisers can view their own email usage"
  ON public.organiser_email_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));
-- (No client write policy: the counter is incremented by the send-campaign func.)

COMMIT;
