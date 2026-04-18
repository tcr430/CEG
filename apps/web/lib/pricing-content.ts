import type { BillingPlanCode } from "@ceg/billing";

export type PricingPlanPresentation = {
  code: BillingPlanCode;
  label: string;
  headline: string;
  summary: string;
  audience: string;
  featured?: boolean;
  bullets: string[];
};

export type PricingFeatureRow = {
  feature: string;
  free: string;
  pro: string;
  agency: string;
};

export const pricingPlans: PricingPlanPresentation[] = [
  {
    code: "free",
    label: "Starter",
    headline: "Start with the core workflow.",
    summary:
      "Built for agencies starting a structured outbound workflow for a smaller active client book.",
    audience:
      "Best for validating one repeatable workflow before scaling delivery volume.",
    bullets: [
      "Campaign context, research, drafting, and reply handling in one workspace",
      "Public-website research snapshots for prospect context",
      "Monthly limits suited to early agency operations",
    ],
  },
  {
    code: "pro",
    label: "Growth",
    headline: "Run active client campaigns with headroom.",
    summary:
      "The default fit for agencies running multiple active client campaigns with stronger workflow headroom.",
    audience:
      "Best for day-to-day agency delivery where consistency and review speed matter.",
    featured: true,
    bullets: [
      "Sender-aware profiles across campaign, research, and drafting stages",
      "Higher monthly capacity for research, sequence, reply, and regeneration workflows",
      "Recommended for most multi-client agency operations",
    ],
  },
  {
    code: "agency",
    label: "Enterprise",
    headline: "Keep larger-scale delivery moving smoothly.",
    summary:
      "For larger agency books of business that need the same controlled workflow with fewer operational limits.",
    audience:
      "Best for high-volume agency operations with heavier prospecting and iteration demand.",
    bullets: [
      "Sender-aware profiles across all workflow stages",
      "Unlimited research, sequence, reply intelligence, and regeneration volume",
      "Maximum operational capacity for sustained client delivery",
    ],
  },
];

export const pricingFeatureRows: PricingFeatureRow[] = [
  {
    feature: "Sender-aware profiles",
    free: "Basic mode only",
    pro: "Included",
    agency: "Included",
  },
  {
    feature: "Prospect website research",
    free: "15 runs / month",
    pro: "150 runs / month",
    agency: "Unlimited",
  },
  {
    feature: "Sequence generation volume",
    free: "20 runs / month",
    pro: "250 runs / month",
    agency: "Unlimited",
  },
  {
    feature: "Reply intelligence",
    free: "20 analyses + 20 draft sets / month",
    pro: "250 analyses + 250 draft sets / month",
    agency: "Unlimited",
  },
  {
    feature: "Regeneration support",
    free: "10 regenerations / month",
    pro: "120 regenerations / month",
    agency: "Unlimited",
  },
];

export function getPricingPlanPresentation(planCode: BillingPlanCode): PricingPlanPresentation {
  return pricingPlans.find((plan) => plan.code === planCode) ?? pricingPlans[0]!;
}
