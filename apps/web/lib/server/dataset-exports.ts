import "server-only";

import { canManageWorkspace, type WorkspaceMembership } from "@ceg/auth";
import {
  createInMemoryReplyAnalysisRepository,
  createInMemoryResearchSnapshotRepository,
  type ReplyAnalysisRepository,
  type ResearchSnapshotRepository,
} from "@ceg/database";
import {
  datasetExportBundleSchema,
  datasetExportFiltersSchema,
  datasetProviderReferenceSchema,
  trainingSignalPayloadSchema,
  type DatasetEvaluationCaseRecord,
  type DatasetExportBundle,
  type DatasetExportFilters,
  type DatasetPreferenceExampleRecord,
  type DatasetProviderReference,
  type DatasetResearchProfileRecord,
  type DatasetSupervisedExampleRecord,
  type ReplyAnalysis,
  type ResearchSnapshot,
  type TrainingSignalPayload,
  type UsageEvent,
  type Workspace,
} from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import {
  getCampaignRepository,
  getConversationThreadRepository,
  getProspectRepository,
} from "./database";
import {
  getDatasetExpectedPropertiesForArtifact,
  getDatasetTaskTypeForArtifact,
  matchesDatasetExportFilters,
} from "./dataset-export-utils";
import { createOperationContext } from "./observability";
import { getSharedUsageEventRepository } from "./usage-events";
import { getWorkspaceRecordById } from "./workspaces";

declare global {
  var __cegResearchSnapshotRepository: ResearchSnapshotRepository | undefined;
  var __cegReplyAnalysisRepository: ReplyAnalysisRepository | undefined;
}

type TrainingSignalEnvelope = {
  usageEventId: string;
  occurredAt: Date;
  signal: TrainingSignalPayload;
};

type ProspectContextEntry = {
  campaign: Awaited<ReturnType<ReturnType<typeof getCampaignRepository>["listCampaignsByWorkspace"]>>[number];
  prospect: Awaited<ReturnType<ReturnType<typeof getProspectRepository>["listProspectsByCampaign"]>>[number];
};

type ReplyAnalysisEnvelope = {
  analysis: ReplyAnalysis;
  prospectEntry: ProspectContextEntry;
  latestResearchSnapshot: ResearchSnapshot | null;
};

function getResearchSnapshotRepository(): ResearchSnapshotRepository {
  if (globalThis.__cegResearchSnapshotRepository === undefined) {
    globalThis.__cegResearchSnapshotRepository =
      createInMemoryResearchSnapshotRepository();
  }

  return globalThis.__cegResearchSnapshotRepository;
}

function getReplyAnalysisRepository(): ReplyAnalysisRepository {
  if (globalThis.__cegReplyAnalysisRepository === undefined) {
    globalThis.__cegReplyAnalysisRepository =
      createInMemoryReplyAnalysisRepository();
  }

  return globalThis.__cegReplyAnalysisRepository;
}

function requireWorkspaceAdmin(input: {
  workspaceId: string;
  membership: WorkspaceMembership;
}) {
  if (input.membership.workspaceId !== input.workspaceId || !canManageWorkspace(input.membership)) {
    throw new Error("Workspace admin access is required for dataset export.");
  }
}

function parseProviderReference(input: unknown): DatasetProviderReference {
  if (typeof input !== "object" || input === null) {
    return datasetProviderReferenceSchema.parse({});
  }

  const candidate = input as Record<string, unknown>;
  return datasetProviderReferenceSchema.parse({
    provider:
      typeof candidate.provider === "string" && candidate.provider.trim().length > 0
        ? candidate.provider
        : null,
    model:
      typeof candidate.model === "string" && candidate.model.trim().length > 0
        ? candidate.model
        : null,
    promptVersion:
      typeof candidate.promptVersion === "string" && candidate.promptVersion.trim().length > 0
        ? candidate.promptVersion
        : null,
    promptTemplateId:
      typeof candidate.promptTemplateId === "string" &&
      candidate.promptTemplateId.trim().length > 0
        ? candidate.promptTemplateId
        : null,
  });
}

