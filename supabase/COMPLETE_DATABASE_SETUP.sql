-- ====================================================================
-- EVENTRALLY COMPLETE MASTER DATABASE SETUP SCRIPT
-- Run this entire file in your NEW Supabase SQL Editor
-- ====================================================================

-- ----------------------------------------------------
-- SCRIPT: supabase\00_combined_migrations.sql
-- ----------------------------------------------------
-- ====================================================================
-- MYEVENTGURU â€” MASTER COMBINED DATABASE MIGRATION SCRIPT
-- Copy & Paste this entire file into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/<your-new-project-ref>/sql/new)
-- ====================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'organiser', 'attendee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_type AS ENUM ('bug', 'suggestion', 'complaint', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_status AS ENUM ('pending', 'reviewed', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Definer Role Checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. RLS Policies for Profiles & Roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Auto-Confirm Email & Smart First User = Super Admin Auto-Assignment Triggers
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_created ON auth.users;
CREATE TRIGGER on_auth_user_before_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
  assigned_role public.app_role;
BEGIN
  -- If this is the very first registered user in the database, automatically assign SUPER ADMIN ('admin')
  SELECT (COUNT(*) = 0) INTO is_first_user FROM public.user_roles;
  
  IF is_first_user THEN
    assigned_role := 'admin'::public.app_role;
  ELSE
    assigned_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'organiser'::public.app_role);
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'))
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  venue text,
  address text,
  city text,
  country text DEFAULT 'Nigeria',
  category text NOT NULL DEFAULT 'conference',
  image_url text,
  status text NOT NULL DEFAULT 'draft',
  is_free boolean NOT NULL DEFAULT false,
  max_attendees integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 8. Ticket Types Table
CREATE TABLE IF NOT EXISTS public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  quantity integer NOT NULL DEFAULT 100,
  sold integer NOT NULL DEFAULT 0,
  sale_start timestamp with time zone,
  sale_end timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

-- 9. Registrations / Attendees Table
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  ticket_type_id uuid REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'confirmed',
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamp with time zone,
  payment_reference text,
  amount_paid numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 10. DP Templates Table
CREATE TABLE IF NOT EXISTS public.dp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  template_image_url TEXT NOT NULL,
  canvas_width INTEGER NOT NULL DEFAULT 500,
  canvas_height INTEGER NOT NULL DEFAULT 500,
  image_x FLOAT NOT NULL DEFAULT 150,
  image_y FLOAT NOT NULL DEFAULT 100,
  image_width FLOAT NOT NULL DEFAULT 200,
  image_height FLOAT NOT NULL DEFAULT 200,
  image_rounded BOOLEAN DEFAULT true,
  name_x FLOAT NOT NULL DEFAULT 150,
  name_y FLOAT NOT NULL DEFAULT 320,
  name_color TEXT NOT NULL DEFAULT '#000000',
  name_font_size FLOAT NOT NULL DEFAULT 28,
  name_font_weight TEXT NOT NULL DEFAULT 'bold',
  name_font_family TEXT NOT NULL DEFAULT 'sans-serif',
  name_text_align TEXT NOT NULL DEFAULT 'left',
  name_width FLOAT NOT NULL DEFAULT 300,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id)
);
ALTER TABLE public.dp_templates ENABLE ROW LEVEL SECURITY;

-- 11. Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type feedback_type NOT NULL,
    message TEXT NOT NULL,
    status feedback_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies for Events, Tickets, Registrations, DP Templates & Feedback
DROP POLICY IF EXISTS "Organisers can manage their own events" ON public.events;
CREATE POLICY "Organisers can manage their own events" ON public.events FOR ALL TO authenticated USING (auth.uid() = organiser_id) WITH CHECK (auth.uid() = organiser_id);

DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "Organisers manage ticket types" ON public.ticket_types;
CREATE POLICY "Organisers manage ticket types" ON public.ticket_types FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = ticket_types.event_id AND events.organiser_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = ticket_types.event_id AND events.organiser_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active ticket types" ON public.ticket_types;
CREATE POLICY "Anyone can view active ticket types" ON public.ticket_types FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Organisers view registrations for their events" ON public.registrations;
CREATE POLICY "Organisers view registrations for their events" ON public.registrations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid()));

DROP POLICY IF EXISTS "Organisers manage registrations for their events" ON public.registrations;
CREATE POLICY "Organisers manage registrations for their events" ON public.registrations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Attendees and guests can view their registrations" ON public.registrations;
CREATE POLICY "Attendees and guests can view their registrations" ON public.registrations FOR SELECT TO anon, authenticated USING (auth.uid() = user_id OR user_id IS NULL OR (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid())));

DROP POLICY IF EXISTS "Anyone can register for events" ON public.registrations;
DROP POLICY IF EXISTS "Anyone can register for published events or organisers for their own" ON public.registrations;
DROP POLICY IF EXISTS "Public and attendees can register for events" ON public.registrations;
CREATE POLICY "Public and attendees can register for events" ON public.registrations FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "DP templates are fully visible to everyone" ON public.dp_templates;
CREATE POLICY "DP templates are fully visible to everyone" ON public.dp_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Organizers can insert DP templates" ON public.dp_templates;
CREATE POLICY "Organizers can insert DP templates" ON public.dp_templates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.organiser_id = auth.uid()));

