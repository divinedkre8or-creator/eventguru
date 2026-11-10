-- supabase/SCHEDULED_JOBS.sql
--
-- EventGuru — Automated Scheduled Cron Jobs for Organizer Lifecycle Emails
-- 
-- 1. Weekly Performance Digest: Runs every Monday at 08:00 UTC
-- 2. Post-Event Debrief & Feedback: Runs every morning at 09:00 UTC
--
-- ==============================================================================
-- OPTION A: SUPABASE PG_CRON SETUP (Inside Supabase SQL Editor)
-- ==============================================================================

-- 1. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the wrapper function to invoke Edge Functions safely
CREATE OR REPLACE FUNCTION public.invoke_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text;
  service_key text;
  request_id bigint;
BEGIN
  -- Replace these with your Supabase project URL and Service Role Key, 
  -- or configure them via database vault / custom settings:
  project_url := coalesce(
    current_setting('app.settings.project_url', true),
    'https://xrkkhuqsacvkkruybujp.supabase.co'
  );
  
  service_key := coalesce(
    current_setting('app.settings.service_role_key', true),
    'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  );

  SELECT net.http_post(
    url := project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- 3. Schedule Weekly Organizer Digest (Every Monday at 08:00 UTC)
-- Cron expression: 0 8 * * 1 (Minute 0, Hour 8, Every Monday)
SELECT cron.unschedule('weekly-organizer-digest') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-organizer-digest'
);

SELECT cron.schedule(
  'weekly-organizer-digest',
  '0 8 * * 1',
  $$SELECT public.invoke_edge_function('send-organizer-digest', '{"limit": 100}'::jsonb);$$
);

-- 4. Schedule Daily Concluded Events Debrief (Every day at 09:00 UTC)
-- Cron expression: 0 9 * * * (Minute 0, Hour 9, Every day)
SELECT cron.unschedule('daily-post-event-debrief') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-post-event-debrief'
);

SELECT cron.schedule(
  'daily-post-event-debrief',
  '0 9 * * *',
  $$SELECT public.invoke_edge_function('send-post-event-debrief', '{"limit": 50}'::jsonb);$$
);

-- Check scheduled jobs status:
-- SELECT * FROM cron.job;


-- ==============================================================================
-- OPTION B: EXTERNAL CRON / GITHUB ACTIONS / VERCEL CRON
-- ==============================================================================
-- If you prefer using Vercel Cron or GitHub Actions to ping the edge functions:
--
-- 1. Weekly Digest Ping (Monday 8:00 AM UTC):
-- POST https://xrkkhuqsacvkkruybujp.supabase.co/functions/v1/send-organizer-digest
-- Headers:
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--   Content-Type: application/json
-- Body:
--   { "limit": 100 }
--
-- 2. Daily Post-Event Debrief Ping (Daily 9:00 AM UTC):
-- POST https://xrkkhuqsacvkkruybujp.supabase.co/functions/v1/send-post-event-debrief
-- Headers:
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--   Content-Type: application/json
-- Body:
--   { "limit": 50 }
--
-- ==============================================================================
-- OPTION C: INSTANT CLI / LOCAL TEST DISPATCH
-- ==============================================================================
-- To send a test preview digest right to your email:
--
-- curl -X POST https://xrkkhuqsacvkkruybujp.supabase.co/functions/v1/send-organizer-digest \
--   -H "Content-Type: application/json" \
--   -d '{"testEmail": "your-email@domain.com"}'
--
-- To send a test post-event debrief preview:
--
-- curl -X POST https://xrkkhuqsacvkkruybujp.supabase.co/functions/v1/send-post-event-debrief \
--   -H "Content-Type: application/json" \
--   -d '{"testEmail": "your-email@domain.com", "targetEventId": "YOUR_EVENT_ID"}'

