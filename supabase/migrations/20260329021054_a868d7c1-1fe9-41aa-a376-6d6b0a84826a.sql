
-- Events table
CREATE TABLE public.events (
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

-- Ticket types table
CREATE TABLE public.ticket_types (
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

-- Registrations / attendees table
CREATE TABLE public.registrations (
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

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Events policies: organisers manage their own events, everyone can view published
CREATE POLICY "Organisers can manage their own events" ON public.events
  FOR ALL TO authenticated
  USING (auth.uid() = organiser_id)
  WITH CHECK (auth.uid() = organiser_id);

CREATE POLICY "Anyone can view published events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Ticket types: organisers manage via event ownership, anyone can view active
CREATE POLICY "Organisers manage ticket types" ON public.ticket_types
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = ticket_types.event_id AND events.organiser_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = ticket_types.event_id AND events.organiser_id = auth.uid()));

CREATE POLICY "Anyone can view active ticket types" ON public.ticket_types
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Registrations: organisers can view registrations for their events
CREATE POLICY "Organisers view registrations for their events" ON public.registrations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid()));

CREATE POLICY "Organisers manage registrations for their events" ON public.registrations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.organiser_id = auth.uid()));

CREATE POLICY "Users can view their own registrations" ON public.registrations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can register (insert) for published events
CREATE POLICY "Anyone can register for events" ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.status = 'published'));