function tryParseStructuredText(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseTrainingSignalEvents(events: UsageEvent[]): TrainingSignalEnvelope[] {
  const output: TrainingSignalEnvelope[] = [];

  for (const event of events) {
    const metadata =
      typeof event.metadata === "object" && event.metadata !== null
        ? (event.metadata as Record<string, unknown>)
        : null;
    const rawSignal = metadata?.trainingSignal;

    if (!rawSignal) {
      continue;
    }

    try {
      output.push({
        usageEventId: event.id,
        occurredAt: event.occurredAt,
        signal: trainingSignalPayloadSchema.parse(rawSignal),
      });
    } catch {
      continue;
    }
  }

  return output;
}

function buildSignalContext(signal: TrainingSignalPayload) {
  return {
    senderProfileSnapshot: signal.senderProfileSnapshot ?? null,
    campaignSnapshot: signal.campaignSnapshot ?? null,
    prospectSnapshot: signal.prospectSnapshot ?? null,
    researchSnapshot: signal.researchSnapshot ?? null,
  };
}

function buildResearchProviderReference(snapshot: ResearchSnapshot): DatasetProviderReference {
  const rawCapture =
    typeof snapshot.rawCapture === "object" && snapshot.rawCapture !== null
      ? (snapshot.rawCapture as Record<string, unknown>)
      : null;
  const operationMetadata =
    rawCapture && typeof rawCapture.operationMetadata === "object" && rawCapture.operationMetadata !== null
      ? (rawCapture.operationMetadata as Record<string, unknown>)
      : null;
  const summarization =
    operationMetadata && typeof operationMetadata.summarization === "object" && operationMetadata.summarization !== null
      ? operationMetadata.summarization
      : null;

  return parseProviderReference(summarization);
}

function buildReplyAnalysisReferenceStructured(analysis: ReplyAnalysis): Record<string, unknown> {
  const structuredOutput =
    typeof analysis.structuredOutput === "object" && analysis.structuredOutput !== null
      ? (analysis.structuredOutput as Record<string, unknown>)
      : {};
  const analysisOutput =
    typeof structuredOutput.analysisOutput === "object" && structuredOutput.analysisOutput !== null
      ? (structuredOutput.analysisOutput as Record<string, unknown>)
      : null;
  const parsedAnalysis =
    analysisOutput && typeof analysisOutput.analysis === "object" && analysisOutput.analysis !== null
      ? (analysisOutput.analysis as Record<string, unknown>)
      : null;

  return {
    classification: analysis.classification,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    intent:
      typeof parsedAnalysis?.intent === "string" ? parsedAnalysis.intent : analysis.intent,
    confidence:
      typeof parsedAnalysis?.confidence === "object" && parsedAnalysis.confidence !== null
        ? parsedAnalysis.confidence
        : analysis.confidence,
    recommendedAction:
      typeof parsedAnalysis?.recommendedAction === "string"
        ? parsedAnalysis.recommendedAction
        : null,
    rationale:
      typeof parsedAnalysis?.rationale === "string" ? parsedAnalysis.rationale : null,
    keySignals: Array.isArray(parsedAnalysis?.keySignals)
      ? parsedAnalysis.keySignals
      : [],
    cautionFlags: Array.isArray(parsedAnalysis?.cautionFlags)
      ? parsedAnalysis.cautionFlags
      : [],
  };
}

async function getWorkspaceOrThrow(workspaceId: string): Promise<Workspace> {
  const workspace = await getWorkspaceRecordById(workspaceId);

  if (workspace === null) {
    throw new Error("Workspace not found.");
  }

  return workspace;
}

async function listWorkspaceProspectEntries(
  workspaceId: string,
): Promise<ProspectContextEntry[]> {
  const campaigns = await getCampaignRepository().listCampaignsByWorkspace(workspaceId);
  const campaignProspects = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      prospects: await getProspectRepository().listProspectsByCampaign(campaign.id),
    })),
  );

  return campaignProspects.flatMap(({ campaign, prospects }) =>
    prospects.map((prospect) => ({ campaign, prospect })),
  );
}

async function listWorkspaceResearchSnapshots(
  workspaceId: string,
  filters: DatasetExportFilters,
): Promise<ResearchSnapshot[]> {
  const prospectEntries = await listWorkspaceProspectEntries(workspaceId);
  const snapshots = await Promise.all(
    prospectEntries.map(({ prospect }) =>
      getResearchSnapshotRepository().listResearchSnapshotsByProspect(
        workspaceId,
        prospect.id,
      ),
    ),
  );

  return snapshots
    .flat()
    .filter((snapshot) =>
      matchesDatasetExportFilters({
        occurredAt: snapshot.capturedAt,
        artifactType: "research_snapshot",
        actionType: null,
        filters,
      }),
    );
}

