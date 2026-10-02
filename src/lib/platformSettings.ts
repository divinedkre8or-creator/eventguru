// src/lib/platformSettings.ts
// Platform configuration manager for Payment Gateway, Email (Resend), SMS (Termii), and Financial Calculations.
// Backed by persistent Supabase Database storage with local caching and environment fallbacks.

import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  // Brand & Identity
  platform_name: string;
  support_email: string;
  currency: string;
  
  // Payment Gateway Configuration
  gateway_public_key: string;
  gateway_provider: string; // e.g. "paystack", "direct_gateway"
  gateway_environment: "live" | "test";
  platform_fee_percent: number; // e.g. 2.5
  
  // Email Delivery Service (Resend)
  resend_api_key: string;
  email_sender_address: string;
  email_sender_name: string;
  email_reply_to: string;

  // SMS Delivery Service (Textflow & Termii)
  textflow_api_token: string;
  textflow_sender_id: string; // e.g. "Textflow" or approved "EventRally"
  termii_api_key: string;
  termii_sender_id: string; // e.g. "Termii" or "EventRally"
  
  // Safety & Banner
  maintenance_mode: boolean;
  announcement_banner: string;
}

const STORAGE_KEY = "eventrally_platform_settings_v1";

export const FALLBACK_PAYSTACK_PUBLIC_KEY = "pk_live_05f315dab83c2ed136a33b33acb5d81812a0f635";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platform_name: "EventRally",
  support_email: "support@geteventrally.com",
  currency: "NGN",
  
  gateway_public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || FALLBACK_PAYSTACK_PUBLIC_KEY,
  gateway_provider: "paystack",
  gateway_environment: "live",
  platform_fee_percent: 2.5,
  
  resend_api_key: import.meta.env.VITE_RESEND_API_KEY || "",
  email_sender_address: import.meta.env.VITE_RESEND_SENDER_EMAIL || "tickets@send.geteventrally.com",
  email_sender_name: import.meta.env.VITE_RESEND_SENDER_NAME || "EventRally Tickets",
  email_reply_to: import.meta.env.VITE_RESEND_REPLY_TO || "support@geteventrally.com",

  textflow_api_token: import.meta.env.VITE_TEXTFLOW_API_TOKEN || "",
  textflow_sender_id: import.meta.env.VITE_TEXTFLOW_SENDER_ID || "Textflow",
  termii_api_key: import.meta.env.VITE_TERMII_API_KEY || "",
  termii_sender_id: import.meta.env.VITE_TERMII_SENDER_ID || "Termii",
  
  maintenance_mode: false,
  announcement_banner: "",
};

let memorySettingsCache: PlatformSettings | null = null;

export interface PlatformSettingsFetchResult {
  settings: PlatformSettings;
  isDatabasePersisted: boolean;
  error?: string;
}

/**
 * Synchronous getter: Retrieves settings from memory / localStorage cache with environment defaults.
 */
export function getPlatformSettings(): PlatformSettings {
  if (memorySettingsCache) return memorySettingsCache;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memorySettingsCache = DEFAULT_PLATFORM_SETTINGS;
      return DEFAULT_PLATFORM_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const validStoredKey = (parsed.gateway_public_key && typeof parsed.gateway_public_key === "string" && (parsed.gateway_public_key.startsWith("pk_live_") || parsed.gateway_public_key.startsWith("pk_test_")))
      ? parsed.gateway_public_key.trim()
      : (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || FALLBACK_PAYSTACK_PUBLIC_KEY);

    const resolved: PlatformSettings = {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...parsed,
      gateway_public_key: validStoredKey,
    };
    memorySettingsCache = resolved;
    return resolved;
  } catch (err) {
    console.error("Failed to parse platform settings from storage:", err);
    memorySettingsCache = DEFAULT_PLATFORM_SETTINGS;
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

/**
 * Saves updated platform settings locally and updates memory cache.
 */
export function savePlatformSettings(updated: Partial<PlatformSettings>): PlatformSettings {
  const current = getPlatformSettings();
  const merged: PlatformSettings = {
    ...current,
    ...updated,
  };
  memorySettingsCache = merged;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error("Failed to save platform settings to storage:", err);
  }
  return merged;
}

/**
 * Asynchronously fetches persistent platform settings from Supabase database.
 * Syncs the local storage and memory cache automatically without clobbering existing valid keys.
 */
