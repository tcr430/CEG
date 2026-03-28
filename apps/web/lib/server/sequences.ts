import {
  createInMemorySequenceRepository,
  type SequenceRepository,
} from "@ceg/database";
import { checkFeatureEntitlement, resolveBillingPlanCode } from "@ceg/billing";
import {
  compiledSequenceOutputSchema,
  createSequenceEngineService,
  regenerateSequencePartOutputSchema,
  scoreCompiledSequenceQuality,
  type CompiledSequenceOutput,
  type SenderContext,
  type SequenceEngineService,
  type SequenceGenerationInput,
} from "@ceg/sequence-engine";
import {
  artifactEditRecordSchema,
  companyProfileSchema,
  type ArtifactEditRecord,
  type CompanyProfile,
  type Sequence,
} from "@ceg/validation";

import { getCampaignForWorkspace, getProspectForCampaign } from "./campaigns";
import { createOpenAiSequenceModelAdapter } from "./openai-sequence-provider";
import { getLatestResearchSnapshotForProspect } from "./prospect-research";
import {
  assertWorkspaceFeatureAccess,
  assertWorkspaceUsageAccess,
} from "./billing";
import { getSenderProfileForWorkspace } from "./sender-profiles";
import { getSharedAuditEventRepository } from "./audit-events";
import { createOperationContext } from "./observability";
import { getSharedUsageEventRepository } from "./usage-events";
import { recordTrainingSignal } from "./training-signals";

declare global {
  var __cegSequenceRepository: SequenceRepository | undefined;
    var __cegSequenceEngineService: SequenceEngineService | undefined;
}

function getSequenceRepository(): SequenceRepository {
  if (globalThis.__cegSequenceRepository === undefined) {
    globalThis.__cegSequenceRepository = createInMemorySequenceRepository();
  }

  return globalThis.__cegSequenceRepository;
}

function getSequenceEngine(): SequenceEngineService {
  if (globalThis.__cegSequenceEngineService === undefined) {
    globalThis.__cegSequenceEngineService = createSequenceEngineService(
      createOpenAiSequenceModelAdapter(),
    );
  }

  return globalThis.__cegSequenceEngineService;
}

const SEQUENCE_PROMPT_VERSION = "sequence.v1";

export type StoredCompiledSequence = CompiledSequenceOutput & {
  recordId: string;
  qualityReport: Sequence["qualityChecksJson"] | null;
};

type SequenceArtifactType =
  | "sequence_subject_line_set"
  | "sequence_opener_set"
  | "sequence_initial_email"
  | "sequence_follow_up_step";

type SequencePartTarget =
  | { targetPart: "subject_line"; feedback: string }
  | { targetPart: "opener"; feedback: string }
  | { targetPart: "initial_email"; feedback: string }
  | { targetPart: "follow_up_step"; targetStepNumber: number; feedback: string };

type SequenceStepEditInput = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetPart: "initial_email" | "follow_up_step";
  targetStepNumber?: number;
  subject: string;
  opener: string;
  body: string;
  cta: string;
  rationale: string;
  userId?: string;
  requestId?: string;
};