async function listWorkspaceReplyAnalyses(
  workspaceId: string,
  filters: DatasetExportFilters,
): Promise<ReplyAnalysisEnvelope[]> {
  const prospectEntries = await listWorkspaceProspectEntries(workspaceId);
  const results = await Promise.all(
    prospectEntries.map(async (entry) => {
      const thread = await getConversationThreadRepository().getThreadByProspect(
        workspaceId,
        entry.campaign.id,
        entry.prospect.id,
      );

      if (thread === null) {
        return [];
      }

      const [analyses, latestResearchSnapshot] = await Promise.all([
        getReplyAnalysisRepository().listReplyAnalysesByThread(workspaceId, thread.id),
        getResearchSnapshotRepository().getLatestResearchSnapshotByProspect(
          workspaceId,
          entry.prospect.id,
        ),
      ]);

      return analyses.map((analysis) => ({
        analysis,
        prospectEntry: entry,
        latestResearchSnapshot,
      }));
    }),
  );

  return results
    .flat()
    .filter((entry) =>
      matchesDatasetExportFilters({
        occurredAt: entry.analysis.analyzedAt,
        artifactType: "reply_analysis",
        actionType: null,
        filters,
      }),
    );
}

function buildResearchProfileRecords(
  snapshots: ResearchSnapshot[],
): DatasetResearchProfileRecord[] {
  return snapshots.map((snapshot) => ({
    recordType: "research_profile",
    workspaceId: snapshot.workspaceId,
    prospectId: snapshot.prospectId,
    sourceArtifactType: "research_snapshot",
    sourceArtifactId: snapshot.id,
    capturedAt: snapshot.capturedAt,
    sourceUrl: snapshot.sourceUrl,
    provider: buildResearchProviderReference(snapshot),
    companyProfile: snapshot.structuredData.companyProfile,
    quality: snapshot.structuredData.quality,
    metadata: {
      sourceType: snapshot.sourceType,
      fetchStatus: snapshot.fetchStatus,
      trainingRecord: snapshot.structuredData.trainingRecord,
    },
  }));
}

function buildReplyAnalysisSupervisedExamples(
  analyses: ReplyAnalysisEnvelope[],
): DatasetSupervisedExampleRecord[] {
  return analyses.map(({ analysis, prospectEntry, latestResearchSnapshot }) => ({
    recordType: "supervised_example",
    workspaceId: analysis.workspaceId,
    occurredAt: analysis.analyzedAt,
    taskType: "reply_analysis",
    sourceArtifactType: "reply_analysis",
    sourceArtifactId: analysis.id,
    actionType: null,
    provider: parseProviderReference(analysis.modelMetadata),
    context: {
      senderProfileSnapshot: null,
      campaignSnapshot: {
        id: prospectEntry.campaign.id,
        name: prospectEntry.campaign.name,
        status: prospectEntry.campaign.status,
        senderProfileId: prospectEntry.campaign.senderProfileId ?? null,
        offerSummary: prospectEntry.campaign.offerSummary ?? null,
        targetIcp: prospectEntry.campaign.targetIcp ?? null,
        frameworkPreferences: prospectEntry.campaign.frameworkPreferences,
        toneStyle: prospectEntry.campaign.tonePreferences.style ?? null,
      },
      prospectSnapshot: {
        id: prospectEntry.prospect.id,
        companyName: prospectEntry.prospect.companyName ?? null,
        companyDomain: prospectEntry.prospect.companyDomain ?? null,
        companyWebsite: prospectEntry.prospect.companyWebsite ?? null,
        status: prospectEntry.prospect.status,
      },
      researchSnapshot: latestResearchSnapshot
        ? {
            snapshotId: latestResearchSnapshot.id,
            sourceUrl: latestResearchSnapshot.sourceUrl,
            capturedAt: latestResearchSnapshot.capturedAt,
            summary:
              latestResearchSnapshot.structuredData.companyProfile.summary ?? null,
            valuePropositions:
              latestResearchSnapshot.structuredData.companyProfile.valuePropositions,
            likelyPainPoints:
              latestResearchSnapshot.structuredData.companyProfile.likelyPainPoints,
            personalizationHooks:
              latestResearchSnapshot.structuredData.companyProfile.personalizationHooks,
            confidence:
              latestResearchSnapshot.structuredData.companyProfile.confidence,
          }
        : null,
    },
    targetText: null,
    targetStructured: buildReplyAnalysisReferenceStructured(analysis),
    metadata: {
      messageId: analysis.messageId,
      threadId: analysis.threadId,
    },
  }));
}

