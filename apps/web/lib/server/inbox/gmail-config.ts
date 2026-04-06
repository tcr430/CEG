import "server-only";

import { getOptionalEnv, getRequiredEnv } from "@ceg/security";

import { createAppUrl } from "../runtime-origin";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
] as const;
export function hasGmailOauthConfigured(): boolean {
  return (
    getOptionalEnv("GOOGLE_GMAIL_CLIENT_ID") !== undefined &&
    getOptionalEnv("GOOGLE_GMAIL_CLIENT_SECRET") !== undefined &&
    getOptionalEnv("INBOX_CREDENTIALS_ENCRYPTION_KEY") !== undefined
  );
}

export function getGmailOauthConfig() {
  const clientId = getRequiredEnv("GOOGLE_GMAIL_CLIENT_ID");
  const clientSecret = getRequiredEnv("GOOGLE_GMAIL_CLIENT_SECRET");
  const redirectUri =
    getOptionalEnv("GOOGLE_GMAIL_REDIRECT_URI") ??
    createAppUrl("/api/inbox/gmail/callback");

  if (redirectUri === undefined) {
    throw new Error(
      "Missing Gmail redirect origin. Set NEXT_PUBLIC_APP_URL or GOOGLE_GMAIL_REDIRECT_URI.",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [...GMAIL_SCOPES],
  };
}

export function buildGmailAuthorizationUrl(input: { state: string }): string {
  const config = getGmailOauthConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);

  return url.toString();
}

export const gmailScopes = [...GMAIL_SCOPES];