function readSequenceEditHistory(record: Sequence): ArtifactEditRecord[] {
  if (typeof record.content !== "object" || record.content === null) {
    return [];
  }

  const candidate = (record.content as Record<string, unknown>).editHistory;
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.flatMap((item) => {
    const parsed = artifactEditRecordSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function serializeSequenceArtifact(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function withSequenceEditHistory(
  compiled: CompiledSequenceOutput,
  history: ArtifactEditRecord[],
): Record<string, unknown> {
  return {
    ...compiled,
    editHistory: history,
  };
}

function toSequenceArtifactType(targetPart: SequencePartTarget["targetPart"]): SequenceArtifactType {
  switch (targetPart) {
    case "subject_line":
      return "sequence_subject_line_set";
    case "opener":
      return "sequence_opener_set";
    case "initial_email":
      return "sequence_initial_email";
    case "follow_up_step":
      return "sequence_follow_up_step";
  }
}

function buildSequenceArtifactId(
  sequenceId: string,
  targetPart: SequencePartTarget["targetPart"] | SequenceStepEditInput["targetPart"],
  targetStepNumber?: number,
): string {
  if (targetPart === "follow_up_step") {
    return `${sequenceId}:follow-up:${targetStepNumber ?? 1}`;
  }

  return `${sequenceId}:${targetPart}`;
}

function mergeRegeneratedSequence(
  compiled: CompiledSequenceOutput,
  regeneratedOutput: ReturnType<typeof regenerateSequencePartOutputSchema.parse>,
): CompiledSequenceOutput {
  const regenerated = regeneratedOutput.regeneratedPart;

  switch (regenerated.part) {
    case "subject_line":
      return compiledSequenceOutputSchema.parse({
        ...compiled,
        subjectLineSet: {
          ...compiled.subjectLineSet,
          subjectLines: regenerated.subjectLines ?? compiled.subjectLineSet.subjectLines,
          rationale: regeneratedOutput.rationale,
          qualityChecks: regeneratedOutput.qualityChecks,
          generationMetadata: regeneratedOutput.generationMetadata,
        },
      });
    case "opener":
      return compiledSequenceOutputSchema.parse({
        ...compiled,
        openerSet: {
          ...compiled.openerSet,
          openerOptions: regenerated.openerOptions ?? compiled.openerSet.openerOptions,
          rationale: regeneratedOutput.rationale,
          qualityChecks: regeneratedOutput.qualityChecks,
          generationMetadata: regeneratedOutput.generationMetadata,
        },
      });
    case "initial_email":
      return compiledSequenceOutputSchema.parse({
        ...compiled,
        initialEmail: {
          email: regenerated.email ?? compiled.initialEmail.email,
          rationale: regeneratedOutput.rationale,
          qualityChecks: regeneratedOutput.qualityChecks,
          generationMetadata: regeneratedOutput.generationMetadata,
        },
      });
    case "follow_up_step":
      return compiledSequenceOutputSchema.parse({
        ...compiled,
        followUpSequence: {
          ...compiled.followUpSequence,
          sequenceSteps: compiled.followUpSequence.sequenceSteps.map((step) =>
            step.stepNumber === regenerated.sequenceStep?.stepNumber
              ? regenerated.sequenceStep
              : step,
          ),
          rationale: regeneratedOutput.rationale,
          qualityChecks: regeneratedOutput.qualityChecks,
          generationMetadata: regeneratedOutput.generationMetadata,
        },
      });
  }
}

function mergeEditedSequenceStep(
  compiled: CompiledSequenceOutput,
  input: SequenceStepEditInput,
): CompiledSequenceOutput {
  if (input.targetPart === "initial_email") {
    return compiledSequenceOutputSchema.parse({
      ...compiled,
      initialEmail: {
        ...compiled.initialEmail,
        email: {
          ...compiled.initialEmail.email,
          subject: input.subject,
          opener: input.opener,
          body: input.body,
          cta: input.cta,
          rationale: input.rationale,
        },
      },
    });
  }

  return compiledSequenceOutputSchema.parse({
    ...compiled,
    followUpSequence: {
      ...compiled.followUpSequence,
      sequenceSteps: compiled.followUpSequence.sequenceSteps.map((step) =>
        step.stepNumber === input.targetStepNumber
          ? {
              ...step,
              subject: input.subject,
              opener: input.opener,
              body: input.body,
              cta: input.cta,
              rationale: input.rationale,
            }
          : step,
      ),
    },
  });
}

function buildFallbackCompanyProfile(input: {
  websiteUrl?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
}): CompanyProfile {
  const websiteUrl = input.websiteUrl ?? `https://${input.companyDomain ?? "example.com"}`;
  const domain = input.companyDomain ?? new URL(websiteUrl).hostname.replace(/^www\./i, "");

  return companyProfileSchema.parse({
    domain,
    websiteUrl,
    companyName: input.companyName ?? domain,
    summary: "Only limited prospect company context is available so sequence phrasing should stay cautious.",
    likelyTargetCustomer: null,
    targetCustomers: [],
    industries: [],
    valuePropositions: [],
    proofPoints: [],
    differentiators: [],
    likelyPainPoints: [],
    personalizationHooks: [],
    callsToAction: [],
    sourceEvidence: [],
    confidence: {
      score: 0.25,
      label: "low",
      reasons: ["No research snapshot was available for this prospect."],
    },
    flags: [
      {
        code: "no_research_snapshot",
        severity: "warning",
        message: "No structured research snapshot was available when generating the sequence.",
      },
    ],
    metadata: {
      source: "prospect-record-fallback",
    },
  });
}

async function buildSenderContext(
  workspaceId: string,
  workspacePlanCode?: string | null,
  senderProfileId?: string | null,
): Promise<SenderContext> {
  if (!senderProfileId) {
    return {
      mode: "basic",
      basicModeReason: "Campaign does not currently have a sender profile attached.",
    };
  }

  const senderAwareAccess = checkFeatureEntitlement(
    resolveBillingPlanCode(workspacePlanCode),
    "sender_aware_profiles",
  );

  if (!senderAwareAccess.allowed) {
    return {
      mode: "basic",
      basicModeReason:
        "Current workspace plan does not include sender-aware profiles, so generation used basic mode.",
    };
  }

  const senderProfile = await getSenderProfileForWorkspace(workspaceId, senderProfileId);

  if (senderProfile === null) {
    return {
      mode: "basic",
      basicModeReason: "Campaign sender profile could not be resolved, so generation fell back to basic mode.",
    };
  }

  return {
    mode: "sender_aware",
    senderProfile,
  };
}

async function buildSequenceGenerationInput(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  workspacePlanCode?: string | null;
}): Promise<SequenceGenerationInput> {
  const campaign = await getCampaignForWorkspace(input.workspaceId, input.campaignId);
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (campaign === null || prospect === null) {
    throw new Error("Campaign or prospect not found for workspace.");
  }

  const [senderContext, researchSnapshot] = await Promise.all([
    buildSenderContext(
      input.workspaceId,
      input.workspacePlanCode,
      campaign.senderProfileId,
    ),
    getLatestResearchSnapshotForProspect(
      input.workspaceId,
      input.campaignId,
      input.prospectId,
    ),
  ]);

  const prospectCompanyProfile =
    researchSnapshot?.structuredData.companyProfile ??
    buildFallbackCompanyProfile({
      websiteUrl: prospect.companyWebsite,
      companyName: prospect.companyName,
      companyDomain: prospect.companyDomain,
    });

  return {
    senderContext,
    campaign,
    prospectCompanyProfile,
    promptContext: {
      framework:
        campaign.frameworkPreferences.join(" | ") ||
        "Problem -> proof -> CTA",
      tone: {
        style:
          campaign.tonePreferences.style ??
          (senderContext.mode === "sender_aware"
            ? senderContext.senderProfile.tonePreferences.style ?? "clear"
            : "clear"),
        do: [
          ...campaign.tonePreferences.do,
          ...(senderContext.mode === "sender_aware"
            ? senderContext.senderProfile.tonePreferences.do
            : []),
        ],
        avoid: [
          ...campaign.tonePreferences.avoid,
          ...(senderContext.mode === "sender_aware"
            ? senderContext.senderProfile.tonePreferences.avoid
            : []),
        ],
        fit: prospectCompanyProfile.confidence.label === "low" ? "strict" : "balanced",
      },
      constraints: {
        maxSubjectLength: 72,
        maxOpenerLength: 180,
        maxEmailBodyLength: 900,
        maxFollowUpSteps: 3,
        requireCta: true,
        forbidUnsupportedClaims: true,
        forbidGenericFluff: true,
        bannedPhrases: ["just checking in", "hope you are well"],
        preferredCallToActionStyle:
          prospectCompanyProfile.confidence.label === "low" ? "soft" : "value_first",
      },
    },
    objective:
      campaign.offerSummary ??
      campaign.targetIcp ??
      "Start a relevant conversation with the prospect.",
  };
}

function getNextSequenceVersion(existingSequences: Sequence[]): number {
  return (
    existingSequences
      .map((sequence) => {
        const candidate = sequence.content;
        return typeof candidate === "object" && candidate !== null && "sequenceVersion" in candidate
          ? Number((candidate as { sequenceVersion?: unknown }).sequenceVersion ?? 0)
          : 0;
      })
      .reduce((highest, current) => Math.max(highest, current), 0) + 1
  );
}

function summarizeModelMetadata(compiled: CompiledSequenceOutput) {
  const subjectMeta = compiled.subjectLineSet.generationMetadata;
  const openerMeta = compiled.openerSet.generationMetadata;
  const initialMeta = compiled.initialEmail.generationMetadata;
  const followUpMeta = compiled.followUpSequence.generationMetadata;
  const inputTokens = [subjectMeta, openerMeta, initialMeta, followUpMeta].reduce(
    (sum, item) => sum + (item.inputTokens ?? 0),
    0,
  );
  const outputTokens = [subjectMeta, openerMeta, initialMeta, followUpMeta].reduce(
    (sum, item) => sum + (item.outputTokens ?? 0),
    0,
  );
  const totalTokens = [subjectMeta, openerMeta, initialMeta, followUpMeta].reduce(
    (sum, item) => sum + (item.totalTokens ?? 0),
    0,
  );

  return {
    provider: subjectMeta.provider,
    model: subjectMeta.model,
    promptVersion: SEQUENCE_PROMPT_VERSION,
    operations: {
      subjectLines: subjectMeta,
      openers: openerMeta,
      initialEmail: initialMeta,
      followUpSequence: followUpMeta,
    },
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: null,
    generatedAt: new Date().toISOString(),
  };
}
function getSequenceArtifactContent(
  compiled: CompiledSequenceOutput,
  targetPart: SequencePartTarget["targetPart"] | SequenceStepEditInput["targetPart"],
  targetStepNumber?: number,
) {
  switch (targetPart) {
    case "subject_line":
      return compiled.subjectLineSet.subjectLines;
    case "opener":
      return compiled.openerSet.openerOptions;
    case "initial_email":
      return compiled.initialEmail.email;
    case "follow_up_step":
      return compiled.followUpSequence.sequenceSteps.find(
        (step) => step.stepNumber === (targetStepNumber ?? 1),
      );
  }
}

function getSequenceOptionArtifactId(
  sequenceId: string,
  artifactType: "sequence_subject_line_option" | "sequence_opener_option",
  optionIndex: number,
): string {
  const artifactLabel =
    artifactType === "sequence_subject_line_option" ? "subject-line-option" : "opener-option";

  return `${sequenceId}:${artifactLabel}:${optionIndex + 1}`;
}

function getSenderProfileIdFromSequenceInput(sequenceInput: SequenceGenerationInput): string | null {
  return sequenceInput.senderContext.mode === "sender_aware"
    ? sequenceInput.senderContext.senderProfile.id
    : null;
}

function buildSequenceSignalProviderMetadata(modelMetadata: unknown) {
  if (typeof modelMetadata !== "object" || modelMetadata === null) {
    return {
      promptVersion: SEQUENCE_PROMPT_VERSION,
    };
  }

  return {
    ...(modelMetadata as Record<string, unknown>),
    promptVersion:
      typeof (modelMetadata as { promptVersion?: unknown }).promptVersion === "string"
        ? (modelMetadata as { promptVersion: string }).promptVersion
        : SEQUENCE_PROMPT_VERSION,
  };
}

async function recordSequenceTrainingSignal(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
  senderProfileId?: string | null;
  artifactType:
    | SequenceArtifactType
    | "sequence_bundle"
    | "sequence_subject_line_option"
    | "sequence_opener_option";
  artifactId: string;
  actionType: "generated" | "regenerated" | "edited" | "selected" | "copied" | "exported";
  providerMetadata?: unknown;
  beforeText?: string | null;
  afterText?: string | null;
  selectedOptionId?: string | null;
  exportFormat?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
}) {
  await recordTrainingSignal({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    senderProfileId: input.senderProfileId ?? null,
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    actionType: input.actionType,
    providerMetadata: buildSequenceSignalProviderMetadata(input.providerMetadata),
    beforeText: input.beforeText ?? null,
    afterText: input.afterText ?? null,
    selectedOptionId: input.selectedOptionId ?? null,
    exportFormat: input.exportFormat ?? null,
    metadata: input.metadata,
    requestId: input.requestId,
  });
}

export async function getLatestStoredSequenceForProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<Sequence | null> {
  return getSequenceRepository().getLatestSequenceByProspect(
    workspaceId,
    campaignId,
    prospectId,
  );
}
export async function getLatestSequenceForProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<StoredCompiledSequence | null> {
  const latest = await getSequenceRepository().getLatestSequenceByProspect(
    workspaceId,
    campaignId,
    prospectId,
  );

  if (latest === null) {
    return null;
  }

  return {
    recordId: latest.id,
    ...compiledSequenceOutputSchema.parse(latest.content),
    qualityReport: latest.qualityChecksJson ?? null,
  };
}

async function persistCompiledSequenceVersion(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
  sequenceInput: SequenceGenerationInput;
  compiled: CompiledSequenceOutput;
  latestSequenceRecord: Sequence;
  version: number;
  operation: {
    kind: "partial_regeneration" | "manual_edit";
    artifactType: SequenceArtifactType;
    artifactId: string;
    feedback?: string;
    editRecord?: ArtifactEditRecord;
    providerMetadata?: unknown;
  };
}): Promise<Sequence> {
  const editHistory = [
    ...readSequenceEditHistory(input.latestSequenceRecord),
    ...(input.operation.editRecord ? [input.operation.editRecord] : []),
  ];
  const contentWithHistory = withSequenceEditHistory(input.compiled, editHistory);
  const qualityReport = scoreCompiledSequenceQuality(input.compiled, input.sequenceInput);
  const modelMetadata = {
    ...(typeof input.latestSequenceRecord.modelMetadata === "object" && input.latestSequenceRecord.modelMetadata !== null
      ? input.latestSequenceRecord.modelMetadata
      : {}),
    lastOperation: {
      kind: input.operation.kind,
      artifactType: input.operation.artifactType,
      artifactId: input.operation.artifactId,
      feedback: input.operation.feedback ?? null,
      occurredAt: new Date().toISOString(),
      providerMetadata: input.operation.providerMetadata ?? null,
    },
    editHistory,
  };

  return getSequenceRepository().createSequence({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    senderProfileId:
      input.sequenceInput.senderContext.mode === "sender_aware"
        ? input.sequenceInput.senderContext.senderProfile.id
        : null,
    generationMode: input.sequenceInput.senderContext.mode,
    channel: "email",
    status: "draft",
    content: contentWithHistory,
    qualityChecksJson: qualityReport,
    modelMetadata,
    createdByUserId: input.userId ?? null,
  });
}

async function getLatestStoredSequenceOrThrow(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
}): Promise<Sequence> {
  const latestSequence = await getLatestStoredSequenceForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (latestSequence === null) {
    throw new Error("Generate a sequence before editing or regenerating one.");
  }

  return latestSequence;
}

