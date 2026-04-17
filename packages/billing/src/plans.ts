export const billingPlanCodes = ["free", "pro", "agency"] as const;

export type BillingPlanCode = (typeof billingPlanCodes)[number];

export const billingFeatureKeys = [
  "sender_aware_profiles",
  "website_research",
  "sequence_generation",
  "reply_intelligence",
  "sequence_regeneration",
  "reply_regeneration",
] as const;

export type BillingFeatureKey = (typeof billingFeatureKeys)[number];

export type BillingMeterKey =
  | "websiteResearchRuns"
  | "sequenceGenerations"
  | "replyAnalyses"
  | "replyDraftGenerations"
  | "regenerations";

export type BillingPlanDefinition = {
  code: BillingPlanCode;
  label: string;
  description: string;
  features: Record<BillingFeatureKey, boolean>;
  monthlyLimits: Record<BillingMeterKey, number | null>;
};

export const billingPlans: Record<BillingPlanCode, BillingPlanDefinition> = {
  free: {
    code: "free",
    label: "Starter",
    description: "Starter workspace for controlled agency operations with lighter monthly headroom.",
    features: {
      sender_aware_profiles: false,
      website_research: true,
      sequence_generation: true,
      reply_intelligence: true,
      sequence_regeneration: true,
      reply_regeneration: true,
    },
    monthlyLimits: {
      websiteResearchRuns: 15,
      sequenceGenerations: 20,
      replyAnalyses: 20,
      replyDraftGenerations: 20,
      regenerations: 10,
    },
  },
  pro: {
    code: "pro",
    label: "Growth",
    description: "Growing agency workspace with sender-aware flows and healthier monthly headroom.",
    features: {
      sender_aware_profiles: true,
      website_research: true,
      sequence_generation: true,
      reply_intelligence: true,
      sequence_regeneration: true,
      reply_regeneration: true,
    },
    monthlyLimits: {
      websiteResearchRuns: 150,
      sequenceGenerations: 250,
      replyAnalyses: 250,
      replyDraftGenerations: 250,
      regenerations: 120,
    },
  },
  agency: {
    code: "agency",
    label: "Enterprise",
    description: "Larger-scale workspace for higher-throughput multi-client outbound operations.",
    features: {
      sender_aware_profiles: true,
      website_research: true,
      sequence_generation: true,
      reply_intelligence: true,
      sequence_regeneration: true,
      reply_regeneration: true,
    },
    monthlyLimits: {
      websiteResearchRuns: null,
      sequenceGenerations: null,
      replyAnalyses: null,
      replyDraftGenerations: null,
      regenerations: null,
    },
  },
};

export function resolveBillingPlanCode(value: string | null | undefined): BillingPlanCode {
  return value === "pro" || value === "agency" ? value : "free";
}

export function getBillingPlanDefinition(
  planCode: BillingPlanCode,
): BillingPlanDefinition {
  return billingPlans[planCode];
}