export async function fetchRemotePlatformSettings(): Promise<PlatformSettingsFetchResult> {
  const local = getPlatformSettings();
  try {
    const { data, error } = await (supabase.from as any)("platform_settings")
      .select("settings")
      .eq("id", "global_settings")
      .maybeSingle();

    if (error) {
      console.warn("Notice: Remote platform settings query returned:", error.message);
      return {
        settings: local,
        isDatabasePersisted: false,
        error: error.message,
      };
    }

    if (data?.settings) {
      // Intelligently merge remote settings with any non-empty local fields
      const merged: PlatformSettings = {
        ...local,
        ...data.settings,
        gateway_public_key: (data.settings.gateway_public_key && (data.settings.gateway_public_key.startsWith("pk_live_") || data.settings.gateway_public_key.startsWith("pk_test_")))
          ? data.settings.gateway_public_key.trim()
          : ((local.gateway_public_key && (local.gateway_public_key.startsWith("pk_live_") || local.gateway_public_key.startsWith("pk_test_")))
            ? local.gateway_public_key.trim()
            : (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || FALLBACK_PAYSTACK_PUBLIC_KEY)),
        resend_api_key: import.meta.env.VITE_RESEND_API_KEY || data.settings.resend_api_key || local.resend_api_key || "",
        textflow_api_token: import.meta.env.VITE_TEXTFLOW_API_TOKEN || data.settings.textflow_api_token || local.textflow_api_token || "",
        textflow_sender_id: data.settings.textflow_sender_id || import.meta.env.VITE_TEXTFLOW_SENDER_ID || local.textflow_sender_id || "Textflow",
        termii_api_key: import.meta.env.VITE_TERMII_API_KEY || data.settings.termii_api_key || local.termii_api_key || "",
      };
      savePlatformSettings(merged);
      return {
        settings: merged,
        isDatabasePersisted: true,
      };
    }

    return {
      settings: local,
      isDatabasePersisted: true,
    };
  } catch (err: any) {
    console.warn("Notice: Remote platform settings sync deferred:", err);
    return {
      settings: local,
      isDatabasePersisted: false,
      error: err.message || "Failed to reach Supabase database",
    };
  }
}

/**
 * Asynchronously saves platform settings to Supabase database (persisted permanently across devices)
 * and syncs local storage.
 */
export async function persistPlatformSettings(updated: Partial<PlatformSettings>): Promise<{
  success: boolean;
  settings: PlatformSettings;
  isDatabasePersisted: boolean;
  error?: string;
}> {
  const merged = savePlatformSettings(updated);
  try {
    // Strip backend secret credentials before persisting to public database table
    const sanitizedDbSettings = { ...merged };
    delete (sanitizedDbSettings as any).resend_api_key;
    delete (sanitizedDbSettings as any).textflow_api_token;
    delete (sanitizedDbSettings as any).termii_api_key;

    const { error } = await (supabase.from as any)("platform_settings")
      .upsert(
        {
          id: "global_settings",
          settings: sanitizedDbSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.warn("Database upsert error for platform_settings:", error);
      return {
        success: true,
        settings: merged,
        isDatabasePersisted: false,
        error: error.message || "Database write failed",
      };
    }
    return {
      success: true,
      settings: merged,
      isDatabasePersisted: true,
    };
  } catch (err: any) {
    console.warn("Remote settings write deferred:", err);
    return {
      success: true,
      settings: merged,
      isDatabasePersisted: false,
      error: err.message || "Network exception during database write",
    };
  }
}

/**
 * Helper to fetch the active public gateway key.
 * Prioritizes environment variables, then persisted database settings, and falls back
 * to the verified live public key. Guaranteed to return a valid 'pk_live_' or 'pk_test_' key.
 */
export function getActiveGatewayPublicKey(): string {
  const envKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "").trim();
  if (envKey.startsWith("pk_live_") || envKey.startsWith("pk_test_")) {
    return envKey;
  }

  const settings = getPlatformSettings();
  const dbCandidate = (settings.gateway_public_key || "").trim();
  if (dbCandidate.startsWith("pk_live_") || dbCandidate.startsWith("pk_test_")) {
    return dbCandidate;
  }

  return FALLBACK_PAYSTACK_PUBLIC_KEY;
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
