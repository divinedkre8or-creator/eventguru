// src/lib/smsPricing.ts
//
// Single source of truth for EventRally's volume-tiered SMS pricing:
// - Up to 100 SMS: ₦10 / unit (Standard rate)
// - Above 100 to 500 SMS: ₦9 / unit (Volume rate - 10% discount)
// - Above 500 SMS: ₦8 / unit (Bulk rate - 20% discount)

export const BASE_SMS_PRICE_NGN = 10;
export const TIER_1_SMS_PRICE_NGN = 9;
export const TIER_2_SMS_PRICE_NGN = 8;

export const SMS_PRICING_TIERS = [
  { min: 1, max: 100, rate: 10, label: "Standard Rate", description: "Up to 100 SMS" },
  { min: 101, max: 500, rate: 9, label: "Volume Rate", description: "101 – 500 SMS (10% OFF)" },
  { min: 501, max: null, rate: 8, label: "Bulk Rate", description: "501+ SMS (20% OFF)" },
] as const;

/**
 * Returns the unit rate in Naira per SMS for a given unit count.
 */
export function getSmsUnitRate(units: number): number {
  if (units > 500) return TIER_2_SMS_PRICE_NGN;
  if (units > 100) return TIER_1_SMS_PRICE_NGN;
  return BASE_SMS_PRICE_NGN;
}

export interface SmsOrderCalculation {
  units: number;
  unitRate: number;
  totalPriceNgn: number;
  savingsNgn: number;
  tierName: string;
  discountBadge?: string;
  nextTierHint?: string;
}

/**
 * Calculates total order price and savings for custom SMS unit purchases.
 */
export function calculateSmsOrderPrice(units: number): SmsOrderCalculation {
  const cleanUnits = Math.max(0, Math.floor(units || 0));
  const unitRate = getSmsUnitRate(cleanUnits);
  const totalPriceNgn = cleanUnits * unitRate;
  const baseTotal = cleanUnits * BASE_SMS_PRICE_NGN;
  const savingsNgn = Math.max(0, baseTotal - totalPriceNgn);

  let tierName = "Standard Rate (₦10/SMS)";
  let discountBadge: string | undefined = undefined;
  let nextTierHint: string | undefined = undefined;

  if (cleanUnits > 500) {
    tierName = "Bulk Rate (₦8/SMS)";
    discountBadge = "20% Bulk Discount";
  } else if (cleanUnits > 100) {
    tierName = "Volume Rate (₦9/SMS)";
    discountBadge = "10% Volume Discount";
    const neededForNext = 501 - cleanUnits;
    nextTierHint = `Add ${neededForNext} more SMS to unlock ₦8/SMS bulk pricing!`;
  } else if (cleanUnits > 0) {
    const neededForNext = 101 - cleanUnits;
    if (neededForNext <= 50) {
      nextTierHint = `Add ${neededForNext} more SMS to drop price to ₦9/SMS!`;
    }
  }

  return {
    units: cleanUnits,
    unitRate,
    totalPriceNgn,
    savingsNgn,
    tierName,
    discountBadge,
    nextTierHint,
  };
}
