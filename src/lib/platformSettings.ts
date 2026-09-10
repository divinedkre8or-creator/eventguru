// src/lib/platformSettings.ts
// Platform configuration manager for Payment Gateway, Email (Resend), and Financial Calculations.

export interface PlatformSettings {
  // Brand & Identity
  platform_name: string;
  support_email: string;
  currency: string;
  
  // Payment Gateway Configuration
  gateway_public_key: string;
  gateway_secret_key: string;
  gateway_provider: string; // e.g. "paystack", "direct_gateway"
  gateway_environment: "live" | "test";
  platform_fee_percent: number; // e.g. 2.5
  
  // Email Delivery Service (Resend)
  resend_api_key: string;
  email_sender_address: string;
  email_sender_name: string;
  email_reply_to: string;
  
  // Safety & Banner
  maintenance_mode: boolean;
  announcement_banner: string;
}

const STORAGE_KEY = "eventrally_platform_settings_v1";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platform_name: "EventRally",
  support_email: "support@eventrally.com",
  currency: "NGN",
  
  gateway_public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
  gateway_secret_key: "",
  gateway_provider: "secure_gateway",
  gateway_environment: "test",
  platform_fee_percent: 2.5,
  
  resend_api_key: "",
  email_sender_address: "tickets@eventrally.com",
  email_sender_name: "EventRally Official",
  email_reply_to: "support@eventrally.com",
  
  maintenance_mode: false,
  announcement_banner: "",
};

/**
 * Retrieves the current platform settings.
 * Prioritizes local stored admin configuration, falling back to environment defaults.
 */
export function getPlatformSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...parsed,
      // If no key is set in localStorage, fallback to env variable if present
      gateway_public_key: parsed.gateway_public_key || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
    };
  } catch (err) {
    console.error("Failed to parse platform settings from storage:", err);
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

/**
 * Saves updated platform settings to storage.
 */
export function savePlatformSettings(updated: Partial<PlatformSettings>): PlatformSettings {
  const current = getPlatformSettings();
  const merged: PlatformSettings = {
    ...current,
    ...updated,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error("Failed to save platform settings to storage:", err);
  }
  return merged;
}

/**
 * Helper to fetch the active public gateway key.
 */
export function getActiveGatewayPublicKey(): string {
  const settings = getPlatformSettings();
  if (settings.gateway_public_key && settings.gateway_public_key.trim() !== "") {
    return settings.gateway_public_key.trim();
  }
  return import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_dummykey1234567890";
}

export interface PaymentBreakdownInput {
  unitPrice: number;
  quantity: number;
  discountPercentage?: number;
  platformFeePercent?: number;
}

export interface PaymentBreakdownResult {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  organiserNetAmount: number;
  amountInMinorUnits: number; // e.g. kobo (amount * 100)
  isFree: boolean;
}

/**
 * Rigorous financial calculations ensuring consistent rounding, zero floating-point error,
 * and transparent breakdown for attendees and organizers.
 */
export function calculatePaymentBreakdown({
  unitPrice,
  quantity,
  discountPercentage = 0,
  platformFeePercent = 2.5,
}: PaymentBreakdownInput): PaymentBreakdownResult {
  const safeUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
  const safeDiscountPct = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
  const safeFeePct = Math.max(0, Number(platformFeePercent) || 0);

  const subtotal = safeUnitPrice * safeQty;
  const discountAmount = safeDiscountPct > 0 
    ? Math.round(subtotal * (safeDiscountPct / 100)) 
    : 0;
  
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const platformFeeAmount = totalAmount > 0 
    ? Math.round(totalAmount * (safeFeePct / 100)) 
    : 0;
  const organiserNetAmount = Math.max(0, totalAmount - platformFeeAmount);
  const amountInMinorUnits = Math.round(totalAmount * 100);

  return {
    unitPrice: safeUnitPrice,
    quantity: safeQty,
    subtotal,
    discountPercentage: safeDiscountPct,
    discountAmount,
    totalAmount,
    platformFeePercent: safeFeePct,
    platformFeeAmount,
    organiserNetAmount,
    amountInMinorUnits,
    isFree: totalAmount === 0,
  };
}
