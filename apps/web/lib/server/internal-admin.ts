import {
  canManageWorkspace,
  type AuthenticatedUser,
  type WorkspaceMembership,
} from "@ceg/auth";
import type { AuditEvent, UsageEvent } from "@ceg/validation";
import {
  createInMemoryConversationThreadRepository,
  createInMemoryReplyAnalysisRepository,
  createInMemoryResearchSnapshotRepository,
  createInMemorySequenceRepository,
  type ConversationThreadRepository,
  type ReplyAnalysisRepository,
  type ResearchSnapshotRepository,
  type SequenceRepository,
} from "@ceg/database";

import { listCampaignsForWorkspace, listProspectsForCampaign } from "./campaigns";
import { listRecentOperationLogs } from "./observability";
import { ensureWorkspaceRecordForMembership } from "./workspaces";
import { getSharedAuditEventRepository } from "./audit-events";
import { getSharedUsageEventRepository } from "./usage-events";

declare global {
  var __cegResearchSnapshotRepository: ResearchSnapshotRepository | undefined;
  var __cegSequenceRepository: SequenceRepository | undefined;
  var __cegConversationThreadRepository: ConversationThreadRepository | undefined;
  var __cegReplyAnalysisRepository: ReplyAnalysisRepository | undefined;
}

type InternalAdminWorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  status: string;
  role: WorkspaceMembership["role"];
  updatedAt: Date;
};

type InternalAdminCampaignSummary = {
  id: string;
  name: string;
  status: string;
  senderProfileAttached: boolean;
  prospectCount: number;
  updatedAt: Date;
};

type InternalAdminProspectSummary = {
  id: string;
  companyName: string | null;
  status: string;
  campaignName: string;
  contactName: string | null;
  updatedAt: Date;
};

type InternalAdminResearchSummary = {
  id: string;
  companyName: string | null;
  sourceHost: string;
  fetchStatus: string;
  confidenceLabel: string;
  capturedAt: Date;
};

type InternalAdminSequenceSummary = {
  id: string;
  companyName: string | null;
  campaignName: string;
  generationMode: string;
  status: string;
  createdAt: Date;
};

type InternalAdminReplyAnalysisSummary = {
  id: string;
  companyName: string | null;
  intent: string | null;
  recommendedAction: string | null;
  confidence: number | null;
  analyzedAt: Date;
};

export type InternalAdminOverview = {
  workspaces: InternalAdminWorkspaceSummary[];
  campaigns: InternalAdminCampaignSummary[];
  prospects: InternalAdminProspectSummary[];
  researchRuns: InternalAdminResearchSummary[];
  sequenceGenerations: InternalAdminSequenceSummary[];
  replyAnalyses: InternalAdminReplyAnalysisSummary[];
  auditEvents: AuditEvent[];
  usageEvents: UsageEvent[];
  operationLogs: ReturnType<typeof listRecentOperationLogs>;
};

function getResearchSnapshotRepository(): ResearchSnapshotRepository {
  if (globalThis.__cegResearchSnapshotRepository === undefined) {
    globalThis.__cegResearchSnapshotRepository =
      createInMemoryResearchSnapshotRepository();
  }

  return globalThis.__cegResearchSnapshotRepository;
}

function getSequenceRepository(): SequenceRepository {
  if (globalThis.__cegSequenceRepository === undefined) {
    globalThis.__cegSequenceRepository = createInMemorySequenceRepository();
  }

  return globalThis.__cegSequenceRepository;
}

function getConversationThreadRepository(): ConversationThreadRepository {
  if (globalThis.__cegConversationThreadRepository === undefined) {
    globalThis.__cegConversationThreadRepository =
      createInMemoryConversationThreadRepository();
  }

  return globalThis.__cegConversationThreadRepository;
}

function getReplyAnalysisRepository(): ReplyAnalysisRepository {
  if (globalThis.__cegReplyAnalysisRepository === undefined) {
    globalThis.__cegReplyAnalysisRepository =
      createInMemoryReplyAnalysisRepository();
  }

  return globalThis.__cegReplyAnalysisRepository;
}

