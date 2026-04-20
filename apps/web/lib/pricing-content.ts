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
    headline: "Validate one repeatable outbound workflow.",
    summary:
      "For teams moving from ad hoc outreach to a structured process with disciplined execution and clear review.",
    audience:
      "Best for early-stage agency, SDR, and founder-led outbound where volume is still controlled.",
    bullets: [
      "Keep research, sequence drafts, and replies in one operating flow",
      "Preserve campaign context from brief through draft handoff",
      "Intentionally limited monthly capacity for proving one stable motion",
    ],
  },
  {
    code: "pro",
    label: "Growth",
    headline: "Run active outbound delivery with real headroom.",
    summary:
      "Default plan for teams running consistent weekly outbound across multiple campaigns and accounts.",
    audience:
      "Best for agencies, SDR teams, and founders with active outbound delivery targets.",
    featured: true,
    bullets: [
      "Use sender-aware profiles across research, sequences, and reply workflows",
      "Get strong monthly headroom for research, generation, analysis, and iteration",
      "Balanced choice for speed, consistency, and day-to-day delivery confidence",
    ],
  },
  {
    code: "agency",
    label: "Enterprise",
    headline: "Support large-scale outbound and complex team load.",
    summary:
      "For heavier-volume organizations coordinating multiple operators and sustained outbound throughput.",
    audience:
      "Best when outbound is core revenue infrastructure and monthly caps become an operational bottleneck.",
    bullets: [
      "Keep sender-aware context across every stage while team volume scales",
      "Run research, sequence generation, and reply intelligence without monthly caps",
      "Designed for heavy prospecting, rapid iteration, and complex delivery operations",
    ],
  },
];

export const pricingFeatureRows: PricingFeatureRow[] = [
  {
    feature: "Sender-aware workflow context",
    free: "Basic mode",
    pro: "Included",
    agency: "Included",
  },
  {
    feature: "Prospect research volume",
    free: "15 runs/mo",
    pro: "150 runs/mo",
    agency: "Unlimited",
  },
  {
    feature: "Sequence generation volume",
    free: "20 runs/mo",
    pro: "250 runs/mo",
    agency: "Unlimited",
  },
  {
    feature: "Reply analysis + draft volume",
    free: "20 + 20 /mo",
    pro: "250 + 250 /mo",
    agency: "Unlimited",
  },
];

export function getPricingPlanPresentation(planCode: BillingPlanCode): PricingPlanPresentation {
  return pricingPlans.find((plan) => plan.code === planCode) ?? pricingPlans[0]!;
}
