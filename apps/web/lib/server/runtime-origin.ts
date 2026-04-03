import { getOptionalEnv } from "@ceg/security";

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return new URL(withProtocol).origin;
}

export function getOptionalAppOrigin(): string | undefined {
  const explicitOrigin = getOptionalEnv("NEXT_PUBLIC_APP_URL");
  if (explicitOrigin) {
    return normalizeOrigin(explicitOrigin);
  }

  const targetEnv = getOptionalEnv("VERCEL_TARGET_ENV");
  const deploymentOrigin = getOptionalEnv("VERCEL_URL");
  const productionOrigin = getOptionalEnv("VERCEL_PROJECT_PRODUCTION_URL");

  if (targetEnv === "production" && productionOrigin) {
    return normalizeOrigin(productionOrigin);
  }

  if (deploymentOrigin) {
    return normalizeOrigin(deploymentOrigin);
  }

  if (productionOrigin) {
    return normalizeOrigin(productionOrigin);
  }

  return undefined;
}

export function getRequiredAppOrigin(): string {
  const origin = getOptionalAppOrigin();

  if (origin === undefined) {
    throw new Error(
      "Missing public application origin. Set NEXT_PUBLIC_APP_URL or rely on Vercel system environment variables.",
    );
  }

  return origin;
}

export function createAppUrl(pathname: string): string | undefined {
  const origin = getOptionalAppOrigin();

  if (origin === undefined) {
    return undefined;
  }

  return new URL(pathname, origin).toString();
}