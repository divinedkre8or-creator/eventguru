-- supabase/migrations/20261110000000_organizer_email_lifecycle.sql
--
-- EventGuru — Organizer Email Lifecycle, Automation Tracking & Host Reviews
-- Tracks automated email dispatches (weekly digest, post-event debrief, milestones)
-- and stores organizer feedback & NPS reviews.

BEGIN;

-- 1. Organizer Email Logs Table
CREATE TABLE IF NOT EXISTS public.organizer_email_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid REFERENCES public.events(id) ON DELETE SET NULL,
  organiser_id    uuid NOT NULL,
  email_type      text NOT NULL CHECK (email_type IN ('weekly_digest', 'post_event_debrief', 'milestone_first_sale', 'pre_flight_briefing', 'organizer_alert')),
  recipient_email text NOT NULL,
  status          text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'mock_sent', 'failed')),
  metadata        jsonb DEFAULT '{}'::jsonb,
  error           text,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast deduplication checks
CREATE INDEX IF NOT EXISTS idx_organizer_email_logs_event_type 
  ON public.organizer_email_logs (event_id, email_type);

CREATE INDEX IF NOT EXISTS idx_organizer_email_logs_organiser_type 
  ON public.organizer_email_logs (organiser_id, email_type, sent_at DESC);

-- Enable RLS
ALTER TABLE public.organizer_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organisers can view their own email logs" ON public.organizer_email_logs;
CREATE POLICY "Organisers can view their own email logs"
  ON public.organizer_email_logs FOR SELECT
  TO authenticated
  USING (organiser_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all email logs" ON public.organizer_email_logs;
CREATE POLICY "Admins can view all email logs"
  ON public.organizer_email_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );


-- 2. Organizer Reviews & Post-Event Feedback Table
CREATE TABLE IF NOT EXISTS public.organizer_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid REFERENCES public.events(id) ON DELETE CASCADE,
  organiser_id    uuid NOT NULL,
  rating          integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  highlight       text,
  feedback        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizer_reviews_event_id 
  ON public.organizer_reviews (event_id);

CREATE INDEX IF NOT EXISTS idx_organizer_reviews_organiser_id 
  ON public.organizer_reviews (organiser_id);

-- Enable RLS
ALTER TABLE public.organizer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert an organizer review" ON public.organizer_reviews;
CREATE POLICY "Anyone can insert an organizer review"
  ON public.organizer_reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Organisers can view their own reviews" ON public.organizer_reviews;
CREATE POLICY "Organisers can view their own reviews"
  ON public.organizer_reviews FOR SELECT
  TO authenticated
  USING (organiser_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all organizer reviews" ON public.organizer_reviews;
CREATE POLICY "Admins can view all organizer reviews"
  ON public.organizer_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

COMMIT;

