-- supabase/migrations/20261010190000_sms_wallet_atomic_remediation.sql
--
-- SMS Wallet Integrity Remediation:
--   1. credit_sms_wallet: Idempotent top-up function called by Paystack Webhook and fund-wallet.
--   2. reserve_sms_wallet_funds: Upfront row-locked atomic reservation ensuring zero overdraft on Termii/Textflow API keys.
--   3. refund_sms_wallet_funds: Atomic refund function for undelivered/failed recipients.

-- 1. credit_sms_wallet
CREATE OR REPLACE FUNCTION credit_sms_wallet(
  p_organiser_id uuid,
  p_amount numeric,
  p_reference text,
  p_units integer,
  p_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_tx uuid;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Idempotency check: return immediately if already credited
  SELECT id INTO v_existing_tx
  FROM wallet_transactions
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    SELECT sms_balance INTO v_current_balance
    FROM organiser_wallets
    WHERE organiser_id = p_organiser_id;

    RETURN jsonb_build_object('ok', true, 'already_credited', true, 'new_balance', v_current_balance);
  END IF;

  -- Upsert wallet balance
  INSERT INTO organiser_wallets (organiser_id, sms_balance, plan, created_at, updated_at)
  VALUES (p_organiser_id, p_amount, 'free', NOW(), NOW())
  ON CONFLICT (organiser_id)
  DO UPDATE SET
    sms_balance = organiser_wallets.sms_balance + p_amount,
    updated_at = NOW()
  RETURNING sms_balance INTO v_new_balance;

  -- Record transaction ledger
  INSERT INTO wallet_transactions (
    organiser_id,
    type,
    amount,
    balance_after,
    reference,
    description,
    created_at
  )
  VALUES (
    p_organiser_id,
    'fund',
    p_amount,
    v_new_balance,
    p_reference,
    'Top-up: ' || p_units || ' SMS Credits (₦' || p_amount || ' via ' || p_source || ')',
    NOW()
  );

  -- Record financial audit log
  INSERT INTO financial_audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    reference,
    metadata,
    created_at
  )
  VALUES (
    'wallet',
    p_organiser_id,
    'WALLET_FUNDED',
    p_source,
    p_reference,
    jsonb_build_object('amount', p_amount, 'units', p_units, 'new_balance', v_new_balance, 'source', p_source),
    NOW()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'already_credited', false,
    'amount_credited', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- 2. reserve_sms_wallet_funds
CREATE OR REPLACE FUNCTION reserve_sms_wallet_funds(
  p_organiser_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Row lock for update to prevent concurrent double-spending
  SELECT sms_balance INTO v_current_balance
  FROM organiser_wallets
  WHERE organiser_id = p_organiser_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'wallet_not_found', 'balance', 0);
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_funds', 'balance', v_current_balance);
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE organiser_wallets
  SET sms_balance = v_new_balance,
      updated_at = NOW()
  WHERE organiser_id = p_organiser_id;

  RETURN jsonb_build_object('ok', true, 'balance_after', v_new_balance, 'reserved_amount', p_amount);
END;
$$;

-- 3. refund_sms_wallet_funds
CREATE OR REPLACE FUNCTION refund_sms_wallet_funds(
  p_organiser_id uuid,
  p_refund_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE organiser_wallets
  SET sms_balance = sms_balance + p_refund_amount,
      updated_at = NOW()
  WHERE organiser_id = p_organiser_id
  RETURNING sms_balance INTO v_new_balance;

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_balance);
END;
$$;