DROP POLICY IF EXISTS "Organizers can update DP templates" ON public.dp_templates;
CREATE POLICY "Organizers can update DP templates" ON public.dp_templates FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.organiser_id = auth.uid()));

DROP POLICY IF EXISTS "Organizers can delete DP templates" ON public.dp_templates;
CREATE POLICY "Organizers can delete DP templates" ON public.dp_templates FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.organiser_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Users can insert their own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view feedback" ON public.feedback;
CREATE POLICY "Admins can view feedback" ON public.feedback FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- 13. Auto-Confirm Any Existing Users & Sync Profiles/Roles for retro-created accounts
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- Ensure profiles and roles exist for any accounts registered before trigger setup
DO $$
DECLARE
    u RECORD;
    is_first BOOLEAN;
    assigned_r public.app_role;
BEGIN
    FOR u IN SELECT id, raw_user_meta_data FROM auth.users LOOP
        SELECT (COUNT(*) = 0) INTO is_first FROM public.user_roles;
        IF is_first THEN
            assigned_r := 'admin'::public.app_role;
        ELSE
            assigned_r := COALESCE((u.raw_user_meta_data->>'role')::public.app_role, 'organiser'::public.app_role);
        END IF;

        INSERT INTO public.profiles (user_id, full_name)
        VALUES (u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'User'))
        ON CONFLICT (user_id) DO NOTHING;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (u.id, assigned_r)
        ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
END $$;

-- 14. Storage Buckets & Policies Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('event-images', 'event-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('dp-templates', 'dp-templates', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760;

DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
CREATE POLICY "Public can view event images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Public can view dp templates" ON storage.objects;
CREATE POLICY "Public can view dp templates" ON storage.objects FOR SELECT TO public USING (bucket_id = 'dp-templates');

DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can upload dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can upload dp templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dp-templates');

DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
CREATE POLICY "Authenticated users can update event images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can update dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can update dp templates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dp-templates');

DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
CREATE POLICY "Authenticated users can delete event images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can delete dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can delete dp templates" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dp-templates');




-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20260910120000_security_hardening.sql
-- ----------------------------------------------------
-- supabase/migrations/20260910120000_security_hardening.sql
--
-- EventRally security hardening.
--
-- ============================================================================
-- DEPLOY NOTE â€” this SQL is safe to run on its own.
--   Free events keep working immediately (a narrow free-only INSERT policy
--   stays open). PAID checkout and guest ticket links move to the edge
--   functions, so deploy those to keep paid flows working:
--     1. Set secret:   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
--     2. Deploy funcs: supabase functions deploy complete-registration
--                      supabase functions deploy get-ticket
--   Order between this SQL and the functions no longer matters for free
--   events; paid checkout simply fails closed (no forged tickets) until the
--   complete-registration function is live. See supabase/DEPLOY_RUNBOOK.md.
-- ============================================================================
--
-- This migration:
--   A. Closes a critical privilege-escalation hole in handle_new_user() where a
--      self-chosen signup `role: 'admin'` was honored, minting admins to anyone.
--   B. Removes the world-readable guest-registration RLS leak and the blanket
--      public INSERT that allowed forged "completed" tickets.
--   C. Adds admin-wide SELECT policies the admin dashboards legitimately need.

BEGIN;

-- ----------------------------------------------------------------------------
-- A. Block privilege escalation via signup metadata.
--
-- The prior trigger did:  COALESCE((raw_user_meta_data->>'role')::app_role, 'organiser')
-- Because supabase.auth.signUp() metadata is fully client-controlled (the public
-- anon key ships in the browser bundle), anyone could call signUp with
-- { data: { role: 'admin' } } and be granted admin. This version preserves the
-- first-user bootstrap and normal attendee/organiser signup, but can NEVER
-- assign 'admin' from client-supplied metadata.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
  requested_role public.app_role;
  assigned_role public.app_role;
BEGIN
  SELECT (COUNT(*) = 0) INTO is_first_user FROM public.user_roles;

  -- Parse the client-supplied role, defaulting to the historical 'organiser'.
  requested_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'organiser'::public.app_role);

  IF is_first_user THEN
    -- Bootstrap: the very first account provisions the platform super admin.
    assigned_role := 'admin'::public.app_role;
  ELSIF requested_role = 'admin'::public.app_role THEN
    -- Hard stop: 'admin' can never be self-assigned via public signup metadata.
    -- Downgrade to the historical default rather than error the signup.
    assigned_role := 'organiser'::public.app_role;
  ELSE
    assigned_role := requested_role;
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- B1. Replace the blanket public INSERT with a FREE-ONLY insert.
--
-- Was: WITH CHECK (true) for anon+authenticated, which let the browser forge
-- rows with status='completed' and an arbitrary amount_paid (a free ticket to a
-- paid event, or a "paid" ticket without paying).
--
-- Now: the public may only insert genuinely FREE registrations (the referenced
-- ticket's price is 0, and amount_paid is 0). PAID registrations must go through
-- the complete-registration edge function (service role), which verifies the
-- payment with Paystack first. Net effect: free events keep working with NO
-- backend deploy, while paid events fail closed until the function is live.
-- Organisers keep full INSERT for their own events via the pre-existing
-- "Organisers manage registrations for their events" FOR ALL policy.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public and attendees can register for events" ON public.registrations;
CREATE POLICY "Public can register for free tickets"
  ON public.registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    amount_paid = 0
    AND status = 'completed'
    AND checked_in = false
    AND (
      ticket_type_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.ticket_types t
        WHERE t.id = ticket_type_id AND t.price = 0
      )
    )
  );

