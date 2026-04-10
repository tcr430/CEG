import type { BillingPlanCode } from "@ceg/billing";

export type AuthMode = "password-sign-in" | "magic-link" | "sign-up";
type PaidPlanCode = Exclude<BillingPlanCode, "free">;

const paidPlanCodes = new Set<string>(["pro", "agency"]);
const allowedPostAuthPathPrefixes = [
  "/app",
  "/app/onboarding",
  "/app/settings",
  "/pricing",
];

export function normalizeAuthMode(value: FormDataEntryValue | string | null): AuthMode {
  if (value === "sign-up" || value === "magic-link") {
    return value;
  }

  return "password-sign-in";
}

export function normalizeSignupPlanCode(value: FormDataEntryValue | string | null): BillingPlanCode | null {
  if (value === "free" || value === "pro" || value === "agency") {
    return value;
  }

  return null;
}

export function isPaidPlanCode(value: BillingPlanCode | null): value is PaidPlanCode {
  return value !== null && paidPlanCodes.has(value);
}

export function createDefaultPostAuthRedirectPath(input: {
  mode: AuthMode;
  planCode?: BillingPlanCode | null;
}): string {
  if (input.mode === "sign-up" && isPaidPlanCode(input.planCode ?? null)) {
    const notice = encodeURIComponent(
      "Account created. Review the selected plan and start checkout when you are ready.",
    );
    return `/app/settings?upgrade=${input.planCode}&notice=${notice}#billing-plans`;
  }

  if (input.mode === "sign-up") {
    return "/app?notice=Workspace%20created.%20Start%20with%20the%20guided%20setup.";
  }

  return "/app?notice=Welcome%20back.";
}

export function normalizePostAuthRedirectPath(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  const parsed = new URL(value, "https://outflow.local");

  if (parsed.origin !== "https://outflow.local") {
    return null;
  }

  const isAllowed = allowedPostAuthPathPrefixes.some(
    (prefix) =>
      parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
  );

  if (!isAllowed) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
