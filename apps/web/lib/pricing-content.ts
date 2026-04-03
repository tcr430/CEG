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
    label: "Free",
    headline: "Prove the workflow in basic mode.",
    summary:
      "Start with guarded capacity, public-website research, and production-minded sequence plus reply workflows.",
    audience: "Best for first live campaigns and founder or rep-led validation.",
    bullets: [
      "Basic mode workflows without sender-aware profile support",
      "Public website research for real prospect context",
      "Core sequence generation and reply intelligence with monthly limits",
    ],
  },
  {
    code: "pro",
    label: "Pro",
    headline: "Run sender-aware outbound with room to operate.",
    summary:
      "Add sender profiles, expand research and generation headroom, and keep one team on a tighter outbound standard.",
    audience: "Best for SDR teams and SaaS founders running a serious outbound motion.",
    featured: true,
    bullets: [
      "Sender-aware profiles for SDR, founder, and agency contexts",
      "Higher monthly research, sequence, reply, and regeneration capacity",
      "A stronger default for repeatable outbound quality across one workspace",
    ],
  },
  {
    code: "agency",
    label: "Agency",
    headline: "Scale multi-client outbound without low ceilings.",
    summary:
      "Keep the same workflow and controls while removing the operational headroom issues that slow agency teams down.",
    audience: "Best for lead generation agencies and high-throughput outbound operations.",
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
