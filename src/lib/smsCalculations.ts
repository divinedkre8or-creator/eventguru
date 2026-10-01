// src/lib/smsCalculations.ts
//
// Shared financial and operational calculations for EventRally SMS & Messaging infrastructure.

export const DEFAULT_WHOLESALE_SMS_PRICE_NGN = 3.75;
export const DEFAULT_RETAIL_SMS_PRICE_NGN = 6.5;

export interface CentralBalanceHealth {
  status: "healthy" | "warning" | "critical";
  color: string;
  badgeText: string;
  recommendation: string;
}

/**
 * Calculates estimated deliverable SMS units from a given Naira balance.
 */
export function calculateRemainingUnits(
  balanceNgn: number | null | undefined,
  costPerUnit: number = DEFAULT_WHOLESALE_SMS_PRICE_NGN
): number {
  if (!balanceNgn || balanceNgn <= 0 || !costPerUnit || costPerUnit <= 0) {
    return 0;
  }
  return Math.floor(balanceNgn / costPerUnit);
}

/**
 * Calculates solvency ratio percentage: (Central Balance / Organiser Liabilities) * 100.
 * A ratio >= 100% means central funds completely back all organizer in-app wallet balances.
 */
export function calculateSolvencyRatio(
  centralBalanceNgn: number | null | undefined,
  totalLiabilitiesNgn: number | null | undefined
): number {
  const central = Math.max(0, Number(centralBalanceNgn) || 0);
  const liabilities = Math.max(0, Number(totalLiabilitiesNgn) || 0);

  if (liabilities === 0) {
    return 100;
  }
  if (central === 0) {
    return 0;
  }

  const ratio = (central / liabilities) * 100;
  return Math.round(ratio * 10) / 10;
}

/**
 * Evaluates the health status and alert color of the central upstream SMS gateway.
 */
export function getCentralBalanceHealth(
  balanceNgn: number | null | undefined,
  lowThreshold: number = 5000,
  criticalThreshold: number = 2000
): CentralBalanceHealth {
  const balance = Number(balanceNgn) || 0;

  if (balance <= criticalThreshold) {
    return {
      status: "critical",
      color: "text-red-500 bg-red-500/10 border-red-500/20",
      badgeText: "Critical Low Balance",
      recommendation: "Recharge Textflow immediately to avoid campaign dispatch failures.",
    };
  }

  if (balance <= lowThreshold) {
    return {
      status: "warning",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      badgeText: "Low Balance Warning",
      recommendation: "Central balance is running low. Top up soon to ensure buffer.",
    };
  }

  return {
    status: "healthy",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    badgeText: "Gateway Healthy",
    recommendation: "Upstream balance is sufficient for normal dispatch operations.",
  };
}

/**
 * Formats a number to Nigerian Naira display string.
 */
export function formatNaira(amount: number | null | undefined, includeKobo = false): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: includeKobo ? 2 : 0,
    maximumFractionDigits: includeKobo ? 2 : 0,
  }).format(num);
}

/**
 * Calculates delivery rate percentage from sent and failed counts.
 */
export function estimateDeliveryRate(sent: number, failed: number): number {
  const total = (Number(sent) || 0) + (Number(failed) || 0);
  if (total === 0) return 100;
  return Math.round(((Number(sent) || 0) / total) * 100);
}
