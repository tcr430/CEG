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
    headline: "For proving a repeatable outbound workflow on real accounts.",
    summary:
      "Run live outbound inside one controlled workflow while the team validates process quality under tighter monthly room.",
    audience:
      "Choose Starter when delivery is lower-volume and your operators are still formalizing a dependable execution rhythm.",
    bullets: [
      "Build each campaign from saved context plus public-source prospect research with visible evidence",
      "Generate sequences, analyze inbound replies, and prepare next drafts without leaving the same workflow",
      "Keep decisions operator-controlled with review before draft output is used",
      "Best for validating process discipline before moving into heavier delivery volume",
    ],
  },
  {
    code: "pro",
    label: "Growth",
    headline: "For agencies shipping active client delivery every week.",
    summary:
      "Default plan for serious execution: sender-aware workflows with enough monthly headroom to run campaigns confidently day to day.",
    audience:
      "Choose Growth when outbound is a core service line and tighter limits start slowing delivery across accounts.",
    featured: true,
    bullets: [
      "Apply sender profiles so research, sequences, and reply drafts stay aligned to each client voice",
      "Run higher monthly research and generation volume without routine workflow bottlenecks",
      "Keep reply analysis and draft preparation connected to campaign history as conversations evolve",
      "Provides the operational headroom most active teams need for consistent multi-client delivery",
    ],
  },
  {
    code: "agency",
    label: "Enterprise",
    headline: "For high-throughput organizations with complex outbound operations.",
    summary:
      "Built for larger delivery organizations where outbound throughput, reliability, and workflow control operate as core infrastructure.",
    audience:
      "Choose Enterprise when concurrent operators and sustained volume make monthly caps an execution risk.",
    bullets: [
      "Remove monthly caps across research, sequence generation, reply analysis, and draft workflows",
      "Support denser campaign portfolios and heavier operator concurrency in one controlled workspace",
      "Maintain review gates and thread continuity while outbound volume scales across accounts",
      "Built for teams managing outbound as an operational system, not campaign-by-campaign coordination",
    ],
  },
];

export const pricingFeatureRows: PricingFeatureRow[] = [
  {
    feature: "Context model",
    free: "Basic context",
    pro: "Sender-aware context",
    agency: "Sender-aware context",
  },
  {
    feature: "Monthly research runs",
    free: "15",
    pro: "150",
    agency: "Unlimited",
  },
  {
    feature: "Monthly drafting + reply runs",
    free: "20 + 20",
    pro: "250 + 250",
    agency: "Unlimited",
  },
];

export function getPricingPlanPresentation(planCode: BillingPlanCode): PricingPlanPresentation {
  return pricingPlans.find((plan) => plan.code === planCode) ?? pricingPlans[0]!;
}
