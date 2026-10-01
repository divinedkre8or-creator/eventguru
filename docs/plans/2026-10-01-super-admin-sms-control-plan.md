# Super Admin SMS Control Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade Super Admin SMS Control Panel (`/admin/sms`) enabling platform administrators to monitor central Textflow balances, track organizer wallet liabilities, audit platform-wide bulk SMS campaigns, inspect delivery failures, grant manual wallet credits, and dispatch diagnostic test/broadcast messages.

**Architecture:** A secure server-side Supabase Edge Function (`admin-sms-ops`) proxies Textflow upstream calls, performs admin role authorization, and handles audited wallet adjustments. The React frontend presents a 4-tab control center within `AdminLayout` displaying provider health, organizer ledgers, campaign feeds, and diagnostic broadcast tools.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide Icons, Supabase (Postgres & Edge Functions / Deno), Textflow REST API, Vitest.

---

## File Structure

- **New Backend Edge Function:**
  - `supabase/functions/admin-sms-ops/index.ts` — Admin-only endpoint for Textflow balance, test SMS, broadcast dispatch, and audited wallet adjustments.
- **New Frontend Components:**
  - `src/pages/admin/SMSControlPanel.tsx` — Main control panel page hosting the 4 operational tabs and KPI header.
  - `src/components/admin/sms/SmsOverviewTab.tsx` — Central balance card, solvency ratio meter, economics & delivery rate KPIs.
  - `src/components/admin/sms/SmsOrganisersTab.tsx` — Searchable table of organizer wallets, lifetime usage, and actions.
  - `src/components/admin/sms/SmsCampaignsTab.tsx` — Platform-wide campaign stream with deliverability metrics.
  - `src/components/admin/sms/SmsToolsTab.tsx` — Diagnostic single-test SMS and multi-recipient admin broadcast tool.
  - `src/components/admin/sms/GrantCreditsModal.tsx` — Modal for Super Admin to credit or debit organizer SMS wallets with audit logging.
  - `src/components/admin/sms/CampaignRecipientsModal.tsx` — Modal to drill into recipient delivery states and provider errors.
- **Modified Core Files:**
  - `src/layouts/AdminLayout.tsx` — Add "SMS & Messaging" to admin navigation sidebar.
  - `src/App.tsx` — Register `/admin/sms` lazy route.
- **Test Files:**
  - `src/test/admin-sms.test.ts` — Tests for SMS solvency calculations, capacity estimation, and balance threshold logic.

---

## Tasks

### Task 1: Admin SMS Solvency & Calculation Unit Tests

**Files:**
- Create: `src/lib/smsCalculations.ts`
- Create: `src/test/admin-sms.test.ts`

- [ ] **Step 1: Write test for SMS calculations**
  Create unit test file `src/test/admin-sms.test.ts` covering:
  - `calculateRemainingUnits(balanceNgn, costPerUnit)`
  - `calculateSolvencyRatio(centralBalance, totalLiabilities)`
  - `getCentralBalanceHealth(balanceNgn, lowThreshold, criticalThreshold)`
  - `formatNaira(amount)`

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test src/test/admin-sms.test.ts`
  Expected: FAIL with module not found or functions undefined.

- [ ] **Step 3: Implement `src/lib/smsCalculations.ts`**
  Implement the utility functions with robust edge case handling (0 balance, 0 liabilities, negative inputs, null values).

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test src/test/admin-sms.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat(admin): add SMS solvency and calculation utilities with unit tests"`

---

### Task 2: Backend Supabase Edge Function (`admin-sms-ops`)

**Files:**
- Create: `supabase/functions/admin-sms-ops/index.ts`

- [ ] **Step 1: Implement authentication & admin role guard**
  Authenticate caller JWT with Supabase auth and verify caller has `role = 'admin'` in `user_roles`. Return HTTP 403 for unauthorized callers.

- [ ] **Step 2: Implement `get_provider_status` action**
  Query `https://textflow.ng/api/v1/balance` and `https://textflow.ng/api/v1/user` using `TEXTFLOW_API_TOKEN`. Return balance, currency, account owner, and sender IDs.

- [ ] **Step 3: Implement `send_test_sms` action**
  Validate phone number format (E.164 / 234 prefix) and dispatch single test message via Textflow `POST https://textflow.ng/api/v1/sms/send`.

- [ ] **Step 4: Implement `adjust_wallet_balance` action**
  Execute atomic wallet credit/debit for an organizer with audited reason and reference in `wallet_transactions`.

- [ ] **Step 5: Implement `send_admin_broadcast` action**
  Accept audience selection (`all_organisers`, `event_attendees`, or `custom`), collect recipient phone numbers, dispatch via Textflow batching, and record results.

- [ ] **Step 6: Commit**
  `git commit -m "feat(edge-functions): create admin-sms-ops edge function for textflow telemetry and ops"`

---

### Task 3: Modal Components (Grant Credits & Recipient Inspector)

