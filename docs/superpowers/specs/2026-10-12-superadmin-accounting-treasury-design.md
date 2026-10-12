# Super Admin Accounting & Financial Treasury Design Specification

- **Feature**: Super Admin Accounting & Platform Financial Treasury Dashboard
- **Route**: `/admin/accounting`
- **Target Audience**: Platform Owners, Super Administrators, Financial Operations
- **Date**: 2026-10-12
- **Status**: Approved Specification

---

## 1. Executive Summary & Problem Statement

As platform owners of EventRally, managing millions of Naira in transactions requires absolute mathematical accuracy and instant clarity regarding:
1. **Total Cash Inflow**: Every Naira processed through Paystack (ticket sales, SMS wallet fundings, add-ons).
2. **Platform Liabilities & Custodial Escrow**: The portion of money that belongs to event organizers (ticket sales not yet paid out) and unspent SMS messaging balances.
3. **Owner Net Revenue (Our Profit)**: The exact realized margin that belongs to the platform owners (2.5% ticket commissions + 50%+ SMS retail markup), minus gateway fees and refunds.
4. **Reconciliation Health**: Proof that every single Naira is accounted for without discrepancies.

Previously, financial data was scattered between the raw order ledger in `/admin/transactions` and telecom metrics in `/admin/sms`. This specification unifies all monetary streams into a dedicated **Accounting & Treasury** dashboard (`/admin/accounting`) positioned directly before **Settings & Admins** in the Super Admin portal.

---

## 2. Navigation & Architecture

### 2.1 Route & Access Control
* **Route Path**: `/admin/accounting`
* **Parent Layout**: `AdminLayout.tsx`
* **Access Control**: Strict `app_role: 'admin'` check enforced via `ProtectedRoute` and Supabase RLS policies.
* **Component File**: `src/pages/admin/Accounting.tsx`
* **Sub-components**: `src/components/admin/accounting/`
  * `AccountingOverviewTab.tsx`
  * `TicketEconomicsTab.tsx`
  * `MessagingEconomicsTab.tsx`
  * `PayoutsVelocityTab.tsx`
  * `ReconciliationProofCard.tsx`

### 2.2 Navigation Order in `src/layouts/AdminLayout.tsx`
The sidebar `navItems` will be ordered as:
1. Overview (`/admin`)
2. Realtime Stats (`/admin/stats`)
3. All Events (`/admin/events`)
4. Organisers (`/admin/organisers`)
5. Users (`/admin/users`)
6. Transactions (`/admin/transactions`)
7. SMS & Messaging (`/admin/sms`)
8. Disputes (`/admin/disputes`)
9. Feedback & Support (`/admin/feedback`)
10. **Accounting & Treasury (`/admin/accounting`)** *(Positioned directly before Settings)*
11. Settings & Admins (`/admin/settings`)

Icon: `Landmark` or `BadgeDollarSign` from `lucide-react`.

---

## 3. Financial Pillars & Double-Entry Calculations

### 3.1 Pillar 1: Platform Cash Flow & Gross Processed Volume (GMV)
* **Gross Inflow ($GMV$)**:
  $$\text{Gross Inflow} = \sum \text{orders.amount\_paid (status = 'paid')} + \sum \text{wallet\_transactions.amount (type = 'fund')}$$
* **Paystack Gateway Fees**:
  $$\text{Gateway Fees} = \sum \text{orders.gateway\_fee}$$
* **Net Cash In Custody**:
  $$\text{Net Cash Inflow} = \text{Gross Inflow} - \text{Gateway Fees} - \sum \text{payout\_requests.amount (status = 'paid')}$$

### 3.2 Pillar 2: Platform Liabilities & Escrow (What We Owe)
* **Organizer Ticket Escrow**: Net ticket revenues held by the platform for events that have not been settled to organizers:
  $$\text{Ticket Escrow} = \sum \text{orders.organiser\_net (status = 'paid')} - \sum \text{payout\_requests.amount (status = 'paid')} - \sum \text{payout\_requests.amount (status \in \{\text{'pending'}, \text{'processing'}\})}$$
* **Unspent SMS Wallet Float**: Prepaid SMS credits held in user wallets:
  $$\text{Wallet Float} = \sum \text{organiser\_wallets.sms\_balance}$$
* **Pending Payout Queue**: Payout requests waiting for bank transfer release:
  $$\text{Pending Payouts} = \sum \text{payout\_requests.amount (status \in \{\text{'pending'}, \text{'processing'}\})}$$
* **Total Platform Liabilities**:
  $$\text{Total Liabilities} = \text{Ticket Escrow} + \text{Wallet Float} + \text{Pending Payouts}$$

### 3.3 Pillar 3: Owner Equity & Realized Net Profit (What Is Ours)
* **Ticket Commission Cut**: 
  $$\text{Ticket Fees Captured} = \sum \text{orders.platform\_fee (status = 'paid')} - \sum \text{refund\_records.amount (platform fee clawbacks)}$$
* **SMS Messaging Realized Profit**:
  * Retail Price: Average ₦9.00 - ₦10.00 / SMS
  * Wholesale Cost (COGS): ₦3.50 / SMS
  * Formula:
    $$\text{SMS Profit} = \sum \text{campaigns.sent\_count (channel = 'sms')} \times (\text{Retail Rate} - \text{Wholesale Cost ₦3.50})$$
