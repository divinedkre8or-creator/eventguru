// src/lib/phoneUtils.ts
// Utility functions for phone number normalization and SMS brand message formatting.

/**
 * Normalizes a Nigerian or international phone number into clean digits.
 * Strips whitespace, hyphens, parentheses, and leading plus sign.
 * Converts local Nigerian format (e.g. 08031234567) into international format (2348031234567) or local digits.
 */
export function normalizePhoneNumber(raw: string | null | undefined, toInternational = true): string {
  if (!raw) return "";

  // Strip all non-digit characters except leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, "");

  // Remove leading plus
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle Nigerian local format starting with 0 (e.g. 080..., 090..., 070..., 081...)
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    if (toInternational) {
      return `234${cleaned.substring(1)}`;
    }
    return cleaned;
  }

  // Already starts with 234 and is 13 digits (e.g. 2348031234567)
  if (/^234[789][01]\d{8}$/.test(cleaned)) {
    if (!toInternational) {
      return `0${cleaned.substring(3)}`;
    }
    return cleaned;
  }

  return cleaned;
}

/**
 * Validates if a phone number is a usable mobile recipient.
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneNumber(phone, true);
  // Nigerian mobile numbers are 13 digits starting with 234
  if (/^234[789][01]\d{8}$/.test(normalized)) {
    return true;
  }
  // Generic international mobile check (10 to 15 digits)
  return /^\d{10,15}$/.test(normalized);
}

/**
 * Prepares the formatted branded SMS message.
 * Embeds the brand prefix tag at the very beginning of the SMS text (e.g. "[EventRally] ...").
 * This ensures attendees immediately see the brand name in their lock screen notification preview.
 */
export function formatBrandedSms(brandTag: string | null | undefined, message: string): string {
  const cleanTag = (brandTag || "EventRally").trim().slice(0, 15);
  const cleanBody = (message || "").trim();

  // If the message already starts with a bracketed tag, don't duplicate
  if (cleanBody.startsWith("[")) {
    return cleanBody;
  }

  return `[${cleanTag}] ${cleanBody}`;
}

/**
 * Calculates SMS character length and segments based on 160 GSM-7 characters per segment.
 */
export function calculateSmsSegments(text: string): {
  charCount: number;
  segments: number;
  charsRemainingInSegment: number;
} {
  const charCount = (text || "").length;
  if (charCount <= 160) {
    return {
      charCount,
      segments: charCount === 0 ? 0 : 1,
      charsRemainingInSegment: 160 - charCount,
    };
  }
  // Multi-part SMS messages use 153 characters per segment due to the UDH header
  const segments = Math.ceil(charCount / 153);
  const charsRemainingInSegment = segments * 153 - charCount;
  return {
    charCount,
    segments,
    charsRemainingInSegment,
  };
}
