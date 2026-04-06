import "server-only";

import {
  canManageWorkspace,
  type WorkspaceMembership,
} from "@ceg/auth";
import {
  createInMemoryDraftReplyRepository,
  createInMemoryReplyAnalysisRepository,
  createInMemoryResearchSnapshotRepository,
  createInMemorySequenceRepository,
  type DraftReplyRepository,
  type ReplyAnalysisRepository,
  type ResearchSnapshotRepository,
  type SequenceRepository,
} from "@ceg/database";
import {
  type Workspace,
  type WorkspaceDataHandlingState,
  workspaceDataHandlingStateSchema,
} from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import {
  getCampaignRepository,
  getConversationThreadRepository,
  getMessageRepository,
  getProspectRepository,
  getSenderProfileRepository,
} from "./database";
import { createOperationContext } from "./observability";
import { getSharedUsageEventRepository } from "./usage-events";
import { getWorkspaceRecordById, updateWorkspaceSettings } from "./workspaces";

declare global {
  var __cegResearchSnapshotRepository: ResearchSnapshotRepository | undefined;
  var __cegSequenceRepository: SequenceRepository | undefined;
  var __cegReplyAnalysisRepository: ReplyAnalysisRepository | undefined;
  var __cegDraftReplyRepository: DraftReplyRepository | undefined;
}

export type WorkspaceExportBundle = {
  exportedAt: string;
  workspace: Workspace;
  dataHandling: WorkspaceDataHandlingState;
  exportedBy: {
    userId: string;
    email: string;
    role: WorkspaceMembership["role"];
  };
  records: {
    senderProfiles: Awaited<ReturnType<ReturnType<typeof getSenderProfileRepository>["listSenderProfilesByWorkspace"]>>;
    campaigns: Awaited<ReturnType<ReturnType<typeof getCampaignRepository>["listCampaignsByWorkspace"]>>;
    prospects: Awaited<ReturnType<ReturnType<typeof getProspectRepository>["listProspectsByCampaign"]>>;
    researchSnapshots: Awaited<ReturnType<ResearchSnapshotRepository["listResearchSnapshotsByProspect"]>>;
    sequences: Awaited<ReturnType<SequenceRepository["listSequencesByProspect"]>>;
    conversationThreads: Awaited<ReturnType<ReturnType<typeof getConversationThreadRepository>["getThreadByProspect"]>>[];
    messages: Awaited<ReturnType<ReturnType<typeof getMessageRepository>["listMessagesByThread"]>>;
    replyAnalyses: Awaited<ReturnType<ReplyAnalysisRepository["listReplyAnalysesByThread"]>>;
    draftReplies: Awaited<ReturnType<DraftReplyRepository["listDraftRepliesByThread"]>>;
  };
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

function getReplyAnalysisRepository(): ReplyAnalysisRepository {
  if (globalThis.__cegReplyAnalysisRepository === undefined) {
    globalThis.__cegReplyAnalysisRepository =
      createInMemoryReplyAnalysisRepository();
  }

  return globalThis.__cegReplyAnalysisRepository;
}

function getDraftReplyRepository(): DraftReplyRepository {
  if (globalThis.__cegDraftReplyRepository === undefined) {
    globalThis.__cegDraftReplyRepository = createInMemoryDraftReplyRepository();
  }

  return globalThis.__cegDraftReplyRepository;
}

function assertWorkspaceScope(membership: WorkspaceMembership, workspaceId: string) {
  if (membership.workspaceId !== workspaceId) {
    throw new Error("Workspace access is denied.");
  }
}

function requireWorkspaceAdmin(membership: WorkspaceMembership) {
  if (!canManageWorkspace(membership)) {
    throw new Error("Workspace admin access is required for this action.");
  }
}

function readWorkspaceDataHandlingState(
  settings: Workspace["settings"],
): WorkspaceDataHandlingState {
  const candidate =
    typeof settings === "object" && settings !== null && "dataHandling" in settings
      ? (settings as { dataHandling?: unknown }).dataHandling
      : undefined;

  return workspaceDataHandlingStateSchema.parse(candidate ?? {});
}

async function getWorkspaceOrThrow(workspaceId: string): Promise<Workspace> {
  const workspace = await getWorkspaceRecordById(workspaceId);

  if (workspace === null) {
    throw new Error("Workspace not found.");
  }

  return workspace;
}

export async function buildWorkspaceExport(input: {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  actorMembership: WorkspaceMembership;
  requestId?: string;
}): Promise<WorkspaceExportBundle> {
  assertWorkspaceScope(input.actorMembership, input.workspaceId);
  requireWorkspaceAdmin(input.actorMembership);

  const workspace = await getWorkspaceOrThrow(input.workspaceId);
  const operation = createOperationContext({
    operation: "workspace.export.generate",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  const senderProfiles = await getSenderProfileRepository().listSenderProfilesByWorkspace(
    input.workspaceId,
  );
  const campaigns = await getCampaignRepository().listCampaignsByWorkspace(input.workspaceId);
  const prospectGroups = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      prospects: await getProspectRepository().listProspectsByCampaign(campaign.id),
    })),
  );
  const prospects = prospectGroups.flatMap((group) => group.prospects);

  const researchSnapshotGroups = await Promise.all(
    prospects.map((prospect) =>
      getResearchSnapshotRepository().listResearchSnapshotsByProspect(
        input.workspaceId,
        prospect.id,
      ),
    ),
  );
  const sequenceGroups = await Promise.all(
    prospects.map((prospect) =>
      prospect.campaignId
        ? getSequenceRepository().listSequencesByProspect(
            input.workspaceId,
            prospect.campaignId,
            prospect.id,
          )
        : Promise.resolve([]),
    ),
  );
  const threadEntries = await Promise.all(
    prospects.map(async (prospect) => {
      if (!prospect.campaignId) {
        return null;
      }

      const thread = await getConversationThreadRepository().getThreadByProspect(
        input.workspaceId,
        prospect.campaignId,
        prospect.id,
      );

      return thread === null ? null : { prospect, thread };
    }),
  );
  const threads = threadEntries.filter((entry) => entry !== null);

  const messageGroups = await Promise.all(
    threads.map((entry) =>
      getMessageRepository().listMessagesByThread(input.workspaceId, entry.thread.id),
    ),
  );
  const analysisGroups = await Promise.all(
    threads.map((entry) =>
      getReplyAnalysisRepository().listReplyAnalysesByThread(
        input.workspaceId,
        entry.thread.id,
      ),
    ),
  );
  const draftGroups = await Promise.all(
    threads.map((entry) =>
      getDraftReplyRepository().listDraftRepliesByThread(
        input.workspaceId,
        entry.thread.id,
      ),
    ),
  );

  const exportedAt = new Date();
  const dataHandling = readWorkspaceDataHandlingState(workspace.settings);
  const nextDataHandling = workspaceDataHandlingStateSchema.parse({
    ...dataHandling,
    lastExportAt: exportedAt,
    lastExportedByUserId: input.actorUserId,
  });

  await updateWorkspaceSettings({
    workspaceId: input.workspaceId,
    settings: {
      ...workspace.settings,
      dataHandling: nextDataHandling,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "workspace.export.generated",
    entityType: "workspace",
    entityId: workspace.id,
    requestId: operation.requestId,
    changes: {
      senderProfileCount: senderProfiles.length,
      campaignCount: campaigns.length,
      prospectCount: prospects.length,
      researchSnapshotCount: researchSnapshotGroups.flat().length,
      sequenceCount: sequenceGroups.flat().length,
      threadCount: threads.length,
      messageCount: messageGroups.flat().length,
      replyAnalysisCount: analysisGroups.flat().length,
      draftReplyCount: draftGroups.flat().length,
    },
    metadata: {
      exportedByEmail: input.actorEmail,
    },
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    eventName: "workspace_export_generated",
    entityType: "workspace",
    entityId: workspace.id,
    quantity: 1,
    billable: false,
    metadata: {
      campaignCount: campaigns.length,
      prospectCount: prospects.length,
    },
  });

  operation.logger.info("Workspace export generated", {
    campaignCount: campaigns.length,
    prospectCount: prospects.length,
    threadCount: threads.length,
  });

  return {
    exportedAt: exportedAt.toISOString(),
    workspace: {
      ...workspace,
      settings: {
        ...workspace.settings,
        dataHandling: nextDataHandling,
      },
    },
    dataHandling: nextDataHandling,
    exportedBy: {
      userId: input.actorUserId,
      email: input.actorEmail,
      role: input.actorMembership.role,
    },
    records: {
      senderProfiles,
      campaigns,
      prospects,
      researchSnapshots: researchSnapshotGroups.flat(),
      sequences: sequenceGroups.flat(),
      conversationThreads: threads.map((entry) => entry.thread),
      messages: messageGroups.flat(),
      replyAnalyses: analysisGroups.flat(),
      draftReplies: draftGroups.flat(),
    },
  };
}

