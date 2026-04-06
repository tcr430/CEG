import "server-only";

import type { CampaignPerformanceSnapshot } from "@ceg/validation";

import {
  countCampaignPerformanceFromRecords,
  readCampaignPerformanceSnapshot,
  summarizeCampaignPerformance,
} from "../campaign-performance";
import { getCampaignRepository, getMessageRepository } from "./database";
import { getSharedReplyAnalysisRepository } from "./reply-analysis-store";
import { getCampaignForWorkspace, listCampaignsForWorkspace } from "./campaigns";

export async function refreshCampaignPerformanceMetrics(
  workspaceId: string,
  campaignId: string,
): Promise<CampaignPerformanceSnapshot | null> {
  const campaign = await getCampaignForWorkspace(workspaceId, campaignId);

  if (campaign === null) {
    return null;
  }

  const messages = await getMessageRepository().listMessagesByCampaign(workspaceId, campaignId);
  const inboundMessages = messages.filter((message) => message.direction === "inbound");
  const analysisResults = await Promise.all(
    inboundMessages.map((message) =>
      getSharedReplyAnalysisRepository().getReplyAnalysisByMessage(workspaceId, message.id),
    ),
  );
  const analyses = analysisResults.filter((analysis) => analysis !== null);

  const snapshot = countCampaignPerformanceFromRecords({ messages, analyses });

  await getCampaignRepository().updateCampaign({
    campaignId: campaign.id,
    workspaceId,
    senderProfileId: campaign.senderProfileId ?? null,
    name: campaign.name,
    description: campaign.description ?? undefined,
    objective: campaign.objective ?? undefined,
    offerSummary: campaign.offerSummary ?? undefined,
    targetIcp: campaign.targetIcp ?? undefined,
    targetIndustries: campaign.targetIndustries,
    tonePreferences: campaign.tonePreferences,
    frameworkPreferences: campaign.frameworkPreferences,
    status: campaign.status,
    settings: {
      ...campaign.settings,
      performance: snapshot,
    },
  });

  return snapshot;
}

export async function getCampaignPerformanceMetrics(
  workspaceId: string,
  campaignId: string,
): Promise<CampaignPerformanceSnapshot | null> {
  const campaign = await getCampaignForWorkspace(workspaceId, campaignId);

  if (campaign === null) {
    return null;
  }

  const stored = readCampaignPerformanceSnapshot(campaign);
  if (stored !== null) {
    return stored;
  }

  return refreshCampaignPerformanceMetrics(workspaceId, campaignId);
}

export async function getWorkspacePerformanceSummary(workspaceId: string): Promise<CampaignPerformanceSnapshot> {
  const campaigns = await listCampaignsForWorkspace(workspaceId);
  return summarizeCampaignPerformance({ campaigns });
}