function buildSignalSupervisedExamples(
  signals: TrainingSignalEnvelope[],
): DatasetSupervisedExampleRecord[] {
  return signals
    .filter(
      ({ signal }) =>
        (signal.actionType === "generated" ||
          signal.actionType === "regenerated" ||
          signal.actionType === "edited") &&
        signal.afterText,
    )
    .map(({ signal, occurredAt, usageEventId }) => ({
      recordType: "supervised_example",
      workspaceId: signal.workspaceId,
      occurredAt,
      taskType: getDatasetTaskTypeForArtifact({
        artifactType: signal.artifactType,
        actionType: signal.actionType,
      }),
      sourceArtifactType: signal.artifactType,
      sourceArtifactId: signal.artifactId,
      actionType: signal.actionType,
      provider: parseProviderReference(signal),
      context: buildSignalContext(signal),
      targetText: signal.afterText ?? null,
      targetStructured: tryParseStructuredText(signal.afterText),
      metadata: {
        usageEventId,
        selectedOptionId: signal.selectedOptionId ?? null,
        sourceMetadata: signal.metadata,
      },
    }));
}

function buildPreferenceExamples(
  signals: TrainingSignalEnvelope[],
): DatasetPreferenceExampleRecord[] {
  return signals
    .filter(({ signal }) => signal.actionType === "selected")
    .map(({ signal, occurredAt }) => ({
      recordType: "preference_example",
      workspaceId: signal.workspaceId,
      occurredAt,
      sourceArtifactType: signal.artifactType,
      sourceArtifactId: signal.artifactId,
      selectedOptionId: signal.selectedOptionId ?? signal.artifactId,
      provider: parseProviderReference(signal),
      context: buildSignalContext(signal),
      chosenText: signal.afterText ?? null,
      metadata: signal.metadata,
    }));
}

function buildEvaluationCasesFromSignals(
  signals: TrainingSignalEnvelope[],
): DatasetEvaluationCaseRecord[] {
  return signals
    .filter(
      ({ signal }) =>
        signal.actionType === "selected" ||
        signal.actionType === "edited" ||
        signal.actionType === "generated" ||
        signal.actionType === "regenerated" ||
        signal.actionType === "positive_outcome" ||
        signal.actionType === "negative_outcome",
    )
    .map(({ signal, occurredAt, usageEventId }) => ({
      recordType: "evaluation_case",
      workspaceId: signal.workspaceId,
      occurredAt,
      sourceArtifactType: signal.artifactType,
      sourceArtifactId: signal.artifactId,
      taskType: getDatasetTaskTypeForArtifact({
        artifactType: signal.artifactType,
        actionType: signal.actionType,
      }),
      provider: parseProviderReference(signal),
      expectedProperties: getDatasetExpectedPropertiesForArtifact(signal.artifactType),
      acceptanceSignals: [signal.actionType],
      referenceText: signal.afterText ?? signal.beforeText ?? null,
      referenceStructured:
        tryParseStructuredText(signal.afterText) ?? tryParseStructuredText(signal.beforeText),
      metadata: {
        usageEventId,
        selectedOptionId: signal.selectedOptionId ?? null,
        outcomeSignal: signal.outcomeSignal ?? null,
      },
    }));
}

function buildEvaluationCasesFromResearch(
  snapshots: ResearchSnapshot[],
): DatasetEvaluationCaseRecord[] {
  return snapshots.map((snapshot) => ({
    recordType: "evaluation_case",
    workspaceId: snapshot.workspaceId,
    occurredAt: snapshot.capturedAt,
    sourceArtifactType: "research_snapshot",
    sourceArtifactId: snapshot.id,
    taskType: "research_profile_extraction",
    provider: buildResearchProviderReference(snapshot),
    expectedProperties: getDatasetExpectedPropertiesForArtifact("research_snapshot"),
    acceptanceSignals: [],
    referenceText: snapshot.structuredData.companyProfile.summary ?? null,
    referenceStructured: {
      companyProfile: snapshot.structuredData.companyProfile,
      quality: snapshot.structuredData.quality,
    },
    metadata: {
      sourceUrl: snapshot.sourceUrl,
    },
  }));
}

