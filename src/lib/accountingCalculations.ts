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
