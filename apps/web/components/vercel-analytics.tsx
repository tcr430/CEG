"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const REDACTED_QUERY_PARAMS = [
  "code",
  "token",
  "access_token",
  "refresh_token",
  "token_hash",
  "confirmation_token",
  "invite_token",
] as const;

function sanitizeAnalyticsEvent(event: BeforeSendEvent) {
  const url = new URL(event.url);

  for (const param of REDACTED_QUERY_PARAMS) {
    url.searchParams.delete(param);
  }

  return {
    ...event,
    url: url.toString(),
  };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={sanitizeAnalyticsEvent} />;
}