function buildEvaluationCasesFromReplyAnalyses(
  analyses: ReplyAnalysisEnvelope[],
): DatasetEvaluationCaseRecord[] {
  return analyses.map(({ analysis }) => ({
    recordType: "evaluation_case",
    workspaceId: analysis.workspaceId,
    occurredAt: analysis.analyzedAt,
    sourceArtifactType: "reply_analysis",
    sourceArtifactId: analysis.id,
    taskType: "reply_analysis",
    provider: parseProviderReference(analysis.modelMetadata),
    expectedProperties: getDatasetExpectedPropertiesForArtifact("reply_analysis"),
    acceptanceSignals: [],
    referenceText: null,
    referenceStructured: buildReplyAnalysisReferenceStructured(analysis),
    metadata: {
      messageId: analysis.messageId,
      threadId: analysis.threadId,
    },
  }));
}

export async function buildWorkspaceDatasetExport(input: {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  actorMembership: WorkspaceMembership;
  filters: Omit<DatasetExportFilters, "workspaceId">;
  requestId?: string;
}): Promise<DatasetExportBundle> {
  requireWorkspaceAdmin({
    workspaceId: input.workspaceId,
    membership: input.actorMembership,
  });

  const workspace = await getWorkspaceOrThrow(input.workspaceId);
  const filters = datasetExportFiltersSchema.parse({
    workspaceId: input.workspaceId,
    ...input.filters,
  });
  const operation = createOperationContext({
    operation: "dataset.export.generate",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  const [usageEvents, researchSnapshots, replyAnalyses] = await Promise.all([
    filters.dateFrom && filters.dateTo
      ? getSharedUsageEventRepository().listUsageEventsByWorkspaceAndOccurredAtRange({
          workspaceId: input.workspaceId,
          occurredFrom: filters.dateFrom,
          occurredTo: filters.dateTo,
        })
      : getSharedUsageEventRepository().listUsageEventsByWorkspace(input.workspaceId),
    listWorkspaceResearchSnapshots(input.workspaceId, filters),
    listWorkspaceReplyAnalyses(input.workspaceId, filters),
  ]);

  const signalEvents = parseTrainingSignalEvents(usageEvents).filter(({ occurredAt, signal }) =>
    matchesDatasetExportFilters({
      occurredAt,
      artifactType: signal.artifactType,
      actionType: signal.actionType,
      filters,
    }),
  );

  const records = {
    researchProfiles: buildResearchProfileRecords(researchSnapshots),
    supervisedExamples: [
      ...buildSignalSupervisedExamples(signalEvents),
      ...buildReplyAnalysisSupervisedExamples(replyAnalyses),
    ].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()),
    preferenceExamples: buildPreferenceExamples(signalEvents).sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    ),
    evaluationCases: [
      ...buildEvaluationCasesFromResearch(researchSnapshots),
      ...buildEvaluationCasesFromReplyAnalyses(replyAnalyses),
      ...buildEvaluationCasesFromSignals(signalEvents),
    ].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()),
  };

  const bundle = datasetExportBundleSchema.parse({
    exportedAt: new Date(),
    workspaceId: input.workspaceId,
    filters,
    records,
    counts: {
      researchProfiles: records.researchProfiles.length,
      supervisedExamples: records.supervisedExamples.length,
      preferenceExamples: records.preferenceExamples.length,
      evaluationCases: records.evaluationCases.length,
    },
    metadata: {
      workspaceSlug: workspace.slug,
      exportedByEmail: input.actorEmail,
      exportKind: "internal_dataset_export",
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "dataset.export.generated",
    entityType: "workspace",
    entityId: workspace.id,
    requestId: operation.requestId,
    changes: bundle.counts,
    metadata: {
      artifactTypes: filters.artifactTypes,
      signalMode: filters.signalMode,
      exportedByEmail: input.actorEmail,
    },
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    eventName: "dataset_export_generated",
    entityType: "workspace",
    entityId: workspace.id,
    quantity: 1,
    billable: false,
    metadata: {
      counts: bundle.counts,
      signalMode: filters.signalMode,
    },
  });

  operation.logger.info("Dataset export generated", {
    researchProfiles: bundle.counts.researchProfiles,
    supervisedExamples: bundle.counts.supervisedExamples,
    preferenceExamples: bundle.counts.preferenceExamples,
    evaluationCases: bundle.counts.evaluationCases,
  });

  return bundle;
}

