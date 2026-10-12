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
    const proof = calculateReconciliationProof({
      totalGrossInflow: 43000,
      totalLiabilities: 27200,
      settledPayouts: 9600,
      ownerNetProfit: 4000,
      gatewayFees: 450,
      cogsWholesaleSms: 1750, // 500 sent * ₦3.50
      refunds: 0,
    });

    expect(proof.isBalanced).toBe(true);
    expect(proof.variance).toBe(0);
  });

  it("filters financial records by date range", () => {
    const now = new Date();
    const records = [
      { id: "1", created_at: now.toISOString() },
      { id: "2", created_at: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString() }, // 40 days ago
    ];

    const all = filterFinancialRecordsByDate(records, "all_time");
    expect(all.length).toBe(2);

    const filtered30d = filterFinancialRecordsByDate(records, "30d");
    expect(filtered30d.length).toBe(1);
    expect(filtered30d[0].id).toBe("1");
  });
});
