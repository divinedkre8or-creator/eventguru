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
