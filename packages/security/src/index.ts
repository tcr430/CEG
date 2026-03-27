const DEFAULT_ALLOWED_PROTOCOLS = ["http:", "https:"] as const;
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/i,
  /^\[fc/i,
  /^\[fd/i,
];

export type SafeUrlPolicy = {
  allowedProtocols: readonly string[];
  allowPrivateHosts: boolean;
  allowCredentials: boolean;
  maxLength: number;
  blockedPorts: readonly string[];
};

export type SafeUrlValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
      hostname: string;
      protocol: string;
    }
  | {
      ok: false;
      reason:
        | "invalid_url"
        | "url_too_long"
        | "disallowed_protocol"
        | "credentials_not_allowed"
        | "private_host_not_allowed"
        | "port_not_allowed";
      message: string;
    };

export const defaultSafeUrlPolicy: SafeUrlPolicy = {
  allowedProtocols: DEFAULT_ALLOWED_PROTOCOLS,
  allowPrivateHosts: false,
  allowCredentials: false,
  maxLength: 2048,
  blockedPorts: ["22", "25", "3306", "5432", "6379", "8080"],
};

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value;
}

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function validateSafeUrl(
  value: string,
  policy: Partial<SafeUrlPolicy> = {},
): SafeUrlValidationResult {
  const resolvedPolicy: SafeUrlPolicy = {
    ...defaultSafeUrlPolicy,
    ...policy,
  };

  if (value.length > resolvedPolicy.maxLength) {
    return {
      ok: false,
      reason: "url_too_long",
      message: `URL exceeds the maximum length of ${resolvedPolicy.maxLength} characters.`,
    };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      reason: "invalid_url",
      message: "URL must be a valid absolute URL.",
    };
  }

  if (!resolvedPolicy.allowedProtocols.includes(url.protocol)) {
    return {
      ok: false,
      reason: "disallowed_protocol",
      message: "Only explicitly allowed protocols may be fetched.",
    };
  }

  if (!resolvedPolicy.allowCredentials && (url.username !== "" || url.password !== "")) {
    return {
      ok: false,
      reason: "credentials_not_allowed",
      message: "URLs with embedded credentials are not allowed.",
    };
  }

  if (!resolvedPolicy.allowPrivateHosts && isPrivateHost(url.hostname)) {
    return {
      ok: false,
      reason: "private_host_not_allowed",
      message: "Private, loopback, and localhost destinations are not allowed.",
    };
  }

  if (url.port !== "" && resolvedPolicy.blockedPorts.includes(url.port)) {
    return {
      ok: false,
      reason: "port_not_allowed",
      message: `Port ${url.port} is blocked by the safe URL policy.`,
    };
  }

  return {
    ok: true,
    normalizedUrl: url.toString(),
    hostname: url.hostname,
    protocol: url.protocol,
  };
}

export function assertSafeUrl(
  value: string,
  policy?: Partial<SafeUrlPolicy>,
): string {
  const result = validateSafeUrl(value, policy);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.normalizedUrl;
}

/**
 * Compatibility helper for existing call sites. Prefer validateSafeUrl when the
 * caller needs explicit failure reasons for logging or product messaging.
 */
export function isAllowedUrl(value: string): boolean {
  return validateSafeUrl(value).ok;
}
