import {
  generatedArtifactTypeSchema,
  trainingSignalActionTypeSchema,
  trainingSignalPayloadSchema,
  type GeneratedArtifactType,
  type TrainingSignalActionType,
  type TrainingSignalOutcome,
  type TrainingSignalPayload,
} from "@ceg/validation";

import { getCampaignForWorkspace, getProspectForCampaign } from "./campaigns";
import { createOperationContext } from "./observability";
import { getLatestResearchSnapshotForProspect } from "./prospect-research";
import { getSenderProfileForWorkspace } from "./sender-profiles";
import { getSharedUsageEventRepository } from "./usage-events";

export type RecordTrainingSignalInput = {
  workspaceId: string;
  userId?: string;
  campaignId?: string | null;
  prospectId?: string | null;
  senderProfileId?: string | null;
  artifactType: GeneratedArtifactType;
  artifactId: string;
  actionType: TrainingSignalActionType;
  providerMetadata?: unknown;
  beforeText?: string | null;
  afterText?: string | null;
  selectedOptionId?: string | null;
  exportFormat?: string | null;
  outcomeSignal?: TrainingSignalOutcome | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
};

type SnapshotContext = {
  senderProfileSnapshot: TrainingSignalPayload["senderProfileSnapshot"];
  campaignSnapshot: TrainingSignalPayload["campaignSnapshot"];
  prospectSnapshot: TrainingSignalPayload["prospectSnapshot"];
  researchSnapshot: TrainingSignalPayload["researchSnapshot"];
};

function resolveProviderMetadata(input: unknown) {
  if (typeof input !== "object" || input === null) {
    return {
      provider: null,
      model: null,
      promptTemplateId: null,
      promptVersion: null,
    };
  }

  const candidate = input as Record<string, unknown>;
  const readText = (key: string) => {
    const value = candidate[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
  };

  return {
    provider: readText("provider"),
    model: readText("model"),
    promptTemplateId: readText("promptTemplateId"),
    promptVersion: readText("promptVersion"),
  };
}

async function buildSnapshotContext(input: {
  workspaceId: string;
  campaignId?: string | null;
  prospectId?: string | null;
  senderProfileId?: string | null;
}): Promise<SnapshotContext> {
  const campaign =
    input.campaignId != null
      ? await getCampaignForWorkspace(input.workspaceId, input.campaignId)
      : null;
  const prospect =
    input.campaignId != null && input.prospectId != null
      ? await getProspectForCampaign(
          input.workspaceId,
          input.campaignId,
          input.prospectId,
        )
      : null;
  const researchSnapshot =
    input.campaignId != null && input.prospectId != null
      ? await getLatestResearchSnapshotForProspect(
          input.workspaceId,
          input.campaignId,
          input.prospectId,
        )
      : null;
  const senderProfileId = input.senderProfileId ?? campaign?.senderProfileId ?? null;
  const senderProfile =
    senderProfileId != null
      ? await getSenderProfileForWorkspace(input.workspaceId, senderProfileId)
      : null;

  return {
    senderProfileSnapshot: senderProfile
      ? {
          id: senderProfile.id,
          name: senderProfile.name,
          senderType: senderProfile.senderType,
          companyName: senderProfile.companyName ?? null,
          valueProposition: senderProfile.valueProposition ?? null,
          toneStyle: senderProfile.tonePreferences.style ?? null,
        }
      : null,
    campaignSnapshot: campaign
      ? {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          senderProfileId: campaign.senderProfileId ?? null,
          offerSummary: campaign.offerSummary ?? null,
          targetIcp: campaign.targetIcp ?? null,
          frameworkPreferences: campaign.frameworkPreferences,
          toneStyle: campaign.tonePreferences.style ?? null,
        }
      : null,
    prospectSnapshot: prospect
      ? {
          id: prospect.id,
          companyName: prospect.companyName ?? null,
          companyDomain: prospect.companyDomain ?? null,
          companyWebsite: prospect.companyWebsite ?? null,
          status: prospect.status,
        }
      : null,
    researchSnapshot: researchSnapshot
      ? {
          snapshotId: researchSnapshot.id,
          sourceUrl: researchSnapshot.sourceUrl,
          capturedAt: researchSnapshot.capturedAt,
          summary:
            researchSnapshot.structuredData.companyProfile.summary ?? null,
          valuePropositions:
            researchSnapshot.structuredData.companyProfile.valuePropositions ?? [],
          likelyPainPoints:
            researchSnapshot.structuredData.companyProfile.likelyPainPoints ?? [],
          personalizationHooks:
            researchSnapshot.structuredData.companyProfile.personalizationHooks ?? [],
          confidence: researchSnapshot.structuredData.companyProfile.confidence,
        }
      : null,
  };
}

function mapTrainingSignalEntityType(artifactType: GeneratedArtifactType) {
  if (artifactType.startsWith("sequence_")) {
    return "sequence";
  }

  if (artifactType.startsWith("draft_reply")) {
    return "draft_reply";
  }

  return null;
}

/**
 * Training-relevant supervision is normalized into usage-event metadata so later
 * dataset export can read one audit-friendly stream instead of scraping every
 * product workflow independently.
 */
export async function recordTrainingSignal(
  input: RecordTrainingSignalInput,
): Promise<void> {
  const operation = createOperationContext({
    operation: "training_signal.record",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId ?? null,
    prospectId: input.prospectId ?? null,
  });
  const [snapshotContext, providerMetadata] = await Promise.all([
    buildSnapshotContext({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId ?? null,
      prospectId: input.prospectId ?? null,
      senderProfileId: input.senderProfileId ?? null,
    }),
    Promise.resolve(resolveProviderMetadata(input.providerMetadata)),
  ]);

  const payload = trainingSignalPayloadSchema.parse({
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId ?? null,
    prospectId: input.prospectId ?? null,
    senderProfileId:
      input.senderProfileId ??
      snapshotContext.senderProfileSnapshot?.id ??
      null,
    artifactType: generatedArtifactTypeSchema.parse(input.artifactType),
    artifactId: input.artifactId,
    actionType: trainingSignalActionTypeSchema.parse(input.actionType),
    provider: providerMetadata.provider,
    model: providerMetadata.model,
    promptTemplateId: providerMetadata.promptTemplateId,
    promptVersion: providerMetadata.promptVersion,
    beforeText: input.beforeText ?? null,
    afterText: input.afterText ?? null,
    selectedOptionId: input.selectedOptionId ?? null,
    exportFormat: input.exportFormat ?? null,
    senderProfileSnapshot: snapshotContext.senderProfileSnapshot,
    campaignSnapshot: snapshotContext.campaignSnapshot,
    prospectSnapshot: snapshotContext.prospectSnapshot,
    researchSnapshot: snapshotContext.researchSnapshot,
    outcomeSignal: input.outcomeSignal ?? null,
    metadata: input.metadata ?? {},
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId ?? null,
    prospectId: input.prospectId ?? null,
    eventName: `training_signal_${payload.actionType}`,
    entityType: mapTrainingSignalEntityType(payload.artifactType),
    entityId: null,
    quantity: 1,
    billable: false,
    metadata: {
      datasetReady: true,
      trainingSignal: payload,
    },
  });

  operation.logger.info("Training signal recorded", {
    artifactType: payload.artifactType,
    artifactId: payload.artifactId,
    actionType: payload.actionType,
    selectedOptionId: payload.selectedOptionId ?? null,
  });
}
