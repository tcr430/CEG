import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { getRequiredEnv } from "@ceg/security";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = "v1";

type GmailTokenEnvelope = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scopes: string[];
  expiresAt: string | null;
};

type GmailOAuthState = {
  workspaceId: string;
  userId: string;
  requestId: string;
  returnPath: string;
  issuedAt: string;
};

function base64UrlEncode(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function getEncryptionKey(): Buffer {
  const rawKey = getRequiredEnv("INBOX_CREDENTIALS_ENCRYPTION_KEY");
  const key = Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "INBOX_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
}

function encryptJson<TValue>(value: TValue): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    base64UrlEncode(iv),
    base64UrlEncode(ciphertext),
    base64UrlEncode(tag),
  ].join(".");
}

function decryptJson<TValue>(value: string): TValue {
  const [version, ivPart, ciphertextPart, tagPart] = value.split(".");

  if (
    version !== ENCRYPTION_VERSION ||
    !ivPart ||
    !ciphertextPart ||
    !tagPart
  ) {
    throw new Error("Inbox credential payload is malformed.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    base64UrlDecode(ivPart),
  );
  decipher.setAuthTag(base64UrlDecode(tagPart));

  const plaintext = Buffer.concat([
    decipher.update(base64UrlDecode(ciphertextPart)),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as TValue;
}

export function encryptGmailTokenEnvelope(value: GmailTokenEnvelope): string {
  return encryptJson(value);
}

export function decryptGmailTokenEnvelope(value: string): GmailTokenEnvelope {
  return decryptJson<GmailTokenEnvelope>(value);
}

export function createGmailOAuthStateToken(value: Omit<GmailOAuthState, "issuedAt">): string {
  return encryptJson<GmailOAuthState>({
    ...value,
    issuedAt: new Date().toISOString(),
  });
}

export function parseGmailOAuthStateToken(value: string): GmailOAuthState {
  const parsed = decryptJson<GmailOAuthState>(value);
  const issuedAt = new Date(parsed.issuedAt);

  if (Number.isNaN(issuedAt.getTime())) {
    throw new Error("Inbox OAuth state is invalid.");
  }

  if (Date.now() - issuedAt.getTime() > 15 * 60 * 1000) {
    throw new Error("Inbox OAuth state has expired. Please try connecting Gmail again.");
  }

  return parsed;
}

export type { GmailOAuthState, GmailTokenEnvelope };
