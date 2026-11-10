-- supabase/migrations/20261110030000_gatekeeper_mode_and_manifest.sql
-- Gatekeeper Mode & Rapid Mobile Door Check-in Support

BEGIN;

-- 1. Add 6-digit gatekeeper access PIN to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS gatekeeper_pin TEXT DEFAULT LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

-- Backfill any existing events that might have NULL
UPDATE public.events
SET gatekeeper_pin = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE gatekeeper_pin IS NULL;

-- 2. Verify Gatekeeper PIN (for door staff login without organizer account)
CREATE OR REPLACE FUNCTION public.verify_gatekeeper_pin(
  p_event_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
BEGIN
  SELECT id, title, date, venue, city, gatekeeper_pin
  INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Event not found');
  END IF;

  IF TRIM(COALESCE(v_event.gatekeeper_pin, '')) <> TRIM(COALESCE(p_pin, '')) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid Gatekeeper PIN');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.date,
      'venue', v_event.venue,
      'city', v_event.city
    )
  );
END;
$$;

-- 3. Gatekeeper Process Ticket (Safe check-in via PIN with zero financial data exposure)
CREATE OR REPLACE FUNCTION public.gatekeeper_process_ticket(
  p_event_id UUID,
  p_pin TEXT,
  p_ticket_query TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid BOOLEAN := false;
  v_clean_query TEXT;
  v_reg RECORD;
  v_ticket_tier_name TEXT;
BEGIN
  -- Verify PIN first
  SELECT (TRIM(COALESCE(gatekeeper_pin, '')) = TRIM(COALESCE(p_pin, '')))
  INTO v_is_valid
  FROM public.events
  WHERE id = p_event_id;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object('ok', false, 'status', 'unauthorized', 'error', 'Invalid or expired Gatekeeper PIN');
  END IF;

  -- Clean query: trim whitespace and remove prefixes
  v_clean_query := TRIM(p_ticket_query);
  
  -- Try to parse JSON if query was a JSON QR code payload
  IF v_clean_query LIKE '{%}' THEN
    BEGIN
      v_clean_query := COALESCE(
        (v_clean_query::jsonb)->>'id',
        (v_clean_query::jsonb)->>'ref',
        v_clean_query
      );
    EXCEPTION WHEN OTHERS THEN
      -- Keep as string if json parse fails
    END;
  END IF;

  -- Extract UUID if it was a ticket URL
  IF v_clean_query ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    v_clean_query := (regexp_matches(v_clean_query, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'i'))[1];
  END IF;

  -- Lookup registration
  SELECT r.id, r.event_id, r.full_name, r.email, r.checked_in, r.checked_in_at, r.status, r.ticket_type_id, r.payment_reference
  INTO v_reg
  FROM public.registrations r
  WHERE r.event_id = p_event_id
    AND (
      r.id::text = v_clean_query
      OR LOWER(r.payment_reference) = LOWER(v_clean_query)
      OR LOWER(REPLACE(r.id::text, '-', '')) = LOWER(REPLACE(v_clean_query, '-', ''))
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'not_found',
      'message', 'Ticket not found for this event manifest'
    );
  END IF;

  -- Check status
  IF v_reg.status NOT IN ('confirmed', 'completed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'unpaid',
      'message', 'Ticket order is unpaid, cancelled, or pending confirmation'
    );
  END IF;

  -- Lookup ticket tier name
  SELECT name INTO v_ticket_tier_name
  FROM public.ticket_types
  WHERE id = v_reg.ticket_type_id;

  -- Already checked in?
  IF v_reg.checked_in THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_checked_in',
      'message', 'Attendee has ALREADY been admitted',
      'checked_in_at', v_reg.checked_in_at,
      'attendee', jsonb_build_object(
        'id', v_reg.id,
        'full_name', v_reg.full_name,
        'ticket_type', COALESCE(v_ticket_tier_name, 'General Admission'),
        'reference', v_reg.payment_reference
      )
    );
  END IF;

  -- Mark checked in atomically
  UPDATE public.registrations
  SET checked_in = true,
      checked_in_at = NOW()
  WHERE id = v_reg.id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'success',
    'message', 'Entry Approved',
    'checked_in_at', NOW(),
    'attendee', jsonb_build_object(
      'id', v_reg.id,
      'full_name', v_reg.full_name,
      'ticket_type', COALESCE(v_ticket_tier_name, 'General Admission'),
      'reference', v_reg.payment_reference
    )
  );
END;
$$;

-- 4. Gatekeeper Lightweight Manifest (for local offline caching at the gate)
CREATE OR REPLACE FUNCTION public.gatekeeper_get_manifest(
  p_event_id UUID,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid BOOLEAN := false;
  v_manifest JSONB;
BEGIN
  SELECT (TRIM(COALESCE(gatekeeper_pin, '')) = TRIM(COALESCE(p_pin, '')))
  INTO v_is_valid
  FROM public.events
  WHERE id = p_event_id;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid Gatekeeper PIN');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'full_name', r.full_name,
      'email_masked', CONCAT(LEFT(r.email, 2), '***@', SPLIT_PART(r.email, '@', 2)),
      'ticket_type', COALESCE(tt.name, 'General Admission'),
      'checked_in', r.checked_in,
      'checked_in_at', r.checked_in_at,
      'ref', r.payment_reference
    )
  )
  INTO v_manifest
  FROM public.registrations r
  LEFT JOIN public.ticket_types tt ON tt.id = r.ticket_type_id
  WHERE r.event_id = p_event_id
    AND r.status IN ('confirmed', 'completed');

  RETURN jsonb_build_object(
    'ok', true,
    'attendees', COALESCE(v_manifest, '[]'::jsonb)
  );
END;
$$;

-- 5. Organizer Reset Gatekeeper PIN
CREATE OR REPLACE FUNCTION public.reset_gatekeeper_pin(
  p_event_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_pin TEXT;
BEGIN
  -- Verify caller is event organizer or admin
  IF NOT (
    EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id AND organiser_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized to reset gatekeeper PIN';
  END IF;

  v_new_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  UPDATE public.events
  SET gatekeeper_pin = v_new_pin
  WHERE id = p_event_id;

  RETURN v_new_pin;
END;
$$;

-- Grant execution permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.verify_gatekeeper_pin(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gatekeeper_process_ticket(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gatekeeper_get_manifest(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_gatekeeper_pin(UUID) TO authenticated;

COMMIT;