export async function generateSequenceForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
  workspacePlanCode?: string | null;
  requestId?: string;
}): Promise<CompiledSequenceOutput> {
  await assertWorkspaceFeatureAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    feature: "sequence_generation",
  });
  await assertWorkspaceUsageAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    meterKey: "sequenceGenerations",
  });

  const operation = createOperationContext({
    operation: "sequence.generate",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });
  const sequenceInput = await buildSequenceGenerationInput(input);
  const existingSequences = await getSequenceRepository().listSequencesByProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );
  const version = getNextSequenceVersion(existingSequences);
  const runLogger = operation.logger.child({
    area: "sequence_generation",
    sequenceVersion: version,
  });

  runLogger.info("Sequence generation started", {
    mode: sequenceInput.senderContext.mode,
    confidence: sequenceInput.prospectCompanyProfile.confidence.label,
  });

  try {
    const engine = getSequenceEngine();
    const [subjectLineSet, openerSet, initialEmail, followUpSequence] = await Promise.all([
      engine.generateSubjectLines(sequenceInput),
      engine.generateOpeners(sequenceInput),
      engine.generateInitialEmail(sequenceInput),
      engine.generateFollowUpSequence(sequenceInput),
    ]);

    if (followUpSequence.sequenceSteps.length !== 3) {
      throw new Error("Follow-up generation must return exactly 3 steps.");
    }

    const compiled = compiledSequenceOutputSchema.parse({
      subjectLineSet,
      openerSet,
      initialEmail,
      followUpSequence,
      sequenceVersion: version,
      generatedForMode: sequenceInput.senderContext.mode,
    });

    const modelMetadata = summarizeModelMetadata(compiled);
    const qualityReport = scoreCompiledSequenceQuality(compiled, sequenceInput);
    const created = await getSequenceRepository().createSequence({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      senderProfileId:
        sequenceInput.senderContext.mode === "sender_aware"
          ? sequenceInput.senderContext.senderProfile.id
          : null,
      generationMode: sequenceInput.senderContext.mode,
      channel: "email",
      status: "draft",
      content: compiled,
      qualityChecksJson: qualityReport,
      modelMetadata,
      createdByUserId: input.userId ?? null,
    });

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      eventName: "sequence_generated",
      entityType: "sequence",
      entityId: created.id,
      quantity: 1,
      billable: false,
      inputTokens: modelMetadata.inputTokens,
      outputTokens: modelMetadata.outputTokens,
      costUsd: modelMetadata.costUsd,
      metadata: {
        provider: modelMetadata.provider,
        model: modelMetadata.model,
        promptVersion: modelMetadata.promptVersion,
        sequenceVersion: version,
        meterKey: "sequenceGenerations",
        workspacePlanCode: input.workspacePlanCode ?? "free",
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "sequence.generated",
      entityType: "sequence",
      entityId: created.id,
      requestId: operation.requestId,
      changes: {
        sequenceVersion: version,
        generationMode: sequenceInput.senderContext.mode,
      },
      metadata: {
        provider: modelMetadata.provider,
        model: modelMetadata.model,
        totalTokens: modelMetadata.totalTokens,
      },
    });

    await recordSequenceTrainingSignal({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      userId: input.userId,
      senderProfileId: getSenderProfileIdFromSequenceInput(sequenceInput),
      artifactType: "sequence_bundle",
      artifactId: created.id,
      actionType: "generated",
      providerMetadata: modelMetadata,
      afterText: JSON.stringify(compiled, null, 2),
      metadata: {
        sequenceVersion: version,
        generationMode: sequenceInput.senderContext.mode,
      },
      requestId: operation.requestId,
    });

    runLogger.info("Sequence generation completed", {
      sequenceId: created.id,
      generationMode: sequenceInput.senderContext.mode,
      totalTokens: modelMetadata.totalTokens,
    });

    return compiled;
  } catch (error) {
    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "sequence.generation_failed",
      entityType: "prospect",
      entityId: input.prospectId,
      requestId: operation.requestId,
      changes: {},
      metadata: {
        error: error instanceof Error ? error.message : "Unknown sequence generation error",
      },
    });

    runLogger.error("Sequence generation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}


export async function regenerateSequencePartForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetPart: SequencePartTarget["targetPart"];
  targetStepNumber?: number;
  feedback: string;
  userId?: string;
  workspacePlanCode?: string | null;
  requestId?: string;
}): Promise<StoredCompiledSequence> {
  await assertWorkspaceFeatureAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    feature: "sequence_regeneration",
  });
  await assertWorkspaceUsageAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    meterKey: "regenerations",
  });

  const operation = createOperationContext({
    operation: "sequence.edit",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });
  const [sequenceInput, latestSequenceRecord, existingSequences] = await Promise.all([
    buildSequenceGenerationInput(input),
    getLatestStoredSequenceOrThrow(input),
    getSequenceRepository().listSequencesByProspect(
      input.workspaceId,
      input.campaignId,
      input.prospectId,
    ),
  ]);
  const currentCompiled = compiledSequenceOutputSchema.parse(latestSequenceRecord.content);
  const target =
    input.targetPart === "follow_up_step"
      ? {
          targetPart: input.targetPart,
          targetStepNumber: input.targetStepNumber ?? 1,
          feedback: input.feedback,
        }
      : { targetPart: input.targetPart, feedback: input.feedback };

  const regeneratedOutput = regenerateSequencePartOutputSchema.parse(
    await getSequenceEngine().regenerateSequencePart({
      baseInput: sequenceInput,
      targetPart: target.targetPart,
      targetStepNumber:
        target.targetPart === "follow_up_step" ? target.targetStepNumber : undefined,
      currentSequenceSteps: currentCompiled.followUpSequence.sequenceSteps,
      currentEmail: currentCompiled.initialEmail.email,
      feedback: target.feedback,
    }),
  );

  const nextVersion = getNextSequenceVersion(existingSequences);
  const updatedCompiled = compiledSequenceOutputSchema.parse({
    ...mergeRegeneratedSequence(currentCompiled, regeneratedOutput),
    sequenceVersion: nextVersion,
  });

  const created = await persistCompiledSequenceVersion({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    sequenceInput,
    compiled: updatedCompiled,
    latestSequenceRecord,
    version: nextVersion,
    operation: {
      kind: "partial_regeneration",
      artifactType: toSequenceArtifactType(target.targetPart),
      artifactId: buildSequenceArtifactId(
        latestSequenceRecord.id,
        target.targetPart,
        target.targetPart === "follow_up_step" ? target.targetStepNumber : undefined,
      ),
      feedback: target.feedback,
      providerMetadata: regeneratedOutput.generationMetadata,
    },
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "sequence_part_regenerated",
    entityType: "sequence",
    entityId: created.id,
    quantity: 1,
    billable: false,
    inputTokens: regeneratedOutput.generationMetadata.inputTokens ?? null,
    outputTokens: regeneratedOutput.generationMetadata.outputTokens ?? null,
    costUsd: regeneratedOutput.generationMetadata.costUsd ?? null,
    metadata: {
      targetPart: target.targetPart,
      targetStepNumber:
        target.targetPart === "follow_up_step" ? target.targetStepNumber : null,
      sequenceVersion: nextVersion,
      meterKey: "regenerations",
      workspacePlanCode: input.workspacePlanCode ?? "free",
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "sequence.part.regenerated",
    entityType: "sequence",
    entityId: created.id,
    requestId: operation.requestId,
    changes: {
      targetPart: target.targetPart,
      targetStepNumber:
        target.targetPart === "follow_up_step" ? target.targetStepNumber : null,
      sequenceVersion: nextVersion,
      feedback: target.feedback,
    },
    metadata: {
      sourceSequenceId: latestSequenceRecord.id,
    },
  });

  await recordSequenceTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId: getSenderProfileIdFromSequenceInput(sequenceInput),
    artifactType: toSequenceArtifactType(target.targetPart),
    artifactId: buildSequenceArtifactId(
      latestSequenceRecord.id,
      target.targetPart,
      target.targetPart === "follow_up_step" ? target.targetStepNumber : undefined,
    ),
    actionType: "regenerated",
    providerMetadata: regeneratedOutput.generationMetadata,
    beforeText: serializeSequenceArtifact(
      getSequenceArtifactContent(
        currentCompiled,
        target.targetPart,
        target.targetPart === "follow_up_step" ? target.targetStepNumber : undefined,
      ),
    ),
    afterText: serializeSequenceArtifact(
      getSequenceArtifactContent(
        updatedCompiled,
        target.targetPart,
        target.targetPart === "follow_up_step" ? target.targetStepNumber : undefined,
      ),
    ),
    metadata: {
      sourceSequenceId: latestSequenceRecord.id,
      sequenceVersion: nextVersion,
      feedback: target.feedback,
      targetStepNumber:
        target.targetPart === "follow_up_step" ? target.targetStepNumber : null,
    },
    requestId: operation.requestId,
  });

  return {
    recordId: created.id,
    ...updatedCompiled,
    qualityReport: created.qualityChecksJson ?? null,
  };
}

