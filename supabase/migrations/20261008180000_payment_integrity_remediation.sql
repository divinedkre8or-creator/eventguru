-- supabase/migrations/20261008180000_payment_integrity_remediation.sql
--
-- EVENTRALLY PRODUCTION PAYMENT INTEGRITY & FINANCIAL ARCHITECTURE REMEDIATION
--
-- This migration implements:
--   1. Orders table for authoritative financial snapshots.
--   2. Multi-ticket support linking registrations to orders.
--   3. Database-backed organizer payout profiles and payout requests.
--   4. Immutable refund records.
--   5. Financial audit trail logs.
--   6. Atomic order finalization RPC function (finalize_order_payment).
--   7. Strict RLS hardening:
--      - Closes the free-ticket bypass on paid events (eliminates ticket_type_id IS NULL loophole).
--      - Prevents organizers from modifying financial fields on registrations.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ORDERS TABLE — Authoritative Financial Snapshot Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organiser_id UUID NOT NULL,
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  user_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  gateway_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  organiser_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_provider TEXT NOT NULL DEFAULT 'paystack',
  payment_reference TEXT UNIQUE,
  gateway_transaction_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'free')),
  order_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'completed', 'cancelled', 'refunded')),
  custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  ticket_issued_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_event ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_organiser ON public.orders(organiser_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(payment_status, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. EXTEND REGISTRATIONS — Link Tickets to Orders
-- ----------------------------------------------------------------------------
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ticket_index INTEGER DEFAULT 1;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS ticket_code TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_order_id ON public.registrations(order_id);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_code ON public.registrations(ticket_code);
-- Drop legacy 1:1 constraint so 1 order/payment can own N tickets in registrations
DROP INDEX IF EXISTS public.idx_registrations_payment_reference_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_ticket_code_unique ON public.registrations(ticket_code) WHERE ticket_code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. ORGANIZER PAYOUT PROFILES & PAYOUT REQUESTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizer_payout_profiles (
  organiser_id UUID PRIMARY KEY,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  recipient_code TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_payout_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  reference TEXT,
  admin_notes TEXT,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payout_requests_organiser ON public.payout_requests(organiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- ----------------------------------------------------------------------------
-- 4. REFUND RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refund_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  organiser_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  gateway_refund_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed')),
  reason TEXT NOT NULL,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.refund_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_refund_records_order ON public.refund_records(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_records_organiser ON public.refund_records(organiser_id);

-- ----------------------------------------------------------------------------
-- 5. FINANCIAL AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'system',
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.financial_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.financial_audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. ATOMIC DATABASE RPC: finalize_order_payment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_order_payment(
  p_payment_reference TEXT,
  p_gateway_transaction_id TEXT,
  p_gateway_amount_kobo NUMERIC,
  p_gateway_currency TEXT,
  p_gateway_fee_kobo NUMERIC DEFAULT 0,
  p_actor_type TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_ticket_tier RECORD;
  v_ticket_ids UUID[] := ARRAY[]::UUID[];
  v_ticket_id UUID;
  v_ticket_code TEXT;
  v_paid_major NUMERIC(12,2);
  v_fee_major NUMERIC(12,2);
  v_net_major NUMERIC(12,2);
  v_i INTEGER;
BEGIN
  -- 1. Locate and lock the pending order
  SELECT * INTO v_order
  FROM public.orders
  WHERE payment_reference = p_payment_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Order not found for reference: ' || p_payment_reference
    );
  END IF;

  -- 2. Idempotency guard: If order is already completed / paid, return success
  IF v_order.order_status = 'completed' AND v_order.payment_status = 'paid' THEN
    SELECT array_agg(id) INTO v_ticket_ids
    FROM public.registrations
    WHERE order_id = v_order.id;

    RETURN jsonb_build_object(
      'ok', true,
      'order_id', v_order.id,
      'already_finalized', true,
      'ticket_ids', COALESCE(v_ticket_ids, ARRAY[]::UUID[]),
      'amount_paid', v_order.amount_paid,
      'platform_fee', v_order.platform_fee,
      'gateway_fee', v_order.gateway_fee,
      'organiser_net', v_order.organiser_net
    );
  END IF;

  -- 3. Strict currency validation
  IF UPPER(COALESCE(p_gateway_currency, 'NGN')) != UPPER(v_order.currency) THEN
    RAISE EXCEPTION 'Currency mismatch: Gateway returned %, order expected %', p_gateway_currency, v_order.currency;
  END IF;

  -- 4. Authoritative amount validation (allow 0.50 tolerance for gateway rounding)
  v_paid_major := ROUND(p_gateway_amount_kobo) / 100.0;
  v_fee_major := ROUND(COALESCE(p_gateway_fee_kobo, 0)) / 100.0;

  IF v_paid_major + 0.50 < v_order.amount_expected THEN
    RAISE EXCEPTION 'Underpayment: Gateway verified % %, required % %', v_paid_major, v_order.currency, v_order.amount_expected, v_order.currency;
  END IF;

  -- 5. Calculate authoritative organiser_net subtracting platform_fee and actual gateway_fee
  v_net_major := GREATEST(0, v_paid_major - v_order.platform_fee - v_fee_major);

  -- 6. Atomic ticket inventory check & update with row lock
  IF v_order.ticket_type_id IS NOT NULL THEN
    SELECT id, quantity, sold INTO v_ticket_tier
    FROM public.ticket_types
    WHERE id = v_order.ticket_type_id
    FOR UPDATE;

    IF v_ticket_tier.id IS NOT NULL THEN
      IF v_ticket_tier.quantity IS NOT NULL AND (v_ticket_tier.sold + v_order.quantity) > v_ticket_tier.quantity THEN
        RAISE EXCEPTION 'Ticket tier is sold out. Available: %, Requested: %', (v_ticket_tier.quantity - v_ticket_tier.sold), v_order.quantity;
      END IF;

      UPDATE public.ticket_types
      SET sold = sold + v_order.quantity
      WHERE id = v_ticket_tier.id;
    END IF;
  END IF;

  -- 7. Mark order completed with financial snapshots
  UPDATE public.orders
  SET payment_status = 'paid',
      order_status = 'completed',
      amount_paid = v_paid_major,
      gateway_fee = v_fee_major,
      organiser_net = v_net_major,
      gateway_transaction_id = p_gateway_transaction_id,
      paid_at = COALESCE(paid_at, now()),
      ticket_issued_at = now()
  WHERE id = v_order.id;

  -- 7. Multi-ticket issuance: generate N individual ticket rows in registrations
  FOR v_i IN 1..v_order.quantity LOOP
    v_ticket_id := gen_random_uuid();
    v_ticket_code := 'TKT-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));

    INSERT INTO public.registrations (
      id,
      order_id,
      event_id,
      ticket_type_id,
      user_id,
      full_name,
      email,
      phone,
      amount_paid,
      payment_reference,
      status,
      checked_in,
      ticket_index,
      ticket_code,
      custom_answers
    ) VALUES (
      v_ticket_id,
      v_order.id,
      v_order.event_id,
      v_order.ticket_type_id,
      v_order.user_id,
      v_order.customer_name,
      v_order.customer_email,
      v_order.customer_phone,
      v_order.unit_price,
      p_payment_reference,
      'completed',
      false,
      v_i,
      v_ticket_code,
      v_order.custom_answers
    );

    v_ticket_ids := array_append(v_ticket_ids, v_ticket_id);
  END LOOP;

  -- 8. Persistent Financial Audit Log
  INSERT INTO public.financial_audit_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_type,
    reference,
    metadata
  ) VALUES (
    'order',
    v_order.id::text,
    'PAYMENT_CONFIRMED',
    v_order.user_id,
    p_actor_type,
    p_payment_reference,
    jsonb_build_object(
      'amount_paid', v_paid_major,
      'quantity', v_order.quantity,
      'currency', v_order.currency,
      'gateway_transaction_id', p_gateway_transaction_id,
      'tickets_created', array_length(v_ticket_ids, 1)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'ticket_ids', v_ticket_ids,
    'quantity', v_order.quantity,
    'amount_paid', v_paid_major
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RLS SECURITY HARDENING
-- ----------------------------------------------------------------------------

-- A. Close the free-ticket bypass on paid events
-- Drop former policy and require genuine server-verifiable free ticket status
DROP POLICY IF EXISTS "Public can register for free tickets" ON public.registrations;
DROP POLICY IF EXISTS "Public can register only for genuinely free tickets" ON public.registrations;

CREATE POLICY "Public can register only for genuinely free tickets"
  ON public.registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    amount_paid = 0
    AND status = 'completed'
    AND checked_in = false
    AND ticket_type_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ticket_types t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = ticket_type_id
        AND t.event_id = registrations.event_id
        AND t.price = 0
        AND e.status = 'published'
    )
  );

-- B. Prevent organizers or any client from tampering with financial columns
CREATE OR REPLACE FUNCTION public.protect_registration_financial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role bypasses trigger (for server-side functions)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Freeze financial, order, payment, and identity columns from client updates
  IF NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR
     NEW.payment_reference IS DISTINCT FROM OLD.payment_reference OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.ticket_type_id IS DISTINCT FROM OLD.ticket_type_id OR
     NEW.event_id IS DISTINCT FROM OLD.event_id OR
     NEW.user_id IS DISTINCT FROM OLD.user_id OR
     NEW.order_id IS DISTINCT FROM OLD.order_id OR
     NEW.ticket_code IS DISTINCT FROM OLD.ticket_code THEN
    RAISE EXCEPTION 'Organizers cannot modify financial, order, or ticket identity fields on registrations';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_registration_financial_fields ON public.registrations;
CREATE TRIGGER trg_protect_registration_financial_fields
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_registration_financial_fields();

-- C. RLS Policies on Orders
DROP POLICY IF EXISTS "Organisers can view orders for their events" ON public.orders;
CREATE POLICY "Organisers can view orders for their events"
  ON public.orders FOR SELECT TO authenticated
  USING (
    organiser_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.events WHERE events.id = orders.event_id AND events.organiser_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'email') = customer_email
  );

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- D. RLS Policies on Organizer Payout Profiles
DROP POLICY IF EXISTS "Organisers can view own payout profile" ON public.organizer_payout_profiles;
CREATE POLICY "Organisers can view own payout profile"
  ON public.organizer_payout_profiles FOR SELECT TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Organisers can upsert own payout profile" ON public.organizer_payout_profiles;
CREATE POLICY "Organisers can upsert own payout profile"
  ON public.organizer_payout_profiles FOR ALL TO authenticated
  USING (auth.uid() = organiser_id)
  WITH CHECK (auth.uid() = organiser_id);

-- E. RLS Policies on Payout Requests
DROP POLICY IF EXISTS "Organisers can view own payout requests" ON public.payout_requests;
CREATE POLICY "Organisers can view own payout requests"
  ON public.payout_requests FOR SELECT TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Organisers can insert payout request" ON public.payout_requests;
CREATE POLICY "Organisers can insert payout request"
  ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organiser_id);

DROP POLICY IF EXISTS "Admins can manage payout requests" ON public.payout_requests;
CREATE POLICY "Admins can manage payout requests"
  ON public.payout_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- F. RLS Policies on Refund Records
DROP POLICY IF EXISTS "Organisers can view refunds for their events" ON public.refund_records;
CREATE POLICY "Organisers can view refunds for their events"
  ON public.refund_records FOR SELECT TO authenticated
  USING (auth.uid() = organiser_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage refund records" ON public.refund_records;
CREATE POLICY "Admins can manage refund records"
  ON public.refund_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- G. RLS Policies on Financial Audit Logs
DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.financial_audit_logs;
CREATE POLICY "Admins can view financial audit logs"
  ON public.financial_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMIT;
