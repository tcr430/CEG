import "server-only";

import type { GenerationPerformanceHints } from "@ceg/validation";

import {
  buildGenerationPerformanceHintsFromSignals,
  extractHintSignalsFromUsageEvents,
} from "../generation-performance-hints";
import { readCampaignPerformanceSnapshot } from "../campaign-performance";
import { getCampaignForWorkspace } from "./campaigns";
import { getSharedUsageEventRepository } from "./usage-events";

const HINT_LOOKBACK_DAYS = 180;
const MIN_SCOPE_SAMPLE_SIZE = 3;

async function buildPerformanceHints(input: {
  workspaceId: string;
  campaignId: string;
  kind: "sequence" | "reply";
}): Promise<GenerationPerformanceHints> {
  const occurredTo = new Date();
  const occurredFrom = new Date(occurredTo.getTime() - HINT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const [campaign, usageEvents] = await Promise.all([
    getCampaignForWorkspace(input.workspaceId, input.campaignId),
    getSharedUsageEventRepository().listUsageEventsByWorkspaceAndOccurredAtRange({
      workspaceId: input.workspaceId,
      occurredFrom,
      occurredTo,
    }),
  ]);
  const allSignals = extractHintSignalsFromUsageEvents({
    events: usageEvents,
    kind: input.kind,
  });
  const campaignSignals = allSignals.filter((signal) => signal.campaignId === input.campaignId);
  const selectedSignals = campaignSignals.length >= MIN_SCOPE_SAMPLE_SIZE ? campaignSignals : allSignals;

  return buildGenerationPerformanceHintsFromSignals({
    kind: input.kind,
    sourceScope:
      selectedSignals.length === 0
        ? "none"
        : selectedSignals === campaignSignals
          ? "campaign"
          : "workspace",
    signals: selectedSignals,
    campaignPerformance: campaign ? readCampaignPerformanceSnapshot(campaign) : null,
  });
}

export async function buildSequencePerformanceHints(input: {
  workspaceId: string;
  campaignId: string;
}): Promise<GenerationPerformanceHints> {
  return buildPerformanceHints({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    kind: "sequence",
  });
}

export async function buildReplyPerformanceHints(input: {
  workspaceId: string;
  campaignId: string;
}): Promise<GenerationPerformanceHints> {
  return buildPerformanceHints({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    kind: "reply",
  });
}
