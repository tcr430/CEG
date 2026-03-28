import {
  getBillingPlanDefinition,
  type BillingMeterKey,
  type BillingPlanCode,
} from "./plans.js";

type UsageEventLike = {
  eventName: string;
  quantity: number;
  billable: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  occurredAt: Date;
};

export const usageEventToMeterKey: Partial<Record<string, BillingMeterKey>> = {
  prospect_research_completed: "websiteResearchRuns",
  sequence_generated: "sequenceGenerations",
  reply_analysis_completed: "replyAnalyses",
  reply_drafts_generated: "replyDraftGenerations",
  sequence_part_regenerated: "regenerations",
  reply_draft_regenerated: "regenerations",
} as const satisfies Record<string, BillingMeterKey>;

export type WorkspaceUsageSummary = {
  windowStart: Date;
  windowEnd: Date;
  counters: Record<BillingMeterKey, number>;
  billableEvents: number;
  totalEvents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
};

function createEmptyCounters(): Record<BillingMeterKey, number> {
  return {
    websiteResearchRuns: 0,
    sequenceGenerations: 0,
    replyAnalyses: 0,
    replyDraftGenerations: 0,
    regenerations: 0,
  };
}

export function getMonthWindow(anchorDate: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );

  return { start, end };
}

export function summarizeWorkspaceUsage(
  events: readonly UsageEventLike[],
  anchorDate: Date = new Date(),
): WorkspaceUsageSummary {
  const window = getMonthWindow(anchorDate);
  const counters = createEmptyCounters();
  let billableEvents = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  let totalEvents = 0;

  for (const event of events) {
    if (event.occurredAt < window.start || event.occurredAt >= window.end) {
      continue;
    }

    totalEvents += 1;

    const meterKey = usageEventToMeterKey[event.eventName];
    if (meterKey) {
      counters[meterKey] += event.quantity;
    }

    if (event.billable) {
      billableEvents += 1;
    }

    totalInputTokens += event.inputTokens ?? 0;
    totalOutputTokens += event.outputTokens ?? 0;
    totalCostUsd += event.costUsd ?? 0;
  }

  return {
    windowStart: window.start,
    windowEnd: window.end,
    counters,
    billableEvents,
    totalEvents,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
  };
}

export function getRemainingMonthlyAllowance(
  planCode: BillingPlanCode,
  usage: WorkspaceUsageSummary,
  meterKey: BillingMeterKey,
): number | null {
  const limit = getBillingPlanDefinition(planCode).monthlyLimits[meterKey];
  if (limit === null) {
    return null;
  }

  return Math.max(limit - usage.counters[meterKey], 0);
}
