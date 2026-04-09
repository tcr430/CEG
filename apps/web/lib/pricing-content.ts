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
    headline: "Start the workflow with the core operating surface.",
    summary:
      "Start with core workflow capacity, public-website research, and a credible operating setup for early live client work.",
    audience: "Best for a solo operator or very small agency team establishing the core workflow.",
    bullets: [
      "Basic mode workflows without sender-aware profile support",
      "Public website research for real prospect context",
      "Core sequence generation and reply intelligence with monthly limits",
    ],
  },
  {
    code: "pro",
    label: "Growth",
    headline: "Expand the workflow for a growing agency team.",
    summary:
      "Add sender-aware context, more research and generation headroom, and stronger operating room for a growing delivery team.",
    audience: "Best for a small agency team that needs sender-aware workflow depth, collaboration, and reusable operating context.",
    featured: true,
    bullets: [
      "Sender-aware profiles for SDR, founder, and agency contexts",
      "Higher monthly research, sequence, reply, and regeneration capacity",
      "A stronger default for repeatable outbound quality across one workspace",
    ],
  },
  {
    code: "agency",
    label: "Enterprise",
    headline: "Run larger-scale client operations without workflow ceilings.",
    summary:
      "Keep the same workflow and controls while opening up higher-volume client operations, deeper controls, and more room to iterate.",
    audience: "Best for larger agency operations that need more scale, deeper control, and more support around active client delivery.",
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