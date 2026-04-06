import {
  shareablePerformanceSummarySchema,
  type CampaignPerformanceSnapshot,
  type ShareablePerformanceSummary,
} from "@ceg/validation";

function formatRate(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

export function buildShareablePerformanceSummary(input: {
  scope: "workspace" | "campaign";
  snapshot: CampaignPerformanceSnapshot;
  campaignCount?: number;
}): ShareablePerformanceSummary {
  const highlights: string[] = [];

  if (input.snapshot.outboundMessages === 0) {
    highlights.push("No outbound volume has been counted yet.");
  } else {
    highlights.push(
      `${formatRate(input.snapshot.replyRate)} reply rate across ${input.snapshot.outboundMessages} sent outbound message(s).`,
    );
  }

  if (input.snapshot.replies === 0) {
    highlights.push("No replies have been recorded yet.");
  } else if (input.snapshot.positiveReplies === 0) {
    highlights.push("Replies are landing, but none are classified positive yet.");
  } else {
    highlights.push(
      `${input.snapshot.positiveReplies} positive repl${input.snapshot.positiveReplies === 1 ? "y" : "ies"} with a ${formatRate(input.snapshot.positiveReplyRate)} positive reply rate.`,
    );
  }

  if (input.scope === "workspace") {
    highlights.push(
      `${input.campaignCount ?? 0} campaign(s) are included in this summary.`,
    );
  }

  return shareablePerformanceSummarySchema.parse({
    scope: input.scope,
    title:
      input.scope === "workspace"
        ? "Workspace performance summary"
        : "Campaign performance summary",
    subtitle:
      input.scope === "workspace"
        ? "Aggregate outbound performance across the current workspace."
        : "A compact, share-ready view of campaign-level outbound results.",
    outboundMessages: input.snapshot.outboundMessages,
    replies: input.snapshot.replies,
    positiveReplies: input.snapshot.positiveReplies,
    replyRate: input.snapshot.replyRate,
    positiveReplyRate: input.snapshot.positiveReplyRate,
    highlights: highlights.slice(0, 4),
    generatedAt: input.snapshot.calculatedAt,
    version: 1,
  });
}

export function formatShareablePerformanceSummaryText(
  summary: ShareablePerformanceSummary,
): string {
  const lines = [
    summary.title,
    summary.subtitle,
    `Outbound messages: ${summary.outboundMessages}`,
    `Replies: ${summary.replies}`,
    `Positive replies: ${summary.positiveReplies}`,
    `Reply rate: ${formatRate(summary.replyRate)}`,
    `Positive reply rate: ${formatRate(summary.positiveReplyRate)}`,
  ].filter((line): line is string => Boolean(line));

  if (summary.highlights.length > 0) {
    lines.push("Highlights:");
    for (const highlight of summary.highlights) {
      lines.push(`- ${highlight}`);
    }
  }

  return lines.join("\n");
}
