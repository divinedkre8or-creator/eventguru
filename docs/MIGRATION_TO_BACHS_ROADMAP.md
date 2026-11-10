# EventGuru: Safe Migration to Bachs.io Roadmap

**Last Updated:** November 2026  
**Status:** Phase 1 (Automated Payouts & Smooth UI) Implemented • Paystack Active & Intact

---

## 1. Paystack Safety & Zero-Breakage Policy

Per strict production directives, **Paystack has NOT been deleted or broken**. All existing checkout pipelines, SMS wallet top-ups, and webhooks remain active and backwards-compatible.

### Audit of Paystack Touchpoints in Codebase:

| Component | File Path | Current Status | Bachs Migration Plan |
|---|---|---|---|
| **Public Key & Config** | `.env`, `src/lib/platformSettings.ts` | Active fallback (`VITE_PAYSTACK_PUBLIC_KEY`) | Keep during transition; toggleable in Admin Settings |
| **Ticket Checkout Modal** | `src/components/events/CheckoutModal.tsx` | Uses `react-paystack` for paid tickets | Phase 2 will introduce Bachs Multi-Currency / Crypto Checkout option |
| **SMS Wallet Top-up** | `src/components/campaigns/MessagingWalletModal.tsx` | Uses `react-paystack` for SMS credits | Phase 2 will add Bachs transfer / card option |
| **Order Verification** | `supabase/functions/complete-registration` | Verifies via Paystack API | Will support dual verification (`PAYSTACK_SECRET_KEY` & `BACHS_SECRET_KEY`) |
| **SMS Wallet Verification** | `supabase/functions/fund-wallet` | Verifies Paystack transactions | Will support Bachs instant deposit webhook |
| **Webhook Handler** | `supabase/functions/paystack-webhook` | Authoritative server webhook | Retained; new `bachs-webhook` will run alongside it |

---

## 2. Bachs Automated Payouts Engine (Phase 1 Implemented)

### What Was Built:
1. **Curated Bank Directory (`src/lib/banks.ts`):**
   * Pre-indexed list of top 30 Nigerian commercial, digital, and microfinance banks (Moniepoint, OPay, PalmPay, Kuda, GTBank, Zenith, Access, Providus, etc.) with exact central clearing codes.
   * Auto-resolves bank names to valid NIP codes.
2. **Digital Odometer Rolling Counter (`src/components/ui/RollingCounter.tsx`):**
   * Fintech-grade rolling number counter with spring physics.
   * Digits slide vertically when balances or ticket revenues update, mimicking a luxury digital clock / trading terminal.
3. **Tactile Spring Micro-Interactions (`src/components/ui/TactileButton.tsx`):**
   * Tactile button compression (`whileTap={{ scale: 0.96 }}`) and spring release with loading states.
4. **Organizer Payments Redesign (`src/pages/dashboard/Payments.tsx`):**
   * All 6 financial columns now use the rolling odometer.
   * Replaced manual payout request button with an **"Withdraw Funds"** action.
   * Opens an interactive, mobile-responsive confirmation modal with beneficiary verification.
   * Dispatches instant payouts via the `bachs-payout` Edge Function.
5. **Admin Desk Automation (`src/pages/admin/Transactions.tsx`):**
   * Added a one-click **"Disburse via Bachs"** action button in both desktop and mobile card layouts.
   * Retained manual settlement as a fallback.
6. **Backend Edge Function (`supabase/functions/bachs-payout/index.ts`):**
   * Authoritatively checks user session and verifies available balance on the server to prevent overdraft.
   * Uses deterministic `Idempotency-Key` (`evr_pout_<uuid>`) to eliminate double-spend risk.
   * Automatically registers the organizer's destination on Bachs (`POST /v1/payouts/destinations`).
   * Fires programmatic transfer via Bachs API (`POST /v1/payouts`).
   * Records transaction in `financial_audit_logs`.
7. **Database Migration (`supabase/migrations/20261110010000_bachs_automated_payouts.sql`):**
   * Enhances `organizer_payout_profiles` with `bachs_destination_id`.
   * Enhances `payout_requests` with `bachs_payout_id`, `idempotency_key`, `payout_gateway`, and `fee_deducted`.

---

## 3. Deployment Runbook

### Step A: Set the Bachs Secret Key in Supabase
Run in PowerShell / Terminal:
```bash
supabase secrets set BACHS_SECRET_KEY=sk_live_9d774e3b_YPZ3fHOdfbSnyL2FkjoqtpffEjmQ476i9mYovG-XdEk
```

### Step B: Run the Database Migration
Execute in Supabase SQL Editor:
```sql
-- Paste contents of:
-- supabase/migrations/20261110010000_bachs_automated_payouts.sql
```

### Step C: Deploy the Edge Function
```bash
supabase functions deploy bachs-payout
```

---

## 4. Security Checklist

* [x] **No Secret Key in Frontend:** `BACHS_SECRET_KEY` is formatted in `.env` without the `VITE_` prefix, preventing Vite from bundling it to client browsers.
* [x] **Zero KYC Friction for Organizers:** Organizers operate under Sleekedge Tech Solutions' master verified merchant account on Bachs. Organizers only provide their bank account to receive disbursements.
* [x] **Double-Spend Protection:** Every withdrawal has a unique UUID and deterministic `Idempotency-Key` passed to Bachs.
* [x] **Server-Enforced Balance Limits:** Organizers can never withdraw more than their authoritative `netRevenue - settled - pending` balance.
* [x] **Fallback Protection:** If network or gateway errors occur, the system safely records the request into `payout_requests` for administrative review.