-- ----------------------------------------------------------------------------
-- B2. Fix the world-readable guest-registration SELECT leak.
--
-- Was: USING (auth.uid() = user_id OR user_id IS NULL OR <organiser>) â€” the
-- "user_id IS NULL" clause exposed every guest's name/email/phone to anyone.
-- New policy drops that clause and instead lets a signed-in user see guest
-- registrations made with their own email (so a guest who later logs in keeps
-- access to their ticket), plus the event's organiser and platform admins.
-- Not-logged-in guests read their ticket via the get-ticket edge function.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Attendees and guests can view their registrations" ON public.registrations;
CREATE POLICY "Attendees and guests can view their registrations"
  ON public.registrations
  FOR SELECT
  TO anon, authenticated
  USING (
    auth.uid() = user_id
    OR (auth.jwt() ->> 'email') = email
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = registrations.event_id
        AND events.organiser_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Index to keep the edge function's payment_reference lookups (idempotency /
-- anti-replay) fast. Non-unique to avoid failing on any pre-existing dupes.
CREATE INDEX IF NOT EXISTS idx_registrations_payment_reference
  ON public.registrations (payment_reference);

-- ----------------------------------------------------------------------------
-- C. Admin-wide SELECT policies for the Super Admin dashboards.
--
-- These are additive (permissive policies OR together), so existing self-view
-- and organiser policies are unaffected. Without them, admin pages that list
-- all events / organisers / profiles silently return only the admin's own rows.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMIT;

-- ============================================================================
-- OPTIONAL HARDENING â€” review before enabling; each changes product behavior.
-- ============================================================================
--
-- (1) Require real email verification.
--     The auto_confirm_new_user() trigger currently confirms every email on
--     insert, so accounts are usable without proving the address. Removing it
--     makes users click a verification link before their first login. Enable
--     only once your Supabase Auth email templates/SMTP are configured, or new
--     signups will be unable to log in.
--
--     DROP TRIGGER IF EXISTS on_auth_user_before_created ON auth.users;
--     -- (leave the function in place; only the trigger gates confirmation)
--
-- (2) Enforce exact payment-reference uniqueness at the database level.
--     The edge function already rejects replays, but a DB constraint is
--     defense-in-depth. Run ONLY after de-duplicating any existing rows, and
--     prefer CONCURRENTLY (outside a transaction) on a large live table:
--
--     CREATE UNIQUE INDEX CONCURRENTLY idx_registrations_payment_reference_unique
--       ON public.registrations (payment_reference)
--       WHERE payment_reference IS NOT NULL;


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20260911120000_campaigns_marketing.sql
-- ----------------------------------------------------
-- supabase/migrations/20260911120000_campaigns_marketing.sql
--
-- EventRally â€” Email & SMS marketing (Campaign Studio) backend.
--
-- ============================================================================
-- DEPLOY NOTE â€” this SQL is safe to run on its own, and safe to re-run.
--   It is wrapped in BEGIN/COMMIT, creates tables with IF NOT EXISTS, and uses
--   DROP POLICY IF EXISTS before every CREATE POLICY. Apply it by pasting into
--   the Supabase Dashboard -> SQL Editor and running, OR via `supabase db push`.
--
--   The Campaign Studio UI reads these tables immediately. Actual EMAIL sending
--   is performed by the `send-campaign` edge function, which needs a Resend key:
--       supabase secrets set RESEND_API_KEY=re_xxxxxxxx
--   Without that secret the function fails closed (returns email_not_configured)
--   and records nothing as "sent" â€” it never fakes delivery.
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
--   * campaigns              â€” organiser has full CRUD on their own rows (they
--                              compose drafts client-side). Admin read-all.
--   * campaign_recipients    â€” organiser/admin READ-ONLY. Rows are written only
--                              by the service-role edge function.
--   * email_unsubscribes     â€” organiser/admin READ-ONLY (see who opted out).
--                              Written only by the public `unsubscribe` function
--                              (service role). A recipient can never be re-added
--                              by a client.
--   * organiser_wallets      â€” READ-ONLY to the owner. Balance and plan are
--     wallet_transactions      mutated ONLY by service-role functions (funding
--     organiser_email_usage    via Paystack, SMS debits, admin grants, usage
--                              counters). This is deliberate: a client must not
--                              be able to credit its own wallet, upgrade its own
--                              plan, or reset its own email usage counter.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. campaigns â€” one row per broadcast an organiser composes/sends.
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
-- 2. campaign_recipients â€” per-recipient delivery record for a campaign.
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
-- 3. email_unsubscribes â€” per-organiser suppression list (compliance).
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
-- 4. organiser_wallets â€” prepaid SMS balance + marketing plan flag.
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
-- 5. wallet_transactions â€” append-only ledger of wallet movements.
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
-- 6. organiser_email_usage â€” monthly free-tier email counter (freemium gate).
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


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20260916000000_create_platform_settings.sql
-- ----------------------------------------------------
-- supabase/migrations/20260916000000_create_platform_settings.sql
-- Create persistent platform_settings table to store admin configuration across reloads/devices

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (for public gateway keys & platform banner)
DROP POLICY IF EXISTS "Public read platform_settings" ON public.platform_settings;
CREATE POLICY "Public read platform_settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- Allow authenticated admins to insert/update settings
DROP POLICY IF EXISTS "Admin write platform_settings" ON public.platform_settings;
CREATE POLICY "Admin write platform_settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default row if not exists
INSERT INTO public.platform_settings (id, settings, updated_at)
VALUES (
  'global_settings',
  jsonb_build_object(
    'platform_name', 'EventRally',
    'support_email', 'support@geteventrally.com',
    'currency', 'NGN',
    'gateway_provider', 'paystack',
    'gateway_environment', 'live',
    'platform_fee_percent', 2.5,
    'email_sender_address', 'tickets@send.geteventrally.com',
    'email_sender_name', 'EventRally Tickets',
    'email_reply_to', 'support@geteventrally.com',
    'termii_sender_id', 'Termii',
    'maintenance_mode', false,
    'announcement_banner', ''
  ),
  now()
)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20261001000000_online_events_and_custom_questions.sql
-- ----------------------------------------------------
-- supabase/migrations/20261001000000_online_events_and_custom_questions.sql
-- Support for Online Events (meeting & redirect links) and Custom Registration Questions

