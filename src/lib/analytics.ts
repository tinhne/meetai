"use client";

// Product analytics (PostHog), loaded only after cookie consent and only
// when NEXT_PUBLIC_POSTHOG_KEY is set. Calls before that are no-ops.

type PostHogLike = { capture: (event: string, properties?: Record<string, unknown>) => void };

export const CONSENT_KEY = "meetai-cookie-consent";

let client: PostHogLike | null = null;
let loading: Promise<void> | null = null;

export function hasAnalyticsConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || client || loading || !hasAnalyticsConsent()) return;

  loading = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      persistence: "localStorage+cookie",
    });
    client = posthog;
  });
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (client) {
    client.capture(event, properties);
    return;
  }
  // Pages outside the marketing site never mount the consent banner, so load
  // the client here (still only when consent was given).
  initAnalytics();
  void loading?.then(() => client?.capture(event, properties));
}
