// src/lib/campaignConstants.ts
//
// Client-side constants for the Campaign Studio. The server (send-campaign edge
// function) is the source of truth for enforcement; these values are for display
// and pre-send UX only.
//
// Keep FREE_EMAIL_MONTHLY_LIMIT in sync with the edge function's
// DEFAULT_FREE_EMAIL_MONTHLY_LIMIT. It is intentionally small: at launch we run
// on Resend's FREE plan, whose monthly quota is shared platform-wide with
// transactional (ticket) email. If an admin raises the server-side
// FREE_EMAIL_MONTHLY_LIMIT secret, update this constant too.

/** Free marketing emails an organiser may send per calendar month (free plan). */
export const FREE_EMAIL_MONTHLY_LIMIT = 100;

/** Current usage period key, matching the server ('YYYY-MM', UTC). */
export function getCurrentUsagePeriod(): string {
  return new Date().toISOString().slice(0, 7);
}