-- 1. Extend events table for online modalities and custom questions
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'physical';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_link text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS redirect_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS access_instructions text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS auto_redirect boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Extend registrations table for custom question responses
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Comments for documentation
COMMENT ON COLUMN public.events.event_type IS 'Modality of event: physical or online';
COMMENT ON COLUMN public.events.meeting_link IS 'URL to join the online event (Zoom, Google Meet, Teams, YouTube Live)';
COMMENT ON COLUMN public.events.redirect_url IS 'Community or group invite URL (e.g. WhatsApp Group, Telegram community) for post-registration redirect';
COMMENT ON COLUMN public.events.access_instructions IS 'Private access notes or password revealed to ticket holders';
COMMENT ON COLUMN public.events.auto_redirect IS 'Whether to automatically redirect attendees to the community/meeting URL after registration';
COMMENT ON COLUMN public.events.custom_questions IS 'JSON array of custom questions defined by the organizer';
COMMENT ON COLUMN public.registrations.custom_answers IS 'JSON object of answers provided by the attendee to custom questions';


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20261001120000_storage_and_security_hardening.sql
-- ----------------------------------------------------
-- supabase/migrations/20261001120000_storage_and_security_hardening.sql
--
-- EventRally Storage & Security Hardening
-- 1. Restrict storage object update and deletion so users cannot delete or overwrite other users' files.
-- 2. Add database-level unique constraint on registrations(payment_reference) for anti-replay prevention.

BEGIN;

-- 1. Storage Objects Authorization (Fix BOLA)
-- Ensure users can only update or delete their own uploaded files in event-images and dp-templates
DROP POLICY IF EXISTS "Authenticated users can update event images" ON storage.objects;
CREATE POLICY "Authenticated users can update event images" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'event-images' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can update dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can update dp templates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'dp-templates' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can delete event images" ON storage.objects;
CREATE POLICY "Authenticated users can delete event images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'event-images' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can delete dp templates" ON storage.objects;
CREATE POLICY "Authenticated users can delete dp templates" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'dp-templates' 
  AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
);

-- 2. Defense-in-depth: database-level uniqueness for payment references
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_payment_reference_unique
  ON public.registrations (payment_reference)
  WHERE payment_reference IS NOT NULL;

