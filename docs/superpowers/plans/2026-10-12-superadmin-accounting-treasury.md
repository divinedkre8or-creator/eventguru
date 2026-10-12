# Super Admin Accounting & Financial Treasury Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, segmented, and mathematically verified Super Admin Accounting & Treasury dashboard (`/admin/accounting`) to provide platform owners with instant clarity on Gross Processed Volume (GMV), platform escrow and wallet liabilities, owner net profit, and double-entry reconciliation.

**Architecture:** A pure mathematical calculation engine (`src/lib/accountingCalculations.ts`) tested with Vitest, powering a modular tabbed React dashboard (`src/pages/admin/Accounting.tsx`) with 4 specialized sub-components (`ReconciliationProofCard`, `AccountingOverviewTab`, `TicketEconomicsTab`, `MessagingEconomicsTab`, `PayoutsVelocityTab`), integrated into `AdminLayout.tsx` directly before Settings and routed in `App.tsx`.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Lucide React, TanStack Query, Supabase Client, Vitest.

---

### Task 1: Mathematical Accounting Calculations Engine & Tests

**Files:**
- Create: `src/lib/accountingCalculations.ts`
- Create: `src/test/accountingCalculations.test.ts`

- [ ] **Step 1: Write the failing tests for accounting calculations**

Write test file `src/test/accountingCalculations.test.ts` covering:
- Gross processed volume calculation (orders subtotal + wallet top-ups).
- Platform liabilities (unsettled ticket escrow + unspent SMS wallet float + pending payouts).
- Owner net profit (ticket commissions + SMS retail markup margin - refunds).
- Automated double-entry reconciliation balance proof and variance calculation.
- Date filtering helper (`all_time`, `today`, `7d`, `30d`, `this_month`).

```typescript
// src/test/accountingCalculations.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateGrossInflow,
  calculatePlatformLiabilities,
  calculateOwnerNetProfit,
  calculateReconciliationProof,
  filterFinancialRecordsByDate,
  FinancialOrder,
  FinancialWallet,
  FinancialPayout,
  FinancialSmsCampaign,
  FinancialRefund,
} from "../lib/accountingCalculations";

describe("Accounting Calculations Engine", () => {
  const sampleOrders: FinancialOrder[] = [
    {
      id: "ord-1",
      amount_paid: 10000,
      subtotal: 10000,
      platform_fee: 250,
      gateway_fee: 150,
      organiser_net: 9600,
      payment_status: "paid",
      created_at: "2026-10-10T12:00:00Z",
    },
    {
      id: "ord-2",
      amount_paid: 20000,
      subtotal: 20000,
      platform_fee: 500,
      gateway_fee: 300,
      organiser_net: 19200,
      payment_status: "paid",
      created_at: "2026-10-11T12:00:00Z",
    },
  ];

  const sampleWallets: FinancialWallet[] = [
    { organiser_id: "org-1", sms_balance: 5000 },
    { organiser_id: "org-2", sms_balance: 3000 },
  ];

  const samplePayouts: FinancialPayout[] = [
    { id: "pay-1", amount: 9600, status: "paid", created_at: "2026-10-10T15:00:00Z" },
    { id: "pay-2", amount: 5000, status: "pending", created_at: "2026-10-11T15:00:00Z" },
  ];

  const sampleCampaigns: FinancialSmsCampaign[] = [
    { id: "camp-1", sent_count: 500, channel: "sms" },
  ];

  const sampleRefunds: FinancialRefund[] = [];

  it("calculates gross inflow accurately", () => {
    const walletTopups = 15000;
    const gross = calculateGrossInflow(sampleOrders, walletTopups);
    expect(gross.totalGrossInflow).toBe(45000); // 10000 + 20000 + 15000
    expect(gross.ticketsGross).toBe(30000);
    expect(gross.walletTopupsGross).toBe(15000);
  });

  it("calculates platform liabilities correctly", () => {
    const liabilities = calculatePlatformLiabilities(sampleOrders, sampleWallets, samplePayouts);
    // Total organiser net = 9600 + 19200 = 28800
    // Settled payouts = 9600
    // Pending payouts = 5000
    // Escrow held = 28800 - 9600 - 5000 = 14200
    expect(liabilities.ticketEscrowHeld).toBe(14200);
    expect(liabilities.unspentWalletFloat).toBe(8000); // 5000 + 3000
    expect(liabilities.pendingPayoutQueue).toBe(5000);
    expect(liabilities.totalLiabilities).toBe(27200); // 14200 + 8000 + 5000
  });

  it("calculates owner net profit and SMS margins correctly", () => {
    const profit = calculateOwnerNetProfit(sampleOrders, sampleCampaigns, sampleRefunds);
    // Ticket fees = 250 + 500 = 750
    expect(profit.ticketFeesCaptured).toBe(750);
    // SMS profit: 500 sent * (₦10 - ₦3.50) = 500 * 6.5 = 3250
    expect(profit.smsNetProfit).toBe(3250);
    expect(profit.ownerNetProfit).toBe(4000); // 750 + 3250
  });

  it("validates double-entry reconciliation balance proof", () => {
    const walletTopups = 8000 + 5000; // 13000 total funded
    // 5000 consumed on SMS (500 units @ ₦10), 8000 remaining float
    const proof = calculateReconciliationProof({
      totalGrossInflow: 43000, // 30000 tickets + 13000 wallet topups
      totalLiabilities: 27200, // 14200 escrow + 8000 wallet float + 5000 pending payout
      settledPayouts: 9600,
      ownerNetProfit: 4000,
      gatewayFees: 450,
      cogsWholesaleSms: 1750, // 500 sent * ₦3.50
      refunds: 0,
    });

    // 27200 (Liabilities) + 9600 (Settled) + 4000 (Owner Net) + 450 (Gateway) + 1750 (Wholesale SMS COGS) = 43000
    expect(proof.isBalanced).toBe(true);
    expect(proof.variance).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/accountingCalculations.test.ts`
