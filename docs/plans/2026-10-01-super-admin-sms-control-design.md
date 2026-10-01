# Super Admin SMS & Messaging Control Panel Specification

**Date:** 2026-10-01  
**Author:** Antigravity (Advanced AI Engineer)  
**Status:** In Review  
**Target:** EventRally Platform (`eventguru`)

---

## 1. Executive Summary & Problem Definition

EventRally integrates **Textflow.ng** as its primary SMS gateway for:
1. **Attendee Ticket Delivery** (instant SMS tickets upon registration).
2. **Organiser Campaign Studio** (bulk SMS broadcasts to registered event attendees).

### Current Architectural Gap:
* **Asymmetric Balances:** Event organizers buy SMS credits at retail price (₦6.50/unit) into their individual `organiser_wallets`. However, all messages exit through EventRally's single central Textflow upstream account (`TEXTFLOW_API_TOKEN`) funded at wholesale rate (~₦3.50 - ₦4.00/unit).
* If the central Textflow account balance drops to zero or near-zero (currently at ₦20.00), organizer dispatches will fail silently or throw errors, even if the organizer has thousands of credits in their wallet.
* Super Admins currently have no visibility into central gateway balance, total organizer credit liability, dispatch throughput, delivery failure rates, or organizer SMS consumption records.

---

## 2. Proposed Architecture & Solution Design

We will implement a unified **SMS & Messaging Control Center** in the Super Admin portal at `/admin/sms`, backed by a secure Supabase Edge Function (`admin-sms-ops`).

```
+--------------------------------------------------------------------------+
|                        SUPER ADMIN SMS CONTROL PANEL                     |
|                               (/admin/sms)                               |
+--------------------------------------------------------------------------+
       |                                                    |
       v (Admin JWT)                                        v (Admin JWT)
+----------------------------+                      +----------------------+
| Supabase Edge Function     |                      | Supabase Postgres DB |
| (admin-sms-ops)            |                      +----------------------+
+----------------------------+                      | - organiser_wallets  |
       |                                            | - wallet_transactions|
       v                                            | - campaigns          |
+----------------------------+                      | - campaign_recipients|
| Textflow REST API          |                      | - profiles / events  |
| - GET /v1/balance          |                      +----------------------+
| - GET /v1/user             |
| - POST /v1/sms/send        |
+----------------------------+
```

---

## 3. Core Modules & User Interface

### Module 1: Provider Health & Central Balance Monitor
* **Real-time Live Balance Fetch:** Live query to Textflow API via `admin-sms-ops` returning NGN cash balance, sender ID, and account status.
* **Remaining SMS Capacity Gauge:** Automatically calculates estimated deliverable SMS units (e.g., `₦45,000 ÷ ₦3.75 = ~12,000 SMS units`).
* **Health Status & Alert Badges:**
  * 🟢 **Healthy:** Balance > ₦10,000 (ample capacity).
  * 🟡 **Low Balance Warning:** ₦2,500 – ₦10,000 (needs top-up soon).
  * 🔴 **Critical Depletion:** < ₦2,500 (dispatch failure imminent).
* **Solvency & Liability Risk Meter:**
  * **Organiser Liabilities:** Sum of all unspent organizer wallet balances (`∑ organiser_wallets.sms_balance`).
  * **Solvency Ratio:** `(Central Textflow Balance / Total Organiser Liabilities) * 100%`.
  * Warns admin if organizers hold more credits than what is funded at the gateway.
* **One-Click Recharge Action:** Direct link to Textflow recharge portal with quick-copy bank details.

### Module 2: Key Performance Indicators (Economics & Delivery)
* **Lifetime SMS Revenue (₦):** Total Paystack top-up volume from `wallet_transactions` where `type = 'fund'`.
* **Lifetime SMS Consumed (₦):** Total SMS expenditure debited for campaigns.
* **Estimated Platform Gross Profit (₦):** Net margin retained between retail (₦6.50) and wholesale (~₦3.75).
* **Global Delivery Rate (%):** Platform-wide delivery success percentage (`Sent / (Sent + Failed)`).

### Module 3: Organiser SMS Accounts Directory & Ledger
* **Searchable & Filterable Table:**
  * Columns: Organiser Name, Email, In-App Wallet Balance (₦ and converted SMS units), Lifetime SMS Sent, Lifetime Top-ups (₦), Last Active Date, Actions.
  * Search by name, email, or filter by zero-balance vs. active wallets.
