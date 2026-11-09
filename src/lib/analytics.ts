// src/lib/analytics.ts
// Central product analytics engine powered by PostHog.
// Gracefully operates in safe no-op mode if PostHog keys are not yet configured.

import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let isInitialized = false;

/**
 * Initializes PostHog analytics with privacy-safe autocapture and session replay defaults.
 */
export function initAnalytics(): void {
  if (isInitialized) return;

  if (!POSTHOG_KEY || POSTHOG_KEY.trim() === "") {
    // Graceful no-op in local development or until user provides a production key
    if (import.meta.env.DEV) {
      console.debug("[Analytics] PostHog key not set. Analytics running in safe mock mode.");
    }
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: false, // We manually trigger on router changes for exact single-page-app accuracy
      capture_pageleave: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true, // Never record passwords, form inputs, or sensitive tokens
        maskInputOptions: {
          password: true,
          color: false,
          date: false,
          "datetime-local": false,
          email: false,
          month: false,
          number: false,
          range: false,
          search: false,
          tel: false,
          text: false,
          time: false,
          url: false,
          week: false,
        },
      },
      persistence: "localStorage+cookie",
      loaded: () => {
        isInitialized = true;
      },
    });
    isInitialized = true;
  } catch (err) {
    console.warn("[Analytics] Failed to initialize PostHog:", err);
  }
}

/**
 * Tracks a custom product event with arbitrary context properties.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  try {
    if (isInitialized && POSTHOG_KEY) {
      posthog.capture(eventName, properties);
    } else if (import.meta.env.DEV) {
      console.debug(`[Analytics Track] ${eventName}:`, properties);
    }
  } catch (err) {
    console.warn(`[Analytics] Error capturing event "${eventName}":`, err);
  }
}

/**
 * Tracks route pageview changes in React Router.
 */
export function trackPageView(path?: string): void {
  try {
    const currentPath = path || window.location.pathname + window.location.search;
    if (isInitialized && POSTHOG_KEY) {
      posthog.capture("$pageview", { $current_url: window.location.href, path: currentPath });
    }
  } catch (err) {
    console.warn("[Analytics] Error capturing pageview:", err);
  }
}

/**
 * Identifies a logged-in user and links their persona traits.
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  try {
    if (isInitialized && POSTHOG_KEY) {
      posthog.identify(userId, traits);
    }
  } catch (err) {
    console.warn("[Analytics] Error identifying user:", err);
  }
}

/**
 * Resets user identification on logout.
 */
export function resetAnalytics(): void {
  try {
    if (isInitialized && POSTHOG_KEY) {
      posthog.reset();
    }
  } catch (err) {
    console.warn("[Analytics] Error resetting user session:", err);
  }
}

export { posthog };