**Files:**
- Create: `src/components/admin/sms/GrantCreditsModal.tsx`
- Create: `src/components/admin/sms/CampaignRecipientsModal.tsx`

- [ ] **Step 1: Create `GrantCreditsModal.tsx`**
  Build clean dialog with:
  - Organiser name & current balance
  - Action selector: Credit (Gift/Bonus) or Debit (Correction)
  - Amount in Naira + auto-calculated SMS units (at ₦6.50/unit)
  - Mandatory audit reason field
  - Calls `admin-sms-ops` or updates `organiser_wallets` + `wallet_transactions`
  - Feedback toast and callback on success

- [ ] **Step 2: Create `CampaignRecipientsModal.tsx`**
  Build drawer/dialog with:
  - Campaign title and summary chips (Sent, Failed, Pending)
  - Searchable list of recipients (`contact`, `name`, `status`, `error`, `sent_at`)
  - Red badges for failed reasons (e.g. invalid phone number)
  - Loading skeleton and empty state

- [ ] **Step 3: Commit**
  `git commit -m "feat(admin): build GrantCreditsModal and CampaignRecipientsModal components"`

---

### Task 4: Sub-Tab Components (Overview, Organisers, Campaigns, Tools)

**Files:**
- Create: `src/components/admin/sms/SmsOverviewTab.tsx`
- Create: `src/components/admin/sms/SmsOrganisersTab.tsx`
- Create: `src/components/admin/sms/SmsCampaignsTab.tsx`
- Create: `src/components/admin/sms/SmsToolsTab.tsx`

- [ ] **Step 1: Create `SmsOverviewTab.tsx`**
  - Central Textflow Balance hero card with live status indicator (🟢/🟡/🔴) and reload trigger.
  - Direct "Recharge Textflow" external button with quick-copy credentials hint.
  - Solvency Risk Meter (Central Balance vs Total Liabilities).
  - KPI Cards: Total In-App SMS Sold (₦), Total Consumed (₦), Gross Margin (₦), Delivery Success Rate (%).

- [ ] **Step 2: Create `SmsOrganisersTab.tsx`**
  - Search input for organizer name/email.
  - Table: Organiser Name, Email, Wallet Balance (₦ + units), Lifetime SMS Sent, Lifetime Spend, Last Active Date.
  - Actions: "Grant / Adjust Balance" button (opens `GrantCreditsModal`), "View Transactions Ledger" drawer.

- [ ] **Step 3: Create `SmsCampaignsTab.tsx`**
  - Table of all platform SMS campaigns: Event, Organiser, Audience Size, Delivered, Failed, Success %, Total Cost (₦), Date.
  - Filter by status (`all`, `sent`, `sending`, `failed`).
  - Action button: "Inspect Deliverability" (opens `CampaignRecipientsModal`).

- [ ] **Step 4: Create `SmsToolsTab.tsx`**
  - Section A: **Diagnostic Test SMS** (Phone input, sender ID selector, 1-click test button, real-time response log).
  - Section B: **Super Admin Broadcast** (Recipient selector: All Organisers / Specific Event Attendees / Custom, SMS body composer with character count and SMS unit estimator, dispatch button with confirmation prompt).

- [ ] **Step 5: Commit**
  `git commit -m "feat(admin): build SMS sub-tabs (Overview, Organisers, Campaigns, Tools)"`

---

### Task 5: Page Assembly, Routing & Sidebar Navigation

**Files:**
- Create: `src/pages/admin/SMSControlPanel.tsx`
- Modify: `src/layouts/AdminLayout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `SMSControlPanel.tsx`**
  Integrate state management (fetching provider balance via edge function, fetching organizers from `organiser_wallets` + `profiles`, fetching campaigns from `campaigns` where `channel = 'sms'`).
  Provide responsive 4-tab switcher, header controls, and toast notifications.

- [ ] **Step 2: Update `src/layouts/AdminLayout.tsx`**
  Import `MessageSquare` icon and add `{ title: "SMS & Messaging", path: "/admin/sms", icon: MessageSquare }` to `navItems`.

- [ ] **Step 3: Register route in `src/App.tsx`**
  Add lazy import for `SMSControlPanel` and mount `<Route path="sms" element={<AdminSMS />} />` inside `/admin`.

- [ ] **Step 4: Verify complete project build and tests**
  Run: `npm run build` and `npm run test`
  Expected: Clean build with zero TypeScript errors and all tests passing.

- [ ] **Step 5: Commit**
  `git commit -m "feat(admin): mount SMS Control Panel route and navigation link"`

---

### Task 6: End-to-End Verification & Walkthrough

- [ ] **Step 1: Verify in browser**
  Navigate to `/admin/sms` using the subagent/browser tool or local preview.
  Check all 4 tabs, balance cards, and responsive layout.

- [ ] **Step 2: Verify provider balance fetch**
  Confirm live Textflow balance displays accurately.

- [ ] **Step 3: Final Git Commit and Artifact Walkthrough**
  Ensure clean repository status and present walkthrough to user.