* **Organiser Ledger Modal / Drawer:**
  * Displays complete history of all `wallet_transactions` (Paystack Top-ups, Campaign Debits, Admin Grants).
* **Admin Credit Grant / Adjustment Tool:**
  * Allows Super Admin to credit or debit an organizer's SMS wallet (e.g., complimentary promotional credits, refunds, or manual balance fixes) with mandatory audit notes logged directly into `wallet_transactions`.

### Module 4: Platform-Wide Bulk SMS Campaign Monitor
* **Live Campaign Stream:**
  * Complete audit trail of all SMS campaigns triggered by organizers across all events.
  * Columns: Campaign Subject, Event Title, Organiser Name, Target Recipients, Sent Count, Failed Count, Delivery %, Total Cost Charged, Status (`sent`, `sending`, `failed`, `draft`), Timestamp.
* **Campaign Delivery Inspector Modal:**
  * Allows super admin to drill into any campaign and inspect individual recipient delivery statuses (`sent` vs. `failed`) with raw provider error descriptions (e.g., "Invalid number", "DND active", "Network unreachable").

### Module 5: Super Admin Test Dispatch & System Broadcast
* **Diagnostic Test SMS:**
  * Super Admin can input any phone number and send a live 1-message test to verify that Textflow routing, sender ID ("Textflow" / "EventRally"), and telecom interconnects are operating smoothly.
* **Admin Platform Broadcast (Optional / Power Feature):**
  * Super Admin can compose an urgent announcement to:
    1. All Event Organisers.
    2. Attendees of a specific selected event.
    3. Custom comma-separated recipient numbers.

---

## 4. Backend Implementation Plan

### 1. Edge Function: `supabase/functions/admin-sms-ops/index.ts`
* Protected by Supabase JWT + verified `public.has_role(auth.uid(), 'admin')` check.
* Implements the following actions:
  1. `get_provider_status`: Queries Textflow `/balance` and `/user`.
  2. `send_test_sms`: Sends a direct test message via Textflow.
  3. `send_admin_broadcast`: Sends a multi-recipient admin broadcast.
  4. `adjust_wallet_balance`: Adjusts an organizer wallet with proper ledger insertion.

### 2. Frontend Routing & Components
* **Route:** `/admin/sms` in `src/App.tsx`.
* **Sidebar:** Add "SMS & Messaging" with `MessageSquare` or `Send` icon in `src/layouts/AdminLayout.tsx`.
* **Page Component:** `src/pages/admin/SMSControlPanel.tsx` with tabs:
  1. `Overview & Central Balance`
  2. `Organiser Wallets`
  3. `Campaign Feed`
  4. `Test & Broadcast Tools`
* **Components:**
  - `src/components/admin/sms/CentralBalanceCard.tsx`
  - `src/components/admin/sms/OrganiserSmsTable.tsx`
  - `src/components/admin/sms/SmsCampaignsTable.tsx`
  - `src/components/admin/sms/GrantCreditsModal.tsx`
  - `src/components/admin/sms/TestSmsModal.tsx`
  - `src/components/admin/sms/AdminBroadcastModal.tsx`

---

## 5. Security & Safety Principles
1. **Zero Secret Leakage:** Textflow API token remains strictly server-side inside Supabase Edge secrets.
2. **Role Enforced:** Edge function explicitly rejects any user who is not a verified `admin` in `user_roles`.
3. **Immutable Audit Trail:** All manual balance grants or adjustments generate an audit entry in `wallet_transactions` with `reference = 'ADMIN-GRANT-...'` and the admin's email in the description.
4. **Idempotency & Limits:** Broadcast tool limits maximum simultaneous admin blast to 500 recipients per click to prevent accidental billing overruns.

---

## 6. Success Metrics
* Super Admin can check the exact central Textflow balance and remaining units in real-time.
* Super Admin receives visual warnings whenever central balance drops below ₦5,000.
* Organizers' SMS balance consumption is transparently tracked and can be audited or adjusted with full accountability.
* Any delivery failures in bulk SMS campaigns can be diagnosed instantly down to the recipient level.