Expected: FAIL (module `accountingCalculations` does not exist yet).

- [ ] **Step 3: Implement `src/lib/accountingCalculations.ts`**

Write the pure functions, types, and mathematical formulas in `src/lib/accountingCalculations.ts`.

```typescript
// src/lib/accountingCalculations.ts

export interface FinancialOrder {
  id: string;
  amount_paid: number;
  subtotal: number;
  platform_fee: number;
  gateway_fee: number;
  organiser_net: number;
  payment_status: string;
  created_at: string;
  event_title?: string;
  organiser_id?: string;
}

export interface FinancialWallet {
  organiser_id: string;
  sms_balance: number;
  full_name?: string;
}

export interface FinancialPayout {
  id: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  created_at: string;
  organiser_id?: string;
  organiser_name?: string;
  bank_name?: string;
}

export interface FinancialSmsCampaign {
  id: string;
  sent_count: number;
  channel: string;
}

export interface FinancialRefund {
  id: string;
  amount: number;
  status?: string;
}

export const WHOLESALE_SMS_COGS_NGN = 3.5;
export const AVERAGE_RETAIL_SMS_PRICE_NGN = 10.0;

export function calculateGrossInflow(orders: FinancialOrder[], walletTopupsNgn: number) {
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const ticketsGross = paidOrders.reduce((sum, o) => sum + (Number(o.subtotal) || Number(o.amount_paid) || 0), 0);
  const totalGrossInflow = ticketsGross + (Number(walletTopupsNgn) || 0);

  return {
    ticketsGross,
    walletTopupsGross: Number(walletTopupsNgn) || 0,
    totalGrossInflow,
  };
}

export function calculatePlatformLiabilities(
  orders: FinancialOrder[],
  wallets: FinancialWallet[],
  payouts: FinancialPayout[]
) {
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const totalOrganiserNet = paidOrders.reduce((sum, o) => sum + (Number(o.organiser_net) || 0), 0);

  const settledPayouts = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingPayoutQueue = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const ticketEscrowHeld = Math.max(0, totalOrganiserNet - settledPayouts - pendingPayoutQueue);

  const unspentWalletFloat = wallets.reduce(
    (sum, w) => sum + Math.max(0, Number(w.sms_balance) || 0),
    0
  );

  const totalLiabilities = ticketEscrowHeld + unspentWalletFloat + pendingPayoutQueue;

  return {
    ticketEscrowHeld,
    unspentWalletFloat,
    pendingPayoutQueue,
    settledPayouts,
    totalLiabilities,
  };
}

export function calculateOwnerNetProfit(
  orders: FinancialOrder[],
  smsCampaigns: FinancialSmsCampaign[],
  refunds: FinancialRefund[]
) {
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const totalTicketFees = paidOrders.reduce((sum, o) => sum + (Number(o.platform_fee) || 0), 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const ticketFeesCaptured = Math.max(0, totalTicketFees - totalRefunds);

  const totalSmsDelivered = smsCampaigns
    .filter((c) => c.channel === "sms")
    .reduce((sum, c) => sum + (Number(c.sent_count) || 0), 0);

  const smsWholesaleCost = totalSmsDelivered * WHOLESALE_SMS_COGS_NGN;
  const smsRetailBilled = totalSmsDelivered * AVERAGE_RETAIL_SMS_PRICE_NGN;
  const smsNetProfit = Math.max(0, smsRetailBilled - smsWholesaleCost);

  const ownerNetProfit = ticketFeesCaptured + smsNetProfit;

  return {
    ticketFeesCaptured,
    totalSmsDelivered,
    smsWholesaleCost,
    smsRetailBilled,
    smsNetProfit,
    ownerNetProfit,
  };
}

export interface ReconciliationInputs {
  totalGrossInflow: number;
  totalLiabilities: number;
  settledPayouts: number;
  ownerNetProfit: number;
  gatewayFees: number;
  cogsWholesaleSms: number;
  refunds: number;
}

export function calculateReconciliationProof(inputs: ReconciliationInputs) {
  const {
    totalGrossInflow,
    totalLiabilities,
    settledPayouts,
    ownerNetProfit,
    gatewayFees,
    cogsWholesaleSms,
    refunds,
  } = inputs;

  const rightHandSide =
    totalLiabilities + settledPayouts + ownerNetProfit + gatewayFees + cogsWholesaleSms + refunds;

  const variance = Math.abs(Math.round(totalGrossInflow - rightHandSide));
  const isBalanced = variance === 0;

  return {
    totalGrossInflow,
    rightHandSide,
    variance,
    isBalanced,
  };
}

export function filterFinancialRecordsByDate<T extends { created_at?: string }>(
  records: T[],
  range: "all_time" | "today" | "7d" | "30d" | "this_month"
): T[] {
  if (range === "all_time") return records;

  const now = new Date();
  const start = new Date();

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    start.setDate(now.getDate() - 7);
  } else if (range === "30d") {
    start.setDate(now.getDate() - 30);
  } else if (range === "this_month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  const startTime = start.getTime();
  return records.filter((r) => {
    if (!r.created_at) return true;
    const time = new Date(r.created_at).getTime();
    return time >= startTime;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/accountingCalculations.test.ts`
