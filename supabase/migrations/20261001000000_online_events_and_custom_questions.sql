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
