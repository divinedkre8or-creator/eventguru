-- supabase/migrations/20261110010000_bachs_automated_payouts.sql
-- 
-- Automated Bank Payouts with Bachs.io Integration
-- Supports instant organizer withdrawals, destination tracking, and double-spend idempotency.

-- 1. Upgrade organizer_payout_profiles
ALTER TABLE public.organizer_payout_profiles
  ADD COLUMN IF NOT EXISTS bachs_destination_id TEXT,
  ADD COLUMN IF NOT EXISTS destination_type TEXT DEFAULT 'bank_account' 
    CHECK (destination_type IN ('bank_account', 'mobile_money', 'crypto_wallet')),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS crypto_network TEXT,
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_organizer_payout_destination 
  ON public.organizer_payout_profiles(bachs_destination_id);

-- 2. Upgrade payout_requests for Bachs Tracking & Idempotency
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS bachs_payout_id TEXT,
  ADD COLUMN IF NOT EXISTS destination_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_gateway TEXT DEFAULT 'bachs',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS fee_deducted NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_requests_idempotency 
  ON public.payout_requests(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_requests_bachs_id 
  ON public.payout_requests(bachs_payout_id);

