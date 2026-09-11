-- supabase/migrations/20260910120000_security_hardening.sql
--
-- EventRally security hardening.
--
-- ============================================================================
-- !! DEPLOY ORDER MATTERS — APPLY THIS *AFTER* THE EDGE FUNCTIONS ARE LIVE !!
--   1. Set secrets:   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
--   2. Deploy funcs:  supabase functions deploy complete-registration
--                     supabase functions deploy get-ticket
--   3. THEN apply this migration.
-- Applying this before the functions exist will block all public ticket
-- purchases and guest ticket lookups, because those paths move to the service
-- role. See supabase/DEPLOY_RUNBOOK.md.
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
-- B1. Remove the blanket public INSERT on registrations.
--
-- Was: WITH CHECK (true) for anon+authenticated, which let the browser forge
-- rows with status='completed' and an arbitrary amount_paid. Public/guest
-- registration now flows exclusively through the complete-registration edge
-- function (service role). Organisers keep INSERT for their own events via the
-- pre-existing "Organisers manage registrations for their events" FOR ALL policy.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public and attendees can register for events" ON public.registrations;

-- ----------------------------------------------------------------------------
-- B2. Fix the world-readable guest-registration SELECT leak.
--
-- Was: USING (auth.uid() = user_id OR user_id IS NULL OR <organiser>) — the
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
-- OPTIONAL HARDENING — review before enabling; each changes product behavior.
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
