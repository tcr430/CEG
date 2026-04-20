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
    description:
      "Starter workspace for validating a repeatable outbound workflow with tighter monthly operating limits.",
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
    description:
      "Growth workspace for active client delivery with sender-aware workflows and healthy monthly headroom.",
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
    description:
      "Enterprise workspace for higher-throughput outbound organizations that need uncapped operational capacity.",
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