export async function editSequenceStepForProspect(
  input: SequenceStepEditInput,
): Promise<StoredCompiledSequence> {
  const operation = createOperationContext({
    operation: "sequence.edit",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });
  const [sequenceInput, latestSequenceRecord, existingSequences] = await Promise.all([
    buildSequenceGenerationInput(input),
    getLatestStoredSequenceOrThrow(input),
    getSequenceRepository().listSequencesByProspect(
      input.workspaceId,
      input.campaignId,
      input.prospectId,
    ),
  ]);
  const currentCompiled = compiledSequenceOutputSchema.parse(latestSequenceRecord.content);
  const originalArtifact =
    input.targetPart === "initial_email"
      ? currentCompiled.initialEmail.email
      : currentCompiled.followUpSequence.sequenceSteps.find(
          (step) => step.stepNumber === input.targetStepNumber,
        );

  if (!originalArtifact) {
    throw new Error("The target sequence step could not be resolved.");
  }

  const nextVersion = getNextSequenceVersion(existingSequences);
  const updatedCompiled = compiledSequenceOutputSchema.parse({
    ...mergeEditedSequenceStep(currentCompiled, input),
    sequenceVersion: nextVersion,
  });
  const artifactId = buildSequenceArtifactId(
    latestSequenceRecord.id,
    input.targetPart,
    input.targetPart === "follow_up_step" ? input.targetStepNumber : undefined,
  );
  const editRecord = artifactEditRecordSchema.parse({
    artifactType: toSequenceArtifactType(input.targetPart),
    artifactId,
    originalText: serializeSequenceArtifact(originalArtifact),
    editedText: serializeSequenceArtifact(
      input.targetPart === "initial_email"
        ? updatedCompiled.initialEmail.email
        : updatedCompiled.followUpSequence.sequenceSteps.find(
            (step) => step.stepNumber === input.targetStepNumber,
          ),
    ),
    editedAt: new Date(),
    editorUserId: input.userId ?? null,
  });

  const created = await persistCompiledSequenceVersion({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    sequenceInput,
    compiled: updatedCompiled,
    latestSequenceRecord,
    version: nextVersion,
    operation: {
      kind: "manual_edit",
      artifactType: toSequenceArtifactType(input.targetPart),
      artifactId,
      editRecord,
    },
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "sequence_step_edited",
    entityType: "sequence",
    entityId: created.id,
    quantity: 1,
    billable: false,
    metadata: {
      artifactType: toSequenceArtifactType(input.targetPart),
      artifactId: editRecord.artifactId,
      sequenceVersion: nextVersion,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "sequence.step.edited",
    entityType: "sequence",
    entityId: created.id,
    requestId: operation.requestId,
    changes: editRecord,
    metadata: {
      sourceSequenceId: latestSequenceRecord.id,
    },
  });

  await recordSequenceTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId: getSenderProfileIdFromSequenceInput(sequenceInput),
    artifactType: toSequenceArtifactType(input.targetPart),
    artifactId: editRecord.artifactId,
    actionType: "edited",
    providerMetadata: created.modelMetadata,
    beforeText: editRecord.originalText,
    afterText: editRecord.editedText,
    metadata: {
      sourceSequenceId: latestSequenceRecord.id,
      sequenceVersion: nextVersion,
    },
    requestId: operation.requestId,
  });

  return {
    recordId: created.id,
    ...updatedCompiled,
    qualityReport: created.qualityChecksJson ?? null,
  };
}


export async function recordSequencePreferenceSignalForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  artifactType: "sequence_subject_line_option" | "sequence_opener_option";
  optionIndex: number;
  userId?: string;
  requestId?: string;
}): Promise<void> {
  const latestSequenceRecord = await getLatestStoredSequenceOrThrow(input);
  const compiled = compiledSequenceOutputSchema.parse(latestSequenceRecord.content);
  const options =
    input.artifactType === "sequence_subject_line_option"
      ? compiled.subjectLineSet.subjectLines
      : compiled.openerSet.openerOptions;
  const option = options[input.optionIndex];

  if (!option) {
    throw new Error("The selected sequence option could not be resolved.");
  }

  const artifactId = getSequenceOptionArtifactId(
    latestSequenceRecord.id,
    input.artifactType,
    input.optionIndex,
  );

  await recordSequenceTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId: latestSequenceRecord.senderProfileId ?? null,
    artifactType: input.artifactType,
    artifactId,
    actionType: "selected",
    providerMetadata: latestSequenceRecord.modelMetadata,
    afterText: serializeSequenceArtifact(option),
    selectedOptionId: artifactId,
    metadata: {
      sourceSequenceId: latestSequenceRecord.id,
      sequenceVersion: compiled.sequenceVersion,
      optionIndex: input.optionIndex,
    },
    requestId: input.requestId,
  });
}

export async function recordSequenceDistributionSignalForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  artifactType: "sequence_initial_email" | "sequence_follow_up_step";
  actionType: "copied" | "exported";
  targetStepNumber?: number;
  exportFormat?: string | null;
  userId?: string;
  requestId?: string;
}): Promise<void> {
  const latestSequenceRecord = await getLatestStoredSequenceOrThrow(input);
  const compiled = compiledSequenceOutputSchema.parse(latestSequenceRecord.content);
  const artifact = getSequenceArtifactContent(
    compiled,
    input.artifactType === "sequence_initial_email" ? "initial_email" : "follow_up_step",
    input.targetStepNumber,
  );

  if (!artifact) {
    throw new Error("The requested sequence artifact could not be resolved.");
  }

  await recordSequenceTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId: latestSequenceRecord.senderProfileId ?? null,
    artifactType: input.artifactType,
    artifactId: buildSequenceArtifactId(
      latestSequenceRecord.id,
      input.artifactType === "sequence_initial_email" ? "initial_email" : "follow_up_step",
      input.targetStepNumber,
    ),
    actionType: input.actionType,
    providerMetadata: latestSequenceRecord.modelMetadata,
    afterText: serializeSequenceArtifact(artifact),
    exportFormat: input.exportFormat ?? null,
    metadata: {
      sourceSequenceId: latestSequenceRecord.id,
      sequenceVersion: compiled.sequenceVersion,
      targetStepNumber: input.targetStepNumber ?? null,
    },
    requestId: input.requestId,
  });
}
