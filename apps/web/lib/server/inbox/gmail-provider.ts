import "server-only";

import type {
  ImportedInboxMessage,
  ImportedInboxThread,
} from "@ceg/inbox";

import { gmailScopes, getGmailOauthConfig } from "./gmail-config";
import type { GmailTokenEnvelope } from "./credentials";

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
  };
  headers?: GmailHeader[];
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

type GmailThread = {
  id: string;
  snippet?: string;
  messages?: GmailMessage[];
};

export type GmailImportedThreadBundle = {
  thread: ImportedInboxThread;
  messages: ImportedInboxMessage[];
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function readHeader(headers: GmailHeader[] | undefined, name: string): string | null {
  const match = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  const value = match?.value?.trim();
  return value ? value : null;
}

function extractTextPlain(part?: GmailMessagePart): string | null {
  if (!part) {
    return null;
  }

  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data).trim() || null;
  }

  for (const child of part.parts ?? []) {
    const candidate = extractTextPlain(child);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function extractHtml(part?: GmailMessagePart): string | null {
  if (!part) {
    return null;
  }

  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data).trim() || null;
  }

  for (const child of part.parts ?? []) {
    const candidate = extractHtml(child);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function extractTextHtml(part?: GmailMessagePart): string | null {
  const html = extractHtml(part);
  return html ? stripHtmlTags(html) : null;
}

function normalizeEmailText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  const lines = sanitized.split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const compact = trimmed.trim();

    if (/^On .+wrote:$/i.test(compact) || /^From:\s/i.test(compact)) {
      break;
    }

    if (compact.startsWith(">")) {
      continue;
    }

    kept.push(trimmed);
  }

  const normalized = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeEmailHtml(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseAddressList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map((item) => item.toLowerCase()))];
}

async function gmailFetch<TValue>(
  accessToken: string,
  pathname: string,
  query: Record<string, string> = {},
): Promise<TValue> {
  const url = new URL(pathname, "https://gmail.googleapis.com/");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as TValue;
}

export async function exchangeGmailAuthorizationCode(
  code: string,
): Promise<GmailTokenEnvelope> {
  const config = getGmailOauthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google OAuth token exchange failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    tokenType: payload.token_type ?? "Bearer",
    scopes: (payload.scope ?? gmailScopes.join(" ")).split(" ").filter(Boolean),
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : null,
  };
}

export async function refreshGmailAccessToken(
  refreshToken: string,
): Promise<GmailTokenEnvelope> {
  const config = getGmailOauthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google OAuth token refresh failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  return {
    accessToken: payload.access_token,
    refreshToken,
    tokenType: payload.token_type ?? "Bearer",
    scopes: (payload.scope ?? gmailScopes.join(" ")).split(" ").filter(Boolean),
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : null,
  };
}

export async function fetchGmailProfile(accessToken: string): Promise<{
  emailAddress: string;
  historyId: string | null;
}> {
  const profile = await gmailFetch<{
    emailAddress: string;
    historyId?: string;
  }>(accessToken, "/gmail/v1/users/me/profile");

  return {
    emailAddress: profile.emailAddress.toLowerCase(),
    historyId: profile.historyId ?? null,
  };
}

