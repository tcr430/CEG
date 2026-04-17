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
      "Built for early-stage agency delivery where one operator or a small team needs structure from day one.",
    audience:
      "Best for starting client work in one workspace before higher-volume delivery.",
    bullets: [
      "Core outbound workflow with monthly limits",
      "Public website research for prospect context",
      "Sequence generation and reply intelligence in one workspace",
    ],
  },
  {
    code: "pro",
    label: "Growth",
    headline: "Run active client campaigns with headroom.",
    summary:
      "The default fit for agencies managing multiple active campaigns with sender-aware context and higher usage capacity.",
    audience:
      "Best for small-to-mid agency teams running repeatable client delivery.",
    featured: true,
    bullets: [
      "Sender-aware profiles across workflow stages",
      "Higher monthly research, sequence, reply, and regeneration limits",
      "Recommended for day-to-day multi-campaign operations",
    ],
  },
  {
    code: "agency",
    label: "Enterprise",
    headline: "Keep larger-scale delivery moving smoothly.",
    summary:
      "For larger books of business that need the same controlled workflow with fewer operational ceilings.",
    audience:
      "Best for higher-volume agency operations with heavier prospecting and iteration needs.",
    bullets: [
      "Sender-aware profiles across all workflows",
      "Research, sequence, reply intelligence, and regenerations without monthly caps",
      "Maximum capacity for sustained client delivery volume",
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
