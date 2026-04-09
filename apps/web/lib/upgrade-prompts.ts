import type { BillingPlanCode } from "@ceg/billing";
import type { CampaignPerformanceSnapshot } from "@ceg/validation";

export type UpgradePromptSurface =
  | "dashboard_performance"
  | "campaign_performance"
  | "prospect_workflow"
  | "settings_billing";

type UsageAllowance = {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  reason: string | null;
};

type UsageCounters = {
  sequenceGenerations: number;
  replyAnalyses: number;
  replyDraftGenerations: number;
  regenerations: number;
  websiteResearchRuns: number;
};

export type UpgradePromptBillingState = {
  planCode: BillingPlanCode;
  planLabel: string;
  usage: {
    counters: UsageCounters;
  };
  limits: {
    websiteResearch: UsageAllowance;
    sequenceGeneration: UsageAllowance;
    replyAnalysis: UsageAllowance;
    replyDraftGeneration: UsageAllowance;
    regenerations: UsageAllowance;
  };
};

export type UpgradePrompt = {
  id: "generation_limit" | "performance_visibility" | "reply_intelligence";
  tone: "subtle" | "strong";
  targetPlanCode: Exclude<BillingPlanCode, "free">;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
};

type UpgradePromptInput = {
  surface: UpgradePromptSurface;
  billing: UpgradePromptBillingState;
  performance?: CampaignPerformanceSnapshot | null;
};

type LimitPressure = {
  label: string;
  remaining: number | null;
};

function getNextPlanCode(
  planCode: BillingPlanCode,
): Exclude<BillingPlanCode, "free"> | null {
  if (planCode === "free") {
    return "pro";
  }

  if (planCode === "pro") {
    return "agency";
  }

  return null;
}

function getLimitPressure(billing: UpgradePromptBillingState): LimitPressure | null {
  const candidates = [
    {
      label: "sequence generation",
      allowance: billing.limits.sequenceGeneration,
    },
    {
      label: "reply intelligence",
      allowance: billing.limits.replyAnalysis,
    },
    {
      label: "reply drafting",
      allowance: billing.limits.replyDraftGeneration,
    },
    {
      label: "regeneration support",
      allowance: billing.limits.regenerations,
    },
  ];

  for (const candidate of candidates) {
    if (candidate.allowance.limit !== null && candidate.allowance.remaining === 0) {
      return {
        label: candidate.label,
        remaining: candidate.allowance.remaining,
      };
    }
  }

  for (const candidate of candidates) {
    if (candidate.allowance.limit === null || candidate.allowance.remaining === null) {
      continue;
    }

    const lowWatermark = Math.max(2, Math.ceil(candidate.allowance.limit * 0.2));
    if (candidate.allowance.remaining <= lowWatermark) {
      return {
        label: candidate.label,
        remaining: candidate.allowance.remaining,
      };
    }
  }

  return null;
}

function getReplyIntensity(billing: UpgradePromptBillingState) {
  const analysisLimit = billing.limits.replyAnalysis.limit;
  const draftLimit = billing.limits.replyDraftGeneration.limit;

  if (analysisLimit === null || draftLimit === null) {
    return {
      heavy: false,
      ratio: 0,
      totalUsed:
        billing.usage.counters.replyAnalyses +
        billing.usage.counters.replyDraftGenerations,
    };
  }

  const totalUsed =
    billing.usage.counters.replyAnalyses +
    billing.usage.counters.replyDraftGenerations;
  const totalLimit = analysisLimit + draftLimit;
  const ratio = totalLimit > 0 ? totalUsed / totalLimit : 0;

  return {
    heavy: totalUsed >= 10 && ratio >= 0.5,
    ratio,
    totalUsed,
  };
}