COMMIT;


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20261008180000_payment_integrity_remediation.sql
-- ----------------------------------------------------
-- supabase/migrations/20261008180000_payment_integrity_remediation.sql
--
-- EVENTRALLY PRODUCTION PAYMENT INTEGRITY & FINANCIAL ARCHITECTURE REMEDIATION
--
-- This migration implements:
--   1. Orders table for authoritative financial snapshots.
--   2. Multi-ticket support linking registrations to orders.
--   3. Database-backed organizer payout profiles and payout requests.
--   4. Immutable refund records.
--   5. Financial audit trail logs.
--   6. Atomic order finalization RPC function (finalize_order_payment).
--   7. Strict RLS hardening:
--      - Closes the free-ticket bypass on paid events (eliminates ticket_type_id IS NULL loophole).
--      - Prevents organizers from modifying financial fields on registrations.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ORDERS TABLE â€” Authoritative Financial Snapshot Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organiser_id UUID NOT NULL,
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  user_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  gateway_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  organiser_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_provider TEXT NOT NULL DEFAULT 'paystack',
  payment_reference TEXT UNIQUE,
  gateway_transaction_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'free')),
  order_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'completed', 'cancelled', 'refunded')),
  custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  ticket_issued_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_event ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_organiser ON public.orders(organiser_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(payment_status, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. EXTEND REGISTRATIONS â€” Link Tickets to Orders
-- ----------------------------------------------------------------------------
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ticket_index INTEGER DEFAULT 1;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ticket_code TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_order_id ON public.registrations(order_id);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_code ON public.registrations(ticket_code);
-- Drop legacy 1:1 constraint so 1 order/payment can own N tickets in registrations
DROP INDEX IF EXISTS public.idx_registrations_payment_reference_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_ticket_code_unique ON public.registrations(ticket_code) WHERE ticket_code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. ORGANIZER PAYOUT PROFILES & PAYOUT REQUESTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizer_payout_profiles (
  organiser_id UUID PRIMARY KEY,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  recipient_code TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_payout_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  reference TEXT,
  admin_notes TEXT,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payout_requests_organiser ON public.payout_requests(organiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- ----------------------------------------------------------------------------
-- 4. REFUND RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refund_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  organiser_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  gateway_refund_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed')),
  reason TEXT NOT NULL,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_refund_records_order ON public.refund_records(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_records_organiser ON public.refund_records(organiser_id);

-- ----------------------------------------------------------------------------
-- 5. FINANCIAL AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'system',
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.financial_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.financial_audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. ATOMIC DATABASE RPC: finalize_order_payment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_order_payment(
  p_payment_reference TEXT,
  p_gateway_transaction_id TEXT,
  p_gateway_amount_kobo NUMERIC,
  p_gateway_currency TEXT,
  p_gateway_fee_kobo NUMERIC DEFAULT 0,
  p_actor_type TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_ticket_tier RECORD;
  v_ticket_ids UUID[] := ARRAY[]::UUID[];
  v_ticket_id UUID;
  v_ticket_code TEXT;
  v_paid_major NUMERIC(12,2);
  v_fee_major NUMERIC(12,2);
  v_net_major NUMERIC(12,2);
  v_i INTEGER;
BEGIN
  -- 1. Locate and lock the pending order
  SELECT * INTO v_order
  FROM public.orders
  WHERE payment_reference = p_payment_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Order not found for reference: ' || p_payment_reference
    );
  END IF;

  -- 2. Idempotency guard: If order is already completed / paid, return success
  IF v_order.order_status = 'completed' AND v_order.payment_status = 'paid' THEN
    SELECT array_agg(id) INTO v_ticket_ids
    FROM public.registrations
    WHERE order_id = v_order.id;

    RETURN jsonb_build_object(
      'ok', true,
      'order_id', v_order.id,
      'already_finalized', true,
      'ticket_ids', COALESCE(v_ticket_ids, ARRAY[]::UUID[]),
      'amount_paid', v_order.amount_paid,
      'platform_fee', v_order.platform_fee,
      'gateway_fee', v_order.gateway_fee,
      'organiser_net', v_order.organiser_net
    );
  END IF;

  -- 3. Strict currency validation
  IF UPPER(COALESCE(p_gateway_currency, 'NGN')) != UPPER(v_order.currency) THEN
    RAISE EXCEPTION 'Currency mismatch: Gateway returned %, order expected %', p_gateway_currency, v_order.currency;
  END IF;

  -- 4. Authoritative amount validation (allow 0.50 tolerance for gateway rounding)
  v_paid_major := ROUND(p_gateway_amount_kobo) / 100.0;
  v_fee_major := ROUND(COALESCE(p_gateway_fee_kobo, 0)) / 100.0;

  IF v_paid_major + 0.50 < v_order.amount_expected THEN
    RAISE EXCEPTION 'Underpayment: Gateway verified % %, required % %', v_paid_major, v_order.currency, v_order.amount_expected, v_order.currency;
  END IF;

  -- 5. Calculate authoritative organiser_net subtracting platform_fee and actual gateway_fee
  v_net_major := GREATEST(0, v_paid_major - v_order.platform_fee - v_fee_major);

  -- 6. Atomic ticket inventory check & update with row lock
  IF v_order.ticket_type_id IS NOT NULL THEN
    SELECT id, quantity, sold INTO v_ticket_tier
    FROM public.ticket_types
    WHERE id = v_order.ticket_type_id
    FOR UPDATE;

    IF v_ticket_tier.id IS NOT NULL THEN
      IF v_ticket_tier.quantity IS NOT NULL AND (v_ticket_tier.sold + v_order.quantity) > v_ticket_tier.quantity THEN
        RAISE EXCEPTION 'Ticket tier is sold out. Available: %, Requested: %', (v_ticket_tier.quantity - v_ticket_tier.sold), v_order.quantity;
      END IF;

      UPDATE public.ticket_types
      SET sold = sold + v_order.quantity
      WHERE id = v_ticket_tier.id;
    END IF;
  END IF;

  -- 7. Mark order completed with financial snapshots
  UPDATE public.orders
  SET payment_status = 'paid',
      order_status = 'completed',
      amount_paid = v_paid_major,
      gateway_fee = v_fee_major,
      organiser_net = v_net_major,
      gateway_transaction_id = p_gateway_transaction_id,
      paid_at = COALESCE(paid_at, now()),
      ticket_issued_at = now()
  WHERE id = v_order.id;

  -- 7. Multi-ticket issuance: generate N individual ticket rows in registrations
  FOR v_i IN 1..v_order.quantity LOOP
    v_ticket_id := gen_random_uuid();
    v_ticket_code := 'TKT-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));

    INSERT INTO public.registrations (
      id,
      order_id,
      event_id,
      ticket_type_id,
      user_id,
      full_name,
      email,
      phone,
      amount_paid,
      payment_reference,
      status,
      checked_in,
      ticket_index,
      ticket_code,
      custom_answers
    ) VALUES (
      v_ticket_id,
      v_order.id,
      v_order.event_id,
      v_order.ticket_type_id,
      v_order.user_id,
      v_order.customer_name,
      v_order.customer_email,
      v_order.customer_phone,
      v_order.unit_price,
      p_payment_reference,
      'completed',
      false,
      v_i,
      v_ticket_code,
      v_order.custom_answers
    );

    v_ticket_ids := array_append(v_ticket_ids, v_ticket_id);
  END LOOP;

  -- 8. Persistent Financial Audit Log
  INSERT INTO public.financial_audit_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_type,
    reference,
    metadata
  ) VALUES (
    'order',
    v_order.id::text,
    'PAYMENT_CONFIRMED',
    v_order.user_id,
    p_actor_type,
    p_payment_reference,
    jsonb_build_object(
      'amount_paid', v_paid_major,
      'quantity', v_order.quantity,
      'currency', v_order.currency,
      'gateway_transaction_id', p_gateway_transaction_id,
      'tickets_created', array_length(v_ticket_ids, 1)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'ticket_ids', v_ticket_ids,
    'quantity', v_order.quantity,
    'amount_paid', v_paid_major
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RLS SECURITY HARDENING
-- ----------------------------------------------------------------------------

-- A. Close the free-ticket bypass on paid events
-- Drop former policy and require genuine server-verifiable free ticket status
DROP POLICY IF EXISTS "Public can register for free tickets" ON public.registrations;
DROP POLICY IF EXISTS "Public can register only for genuinely free tickets" ON public.registrations;

CREATE POLICY "Public can register only for genuinely free tickets"
  ON public.registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    amount_paid = 0
    AND status = 'completed'
    AND checked_in = false
    AND ticket_type_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ticket_types t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = ticket_type_id
        AND t.event_id = registrations.event_id
        AND t.price = 0
        AND e.status = 'published'
    )
  );

-- B. Prevent organizers or any client from tampering with financial columns
CREATE OR REPLACE FUNCTION public.protect_registration_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses trigger (for server-side functions)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Freeze financial, order, payment, and identity columns from client updates
  IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR
     NEW.payment_reference IS DISTINCT FROM OLD.payment_reference OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.ticket_type_id IS DISTINCT FROM OLD.ticket_type_id OR
     NEW.event_id IS DISTINCT FROM OLD.event_id OR
     NEW.user_id IS DISTINCT FROM OLD.user_id OR
     NEW.order_id IS DISTINCT FROM OLD.order_id OR
     NEW.ticket_code IS DISTINCT FROM OLD.ticket_code THEN
    RAISE EXCEPTION 'Organizers cannot modify financial, order, or ticket identity fields on registrations';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_registration_financial_fields ON public.registrations;
CREATE TRIGGER trg_protect_registration_financial_fields
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_registration_financial_fields();

-- C. RLS Policies on Orders
DROP POLICY IF EXISTS "Organisers can view orders for their events" ON public.orders;
CREATE POLICY "Organisers can view orders for their events"
  ON public.orders FOR SELECT TO authenticated
  USING (
    organiser_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.events WHERE events.id = orders.event_id AND events.organiser_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'email') = customer_email
  );

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- D. RLS Policies on Organizer Payout Profiles
DROP POLICY IF EXISTS "Organisers can view own payout profile" ON public.organizer_payout_profiles;
CREATE POLICY "Organisers can view own payout profile"
  ON public.organizer_payout_profiles FOR SELECT TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Organisers can upsert own payout profile" ON public.organizer_payout_profiles;
CREATE POLICY "Organisers can upsert own payout profile"
  ON public.organizer_payout_profiles FOR ALL TO authenticated
  USING (auth.uid() = organiser_id)
  WITH CHECK (auth.uid() = organiser_id);

-- E. RLS Policies on Payout Requests
DROP POLICY IF EXISTS "Organisers can view own payout requests" ON public.payout_requests;
CREATE POLICY "Organisers can view own payout requests"
  ON public.payout_requests FOR SELECT TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Organisers can insert payout request" ON public.payout_requests;
CREATE POLICY "Organisers can insert payout request"
  ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organiser_id);

DROP POLICY IF EXISTS "Admins can manage payout requests" ON public.payout_requests;
CREATE POLICY "Admins can manage payout requests"
  ON public.payout_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- F. RLS Policies on Refund Records
DROP POLICY IF EXISTS "Organisers can view refunds for their events" ON public.refund_records;
CREATE POLICY "Organisers can view refunds for their events"
  ON public.refund_records FOR SELECT TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage refund records" ON public.refund_records;
CREATE POLICY "Admins can manage refund records"
  ON public.refund_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- G. RLS Policies on Financial Audit Logs
DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.financial_audit_logs;
CREATE POLICY "Admins can view financial audit logs"
  ON public.financial_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMIT;


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20261008200000_admin_stats_and_user_directory.sql
-- ----------------------------------------------------
-- supabase/migrations/20261008200000_admin_stats_and_user_directory.sql
-- Additive functions for Super Admin Realtime Stats, Platform Users Directory, and Role Delegation.
-- Safe for live production: does not drop tables, does not alter existing columns, does not modify RLS on existing flows.

BEGIN;

-- 1. Realtime Platform Aggregation Metrics RPC
CREATE OR REPLACE FUNCTION public.get_admin_realtime_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_today_start timestamptz;
  v_total_gmv numeric;
  v_today_gmv numeric;
  v_total_tickets bigint;
  v_today_tickets bigint;
  v_total_organisers bigint;
  v_total_attendees bigint;
  v_total_events bigint;
  v_published_events bigint;
  v_total_checkins bigint;
  v_checkin_rate numeric;
  v_estimated_fees numeric;
BEGIN
  -- Verify caller is admin
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin privileges required';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');

  -- Gross Merchandise Volume (GMV)
  SELECT COALESCE(SUM(amount_paid), 0)
  INTO v_total_gmv
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed');

  -- Today's GMV
  SELECT COALESCE(SUM(amount_paid), 0)
  INTO v_today_gmv
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed')
    AND created_at >= v_today_start;

  -- Total tickets sold
  SELECT COUNT(*)
  INTO v_total_tickets
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed');

  -- Today's tickets sold
  SELECT COUNT(*)
  INTO v_today_tickets
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed')
    AND created_at >= v_today_start;

  -- User counts by role
  SELECT COUNT(DISTINCT user_id)
  INTO v_total_organisers
  FROM public.user_roles
  WHERE role = 'organiser';

  SELECT COUNT(DISTINCT user_id)
  INTO v_total_attendees
  FROM public.user_roles
  WHERE role = 'attendee';

  -- Events breakdown
  SELECT COUNT(*) INTO v_total_events FROM public.events;
  SELECT COUNT(*) INTO v_published_events FROM public.events WHERE status = 'published';

  -- Check-in counts
  SELECT COUNT(*)
  INTO v_total_checkins
  FROM public.registrations
  WHERE checked_in = true;

  -- Check-in rate percentage
  IF v_total_tickets > 0 THEN
    v_checkin_rate := ROUND((v_total_checkins::numeric / v_total_tickets::numeric) * 100, 1);
  ELSE
    v_checkin_rate := 0.0;
  END IF;

  -- Estimated platform take-rate (approx 3.5% + NGN 100 per paid ticket)
  SELECT COALESCE(SUM((amount_paid * 0.035) + CASE WHEN amount_paid > 0 THEN 100 ELSE 0 END), 0)
  INTO v_estimated_fees
  FROM public.registrations
  WHERE status IN ('completed', 'confirmed');

  RETURN json_build_object(
    'total_gmv', v_total_gmv,
    'today_gmv', v_today_gmv,
    'total_tickets', v_total_tickets,
    'today_tickets', v_today_tickets,
    'total_organisers', v_total_organisers,
    'total_attendees', v_total_attendees,
    'total_events', v_total_events,
    'published_events', v_published_events,
    'total_checkins', v_total_checkins,
    'checkin_rate_pct', v_checkin_rate,
    'estimated_fees', v_estimated_fees
  );
END;
$$;

-- 2. Platform Users Directory RPC
CREATE OR REPLACE FUNCTION public.get_admin_platform_users(
  search_query text DEFAULT '',
  limit_val int DEFAULT 50,
  offset_val int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_result json;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin privileges required';
  END IF;

  WITH attendee_users AS (
    SELECT DISTINCT ur.user_id, ur.created_at as role_created_at
    FROM public.user_roles ur
    WHERE ur.role = 'attendee'
  ),
  user_stats AS (
    SELECT 
      au.user_id,
      au.role_created_at,
      p.full_name,
      p.avatar_url,
      u.email,
      COALESCE(COUNT(r.id), 0) as tickets_count,
      COALESCE(SUM(r.amount_paid), 0) as total_spent,
      MAX(r.created_at) as last_activity,
      EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = au.user_id AND role = 'admin') as is_admin
    FROM attendee_users au
    LEFT JOIN public.profiles p ON p.user_id = au.user_id
    LEFT JOIN auth.users u ON u.id = au.user_id
    LEFT JOIN public.registrations r ON (r.user_id = au.user_id OR (u.email IS NOT NULL AND r.email = u.email))
    WHERE (
      search_query IS NULL 
      OR search_query = '' 
      OR p.full_name ILIKE '%' || search_query || '%'
      OR u.email ILIKE '%' || search_query || '%'
    )
    GROUP BY au.user_id, au.role_created_at, p.full_name, p.avatar_url, u.email
    ORDER BY au.role_created_at DESC
    LIMIT limit_val OFFSET offset_val
  )
  SELECT json_agg(
    json_build_object(
      'user_id', user_id,
      'full_name', COALESCE(full_name, 'Platform User'),
      'avatar_url', avatar_url,
      'email', COALESCE(email, ''),
      'tickets_count', tickets_count,
      'total_spent', total_spent,
      'last_activity', last_activity,
      'joined_at', role_created_at,
      'is_admin', is_admin
    )
  ) INTO v_result
  FROM user_stats;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 3. Secure Admin Delegation RPC
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_target_user_id uuid;
  v_clean_email text;
BEGIN
  -- Strict caller verification
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can delegate administrative roles';
  END IF;

  v_clean_email := lower(trim(target_email));
  IF v_clean_email = '' OR v_clean_email IS NULL THEN
    RAISE EXCEPTION 'Invalid email address provided';
  END IF;

  -- Look up target user ID from auth.users
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found with email: %', target_email;
  END IF;

  -- Grant admin role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_target_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'user_id', v_target_user_id,
    'email', v_clean_email,
    'message', 'Super Admin role granted successfully'
  );
