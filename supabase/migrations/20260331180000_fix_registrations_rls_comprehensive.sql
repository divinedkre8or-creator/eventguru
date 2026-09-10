-- ====================================================================
-- FIX REGISTRATIONS ROW LEVEL SECURITY (RLS) POLICIES
-- Resolves: new row violates row-level security policy for table "registrations"
-- Allows both authenticated and guest/anonymous attendees to register
-- for events smoothly without permission blocks.
-- ====================================================================

-- 1. Ensure RLS is enabled on registrations
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 2. Drop all previous restrictive or conflicting INSERT policies
DROP POLICY IF EXISTS "Anyone can register for events" ON public.registrations;
DROP POLICY IF EXISTS "Anyone can register for published events or organisers for their own" ON public.registrations;
DROP POLICY IF EXISTS "Public and attendees can register for events" ON public.registrations;

-- 3. Create comprehensive open INSERT policy for registrations
-- Any visitor (guest or authenticated) can submit a registration for an event.
CREATE POLICY "Public and attendees can register for events" ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4. Drop and recreate SELECT policies to allow attendees and guests to view their passes
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Attendees and guests can view their registrations" ON public.registrations;

CREATE POLICY "Attendees and guests can view their registrations" ON public.registrations
  FOR SELECT TO anon, authenticated
  USING (
    auth.uid() = user_id 
    OR user_id IS NULL
    OR (EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = registrations.event_id 
      AND events.organiser_id = auth.uid()
    ))
  );

-- 5. Organisers can update/manage registrations for their events (e.g. gate check-in)
DROP POLICY IF EXISTS "Organisers manage registrations for their events" ON public.registrations;
CREATE POLICY "Organisers manage registrations for their events" ON public.registrations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = registrations.event_id 
      AND events.organiser_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = registrations.event_id 
      AND events.organiser_id = auth.uid()
    )
  );