* **Owner Net Profit**:
  $$\text{Owner Net Profit} = \text{Ticket Fees Captured} + \text{SMS Profit}$$

### 3.4 Pillar 4: The Live Mathematical Reconciliation Equation
The system enforces automated double-entry verification:
$$\text{Gross Inflow} = \text{Total Liabilities} + \text{Settled Payouts} + \text{Owner Net Profit} + \text{Gateway Fees} + \text{Processed Refunds}$$
* **Variance Indicator**:
  $$\text{Variance} = |\text{Gross Inflow} - (\text{Liabilities} + \text{Settled} + \text{Profit} + \text{Fees} + \text{Refunds})|$$
* If $\text{Variance} == 0$, display **✓ 100% Balanced & Reconciled (₦0.00 Variance)** in green.
* If $\text{Variance} > 0$, display a high-contrast amber warning with exact variance for forensic review.

---

## 4. User Interface & Feature Specifications

### 4.1 Header & Control Bar
* **Title**: Platform Financial Treasury & Accounting
* **Subtitle**: Authoritative balance sheet, owner revenue margins, custodial escrow liabilities, and double-entry reconciliation.
* **Date Filter**: Dropdown with presets (`All Time`, `This Month`, `Last 30 Days`, `Last 7 Days`, `Today`, `Custom`).
* **Actions**:
  * `Refresh` button with loading state.
  * `Export Treasury CSV` button (generates a timestamped financial report with all balance sheet totals and breakdown rows).

### 4.2 Top-Level KPI Summary Grid (4 Cards)
1. **Total Cash Inflow (GMV)**
   * Large currency display (`₦X,XXX,XXX.XX`).
   * Breakdown subtitle: Tickets + SMS Top-ups.
2. **Current Platform Liabilities (Escrow + Wallets)**
   * High-contrast amber card accent.
   * Breakdown: Organizer Ticket Escrow + Unspent SMS Float + Pending Payouts.
3. **Owner Net Revenue (Our Profit)**
   * Vibrant emerald green accent.
   * Breakdown: Ticket Commissions (2.5%) + SMS Gross Margin.
4. **Settled Payouts to Date**
   * Neutral blue accent.
   * Total money already transferred to organizers' verified bank accounts.

### 4.3 Automated Reconciliation Proof Banner
* Visual equation box displaying the live mathematical balance.
* Shows left side ($\text{Gross Inflow}$) vs right side ($\text{Liabilities} + \text{Settled} + \text{Profit} + \text{Fees} + \text{Refunds}$).
* Zero-variance badge (`₦0.00 Discrepancy`).

### 4.4 Tabbed Segmentation Views
1. **Overview & Balance Sheet Tab**:
   * Asset vs Liability split visualization.
   * Revenue vs Expenses comparison (Inflow vs Gateway Fees & Wholesale Telco costs).
   * Quick-jump metrics to critical financial thresholds.
2. **Ticket Economics Tab**:
   * Paid vs Free ticket volume.
   * Average ticket price and commission captured per transaction.
   * Top 10 revenue-generating events and their platform fee contribution.
3. **SMS & Messaging Margins Tab**:
   * Total funded wallet volume vs consumed volume.
   * Gross SMS units delivered.
   * Wholesale Telco COGS (₦3.50/unit) vs Retail Revenue.
   * Active organizer wallet liability ranking (who holds unspent float).
4. **Payouts & Settlement Velocity Tab**:
   * Total payouts approved vs rejected vs pending.
   * Average payout turnaround time.
   * Top receiving organizers and verified bank distribution.

---

## 5. Performance & Data Fetching Strategy

* **Optimized Queries**: Parallel batch fetching using TanStack Query / `Promise.all` across:
  * `orders` (grouped by status, subtotal, platform_fee, gateway_fee, organiser_net).
  * `organiser_wallets` (sum of `sms_balance`).
  * `wallet_transactions` (sum of `fund` transactions).
  * `payout_requests` (grouped by status, amount).
  * `campaigns` (sum of `sent_count` for SMS).
* **Caching**: 30-second stale time via React Query with background refetch on tab focus so navigating around the Super Admin portal is instant.
* **Defensive Calculations**: Zero-division protection, strict null/undefined coercion (`Number(val) || 0`), and fallback handling if historical data contains legacy rows without order snapshots.

---

## 6. Verification & Testing Plan

1. **Routing Verification**:
   * Verify navigation link `/admin/accounting` renders directly before `/admin/settings` in the sidebar.
   * Verify non-admin users cannot access the route (redirected or blocked).
2. **Formula Integrity Tests**:
   * Verify mathematical reconciliation formula evaluates to zero variance against test datasets.
   * Verify unspent SMS wallet balances are correctly counted as liabilities.
   * Verify platform fees are properly separated from organizer net amounts.
3. **Export Integrity**:
   * Verify CSV export produces valid CSV with correct headers and numeric formats.
4. **UI Responsiveness & Themes**:
   * Test on desktop and mobile drawer views.
   * Verify light and dark mode color contrast.