END;
$$;

-- 4. Demote Admin with Lockout Protection RPC
CREATE OR REPLACE FUNCTION public.demote_admin(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
  v_admin_count int;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO v_caller_is_admin;
  IF NOT COALESCE(v_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Super Admin access required';
  END IF;

  -- Ensure at least 1 other admin remains to prevent platform lockout
  SELECT COUNT(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
  IF v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot demote: Platform must have at least one active Super Admin';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'admin';

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'message', 'Super Admin role revoked successfully'
  );
END;
$$;

COMMIT;


-- ----------------------------------------------------
-- SCRIPT: supabase\migrations\20261010190000_sms_wallet_atomic_remediation.sql
-- ----------------------------------------------------
-- supabase/migrations/20261010190000_sms_wallet_atomic_remediation.sql
--
-- SMS Wallet Integrity Remediation:
--   1. credit_sms_wallet: Idempotent top-up function called by Paystack Webhook and fund-wallet.
--   2. reserve_sms_wallet_funds: Upfront row-locked atomic reservation ensuring zero overdraft on Termii/Textflow API keys.
--   3. refund_sms_wallet_funds: Atomic refund function for undelivered/failed recipients.

-- 1. credit_sms_wallet
CREATE OR REPLACE FUNCTION credit_sms_wallet(
  p_organiser_id uuid,
  p_amount numeric,
  p_reference text,
  p_units integer,
  p_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_tx uuid;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Idempotency check: return immediately if already credited
  SELECT id INTO v_existing_tx
  FROM wallet_transactions
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    SELECT sms_balance INTO v_current_balance
    FROM organiser_wallets
    WHERE organiser_id = p_organiser_id;

    RETURN jsonb_build_object('ok', true, 'already_credited', true, 'new_balance', v_current_balance);
  END IF;

  -- Upsert wallet balance
  INSERT INTO organiser_wallets (organiser_id, sms_balance, plan, created_at, updated_at)
  VALUES (p_organiser_id, p_amount, 'free', NOW(), NOW())
  ON CONFLICT (organiser_id)
  DO UPDATE SET
    sms_balance = organiser_wallets.sms_balance + p_amount,
    updated_at = NOW()
  RETURNING sms_balance INTO v_new_balance;

  -- Record transaction ledger
  INSERT INTO wallet_transactions (
    organiser_id,
    type,
    amount,
    balance_after,
    reference,
    description,
    created_at
  )
  VALUES (
    p_organiser_id,
    'fund',
    p_amount,
    v_new_balance,
    p_reference,
    'Top-up: ' || p_units || ' SMS Credits (â‚¦' || p_amount || ' via ' || p_source || ')',
    NOW()
  );

  -- Record financial audit log
  INSERT INTO financial_audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    reference,
    metadata,
    created_at
  )
  VALUES (
    'wallet',
    p_organiser_id,
    'WALLET_FUNDED',
    p_source,
    p_reference,
    jsonb_build_object('amount', p_amount, 'units', p_units, 'new_balance', v_new_balance, 'source', p_source),
    NOW()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_credited', false,
    'amount_credited', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- 2. reserve_sms_wallet_funds
CREATE OR REPLACE FUNCTION reserve_sms_wallet_funds(
  p_organiser_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Row lock for update to prevent concurrent double-spending
  SELECT sms_balance INTO v_current_balance
  FROM organiser_wallets
  WHERE organiser_id = p_organiser_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wallet_not_found', 'balance', 0);
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_funds', 'balance', v_current_balance);
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE organiser_wallets
  SET sms_balance = v_new_balance,
      updated_at = NOW()
  WHERE organiser_id = p_organiser_id;

  RETURN jsonb_build_object('ok', true, 'balance_after', v_new_balance, 'reserved_amount', p_amount);
END;
$$;

-- 3. refund_sms_wallet_funds
CREATE OR REPLACE FUNCTION refund_sms_wallet_funds(
  p_organiser_id uuid,
  p_refund_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE organiser_wallets
  SET sms_balance = sms_balance + p_refund_amount,
      updated_at = NOW()
  WHERE organiser_id = p_organiser_id
  RETURNING sms_balance INTO v_new_balance;

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_balance);
END;
$$;



