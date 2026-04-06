import type { Campaign, CampaignPerformanceSnapshot } from "@ceg/validation";

import { readCampaignPerformanceSnapshot } from "./campaign-performance.ts";

type CampaignStatus = Campaign["status"];

const statusOrder: CampaignStatus[] = [
  "active",
  "draft",
  "paused",
  "completed",
  "archived",
];

const statusLabels: Record<CampaignStatus, string> = {
  active: "Active campaigns",
  draft: "Draft campaigns",
  paused: "Paused campaigns",
  completed: "Completed campaigns",
  archived: "Archived campaigns",
};

export type CampaignOverviewItem = {
  campaign: Campaign;
  performance: CampaignPerformanceSnapshot | null;
  isSenderAware: boolean;
};

export type CampaignOverviewGroup = {
  status: CampaignStatus;
  label: string;
  campaigns: CampaignOverviewItem[];
};

export type CampaignOverview = {
  campaignCount: number;
  activeCount: number;
  senderAwareCount: number;
  basicModeCount: number;
  totalOutboundMessages: number;
  totalReplies: number;
  totalPositiveReplies: number;
  groupedCampaigns: CampaignOverviewGroup[];
  quickSwitchCampaigns: CampaignOverviewItem[];
  topPerformers: CampaignOverviewItem[];
};

function compareCampaignRecency(left: Campaign, right: Campaign) {
  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

function compareTopPerformance(left: CampaignOverviewItem, right: CampaignOverviewItem) {
  const leftPositive = left.performance?.positiveReplyRate ?? -1;
  const rightPositive = right.performance?.positiveReplyRate ?? -1;

  if (rightPositive !== leftPositive) {
    return rightPositive - leftPositive;
  }

  const leftReply = left.performance?.replyRate ?? -1;
  const rightReply = right.performance?.replyRate ?? -1;

  if (rightReply !== leftReply) {
    return rightReply - leftReply;
  }

  const leftOutbound = left.performance?.outboundMessages ?? 0;
  const rightOutbound = right.performance?.outboundMessages ?? 0;

  if (rightOutbound !== leftOutbound) {
    return rightOutbound - leftOutbound;
  }

  return compareCampaignRecency(left.campaign, right.campaign);
}

function compareQuickSwitch(left: CampaignOverviewItem, right: CampaignOverviewItem) {
  if (left.campaign.status !== right.campaign.status) {
    if (left.campaign.status === "active") {
      return -1;
    }

    if (right.campaign.status === "active") {
      return 1;
    }
  }

  return compareCampaignRecency(left.campaign, right.campaign);
}

export function buildCampaignOverview(campaigns: Campaign[]): CampaignOverview {
  const items = campaigns.map((campaign) => ({
    campaign,
    performance: readCampaignPerformanceSnapshot(campaign),
    isSenderAware: campaign.senderProfileId !== null,
  }));

  const groupedCampaigns = statusOrder
    .map((status) => ({
      status,
      label: statusLabels[status],
      campaigns: items
        .filter((item) => item.campaign.status === status)
        .sort((left, right) => compareCampaignRecency(left.campaign, right.campaign)),
    }))
    .filter((group) => group.campaigns.length > 0);

  const topPerformers = items
    .filter((item) => (item.performance?.outboundMessages ?? 0) > 0)
    .sort(compareTopPerformance)
    .slice(0, 3);

  const quickSwitchCampaigns = [...items].sort(compareQuickSwitch).slice(0, 5);

  return {
    campaignCount: items.length,
    activeCount: items.filter((item) => item.campaign.status === "active").length,
    senderAwareCount: items.filter((item) => item.isSenderAware).length,
    basicModeCount: items.filter((item) => !item.isSenderAware).length,
    totalOutboundMessages: items.reduce(
      (total, item) => total + (item.performance?.outboundMessages ?? 0),
      0,
    ),
    totalReplies: items.reduce(
      (total, item) => total + (item.performance?.replies ?? 0),
      0,
    ),
    totalPositiveReplies: items.reduce(
      (total, item) => total + (item.performance?.positiveReplies ?? 0),
      0,
    ),
    groupedCampaigns,
    quickSwitchCampaigns,
    topPerformers,
  };
}

export function formatPerformanceRate(value: number | null | undefined) {
  return value === null || value === undefined ? "n/a" : `${Math.round(value * 100)}%`;
}