export function parseInternalAdminEmails(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function canAccessInternalAdminView(input: {
  email?: string | null;
  membership: WorkspaceMembership | null;
  allowedEmails: readonly string[];
}): boolean {
  if (input.membership === null || input.email == null) {
    return false;
  }

  return (
    canManageWorkspace(input.membership) &&
    input.allowedEmails.includes(input.email.trim().toLowerCase())
  );
}

export function getInternalAdminAllowedEmails(): string[] {
  return parseInternalAdminEmails(process.env.INTERNAL_ADMIN_EMAILS);
}

export function isInternalAdminEnabled(): boolean {
  return getInternalAdminAllowedEmails().length > 0;
}

function getSourceHost(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

export async function getRecentManagedWorkspaces(
  user: AuthenticatedUser,
): Promise<InternalAdminWorkspaceSummary[]> {
  const managedMemberships = user.memberships.filter((membership) =>
    canManageWorkspace(membership),
  );
  const resolved = await Promise.all(
    managedMemberships.map(async (membership) => {
      const workspace = await ensureWorkspaceRecordForMembership({
        membership,
        userId: user.userId,
      });

      return {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        status: workspace.status,
        role: membership.role,
        updatedAt: workspace.updatedAt,
      } satisfies InternalAdminWorkspaceSummary;
    }),
  );

  return resolved.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

export async function getInternalAdminOverview(input: {
  workspaceId: string;
  user: AuthenticatedUser;
}): Promise<InternalAdminOverview> {
  const workspaces = await getRecentManagedWorkspaces(input.user);
  const campaigns = await listCampaignsForWorkspace(input.workspaceId);
  const campaignProspects = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      prospects: await listProspectsForCampaign(input.workspaceId, campaign.id),
    })),
  );
  const flattenedProspects = campaignProspects.flatMap(({ campaign, prospects }) =>
    prospects.map((prospect) => ({
      campaign,
      prospect,
    })),
  );

  const researchRuns = await Promise.all(
    flattenedProspects.map(async ({ prospect }) =>
      getResearchSnapshotRepository().listResearchSnapshotsByProspect(prospect.id),
    ),
  );
  const sequenceRuns = await Promise.all(
    flattenedProspects.map(async ({ prospect }) =>
      prospect.campaignId
        ? getSequenceRepository().listSequencesByProspect(
            input.workspaceId,
            prospect.campaignId,
            prospect.id,
          )
        : [],
    ),
  );
  const replyAnalysesByProspect = await Promise.all(
    flattenedProspects.map(async ({ prospect }) => {
      if (!prospect.campaignId) {
        return [];
      }

      const thread = await getConversationThreadRepository().getThreadByProspect(
        input.workspaceId,
        prospect.campaignId,
        prospect.id,
      );

      if (thread === null) {
        return [];
      }

      return getReplyAnalysisRepository().listReplyAnalysesByThread(thread.id);
    }),
  );

  const auditEvents = await getSharedAuditEventRepository().listRecentAuditEventsByWorkspace({
    workspaceId: input.workspaceId,
    limit: 20,
  });
  const usageEvents = (await getSharedUsageEventRepository().listUsageEventsByWorkspace(
    input.workspaceId,
  ))
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 20);

  return {
    workspaces: workspaces.slice(0, 12),
    campaigns: campaignProspects
      .map(({ campaign, prospects }) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        senderProfileAttached: campaign.senderProfileId != null,
        prospectCount: prospects.length,
        updatedAt: campaign.updatedAt,
      }))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 12),
    prospects: flattenedProspects
      .map(({ campaign, prospect }) => ({
        id: prospect.id,
        companyName: prospect.companyName ?? null,
        status: prospect.status,
        campaignName: campaign.name,
        contactName: prospect.contactName ?? prospect.fullName ?? null,
        updatedAt: prospect.updatedAt,
      }))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 12),
    researchRuns: researchRuns
      .flat()
      .map((snapshot) => ({
        id: snapshot.id,
        companyName:
          snapshot.structuredData.companyProfile.companyName ??
          snapshot.structuredData.companyProfile.domain,
        sourceHost: getSourceHost(snapshot.sourceUrl),
        fetchStatus: snapshot.fetchStatus,
        confidenceLabel: snapshot.structuredData.quality.overall.label,
        capturedAt: snapshot.capturedAt,
      }))
      .sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime())
      .slice(0, 12),
    sequenceGenerations: sequenceRuns
      .flat()
      .map((sequence) => {
        const matchingProspect = flattenedProspects.find(
          ({ prospect }) => prospect.id === sequence.prospectId,
        );

        return {
          id: sequence.id,
          companyName: matchingProspect?.prospect.companyName ?? null,
          campaignName: matchingProspect?.campaign.name ?? "Unknown campaign",
          generationMode: sequence.generationMode,
          status: sequence.status,
          createdAt: sequence.createdAt,
        };
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 12),
    replyAnalyses: replyAnalysesByProspect
      .flat()
      .map((analysis) => {
        const structured =
          typeof analysis.structuredOutput === "object" && analysis.structuredOutput !== null
            ? (analysis.structuredOutput as Record<string, unknown>)
            : null;
        const analysisOutput =
          structured &&
          typeof structured.analysisOutput === "object" &&
          structured.analysisOutput !== null
            ? (structured.analysisOutput as {
                analysis?: {
                  intent?: unknown;
                  recommendedAction?: unknown;
                  confidence?: { score?: unknown };
                };
              })
            : null;
        const output = analysisOutput?.analysis;

        return {
          id: analysis.id,
          companyName: null,
          intent: typeof output?.intent === "string" ? output.intent : analysis.intent ?? null,
          recommendedAction:
            typeof output?.recommendedAction === "string"
              ? output.recommendedAction
              : null,
          confidence:
            typeof output?.confidence?.score === "number"
              ? output.confidence.score
              : analysis.confidence ?? null,
          analyzedAt: analysis.analyzedAt,
        };
      })
      .sort((left, right) => right.analyzedAt.getTime() - left.analyzedAt.getTime())
      .slice(0, 12),
    auditEvents,
    usageEvents,
    operationLogs: listRecentOperationLogs({
      workspaceId: input.workspaceId,
      limit: 20,
    }),
  };
}


