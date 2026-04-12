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
    headline: "Start the workflow without overcommitting.",
    summary:
      "A clean entry point for a solo operator or very small team that needs structure, not sprawl, for early outbound work.",
    audience: "Best for initial agency use, smaller books of business, or validating the operating workflow before scaling it.",
    bullets: [
      "Basic mode workflows without sender-aware profile support",
      "Public website research for real prospect context",
      "Core sequence generation and reply intelligence with monthly limits",
    ],
  },
  {
    code: "pro",
    label: "Growth",
    headline: "Give a growing team real operating room.",
    summary:
      "The default plan for agencies that need sender-aware context, more workflow depth, and enough headroom to manage live client delivery confidently.",
    audience: "Best for small-to-mid agency teams running active client campaigns and needing reusable context across more outbound work.",
    featured: true,
    bullets: [
      "Sender-aware profiles for SDR, founder, and agency contexts",
      "Higher monthly research, sequence, reply, and regeneration capacity",
      "A stronger day-to-day operating layer for repeatable outbound quality across one workspace",
    ],
  },
  {
    code: "agency",
    label: "Enterprise",
    headline: "Keep larger-scale client operations out of the way of the work.",
    summary:
      "For larger books of business that need the same controlled workflow, but with more scale, more room to iterate, and fewer operational ceilings.",
    audience: "Best for higher-volume agency operations that need deeper headroom around active client delivery and iteration.",
    bullets: [
      "Sender-aware profiles included across agency workflows",
      "Research, sequence generation, reply intelligence, and regenerations without monthly caps",
      "Headroom for heavier prospecting, iteration, and client delivery volume",
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
