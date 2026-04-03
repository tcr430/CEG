import { getOptionalAppOrigin } from "./runtime-origin";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function assertTrustedAppRequest(request: Request): void {
  const configuredAppOrigin = getOptionalAppOrigin();
  const requestOrigin = normalizeOrigin(request.url);
  const allowedOrigins = new Set(
    [configuredAppOrigin, requestOrigin].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    ),
  );

  if (allowedOrigins.size === 0) {
    throw new Error("Trusted origin verification is not configured.");
  }

  const candidateOrigin =
    normalizeOrigin(request.headers.get("origin") ?? "") ??
    normalizeOrigin(request.headers.get("referer") ?? "");

  if (candidateOrigin === null || !allowedOrigins.has(candidateOrigin)) {
    throw new Error("Request origin could not be verified.");
  }
}
