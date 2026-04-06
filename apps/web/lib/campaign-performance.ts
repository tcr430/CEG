import type { Campaign, CampaignPerformanceSnapshot, Message, ReplyAnalysis } from "@ceg/validation";
import { campaignPerformanceSnapshotSchema } from "@ceg/validation";

const positiveReplyIntentSet = new Set([
  "interested",
  "needs_more_info",
  "referral_to_other_person",
]);
const countedOutboundStatuses = new Set(["sent", "delivered"]);

export function isPositiveReplyIntent(intent: string | null | undefined): boolean {
  return intent !== null && intent !== undefined && positiveReplyIntentSet.has(intent);
}

export function isCountedOutboundMessage(message: Pick<Message, "direction" | "status">): boolean {
  return message.direction === "outbound" && countedOutboundStatuses.has(message.status);
}

export function buildCampaignPerformanceSnapshot(input: {
  outboundMessages: number;
  replies: number;
  positiveReplies: number;
  calculatedAt?: Date;
}): CampaignPerformanceSnapshot {
  const outboundMessages = input.outboundMessages;
  const replies = input.replies;
  const positiveReplies = input.positiveReplies;

  return campaignPerformanceSnapshotSchema.parse({
    outboundMessages,
    replies,
    positiveReplies,
    replyRate: outboundMessages > 0 ? replies / outboundMessages : null,
    positiveReplyRate: outboundMessages > 0 ? positiveReplies / outboundMessages : null,
    positiveReplyIntents: ["interested", "needs_more_info", "referral_to_other_person"],
    calculatedAt: input.calculatedAt ?? new Date(),
    version: 1,
  });
}

export function readCampaignPerformanceSnapshot(campaign: Campaign): CampaignPerformanceSnapshot | null {
  if (typeof campaign.settings !== "object" || campaign.settings === null) {
    return null;
  }

  const candidate = (campaign.settings as Record<string, unknown>).performance;
  const parsed = campaignPerformanceSnapshotSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function summarizeCampaignPerformance(input: {
  campaigns: Campaign[];
}): CampaignPerformanceSnapshot {
  const totals = input.campaigns
    .map(readCampaignPerformanceSnapshot)
    .filter((item): item is CampaignPerformanceSnapshot => item !== null)
    .reduce(
      (accumulator, snapshot) => ({
        outboundMessages: accumulator.outboundMessages + snapshot.outboundMessages,
        replies: accumulator.replies + snapshot.replies,
        positiveReplies: accumulator.positiveReplies + snapshot.positiveReplies,
      }),
      { outboundMessages: 0, replies: 0, positiveReplies: 0 },
    );

  return buildCampaignPerformanceSnapshot(totals);
}

export function countCampaignPerformanceFromRecords(input: {
  messages: Message[];
  analyses: ReplyAnalysis[];
}): CampaignPerformanceSnapshot {
  const outboundMessages = input.messages.filter(isCountedOutboundMessage).length;
  const replyMessages = input.messages.filter((message) => message.direction === "inbound");
  const replyMessageIds = new Set(replyMessages.map((message) => message.id));
  const positiveReplies = input.analyses.filter(
    (analysis) => replyMessageIds.has(analysis.messageId) && isPositiveReplyIntent(analysis.intent),
  ).length;

  return buildCampaignPerformanceSnapshot({
    outboundMessages,
    replies: replyMessages.length,
    positiveReplies,
  });
}