function buildImportedThreadBundle(thread: GmailThread): GmailImportedThreadBundle {
  const messages = (thread.messages ?? [])
    .map((message) => {
      const headers = message.payload?.headers;
      const fromAddresses = parseAddressList(readHeader(headers, "From"));
      const toAddresses = parseAddressList(readHeader(headers, "To"));
      const ccAddresses = parseAddressList(readHeader(headers, "Cc"));
      const bccAddresses = parseAddressList(readHeader(headers, "Bcc"));
      const rawBodyText =
        extractTextPlain(message.payload) ?? extractTextHtml(message.payload) ?? message.snippet ?? null;
      const rawBodyHtml = extractHtml(message.payload);
      const normalizedBodyText = normalizeEmailText(rawBodyText);
      const normalizedBodyHtml = normalizeEmailHtml(rawBodyHtml);
      const subject = readHeader(headers, "Subject");
      const sentAtHeader = readHeader(headers, "Date");
      const sentAt = sentAtHeader ? new Date(sentAtHeader) : null;
      const internalDate = message.internalDate ? new Date(Number(message.internalDate)) : null;
      const direction: ImportedInboxMessage["direction"] =
        message.labelIds?.includes("SENT") || message.labelIds?.includes("DRAFT")
          ? "outbound"
          : "inbound";
      const providerMessageType: ImportedInboxMessage["providerMessageType"] =
        message.labelIds?.includes("DRAFT") ? "draft" : direction;
      const replyReference = readHeader(headers, "In-Reply-To");
      const timestamp =
        direction === "inbound"
          ? internalDate
          : sentAt && !Number.isNaN(sentAt.getTime())
            ? sentAt
            : internalDate;

      return {
        provider: "gmail" as const,
        providerThreadId: message.threadId,
        providerMessageId: message.id,
        direction,
        providerMessageType,
        messageRole: "unclassified" as const,
        replyToProviderMessageId: replyReference,
        subject,
        bodyText: normalizedBodyText,
        bodyHtml: normalizedBodyHtml,
        rawBodyText,
        rawBodyHtml,
        normalizedBodyText,
        normalizedBodyHtml,
        fromAddress: fromAddresses[0] ?? null,
        toAddresses,
        ccAddresses,
        bccAddresses,
        sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : null,
        receivedAt: direction === "inbound" ? internalDate : null,
        metadata: {
          snippet: message.snippet ?? null,
          labelIds: message.labelIds ?? [],
        },
        _timestamp: timestamp,
      };
    })
    .sort((left, right) => (left._timestamp?.getTime() ?? 0) - (right._timestamp?.getTime() ?? 0));

  let hasSeenOutbound = false;
  const normalizedMessages = messages.map((message) => {
    let messageRole: ImportedInboxMessage["messageRole"] = "unclassified";

    if (message.providerMessageType === "draft") {
      messageRole = "draft";
    } else if (message.direction === "outbound") {
      messageRole = "outbound";
      hasSeenOutbound = true;
    } else if (
      message.direction === "inbound" &&
      (message.replyToProviderMessageId !== null || hasSeenOutbound || /^re:/i.test(message.subject ?? ""))
    ) {
      messageRole = "reply";
    }

    return {
      provider: message.provider,
      providerThreadId: message.providerThreadId,
      providerMessageId: message.providerMessageId,
      direction: message.direction,
      providerMessageType: message.providerMessageType,
      messageRole,
      replyToProviderMessageId: message.replyToProviderMessageId,
      subject: message.subject,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      rawBodyText: message.rawBodyText,
      rawBodyHtml: message.rawBodyHtml,
      normalizedBodyText: message.normalizedBodyText,
      normalizedBodyHtml: message.normalizedBodyHtml,
      fromAddress: message.fromAddress,
      toAddresses: message.toAddresses,
      ccAddresses: message.ccAddresses,
      bccAddresses: message.bccAddresses,
      sentAt: message.sentAt,
      receivedAt: message.receivedAt,
      metadata: message.metadata,
    } satisfies ImportedInboxMessage;
  });

  const allParticipants = new Map<string, { email: string; name: null; role: "unknown" }>();
  for (const message of normalizedMessages) {
    for (const address of [message.fromAddress, ...message.toAddresses, ...message.ccAddresses]) {
      if (!address) {
        continue;
      }

      allParticipants.set(address, {
        email: address,
        name: null,
        role: "unknown",
      });
    }
  }

  const latestInbound = [...normalizedMessages]
    .filter((message) => message.direction === "inbound" && message.receivedAt)
    .sort((left, right) => (right.receivedAt?.getTime() ?? 0) - (left.receivedAt?.getTime() ?? 0))[0];

  return {
    thread: {
      provider: "gmail",
      providerThreadId: thread.id,
      subject: normalizedMessages.find((message) => message.subject)?.subject ?? null,
      participants: [...allParticipants.values()],
      lastMessageReceivedAt: latestInbound?.receivedAt ?? null,
      snippet: thread.snippet ?? ((latestInbound?.metadata as { snippet?: string | null } | undefined)?.snippet ?? null),
      metadata: {
        messageCount: normalizedMessages.length,
      },
    },
    messages: normalizedMessages,
  };
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildGmailDraftMimeMessage(input: {
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
}): string {
  const headers = [
    `To: ${input.toRecipients.join(", ")}`,
    input.ccRecipients.length > 0 ? `Cc: ${input.ccRecipients.join(", ")}` : null,
    input.bccRecipients.length > 0 ? `Bcc: ${input.bccRecipients.join(", ")}` : null,
    "MIME-Version: 1.0",
    `Subject: ${input.subject}`,
  ].filter(Boolean);

  if (input.bodyHtml) {
    const boundary = `ceg-${Math.random().toString(36).slice(2)}`;
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      input.bodyText,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      input.bodyHtml,
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  return [
    ...headers,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    input.bodyText,
    "",
  ].join("\r\n");
}

export async function createGmailDraft(input: {
  accessToken: string;
  toRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  providerThreadId?: string | null;
}): Promise<{
  providerDraftId: string;
  providerMessageId: string | null;
  providerThreadId: string | null;
  createdAt: Date;
  status: "created";
}> {
  const raw = encodeBase64Url(
    buildGmailDraftMimeMessage({
      toRecipients: input.toRecipients,
      ccRecipients: input.ccRecipients,
      bccRecipients: input.bccRecipients,
      subject: input.subject,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
    }),
  );

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        raw,
        threadId: input.providerThreadId ?? undefined,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gmail draft creation failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    id: string;
    message?: {
      id?: string;
      threadId?: string;
    };
  };

  return {
    providerDraftId: payload.id,
    providerMessageId: payload.message?.id ?? null,
    providerThreadId: payload.message?.threadId ?? input.providerThreadId ?? null,
    createdAt: new Date(),
    status: "created",
  };
}
export async function importRecentGmailThreads(input: {
  accessToken: string;
  maxResults?: number;
}): Promise<GmailImportedThreadBundle[]> {
  const listResponse = await gmailFetch<{
    threads?: Array<{ id: string }>;
  }>(input.accessToken, "/gmail/v1/users/me/threads", {
    maxResults: String(input.maxResults ?? 10),
  });

  const threadIds = (listResponse.threads ?? []).map((thread) => thread.id);
  const threads = await Promise.all(
    threadIds.map((threadId) =>
      gmailFetch<GmailThread>(input.accessToken, `/gmail/v1/users/me/threads/${threadId}`, {
        format: "full",
      }),
    ),
  );

  return threads.map((thread) => buildImportedThreadBundle(thread));
}
