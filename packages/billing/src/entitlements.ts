import {
  getBillingPlanDefinition,
  type BillingFeatureKey,
  type BillingMeterKey,
  type BillingPlanCode,
} from "./plans.js";
import {
  getRemainingMonthlyAllowance,
  type WorkspaceUsageSummary,
} from "./usage.js";

export class BillingEntitlementError extends Error {
  readonly code = "BILLING_ENTITLEMENT_ERROR" as const;

  constructor(message: string, readonly details: Record<string, unknown>) {
    super(message);
    this.name = "BillingEntitlementError";
  }
}

export type FeatureEntitlement = {
  feature: BillingFeatureKey;
  allowed: boolean;
  reason: string | null;
};

export type UsageEntitlement = {
  meterKey: BillingMeterKey;
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  reason: string | null;
};

export function checkFeatureEntitlement(
  planCode: BillingPlanCode,
  feature: BillingFeatureKey,
): FeatureEntitlement {
  const plan = getBillingPlanDefinition(planCode);
  const allowed = plan.features[feature];

  return {
    feature,
    allowed,
    reason: allowed ? null : `${plan.label} does not include ${feature.replaceAll("_", " ")}.`,
  };
}

export function checkUsageEntitlement(input: {
  planCode: BillingPlanCode;
  usage: WorkspaceUsageSummary;
  meterKey: BillingMeterKey;
  quantity?: number;
}): UsageEntitlement {
  const quantity = input.quantity ?? 1;
  const plan = getBillingPlanDefinition(input.planCode);
  const limit = plan.monthlyLimits[input.meterKey];
  const used = input.usage.counters[input.meterKey];
  const remaining = getRemainingMonthlyAllowance(
    input.planCode,
    input.usage,
    input.meterKey,
  );
  const allowed = limit === null ? true : used + quantity <= limit;

  return {
    meterKey: input.meterKey,
    allowed,
    limit,
    used,
    remaining,
    reason:
      allowed || limit === null
        ? null
        : `${plan.label} includes ${limit} ${input.meterKey} per month. This workspace has already used ${used}.`,
  };
}

export function assertFeatureEntitlement(
  planCode: BillingPlanCode,
  feature: BillingFeatureKey,
): void {
  const result = checkFeatureEntitlement(planCode, feature);
  if (!result.allowed) {
    throw new BillingEntitlementError(result.reason ?? "Feature not available.", {
      planCode,
      feature,
    });
  }
}

export function assertUsageEntitlement(input: {
  planCode: BillingPlanCode;
  usage: WorkspaceUsageSummary;
  meterKey: BillingMeterKey;
  quantity?: number;
}): void {
  const result = checkUsageEntitlement(input);
  if (!result.allowed) {
    throw new BillingEntitlementError(result.reason ?? "Usage limit reached.", {
      planCode: input.planCode,
      meterKey: input.meterKey,
      used: result.used,
      limit: result.limit,
      quantity: input.quantity ?? 1,
    });
  }
}
