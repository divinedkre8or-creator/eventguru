-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Anyone can register for events" ON public.registrations;

-- Create the new policy that allows organizers to register (test) their own draft events, 
-- while still allowing the public to register for published events.
CREATE POLICY "Anyone can register for published events or organisers for their own" ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = registrations.event_id 
      AND (events.status = 'published' OR events.organiser_id = auth.uid())
    )
  );
