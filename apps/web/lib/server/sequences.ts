import {
  createInMemoryAuditEventRepository,
  createInMemorySequenceRepository,
  createInMemoryUsageEventRepository,
  type AuditEventRepository,
  type SequenceRepository,
  type UsageEventRepository,
} from "@ceg/database";
import { createConsoleLogger } from "@ceg/observability";
import {
  compiledSequenceOutputSchema,
  createSequenceEngineService,
  type CompiledSequenceOutput,
  type SenderContext,
  type SequenceEngineService,
  type SequenceGenerationInput,
} from "@ceg/sequence-engine";
import { companyProfileSchema, type CompanyProfile, type Sequence } from "@ceg/validation";

import { getCampaignForWorkspace, getProspectForCampaign } from "./campaigns";
import { createOpenAiSequenceModelAdapter } from "./openai-sequence-provider";
import { getLatestResearchSnapshotForProspect } from "./prospect-research";
import { getSenderProfileForWorkspace } from "./sender-profiles";

declare global {
  var __cegSequenceRepository: SequenceRepository | undefined;
  var __cegSequenceUsageEventRepository: UsageEventRepository | undefined;
  var __cegSequenceAuditEventRepository: AuditEventRepository | undefined;
  var __cegSequenceEngineService: SequenceEngineService | undefined;
}

function getSequenceRepository(): SequenceRepository {
  if (globalThis.__cegSequenceRepository === undefined) {
    globalThis.__cegSequenceRepository = createInMemorySequenceRepository();
  }

  return globalThis.__cegSequenceRepository;
}

function getUsageEventRepository(): UsageEventRepository {
  if (globalThis.__cegSequenceUsageEventRepository === undefined) {
    globalThis.__cegSequenceUsageEventRepository = createInMemoryUsageEventRepository();
  }

  return globalThis.__cegSequenceUsageEventRepository;
}

function getAuditEventRepository(): AuditEventRepository {
  if (globalThis.__cegSequenceAuditEventRepository === undefined) {
    globalThis.__cegSequenceAuditEventRepository = createInMemoryAuditEventRepository();
  }

  return globalThis.__cegSequenceAuditEventRepository;
}

function getSequenceEngine(): SequenceEngineService {
  if (globalThis.__cegSequenceEngineService === undefined) {
    globalThis.__cegSequenceEngineService = createSequenceEngineService(
      createOpenAiSequenceModelAdapter(),
    );
  }

  return globalThis.__cegSequenceEngineService;
}

const logger = createConsoleLogger({ area: "sequence_generation" });
const SEQUENCE_PROMPT_VERSION = "sequence.v1";

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

async function buildSenderContext(workspaceId: string, senderProfileId?: string | null): Promise<SenderContext> {
  if (!senderProfileId) {
    return {
      mode: "basic",
      basicModeReason: "Campaign does not currently have a sender profile attached.",
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
    buildSenderContext(input.workspaceId, campaign.senderProfileId),
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

export async function getLatestSequenceForProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<CompiledSequenceOutput | null> {
  const latest = await getSequenceRepository().getLatestSequenceByProspect(
    workspaceId,
    campaignId,
    prospectId,
  );

  if (latest === null) {
    return null;
  }

  return compiledSequenceOutputSchema.parse(latest.content);
}

export async function generateSequenceForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
}): Promise<CompiledSequenceOutput> {
  const sequenceInput = await buildSequenceGenerationInput(input);
  const existingSequences = await getSequenceRepository().listSequencesByProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );
  const version = getNextSequenceVersion(existingSequences);
  const runLogger = logger.child({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
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
      modelMetadata,
      createdByUserId: input.userId ?? null,
    });

    await getUsageEventRepository().createUsageEvent({
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
      },
    });

    await getAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "sequence.generated",
      entityType: "sequence",
      entityId: created.id,
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

    runLogger.info("Sequence generation completed", {
      sequenceId: created.id,
      generationMode: sequenceInput.senderContext.mode,
      totalTokens: modelMetadata.totalTokens,
    });

    return compiled;
  } catch (error) {
    await getAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "sequence.generation_failed",
      entityType: "prospect",
      entityId: input.prospectId,
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
