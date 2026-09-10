-- ====================================================================
-- MYEVENTGURU — MASTER COMBINED DATABASE MIGRATION SCRIPT
-- Copy & Paste this entire file into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/edpnvsakkudorleqqhxv/sql/new)
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