Expected: PASS with all 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/accountingCalculations.ts src/test/accountingCalculations.test.ts
git commit -m "feat(accounting): add mathematical calculations engine and unit tests"
```

---

### Task 2: Live Mathematical Reconciliation Card Component

**Files:**
- Create: `src/components/admin/accounting/ReconciliationProofCard.tsx`

- [ ] **Step 1: Implement `ReconciliationProofCard.tsx`**

Build the high-visibility double-entry audit card showing:
- Left hand side: Gross Inflow
- Right hand side: Liabilities + Settled Payouts + Owner Net Profit + Gateway Fees + Wholesale Telco Costs
- Live variance badge: Green `✓ 100% Balanced (₦0.00 Variance)` or amber warning when out of sync.
- Interactive tooltip explaining the accounting formula.

```tsx
// src/components/admin/accounting/ReconciliationProofCard.tsx
import { ShieldCheck, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { ReconciliationInputs, calculateReconciliationProof } from "@/lib/accountingCalculations";

interface Props {
  inputs: ReconciliationInputs;
}

export const ReconciliationProofCard = ({ inputs }: Props) => {
  const proof = calculateReconciliationProof(inputs);

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
      proof.isBalanced 
        ? "bg-emerald-500/5 border-emerald-500/30 text-foreground" 
        : "bg-amber-500/5 border-amber-500/40 text-foreground"
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${
            proof.isBalanced ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600"
          }`}>
            {proof.isBalanced ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
              Automated Double-Entry Reconciliation Proof
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                proof.isBalanced ? "bg-emerald-500/20 text-emerald-600" : "bg-amber-500/20 text-amber-600"
              }`}>
                {proof.isBalanced ? "✓ BALANCED" : "FLAGGED VARIANCE"}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live mathematical ledger verification ensuring every Naira in the platform is accounted for.
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">Variance Gap</div>
          <div className={`font-mono text-base font-bold ${proof.isBalanced ? "text-emerald-600" : "text-amber-600"}`}>
            ₦{proof.variance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Mathematical Flow Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-3 text-xs">
        <div className="md:col-span-3 bg-card p-3 rounded-xl border border-border">
          <div className="text-muted-foreground text-[11px] font-bold uppercase">Total Inflow (GMV)</div>
          <div className="text-sm font-black font-mono text-foreground mt-0.5">
            ₦{inputs.totalGrossInflow.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground">Tickets + Top-ups</div>
        </div>

        <div className="md:col-span-1 flex justify-center text-muted-foreground font-black text-base">
          =
        </div>

        <div className="md:col-span-8 bg-card p-3 rounded-xl border border-border">
          <div className="text-muted-foreground text-[11px] font-bold uppercase mb-1">
            Allocated Sum (Liabilities + Settled + Profit + Fees)
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-foreground">
            <span>
              <strong className="text-amber-500">₦{inputs.totalLiabilities.toLocaleString("en-NG")}</strong> <span className="text-[10px] text-muted-foreground">(Liabilities)</span>
            </span>
            <span className="text-muted-foreground">+</span>
            <span>
              <strong className="text-blue-500">₦{inputs.settledPayouts.toLocaleString("en-NG")}</strong> <span className="text-[10px] text-muted-foreground">(Settled)</span>
            </span>
            <span className="text-muted-foreground">+</span>
            <span>
              <strong className="text-emerald-500">₦{inputs.ownerNetProfit.toLocaleString("en-NG")}</strong> <span className="text-[10px] text-muted-foreground">(Our Profit)</span>
            </span>
            <span className="text-muted-foreground">+</span>
            <span>
              <strong className="text-muted-foreground">₦{(inputs.gatewayFees + inputs.cogsWholesaleSms).toLocaleString("en-NG")}</strong> <span className="text-[10px] text-muted-foreground">(COGS & Gateway)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/accounting/ReconciliationProofCard.tsx
git commit -m "feat(accounting): add automated double-entry reconciliation card"
```

---

### Task 3: Segmentation Tabs (Overview, Tickets, Messaging, Payouts)

**Files:**
- Create: `src/components/admin/accounting/AccountingOverviewTab.tsx`
- Create: `src/components/admin/accounting/TicketEconomicsTab.tsx`
- Create: `src/components/admin/accounting/MessagingEconomicsTab.tsx`
- Create: `src/components/admin/accounting/PayoutsVelocityTab.tsx`

- [ ] **Step 1: Implement `AccountingOverviewTab.tsx`**

4 top cards:
- Gross Inflow (GMV)
- Total Platform Liabilities (Escrow + Unspent Wallets)
- Owner Net Profit (Realized Margin)
- Settled Payouts
Plus liquidity distribution and revenue streams comparison breakdown.

- [ ] **Step 2: Implement `TicketEconomicsTab.tsx`**

- Paid tickets vs free registrations
- Average ticket price & average commission per paid ticket
- Top grossing events table with ticket volume, GMV, platform fee captured, and payout status.

- [ ] **Step 3: Implement `MessagingEconomicsTab.tsx`**

- SMS wallet fundings total
- SMS dispatched units count
- Wholesale Telco costs (₦3.50/SMS) vs Retail Revenue billed
- Net SMS profit margin percentage (50%+)
- Active organizer wallet liability balance table.

- [ ] **Step 4: Implement `PayoutsVelocityTab.tsx`**

- Settled payouts total & count
- Pending payout requests awaiting release
- Average turnaround time
- List of recent payouts with bank details and settlement timestamps.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/accounting/
git commit -m "feat(accounting): create detailed segmentation tabs for overview, tickets, messaging, and payouts"
```

---

### Task 4: Master Accounting Page with Date Filters & CSV Export

**Files:**
- Create: `src/pages/admin/Accounting.tsx`

- [ ] **Step 1: Implement `src/pages/admin/Accounting.tsx`**

- Parallel queries via TanStack React Query for `orders`, `organiser_wallets`, `wallet_transactions`, `payout_requests`, `campaigns`, `refund_records`.
- Date range picker dropdown (`all_time`, `this_month`, `30d`, `7d`, `today`).
- Tab switcher (`overview`, `tickets`, `messaging`, `payouts`).
- Comprehensive CSV Export generating authoritative timestamped accounting summary.
- Loading spinners and error handling with `sonner` toasts.

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/Accounting.tsx
git commit -m "feat(accounting): create master Accounting & Treasury page"
```

---

### Task 5: Routing & Sidebar Navigation Integration

**Files:**
- Modify: `src/layouts/AdminLayout.tsx` (add Accounting & Treasury right before Settings)
- Modify: `src/App.tsx` (register route `/admin/accounting`)

- [ ] **Step 1: Update `src/layouts/AdminLayout.tsx`**

Import `BadgePercent` or `Landmark` icon from `lucide-react`.
Insert `{ title: "Accounting & Treasury", path: "/admin/accounting", icon: Landmark }` into `navItems` immediately before `{ title: "Settings & Admins", path: "/admin/settings", icon: Settings }`.

- [ ] **Step 2: Update `src/App.tsx`**

Import `AdminAccounting` (lazy loaded) and register:
`<Route path="accounting" element={<AdminAccounting />} />` inside the `/admin` route group.

- [ ] **Step 3: Run Vitest and TypeScript build checks**

Run:
`npx vitest run`
`npm run build`
Expected: Zero build or type errors.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/AdminLayout.tsx src/App.tsx
git commit -m "feat(admin): register Accounting & Treasury route and sidebar item"
```

---

### Task 6: End-to-End Verification & Sanity Checks

**Files:**
- Test: Vitest test suite
- Verification: Browser inspection

- [ ] **Step 1: Run full test suite**
Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run production build check**
Run: `npm run build`
Expected: Build succeeds without warnings or TypeScript errors.

- [ ] **Step 3: Commit all changes**
```bash
git status
git commit -m "chore: complete superadmin accounting dashboard integration"
```