export async function requestWorkspaceDeletion(input: {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  actorMembership: WorkspaceMembership;
  confirmationLabel: string;
  reason?: string | null;
  requestId?: string;
}): Promise<WorkspaceDataHandlingState> {
  assertWorkspaceScope(input.actorMembership, input.workspaceId);

  if (input.actorMembership.role !== "owner") {
    throw new Error("Only workspace owners can request workspace deletion.");
  }

  const workspace = await getWorkspaceOrThrow(input.workspaceId);
  const expectedLabel = workspace.name.trim();
  if (input.confirmationLabel.trim() !== expectedLabel) {
    throw new Error("Workspace name confirmation did not match.");
  }

  const operation = createOperationContext({
    operation: "workspace.deletion.request",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });
  const currentState = readWorkspaceDataHandlingState(workspace.settings);
  const nextState = workspaceDataHandlingStateSchema.parse({
    ...currentState,
    deletionRequest: {
      status: "requested",
      requestedAt: new Date(),
      requestedByUserId: input.actorUserId,
      requestedByEmail: input.actorEmail,
      reason:
        typeof input.reason === "string" && input.reason.trim().length > 0
          ? input.reason
          : null,
      confirmationLabel: input.confirmationLabel,
    },
  });

  await updateWorkspaceSettings({
    workspaceId: input.workspaceId,
    settings: {
      ...workspace.settings,
      dataHandling: nextState,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "workspace.deletion.requested",
    entityType: "workspace",
    entityId: workspace.id,
    requestId: operation.requestId,
    changes: {
      confirmationLabel: input.confirmationLabel,
    },
    metadata: {
      requestedByEmail: input.actorEmail,
      reason: nextState.deletionRequest.reason,
    },
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    eventName: "workspace_deletion_requested",
    entityType: "workspace",
    entityId: workspace.id,
    quantity: 1,
    billable: false,
    metadata: {},
  });

  operation.logger.info("Workspace deletion requested", {
    confirmationLabel: input.confirmationLabel,
  });

  return nextState;
}

export function readWorkspaceDataHandling(
  settings: Workspace["settings"],
): WorkspaceDataHandlingState {
  return readWorkspaceDataHandlingState(settings);
}