function buildGenerationLimitPrompt(
  billing: UpgradePromptBillingState,
  pressure: LimitPressure,
): UpgradePrompt | null {
  const targetPlanCode = getNextPlanCode(billing.planCode);
  if (targetPlanCode === null) {
    return null;
  }

  const title =
    pressure.remaining === 0
      ? "Keep generation moving without pausing the workflow"
      : "Stay ahead of this month's workflow ceiling";

  const body =
    billing.planCode === "free"
      ? `This workspace is running close to its ${pressure.label} limit. Upgrade to Growth for more headroom so the team can keep researching, generating, and iterating across live client work without rationing each run.`
      : `This workspace is pressing against ${pressure.label} capacity. Move to Enterprise to keep improving performance across more client campaigns without monthly ceilings slowing the team down.`;

  return {
    id: "generation_limit",
    tone: pressure.remaining === 0 ? "strong" : "subtle",
    targetPlanCode,
    eyebrow: "Workflow capacity",
    title,
    body,
    ctaLabel:
      targetPlanCode === "pro" ? "Upgrade to Growth" : "Upgrade to Enterprise",
  };
}

function buildPerformancePrompt(
  billing: UpgradePromptBillingState,
  performance: CampaignPerformanceSnapshot | null | undefined,
): UpgradePrompt | null {
  const targetPlanCode = getNextPlanCode(billing.planCode);
  if (targetPlanCode === null || !performance || performance.outboundMessages < 5) {
    return null;
  }

  const hasMeaningfulSignal =
    performance.replies > 0 || performance.positiveReplies > 0;

  if (!hasMeaningfulSignal) {
    return null;
  }

  const body =
    billing.planCode === "free"
      ? "You now have real reply-rate signal. Upgrade to Growth to bring sender-aware context and more generation headroom into the workflow so the team can turn that early campaign history into more informed guidance across live client work."
      : "You now have real campaign performance data. Upgrade to Enterprise to keep testing and refining what drives replies without operational ceilings limiting the client portfolio.";

  return {
    id: "performance_visibility",
    tone: "subtle",
    targetPlanCode,
    eyebrow: "Campaign learning",
    title: "Turn early reply data into a stronger outbound motion",
    body,
    ctaLabel:
      targetPlanCode === "pro" ? "Upgrade to Growth" : "Upgrade to Enterprise",
  };
}

function buildReplyPrompt(
  billing: UpgradePromptBillingState,
): UpgradePrompt | null {
  const targetPlanCode = getNextPlanCode(billing.planCode);
  if (targetPlanCode === null) {
    return null;
  }

  const replyIntensity = getReplyIntensity(billing);
  if (!replyIntensity.heavy) {
    return null;
  }

  const body =
    billing.planCode === "free"
      ? "This workspace is leaning on reply intelligence heavily. Upgrade to Growth for more analysis and draft capacity so the team can respond faster while building a stronger record of how replies are classified and handled."
      : "Reply intelligence is now a meaningful part of this workflow. Upgrade to Enterprise to keep handling higher reply volume and more regeneration without plan friction across client work.";

  return {
    id: "reply_intelligence",
    tone: "subtle",
    targetPlanCode,
    eyebrow: "Reply handling",
    title: "Keep momentum when reply handling starts to matter",
    body,
    ctaLabel:
      targetPlanCode === "pro" ? "Upgrade to Growth" : "Upgrade to Enterprise",
  };
}

export function getUpgradePrompt(
  input: UpgradePromptInput,
): UpgradePrompt | null {
  if (input.billing.planCode === "agency") {
    return null;
  }

  const limitPressure = getLimitPressure(input.billing);

  switch (input.surface) {
    case "prospect_workflow":
      return (
        (limitPressure
          ? buildGenerationLimitPrompt(input.billing, limitPressure)
          : null) ?? buildReplyPrompt(input.billing)
      );
    case "dashboard_performance":
    case "campaign_performance":
      return (
        buildPerformancePrompt(input.billing, input.performance) ??
        (limitPressure
          ? buildGenerationLimitPrompt(input.billing, limitPressure)
          : null)
      );
    case "settings_billing":
      return (
        (limitPressure
          ? buildGenerationLimitPrompt(input.billing, limitPressure)
          : null) ??
        buildReplyPrompt(input.billing) ??
        buildPerformancePrompt(input.billing, input.performance)
      );
    default:
      return limitPressure
        ? buildGenerationLimitPrompt(input.billing, limitPressure)
        : null;
  }
}

