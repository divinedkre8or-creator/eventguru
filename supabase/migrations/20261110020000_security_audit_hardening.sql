-- supabase/migrations/20261110020000_security_audit_hardening.sql
--
-- Security Audit Remediation:
-- 1. Prevent cascade deletion of events with paid orders or confirmed attendees.
-- 2. Drop direct client INSERT policy on payout_requests (force creation via server-side RPC / edge function).
-- 3. Atomic payout disbursement claim with row-level transaction advisory lock (eliminates withdrawal double-spend races).
-- 4. Reset bachs_destination_id when bank details change on organizer_payout_profiles.

BEGIN;

-- ============================================================================
-- 1. PREVENT PAID EVENT DELETION (Closes Cascade Deletion Flaw)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_paid_event_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block hard-deletion if event has paid orders or completed tickets
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE event_id = OLD.id
      AND payment_status = 'paid'
  ) OR EXISTS (
    SELECT 1 FROM public.registrations
    WHERE event_id = OLD.id
      AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Cannot delete an event that has active paid orders or confirmed attendees. Please update event status to cancelled instead.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_paid_event_deletion ON public.events;
CREATE TRIGGER trg_prevent_paid_event_deletion
  BEFORE DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_paid_event_deletion();


-- ============================================================================
-- 2. LOCK DOWN PAYOUT_REQUESTS RLS (Block Direct Client Spoofed Inserts)
-- ============================================================================
DROP POLICY IF EXISTS "Organisers can insert payout request" ON public.payout_requests;
-- Note: Organizers can still SELECT their own payout requests (auth.uid() = organiser_id).
-- Only service_role (Edge Functions) and admins can insert or update payout_requests.


-- ============================================================================
-- 3. RESET CACHED BACHS DESTINATION ON BANK ACCOUNT CHANGE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_bachs_destination_on_bank_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.account_number IS DISTINCT FROM NEW.account_number) OR
     (OLD.bank_code IS DISTINCT FROM NEW.bank_code) THEN
    NEW.bachs_destination_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_bachs_destination ON public.organizer_payout_profiles;
CREATE TRIGGER trg_reset_bachs_destination
  BEFORE UPDATE ON public.organizer_payout_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_bachs_destination_on_bank_change();


-- ============================================================================
-- 4. ATOMIC PAYOUT DISBURSEMENT CLAIM (Eliminates Race Conditions / Double-Spend)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_payout_disbursement(
  p_organiser_id UUID,
  p_requested_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net_revenue NUMERIC(12,2) := 0;
  v_settled_total NUMERIC(12,2) := 0;
  v_pending_total NUMERIC(12,2) := 0;
  v_available NUMERIC(12,2) := 0;
  v_disburse_amount NUMERIC(12,2);
  v_payout_id UUID;
  v_reference TEXT;
  v_idempotency_key TEXT;
  v_profile RECORD;
BEGIN
  -- 1. Acquire transaction advisory lock specific to this organiser (prevents concurrent race)
  PERFORM pg_advisory_xact_lock(hashtext('payout_' || p_organiser_id::text));

  -- 2. Verify bank profile exists
  SELECT * INTO v_profile
  FROM public.organizer_payout_profiles
  WHERE organiser_id = p_organiser_id;

  IF NOT FOUND OR v_profile.account_number IS NULL OR v_profile.bank_name IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No verified bank account found. Please save and verify payout bank details first.'
    );
  END IF;

  -- 3. Compute net revenue from paid orders
  SELECT COALESCE(SUM(organiser_net), 0) INTO v_net_revenue
  FROM public.orders
  WHERE organiser_id = p_organiser_id
    AND payment_status = 'paid';

  -- 4. Compute settled and in-flight payouts
  SELECT
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN amount ELSE 0 END), 0)
  INTO v_settled_total, v_pending_total
  FROM public.payout_requests
  WHERE organiser_id = p_organiser_id;

  v_available := GREATEST(0, v_net_revenue - v_settled_total - v_pending_total);

  -- Determine amount to disburse
  IF p_requested_amount IS NOT NULL AND p_requested_amount > 0 THEN
    v_disburse_amount := ROUND(p_requested_amount, 2);
  ELSE
    v_disburse_amount := v_available;
  END IF;

  IF v_disburse_amount <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Available balance is ₦0.00. No funds to withdraw.',
      'available', v_available
    );
  END IF;

  IF v_disburse_amount > v_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Requested amount (₦' || v_disburse_amount || ') exceeds available balance (₦' || v_available || ')',
      'available', v_available
    );
  END IF;

  -- 5. Atomically insert payout_requests with status 'processing'
  v_payout_id := gen_random_uuid();
  v_idempotency_key := 'evr_pout_' || v_payout_id;
  v_reference := 'EVR-POUT-' || EXTRACT(EPOCH FROM now())::BIGINT || '-' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 6));

  INSERT INTO public.payout_requests (
    id,
    organiser_id,
    amount,
    currency,
    bank_name,
    account_number,
    account_name,
    status,
    payout_gateway,
    destination_id,
    idempotency_key,
    reference,
    admin_notes,
    created_at
  ) VALUES (
    v_payout_id,
    p_organiser_id,
    v_disburse_amount,
    'NGN',
    v_profile.bank_name,
    v_profile.account_number,
    v_profile.account_name,
    'processing',
    'bachs',
    v_profile.bachs_destination_id,
    v_idempotency_key,
    v_reference,
    'Instant withdrawal initiated by organizer via Bachs',
    now()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'payout_id', v_payout_id,
    'amount', v_disburse_amount,
    'reference', v_reference,
    'idempotency_key', v_idempotency_key,
    'available_after', (v_available - v_disburse_amount),
    'bank_name', v_profile.bank_name,
    'account_number', v_profile.account_number,
    'account_name', v_profile.account_name,
    'bank_code', COALESCE(v_profile.bank_code, '058'),
    'destination_id', v_profile.bachs_destination_id
  );
END;
$$;

COMMIT;

