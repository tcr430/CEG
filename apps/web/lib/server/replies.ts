import { randomUUID } from "node:crypto";

import {
  createInMemoryDraftReplyRepository,
  type DraftReplyRepository,
  type ReplyAnalysisRepository,
} from "@ceg/database";
import { checkFeatureEntitlement, resolveBillingPlanCode } from "@ceg/billing";
import {
  createReplyEngineService,
  replyAnalysisOutputSchema,
  responseStrategyRecommendationOutputSchema,
  scoreDraftReplyQuality,
  type DraftReplyGenerationOutput,
  type ReplyAnalysisOutput,
  type ReplyAnalysisRequest,
  type ReplyEngineService,
  type ResponseStrategyRecommendationOutput,
} from "@ceg/reply-engine";
import { compiledSequenceOutputSchema } from "@ceg/sequence-engine";
import {
  artifactEditRecordSchema,
  trainingSignalOutcomeSchema,
  draftReplyOutputSchema,
  type ArtifactEditRecord,
  type ConversationThread,
  type DraftReply,
  type Message,
  type Prospect,
  type ReplyAnalysis,
  type TrainingSignalOutcome,
} from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import {
  getConversationThreadRepository,
  getMessageRepository,
} from "./database";
import { getCampaignForWorkspace, getProspectForCampaign, updateProspectForCampaign } from "./campaigns";
import { getReplyModelAdapter } from "./model-providers";
import { getSharedReplyAnalysisRepository } from "./reply-analysis-store";
import { createOperationContext } from "./observability";
import { refreshCampaignPerformanceMetrics } from "./campaign-performance";
import {
  beginProspectAsyncOperation,
  completeProspectAsyncOperation,
  failProspectAsyncOperation,
} from "./prospect-job-runs";
import { trackProductAnalyticsEvent } from "./product-analytics";
import { getLatestResearchSnapshotForProspect } from "./prospect-research";
import { buildReplyPerformanceHints } from "./generation-performance-hints";
import {
  assertWorkspaceFeatureAccess,
  assertWorkspaceUsageAccess,
} from "./billing";
import { getSenderProfileForWorkspace } from "./sender-profiles";
import { getLatestStoredSequenceForProspect } from "./sequences";
import { getSharedUsageEventRepository } from "./usage-events";
import { recordTrainingSignal } from "./training-signals";
import {
  classifyReplyOutcome,
  resolveGeneratedArtifactForSentMessage,
} from "../reply-outcomes";

type PersistedReplyAnalysisRecord = {
  analysisVersion: number;
  analysisOutput: ReplyAnalysisOutput;
  strategyOutput: ResponseStrategyRecommendationOutput;
};

type PersistedDraftReplyRecord = {
  draftVersion: number;
  bundleId: string;
  bundleOutput: DraftReplyGenerationOutput["output"];
};

type PersistedDraftReplyBundle = {
  version: number;
  bundleId: string;
  output: DraftReplyGenerationOutput["output"];
  records: DraftReply[];
};

type DraftReplyEditInput = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetSlotId: string;
  subject?: string | null;
  bodyText: string;
  strategyNote: string;
  userId?: string;
};

function readDraftEditHistory(record: DraftReply): ArtifactEditRecord[] {
  if (typeof record.structuredOutput !== "object" || record.structuredOutput === null) {
    return [];
  }

  const candidate = (record.structuredOutput as Record<string, unknown>).editHistory;
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.flatMap((item) => {
    const parsed = artifactEditRecordSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function serializeDraftReplyArtifact(value: { subject?: string | null; bodyText: string; strategyNote: string }) {
  return JSON.stringify(value, null, 2);
}

function buildDraftReplyArtifactId(messageId: string, slotId: string): string {
  return `${messageId}:draft:${slotId}`;
}

function buildReplySignalProviderMetadata(modelMetadata: unknown) {
  if (typeof modelMetadata !== "object" || modelMetadata === null) {
    return {
      promptTemplateId: REPLY_PROMPT_TEMPLATE_ID,
      promptVersion: REPLY_PROMPT_TEMPLATE_ID,
    };
  }

  return {
    ...(modelMetadata as Record<string, unknown>),
    promptTemplateId:
      typeof (modelMetadata as { promptTemplateId?: unknown }).promptTemplateId === "string"
        ? (modelMetadata as { promptTemplateId: string }).promptTemplateId
        : REPLY_PROMPT_TEMPLATE_ID,
    promptVersion:
      typeof (modelMetadata as { promptVersion?: unknown }).promptVersion === "string"
        ? (modelMetadata as { promptVersion: string }).promptVersion
        : REPLY_PROMPT_TEMPLATE_ID,
  };
}

async function recordReplyTrainingSignal(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
  senderProfileId?: string | null;
  artifactType: "draft_reply_bundle" | "draft_reply_option";
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
    providerMetadata: buildReplySignalProviderMetadata(input.providerMetadata),
    beforeText: input.beforeText ?? null,
    afterText: input.afterText ?? null,
    selectedOptionId: input.selectedOptionId ?? null,
    exportFormat: input.exportFormat ?? null,
    metadata: input.metadata,
    requestId: input.requestId,
  });
}

export type ReplyTimelineEntry = {
  message: Message;
  analysis: PersistedReplyAnalysisRecord | null;
  draftBundles: PersistedDraftReplyBundle[];
};

type ReplyThreadState = {
  thread: ConversationThread | null;
  messages: Message[];
  timeline: ReplyTimelineEntry[];
  latestInboundMessage: Message | null;
  latestAnalysis: PersistedReplyAnalysisRecord | null;
  latestDrafts: PersistedDraftReplyBundle | null;
};

type AppendProspectThreadMessageInput = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  direction: Message["direction"];
  messageKind?: Message["messageKind"];
  status?: Message["status"];
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  sequenceId?: string | null;
  sequenceVersion?: number | null;
  replyToMessageId?: string | null;
  providerMessageId?: string | null;
  source?: Message["metadata"]["source"];
  generatedFrom?: NonNullable<Message["metadata"]["generatedFrom"]> | null;
  importedFrom?: string | null;
  timelineLabel?: string | null;
  metadata?: Record<string, unknown>;
  sentAt?: Date | null;
  receivedAt?: Date | null;
  userId?: string;
};

declare global {
  var __cegDraftReplyRepository: DraftReplyRepository | undefined;
  var __cegReplyEngineService: ReplyEngineService | undefined;
}

const REPLY_PROMPT_TEMPLATE_ID = "reply.v1";

function getDraftReplyRepository(): DraftReplyRepository {
  if (globalThis.__cegDraftReplyRepository === undefined) {
    globalThis.__cegDraftReplyRepository = createInMemoryDraftReplyRepository();
  }

  return globalThis.__cegDraftReplyRepository;
}


function getReplyEngine(): ReplyEngineService {
  if (globalThis.__cegReplyEngineService === undefined) {
    globalThis.__cegReplyEngineService = createReplyEngineService(
      getReplyModelAdapter(),
    );
  }

  return globalThis.__cegReplyEngineService;
}

function getLatestInboundMessage(messages: Message[]): Message | null {
  return (
    [...messages]
      .filter((message) => message.direction === "inbound")
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ??
    null
  );
}

function parsePersistedReplyAnalysis(value: unknown): PersistedReplyAnalysisRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as {
    analysisVersion?: unknown;
    analysisOutput?: unknown;
    strategyOutput?: unknown;
  };

  if (typeof candidate.analysisVersion !== "number") {
    return null;
  }

  return {
    analysisVersion: candidate.analysisVersion,
    analysisOutput: replyAnalysisOutputSchema.parse(candidate.analysisOutput),
    strategyOutput: responseStrategyRecommendationOutputSchema.parse(
      candidate.strategyOutput,
    ),
  };
}

function parsePersistedDraftReply(value: unknown): PersistedDraftReplyRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as {
    draftVersion?: unknown;
    bundleId?: unknown;
    bundleOutput?: unknown;
  };

  if (
    typeof candidate.draftVersion !== "number" ||
    typeof candidate.bundleId !== "string"
  ) {
    return null;
  }

  return {
    draftVersion: candidate.draftVersion,
    bundleId: candidate.bundleId,
    bundleOutput: draftReplyOutputSchema.parse(candidate.bundleOutput),
  };
}

function collectDraftBundlesForMessage(records: DraftReply[]): PersistedDraftReplyBundle[] {
  const grouped = new Map<string, PersistedDraftReplyBundle>();

  for (const record of records) {
    const parsed = parsePersistedDraftReply(record.structuredOutput);

    if (parsed === null) {
      continue;
    }

    const key = `${parsed.draftVersion}:${parsed.bundleId}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.records.push(record);
      continue;
    }

    grouped.set(key, {
      version: parsed.draftVersion,
      bundleId: parsed.bundleId,
      output: parsed.bundleOutput,
      records: [record],
    });
  }

  return [...grouped.values()].sort((left, right) => right.version - left.version);
}

function buildReplyTimeline(input: {
  messages: Message[];
  analyses: Awaited<ReturnType<ReplyAnalysisRepository["listReplyAnalysesByThread"]>>;
  draftReplies: DraftReply[];
}): ReplyTimelineEntry[] {
  const latestAnalysisByMessageId = new Map<string, PersistedReplyAnalysisRecord>();

  for (const analysis of input.analyses) {
    const parsed = parsePersistedReplyAnalysis(analysis.structuredOutput);
    if (parsed !== null) {
      latestAnalysisByMessageId.set(analysis.messageId, parsed);
    }
  }

  const draftsByMessageId = new Map<string, DraftReply[]>();
  for (const draft of input.draftReplies) {
    if (!draft.messageId) {
      continue;
    }

    const current = draftsByMessageId.get(draft.messageId) ?? [];
    current.push(draft);
    draftsByMessageId.set(draft.messageId, current);
  }

  return [...input.messages]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((message) => ({
      message,
      analysis: latestAnalysisByMessageId.get(message.id) ?? null,
      draftBundles: collectDraftBundlesForMessage(
        draftsByMessageId.get(message.id) ?? [],
      ),
    }));
}

function mapReplyClassification(
  intent: ReplyAnalysisOutput["analysis"]["intent"],
): {
  classification:
    | "positive"
    | "neutral"
    | "negative"
    | "objection"
    | "unsubscribe"
    | "unknown";
  sentiment: "positive" | "neutral" | "negative";
} {
  switch (intent) {
    case "interested":
      return { classification: "positive", sentiment: "positive" };
    case "needs_more_info":
    case "referral_to_other_person":
      return { classification: "neutral", sentiment: "neutral" };
    case "objection_price":
    case "objection_timing":
    case "objection_authority":
    case "objection_already_has_solution":
      return { classification: "objection", sentiment: "negative" };
    case "soft_no":
      return { classification: "negative", sentiment: "negative" };
    case "hard_no":
      return { classification: "unsubscribe", sentiment: "negative" };
    default:
      return { classification: "unknown", sentiment: "neutral" };
  }
}

function readReplyOutcomeHistory(message: Message): TrainingSignalOutcome[] {
  const candidate = message.metadata.outcomeHistory;

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.flatMap((item) => {
    const parsed = trainingSignalOutcomeSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function findLatestReplyTargetMessage(messages: Message[]): Message | null {
  const sentMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.direction === "outbound" &&
        (message.status === "sent" || message.status === "delivered"),
    );

  if (sentMessage) {
    return sentMessage;
  }

  return (
    [...messages]
      .reverse()
      .find((message) => message.direction === "outbound") ?? null
  );
}

async function recordReplyOutcomeForLinkedMessage(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  replyMessage: Message;
  analysisRecord: ReplyAnalysis;
  analysisOutput: ReplyAnalysisOutput;
  strategyOutput: ResponseStrategyRecommendationOutput;
  userId?: string;
  requestId?: string;
}) {
  if (!input.replyMessage.replyToMessageId) {
    return;
  }

  const sentMessage = await getMessageRepository().getMessageById(
    input.workspaceId,
    input.replyMessage.replyToMessageId,
  );

  if (sentMessage === null || sentMessage.direction !== "outbound") {
    return;
  }

  const outcomeLabel = classifyReplyOutcome(input.analysisOutput.analysis.intent);

  if (outcomeLabel === null) {
    return;
  }

  const outcomeSignal = trainingSignalOutcomeSchema.parse({
    label: outcomeLabel,
    sentMessageId: sentMessage.id,
    replyMessageId: input.replyMessage.id,
    replyAnalysisId: input.analysisRecord.id,
    replyIntent: input.analysisOutput.analysis.intent,
    replyClassification: input.analysisRecord.classification,
    recommendedAction: input.strategyOutput.strategy.recommendedAction,
    recordedAt: new Date(),
  });

  const priorHistory = readReplyOutcomeHistory(sentMessage).filter(
    (item) => item.replyMessageId !== input.replyMessage.id,
  );

  await Promise.all([
    getMessageRepository().updateMessage({
      workspaceId: input.workspaceId,
      messageId: sentMessage.id,
      metadata: {
        ...sentMessage.metadata,
        latestOutcome: outcomeSignal,
        outcomeHistory: [...priorHistory, outcomeSignal],
      },
    }),
    getMessageRepository().updateMessage({
      workspaceId: input.workspaceId,
      messageId: input.replyMessage.id,
      metadata: {
        ...input.replyMessage.metadata,
        linkedOutcome: outcomeSignal,
      },
    }),
  ]);

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: `reply_outcome_${outcomeLabel}`,
    entityType: "message",
    entityId: sentMessage.id,
    quantity: 1,
    billable: false,
    metadata: {
      sentMessageId: sentMessage.id,
      replyMessageId: input.replyMessage.id,
      replyAnalysisId: input.analysisRecord.id,
      replyIntent: input.analysisOutput.analysis.intent,
      replyClassification: input.analysisRecord.classification,
      recommendedAction: input.strategyOutput.strategy.recommendedAction,
      outcomeSignal,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "reply.outcome.linked",
    entityType: "message",
    entityId: sentMessage.id,
    requestId: input.requestId,
    changes: outcomeSignal,
    metadata: {
      replyMessageId: input.replyMessage.id,
      replyAnalysisId: input.analysisRecord.id,
    },
  });

  const generatedArtifact = resolveGeneratedArtifactForSentMessage(sentMessage);

  if (generatedArtifact !== null) {
    await recordTrainingSignal({
      workspaceId: input.workspaceId,
      userId: input.userId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      senderProfileId: null,
      artifactType: generatedArtifact.artifactType,
      artifactId: generatedArtifact.artifactId,
      actionType:
        outcomeLabel === "positive" ? "positive_outcome" : "negative_outcome",
      afterText: sentMessage.bodyText ?? sentMessage.subject ?? null,
      outcomeSignal,
      metadata: {
        sentMessageId: sentMessage.id,
        replyMessageId: input.replyMessage.id,
        replyAnalysisId: input.analysisRecord.id,
      },
      requestId: input.requestId,
    });
  }
}

async function getProspectForWorkspaceCampaign(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
}): Promise<Prospect> {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  return prospect;
}

export async function ensureThreadForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
}): Promise<ConversationThread> {
  await getProspectForWorkspaceCampaign(input);

  return getConversationThreadRepository().findOrCreateThreadForProspect({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    metadata: {},
  });
}

export async function appendMessageToProspectThread(
  input: AppendProspectThreadMessageInput,
): Promise<Message> {
  const [prospect, thread] = await Promise.all([
    getProspectForWorkspaceCampaign(input),
    ensureThreadForProspect(input),
  ]);
  const existingMessages = await getMessageRepository().listMessagesByThread(
    input.workspaceId,
    thread.id,
  );
  const messageVersion = existingMessages.length + 1;

  const message = await getMessageRepository().createMessage({
    workspaceId: input.workspaceId,
    threadId: thread.id,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    sequenceId: input.sequenceId ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
    direction: input.direction,
    messageKind:
      input.messageKind ?? (input.direction === "inbound" ? "reply" : "email"),
    status:
      input.status ?? (input.direction === "inbound" ? "received" : "draft"),
    providerMessageId: input.providerMessageId ?? null,
    subject: input.subject ?? null,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml ?? null,
    metadata: {
      source: input.source ?? "manual",
      generatedFrom: input.generatedFrom ?? null,
      messageVersion,
      sequenceVersion: input.sequenceVersion ?? undefined,
      importedFrom: input.importedFrom ?? null,
      timelineLabel: input.timelineLabel ?? null,
      ...(input.metadata ?? {}),
    },
    sentAt: input.sentAt ?? null,
    receivedAt:
      input.receivedAt ?? (input.direction === "inbound" ? new Date() : null),
  });

  await getConversationThreadRepository().updateThread({
    threadId: thread.id,
    workspaceId: input.workspaceId,
    latestMessageAt: message.createdAt,
    metadata: {
      ...thread.metadata,
      latestMessageId: message.id,
      latestInboundMessageId:
        input.direction === "inbound"
          ? message.id
          : (thread.metadata.latestInboundMessageId as string | undefined) ?? null,
    },
  });

  if (input.direction === "inbound") {
    await setProspectStatusToReplied(prospect, input.campaignId);
  }

  await refreshCampaignPerformanceMetrics(input.workspaceId, input.campaignId);

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: `thread_message_${input.direction}_created`,
    entityType: "message",
    entityId: message.id,
    quantity: 1,
    billable: false,
    metadata: {
      direction: input.direction,
      source: input.source ?? "manual",
      messageVersion,
      generatedFrom: input.generatedFrom ?? null,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: `thread.message.${input.direction}.created`,
    entityType: "message",
    entityId: message.id,
    changes: {
      threadId: thread.id,
      messageVersion,
      source: input.source ?? "manual",
    },
    metadata: {
      generatedFrom: input.generatedFrom ?? null,
      timelineLabel: input.timelineLabel ?? null,
    },
  });

  return message;
}

async function buildReplyAnalysisRequest(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  latestInboundMessage: Message;
  threadMessages: Message[];
  workspacePlanCode?: string | null;
}): Promise<ReplyAnalysisRequest> {
  const campaign = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (campaign === null) {
    throw new Error("Campaign not found for workspace.");
  }

  const senderAwareAccess = checkFeatureEntitlement(
    resolveBillingPlanCode(input.workspacePlanCode),
    "sender_aware_profiles",
  );

  const senderContext = campaign.senderProfileId && senderAwareAccess.allowed
    ? await (async () => {
        const senderProfile = await getSenderProfileForWorkspace(
          input.workspaceId,
          campaign.senderProfileId ?? "",
        );

        if (!senderProfile) {
          return {
            mode: "basic" as const,
            basicModeReason:
              "Campaign sender profile could not be resolved, so reply handling fell back to basic mode.",
            credibilityLevel: "cautious" as const,
          };
        }

        return {
          mode: "sender_aware" as const,
          senderProfile,
          credibilityLevel: "balanced" as const,
        };
      })()
    : {
        mode: "basic" as const,
        basicModeReason:
          campaign.senderProfileId && !senderAwareAccess.allowed
            ? "Current workspace plan does not include sender-aware profiles, so reply handling fell back to basic mode."
            : "Campaign does not currently have a sender profile attached.",
        credibilityLevel: "cautious" as const,
      };

  const [researchSnapshot, performanceHints] = await Promise.all([
    getLatestResearchSnapshotForProspect(
      input.workspaceId,
      input.campaignId,
      input.prospectId,
    ),
    buildReplyPerformanceHints({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
    }),
  ]);

  return {
    senderContext,
    campaign,
    prospectCompanyProfile: researchSnapshot?.structuredData.companyProfile ?? null,
    analysisInput: {
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      threadId: input.latestInboundMessage.threadId,
      latestInboundMessage: {
        messageId: input.latestInboundMessage.id,
        subject: input.latestInboundMessage.subject,
        bodyText: input.latestInboundMessage.bodyText ?? "",
      },
      threadMessages: input.threadMessages.map((message) => ({
        direction: message.direction,
        subject: message.subject,
        bodyText: message.bodyText ?? "",
      })),
      campaignSummary:
        campaign.offerSummary ??
        campaign.targetIcp ??
        campaign.objective ??
        campaign.name,
      senderContextSummary:
        senderContext.mode === "sender_aware"
          ? senderContext.senderProfile.valueProposition ??
            senderContext.senderProfile.productDescription ??
            senderContext.senderProfile.name
          : senderContext.basicModeReason,
      prospectCompanyProfileSummary:
        researchSnapshot?.structuredData.companyProfile.summary ?? null,
    },
    promptContext: {
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
      },
      productCredibility:
        researchSnapshot?.structuredData.companyProfile.confidence.label === "high"
          ? "high_conviction"
          : researchSnapshot?.structuredData.companyProfile.confidence.label === "medium"
            ? "grounded"
            : "low_context",
      constraints: {
        forbidPushAfterHardNo: true,
        forbidInventedFacts: true,
        avoidRepeatingWholeThread: true,
        preserveToneAndCredibility: true,
        softerLanguageWhenLowConfidence: true,
        maxDraftReplyLength: 900,
        maxDraftOptions: 3,
      },
      performanceHints,
    },
  };
}

async function setProspectStatusToReplied(
  prospect: Prospect,
  campaignId: string,
): Promise<void> {
  await updateProspectForCampaign({
    prospectId: prospect.id,
    workspaceId: prospect.workspaceId,
    campaignId,
    contactName: prospect.contactName ?? undefined,
    fullName: prospect.fullName ?? undefined,
    firstName: prospect.firstName ?? undefined,
    lastName: prospect.lastName ?? undefined,
    email: prospect.email ?? undefined,
    title: prospect.title ?? undefined,
    companyName: prospect.companyName ?? undefined,
    companyDomain: prospect.companyDomain ?? undefined,
    companyWebsite: prospect.companyWebsite ?? undefined,
    linkedinUrl: prospect.linkedinUrl ?? undefined,
    location: prospect.location ?? undefined,
    source: prospect.source ?? undefined,
    status: "replied",
    metadata: prospect.metadata,
  });
}

export async function loadFullThreadHistoryForProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<ReplyThreadState> {
  const thread = await getConversationThreadRepository().getThreadByProspect(
    workspaceId,
    campaignId,
    prospectId,
  );

  if (thread === null) {
    return {
      thread: null,
      messages: [],
      timeline: [],
      latestInboundMessage: null,
      latestAnalysis: null,
      latestDrafts: null,
    };
  }

  const [messages, analyses, draftRecords] = await Promise.all([
    getMessageRepository().listMessagesByThread(workspaceId, thread.id),
    getSharedReplyAnalysisRepository().listReplyAnalysesByThread(workspaceId, thread.id),
    getDraftReplyRepository().listDraftRepliesByThread(workspaceId, thread.id),
  ]);
  const timeline = buildReplyTimeline({
    messages,
    analyses,
    draftReplies: draftRecords,
  });
  const latestInboundMessage = getLatestInboundMessage(messages);
  const latestEntry =
    latestInboundMessage === null
      ? null
      : timeline.find((entry) => entry.message.id === latestInboundMessage.id) ?? null;

  return {
    thread,
    messages,
    timeline,
    latestInboundMessage,
    latestAnalysis: latestEntry?.analysis ?? null,
    latestDrafts: latestEntry?.draftBundles[0] ?? null,
  };
}

export async function getReplyThreadStateForProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<ReplyThreadState> {
  return loadFullThreadHistoryForProspect(workspaceId, campaignId, prospectId);
}

export async function createInboundReplyForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  subject?: string | null;
  bodyText: string;
  userId?: string;
  workspacePlanCode?: string | null;
  requestId?: string;
  autoAnalyze?: boolean;
}): Promise<Message> {
  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );
  const replyTargetMessage = findLatestReplyTargetMessage(state.messages);
  const message = await appendMessageToProspectThread({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    direction: "inbound",
    messageKind: "reply",
    status: "received",
    subject: input.subject ?? null,
    bodyText: input.bodyText,
    replyToMessageId: replyTargetMessage?.id ?? null,
    source: "manual",
    timelineLabel: "Inbound reply",
    userId: input.userId,
    metadata: {
      replyAttribution: replyTargetMessage
        ? {
            linkedOutboundMessageId: replyTargetMessage.id,
            attributionMode:
              replyTargetMessage.status === "sent" || replyTargetMessage.status === "delivered"
                ? "latest_sent_outbound"
                : "latest_outbound_fallback",
          }
        : undefined,
    },
  });

  if (input.autoAnalyze !== false) {
    const operation = createOperationContext({
      operation: "reply.analysis.auto_on_inbound",
      requestId: input.requestId,
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
    });

    try {
      await analyzeLatestReplyForProspect({
        workspaceId: input.workspaceId,
        campaignId: input.campaignId,
        prospectId: input.prospectId,
        userId: input.userId,
        workspacePlanCode: input.workspacePlanCode ?? null,
        requestId: input.requestId,
      });
    } catch (error) {
      operation.logger.error("Automatic reply analysis after inbound message save failed", {
        messageId: message.id,
        error: error instanceof Error ? error.message : "Unknown automatic reply analysis error",
      });
    }
  }

  return message;
}

export async function createManualOutboundMessageForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  subject?: string | null;
  bodyText: string;
  userId?: string;
}): Promise<Message> {
  return appendMessageToProspectThread({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    direction: "outbound",
    messageKind: "email",
    status: "draft",
    subject: input.subject ?? null,
    bodyText: input.bodyText,
    source: "manual",
    timelineLabel: "Manual outbound draft",
    userId: input.userId,
  });
}

export async function appendLatestSequenceMessagesToProspectThread(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
}): Promise<Message[]> {
  const [thread, latestSequenceRecord] = await Promise.all([
    ensureThreadForProspect(input),
    getLatestStoredSequenceForProspect(
      input.workspaceId,
      input.campaignId,
      input.prospectId,
    ),
  ]);

  if (latestSequenceRecord === null) {
    throw new Error("Generate a sequence before adding outbound messages to the thread.");
  }

  const compiled = compiledSequenceOutputSchema.parse(latestSequenceRecord.content);
  const existingMessages = await getMessageRepository().listMessagesByThread(
    input.workspaceId,
    thread.id,
  );
  const sequenceVersion = compiled.sequenceVersion;
  const alreadyAppendedCount = existingMessages.filter(
    (message) =>
      message.sequenceId === latestSequenceRecord.id &&
      message.metadata.generatedFrom === "sequence" &&
      message.metadata.sequenceVersion === sequenceVersion,
  ).length;

  if (alreadyAppendedCount > 0) {
    throw new Error("The latest generated sequence has already been added to this thread.");
  }

  const draftMessages = [
    {
      subject: compiled.initialEmail.email.subject,
      bodyText: `${compiled.initialEmail.email.opener}\n\n${compiled.initialEmail.email.body}\n\n${compiled.initialEmail.email.cta}`,
      timelineLabel: "Generated initial email",
    },
    ...compiled.followUpSequence.sequenceSteps.map((step) => ({
      subject: step.subject,
      bodyText: `${step.opener}\n\n${step.body}\n\n${step.cta}`,
      timelineLabel:
        step.stepNumber === 3
          ? "Generated final soft-close"
          : `Generated follow-up ${step.stepNumber}`,
    })),
  ];

  const createdMessages: Message[] = [];
  for (const draftMessage of draftMessages) {
    const created = await appendMessageToProspectThread({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      direction: "outbound",
      messageKind: "email",
      status: "draft",
      subject: draftMessage.subject,
      bodyText: draftMessage.bodyText,
      sequenceId: latestSequenceRecord.id,
      sequenceVersion,
      source: "generated",
      generatedFrom: "sequence",
      timelineLabel: draftMessage.timelineLabel,
      userId: input.userId,
    });
    createdMessages.push(created);
  }

  return createdMessages;
}

export async function analyzeLatestReplyForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
  workspacePlanCode?: string | null;
  requestId?: string;
}): Promise<PersistedReplyAnalysisRecord> {
  await assertWorkspaceFeatureAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    feature: "reply_intelligence",
  });
  await assertWorkspaceUsageAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    meterKey: "replyAnalyses",
  });

  const operation = createOperationContext({
    operation: "reply.analysis",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });


  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (state.latestInboundMessage === null) {
    throw new Error("No inbound reply is stored for this prospect yet.");
  }

  const request = await buildReplyAnalysisRequest({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    latestInboundMessage: state.latestInboundMessage,
    threadMessages: state.messages,
    workspacePlanCode: input.workspacePlanCode,
  });

  const runLogger = operation.logger.child({
    area: "reply_intelligence",
    messageId: state.latestInboundMessage.id,
  });

  const asyncRun = await beginProspectAsyncOperation({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    kind: "reply_analysis",
    idempotencyKey: `reply_analysis:${state.latestInboundMessage.id}`,
    requestId: operation.requestId,
  });

  if (asyncRun.status === "already_running") {
    runLogger.info("Reply analysis already running");
    throw new Error("Reply analysis is already running for this prospect.");
  }

  try {
    const analysisOutput = await getReplyEngine().analyzeReply(request);
    const strategyOutput = await getReplyEngine().recommendResponseStrategy({
      request,
      analysis: analysisOutput.analysis,
    });

    const nextVersion = (state.latestAnalysis?.analysisVersion ?? 0) + 1;
    const mapped = mapReplyClassification(analysisOutput.analysis.intent);

    const persistedAnalysis = await getSharedReplyAnalysisRepository().upsertReplyAnalysis({
    workspaceId: input.workspaceId,
    threadId: state.latestInboundMessage.threadId,
    messageId: state.latestInboundMessage.id,
    promptTemplateId: REPLY_PROMPT_TEMPLATE_ID,
    classification: mapped.classification,
    sentiment: mapped.sentiment,
    urgency:
      analysisOutput.analysis.intent === "hard_no"
        ? "high"
        : analysisOutput.analysis.intent === "interested"
          ? "medium"
          : "low",
    intent: analysisOutput.analysis.intent,
    confidence: analysisOutput.analysis.confidence.score,
    structuredOutput: {
      analysisVersion: nextVersion,
      analysisOutput,
      strategyOutput,
    },
    modelMetadata: {
      analysis: analysisOutput.analysisMetadata,
      strategy: strategyOutput.analysisMetadata,
    },
  });

  const totalTokens =
    (analysisOutput.analysisMetadata.totalTokens ?? 0) +
    (strategyOutput.analysisMetadata.totalTokens ?? 0);

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "reply_analysis_completed",
    entityType: "reply_analysis",
    entityId: state.latestInboundMessage.id,
    quantity: 1,
    billable: false,
    inputTokens:
      (analysisOutput.analysisMetadata.inputTokens ?? 0) +
      (strategyOutput.analysisMetadata.inputTokens ?? 0),
    outputTokens:
      (analysisOutput.analysisMetadata.outputTokens ?? 0) +
      (strategyOutput.analysisMetadata.outputTokens ?? 0),
    costUsd: null,
    metadata: {
      provider: analysisOutput.analysisMetadata.provider,
      model: analysisOutput.analysisMetadata.model,
      analysisVersion: nextVersion,
      recommendedAction: analysisOutput.analysis.recommendedAction,
      totalTokens,
      meterKey: "replyAnalyses",
      workspacePlanCode: input.workspacePlanCode ?? "free",
    },
  });

  await trackProductAnalyticsEvent({
    event: "reply_analysis_completed",
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    entityType: "message",
    entityId: state.latestInboundMessage.id,
    requestId: operation.requestId,
    metadata: {
      analysisVersion: nextVersion,
      intent: analysisOutput.analysis.intent,
      recommendedAction: strategyOutput.strategy.recommendedAction,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "reply.analysis.completed",
    entityType: "message",
    entityId: state.latestInboundMessage.id,
    changes: {
      analysisVersion: nextVersion,
      intent: analysisOutput.analysis.intent,
      recommendedAction: strategyOutput.strategy.recommendedAction,
    },
    metadata: {
      totalTokens,
    },
  });

    await recordReplyOutcomeForLinkedMessage({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      replyMessage: state.latestInboundMessage,
      analysisRecord: persistedAnalysis,
      analysisOutput,
      strategyOutput,
      userId: input.userId,
      requestId: operation.requestId,
    });

    await refreshCampaignPerformanceMetrics(input.workspaceId, input.campaignId);

    await completeProspectAsyncOperation({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      kind: "reply_analysis",
      requestId: operation.requestId,
      resultSummary: {
        analysisVersion: nextVersion,
        intent: analysisOutput.analysis.intent,
        recommendedAction: strategyOutput.strategy.recommendedAction,
      },
    });

    runLogger.info("Reply analysis completed", {
      analysisVersion: nextVersion,
      intent: analysisOutput.analysis.intent,
    });

    return {
      analysisVersion: nextVersion,
      analysisOutput,
      strategyOutput,
    };
  } catch (error) {
    await failProspectAsyncOperation({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      kind: "reply_analysis",
      requestId: operation.requestId,
      errorSummary: error instanceof Error ? error.message : "Unknown reply analysis error",
      resultSummary: {
        messageId: state.latestInboundMessage.id,
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "reply.analysis.failed",
      entityType: "message",
      entityId: state.latestInboundMessage.id,
      changes: {},
      metadata: {
        error: error instanceof Error ? error.message : "Unknown reply analysis error",
      },
    });

    runLogger.error("Reply analysis failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

export async function generateDraftRepliesForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
  workspacePlanCode?: string | null;
  requestId?: string;
}): Promise<DraftReplyGenerationOutput["output"]> {
  await assertWorkspaceFeatureAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    feature: "reply_intelligence",
  });
  await assertWorkspaceUsageAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    meterKey: "replyDraftGenerations",
  });

  const operation = createOperationContext({
    operation: "reply.draft_generation",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });

  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (state.latestInboundMessage === null || state.latestAnalysis === null) {
    throw new Error("Analyze the latest inbound reply before generating drafts.");
  }

  const latestInboundMessage = state.latestInboundMessage;
  const latestAnalysis = state.latestAnalysis;
  const runLogger = operation.logger.child({
    area: "reply_drafting",
    messageId: latestInboundMessage.id,
  });

  const asyncRun = await beginProspectAsyncOperation({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    kind: "reply_drafting",
    idempotencyKey: `reply_drafting:${latestInboundMessage.id}:${latestAnalysis.analysisVersion}`,
    requestId: operation.requestId,
  });

  if (asyncRun.status === "already_running") {
    runLogger.info("Reply draft generation already running");
    throw new Error("Reply draft generation is already running for this prospect.");
  }

  const request = await buildReplyAnalysisRequest({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    latestInboundMessage,
    threadMessages: state.messages,
    workspacePlanCode: input.workspacePlanCode,
  });

  try {
    const generated = await getReplyEngine().generateDraftReplies({
      request,
      analysis: latestAnalysis.analysisOutput.analysis,
      strategy: latestAnalysis.strategyOutput.strategy,
    });

    const nextDraftVersion = (state.latestDrafts?.version ?? 0) + 1;
    const bundleId = randomUUID();

    await Promise.all(
    generated.output.drafts.map((draft) =>
      getDraftReplyRepository().createDraftReply({
        workspaceId: input.workspaceId,
        threadId: latestInboundMessage.threadId,
        messageId: latestInboundMessage.id,
        senderProfileId:
          request.senderContext.mode === "sender_aware"
            ? request.senderContext.senderProfile.id
            : null,
        replyAnalysisId: null,
        promptTemplateId: REPLY_PROMPT_TEMPLATE_ID,
        subject: draft.subject ?? null,
        bodyText: draft.bodyText,
        structuredOutput: {
          draftVersion: nextDraftVersion,
          bundleId,
          bundleOutput: generated.output,
        },
        qualityChecksJson: scoreDraftReplyQuality(draft, {
          request,
          analysis: latestAnalysis.analysisOutput.analysis,
          strategy: latestAnalysis.strategyOutput.strategy,
        }),
        modelMetadata: generated.generationMetadata,
        createdByUserId: input.userId ?? null,
      }),
    ),
  );

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "reply_drafts_generated",
    entityType: "draft_reply",
    entityId: state.latestInboundMessage.id,
    quantity: generated.output.drafts.length,
    billable: false,
    inputTokens: generated.generationMetadata.inputTokens ?? null,
    outputTokens: generated.generationMetadata.outputTokens ?? null,
    costUsd: generated.generationMetadata.costUsd ?? null,
    metadata: {
      provider: generated.generationMetadata.provider,
      model: generated.generationMetadata.model,
      draftVersion: nextDraftVersion,
      meterKey: "replyDraftGenerations",
      workspacePlanCode: input.workspacePlanCode ?? "free",
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "reply.drafts.generated",
    entityType: "message",
    entityId: state.latestInboundMessage.id,
    changes: {
      draftVersion: nextDraftVersion,
      optionCount: generated.output.drafts.length,
    },
    metadata: {
      provider: generated.generationMetadata.provider,
      model: generated.generationMetadata.model,
    },
  });

    await recordReplyTrainingSignal({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      userId: input.userId,
      senderProfileId:
        request.senderContext.mode === "sender_aware"
          ? request.senderContext.senderProfile.id
          : null,
      artifactType: "draft_reply_bundle",
      artifactId: bundleId,
      actionType: "generated",
      providerMetadata: generated.generationMetadata,
      afterText: JSON.stringify(generated.output, null, 2),
      metadata: {
        messageId: latestInboundMessage.id,
        draftVersion: nextDraftVersion,
        optionCount: generated.output.drafts.length,
      },
      requestId: operation.requestId,
    });

    await completeProspectAsyncOperation({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      kind: "reply_drafting",
      requestId: operation.requestId,
      resultSummary: {
        draftVersion: nextDraftVersion,
        optionCount: generated.output.drafts.length,
        messageId: latestInboundMessage.id,
      },
    });

    runLogger.info("Reply drafts generated", {
      draftVersion: nextDraftVersion,
      optionCount: generated.output.drafts.length,
    });

    return generated.output;
  } catch (error) {
    await failProspectAsyncOperation({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      kind: "reply_drafting",
      requestId: operation.requestId,
      errorSummary: error instanceof Error ? error.message : "Unknown reply drafting error",
      resultSummary: {
        messageId: latestInboundMessage.id,
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "reply.drafts.failed",
      entityType: "message",
      entityId: latestInboundMessage.id,
      changes: {},
      metadata: {
        error: error instanceof Error ? error.message : "Unknown reply drafting error",
      },
    });

    runLogger.error("Reply draft generation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

export async function regenerateDraftReplyForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetSlotId: string;
  feedback: string;
  userId?: string;
  workspacePlanCode?: string | null;
}): Promise<DraftReplyGenerationOutput["output"]> {
  await assertWorkspaceFeatureAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    feature: "reply_regeneration",
  });
  await assertWorkspaceUsageAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    meterKey: "regenerations",
  });

  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (
    state.latestInboundMessage === null ||
    state.latestAnalysis === null ||
    state.latestDrafts === null
  ) {
    throw new Error("Generate draft replies before regenerating one option.");
  }

  const latestInboundMessage = state.latestInboundMessage;
  const latestAnalysis = state.latestAnalysis;
  const latestDrafts = state.latestDrafts;

  const request = await buildReplyAnalysisRequest({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    latestInboundMessage,
    threadMessages: state.messages,
    workspacePlanCode: input.workspacePlanCode,
  });

  const regenerated = await getReplyEngine().regenerateDraftReplyOption({
    baseInput: {
      request,
      analysis: latestAnalysis.analysisOutput.analysis,
      strategy: latestAnalysis.strategyOutput.strategy,
    },
    targetSlotId: input.targetSlotId,
    currentOutput: latestDrafts.output,
    feedback: input.feedback,
  });

  const nextDraftVersion = latestDrafts.version + 1;
  const updatedOutput = draftReplyOutputSchema.parse({
    ...latestDrafts.output,
    drafts: latestDrafts.output.drafts.map((draft) =>
      draft.slotId === input.targetSlotId ? regenerated.regeneratedDraft : draft,
    ),
  });
  const bundleId = randomUUID();

  await Promise.all(
    updatedOutput.drafts.map((draft) =>
      getDraftReplyRepository().createDraftReply({
        workspaceId: input.workspaceId,
        threadId: latestInboundMessage.threadId,
        messageId: latestInboundMessage.id,
        senderProfileId:
          request.senderContext.mode === "sender_aware"
            ? request.senderContext.senderProfile.id
            : null,
        promptTemplateId: REPLY_PROMPT_TEMPLATE_ID,
        subject: draft.subject ?? null,
        bodyText: draft.bodyText,
        structuredOutput: {
          draftVersion: nextDraftVersion,
          bundleId,
          bundleOutput: updatedOutput,
        },
        qualityChecksJson: scoreDraftReplyQuality(draft, {
          request,
          analysis: latestAnalysis.analysisOutput.analysis,
          strategy: latestAnalysis.strategyOutput.strategy,
        }),
        modelMetadata: regenerated.generationMetadata,
        createdByUserId: input.userId ?? null,
      }),
    ),
  );

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "reply_draft_regenerated",
    entityType: "draft_reply",
    entityId: state.latestInboundMessage.id,
    quantity: 1,
    billable: false,
    inputTokens: regenerated.generationMetadata.inputTokens ?? null,
    outputTokens: regenerated.generationMetadata.outputTokens ?? null,
    costUsd: regenerated.generationMetadata.costUsd ?? null,
    metadata: {
      provider: regenerated.generationMetadata.provider,
      model: regenerated.generationMetadata.model,
      draftVersion: nextDraftVersion,
      targetSlotId: input.targetSlotId,
      meterKey: "regenerations",
      workspacePlanCode: input.workspacePlanCode ?? "free",
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "reply.draft.regenerated",
    entityType: "message",
    entityId: state.latestInboundMessage.id,
    changes: {
      draftVersion: nextDraftVersion,
      targetSlotId: input.targetSlotId,
    },
    metadata: {},
  });

  const priorDraft = latestDrafts.output.drafts.find(
    (draft) => draft.slotId === input.targetSlotId,
  );

  await recordReplyTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId:
      request.senderContext.mode === "sender_aware"
        ? request.senderContext.senderProfile.id
        : null,
    artifactType: "draft_reply_option",
    artifactId: buildDraftReplyArtifactId(latestInboundMessage.id, input.targetSlotId),
    actionType: "regenerated",
    providerMetadata: regenerated.generationMetadata,
    beforeText: priorDraft ? serializeDraftReplyArtifact(priorDraft) : null,
    afterText: serializeDraftReplyArtifact(regenerated.regeneratedDraft),
    selectedOptionId: input.targetSlotId,
    metadata: {
      messageId: latestInboundMessage.id,
      draftVersion: nextDraftVersion,
      feedback: input.feedback,
    },
  });

  return updatedOutput;
}



export async function editDraftReplyForProspect(
  input: DraftReplyEditInput,
): Promise<DraftReplyGenerationOutput["output"]> {
  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (
    state.latestInboundMessage === null ||
    state.latestAnalysis === null ||
    state.latestDrafts === null
  ) {
    throw new Error("Generate draft replies before editing one option.");
  }

  const latestInboundMessage = state.latestInboundMessage;
  const latestAnalysis = state.latestAnalysis;
  const latestDrafts = state.latestDrafts;
  const priorRecordBySlotId = new Map(
    latestDrafts.output.drafts.map((draft, index) => [
      draft.slotId,
      latestDrafts.records[index] ?? null,
    ]),
  );
  const existingDraft = latestDrafts.output.drafts.find(
    (draft) => draft.slotId === input.targetSlotId,
  );
  const existingDraftRecord = priorRecordBySlotId.get(input.targetSlotId) ?? null;

  if (existingDraft === undefined || existingDraftRecord === null) {
    throw new Error("The target draft option could not be resolved.");
  }

  const request = await buildReplyAnalysisRequest({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    latestInboundMessage,
    threadMessages: state.messages,
  });

  const nextDraftVersion = latestDrafts.version + 1;
  const updatedOutput = draftReplyOutputSchema.parse({
    ...latestDrafts.output,
    drafts: latestDrafts.output.drafts.map((draft) =>
      draft.slotId === input.targetSlotId
        ? {
            ...draft,
            subject: input.subject ?? null,
            bodyText: input.bodyText,
            strategyNote: input.strategyNote,
          }
        : draft,
    ),
  });
  const bundleId = randomUUID();
  const targetDraft = updatedOutput.drafts.find((draft) => draft.slotId === input.targetSlotId);

  if (!targetDraft) {
    throw new Error("Edited draft option could not be resolved.");
  }

  const editRecord = artifactEditRecordSchema.parse({
    artifactType: "draft_reply_option",
    artifactId: existingDraftRecord.id,
    originalText: serializeDraftReplyArtifact(existingDraft),
    editedText: serializeDraftReplyArtifact(targetDraft),
    editedAt: new Date(),
    editorUserId: input.userId ?? null,
  });

  await Promise.all(
    updatedOutput.drafts.map((draft) => {
      const priorRecord = priorRecordBySlotId.get(draft.slotId) ?? null;
      const priorHistory = priorRecord ? readDraftEditHistory(priorRecord) : [];

      return getDraftReplyRepository().createDraftReply({
        workspaceId: input.workspaceId,
        threadId: latestInboundMessage.threadId,
        messageId: latestInboundMessage.id,
        senderProfileId:
          request.senderContext.mode === "sender_aware"
            ? request.senderContext.senderProfile.id
            : null,
        promptTemplateId: REPLY_PROMPT_TEMPLATE_ID,
        subject: draft.subject ?? null,
        bodyText: draft.bodyText,
        structuredOutput: {
          draftVersion: nextDraftVersion,
          bundleId,
          bundleOutput: updatedOutput,
          editHistory:
            draft.slotId === input.targetSlotId
              ? [...priorHistory, editRecord]
              : priorHistory,
        },
        qualityChecksJson: scoreDraftReplyQuality(draft, {
          request,
          analysis: latestAnalysis.analysisOutput.analysis,
          strategy: latestAnalysis.strategyOutput.strategy,
        }),
        modelMetadata: {
          editedAt: new Date().toISOString(),
          editRecord,
          sourceDraftId: existingDraftRecord.id,
        },
        createdByUserId: input.userId ?? null,
      });
    }),
  );

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "reply_draft_edited",
    entityType: "draft_reply",
    entityId: existingDraftRecord.id,
    quantity: 1,
    billable: false,
    metadata: {
      targetSlotId: input.targetSlotId,
      draftVersion: nextDraftVersion,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "reply.draft.edited",
    entityType: "draft_reply",
    entityId: existingDraftRecord.id,
    changes: editRecord,
    metadata: {
      draftVersion: nextDraftVersion,
    },
  });

  await recordReplyTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId:
      request.senderContext.mode === "sender_aware"
        ? request.senderContext.senderProfile.id
        : null,
    artifactType: "draft_reply_option",
    artifactId: buildDraftReplyArtifactId(latestInboundMessage.id, input.targetSlotId),
    actionType: "edited",
    providerMetadata: existingDraftRecord.modelMetadata,
    beforeText: editRecord.originalText,
    afterText: editRecord.editedText,
    selectedOptionId: input.targetSlotId,
    metadata: {
      messageId: latestInboundMessage.id,
      draftVersion: nextDraftVersion,
      sourceDraftId: existingDraftRecord.id,
    },
  });

  return updatedOutput;
}

export async function recordReplyDraftSelectionForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetSlotId: string;
  userId?: string;
  requestId?: string;
}): Promise<void> {
  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (state.latestInboundMessage === null || state.latestDrafts === null) {
    throw new Error("Generate draft replies before selecting one.");
  }

  const draftIndex = state.latestDrafts.output.drafts.findIndex(
    (item) => item.slotId === input.targetSlotId,
  );
  const draft = draftIndex >= 0 ? state.latestDrafts.output.drafts[draftIndex] : undefined;
  const record = draftIndex >= 0 ? state.latestDrafts.records[draftIndex] ?? null : null;

  if (!draft) {
    throw new Error("The selected draft reply could not be resolved.");
  }

  await recordReplyTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId: record?.senderProfileId ?? null,
    artifactType: "draft_reply_option",
    artifactId: buildDraftReplyArtifactId(state.latestInboundMessage.id, input.targetSlotId),
    actionType: "selected",
    providerMetadata: record?.modelMetadata,
    afterText: serializeDraftReplyArtifact(draft),
    selectedOptionId: input.targetSlotId,
    metadata: {
      messageId: state.latestInboundMessage.id,
      draftVersion: state.latestDrafts.version,
    },
    requestId: input.requestId,
  });
}

export async function recordReplyDraftDistributionSignalForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetSlotId: string;
  actionType: "copied" | "exported";
  exportFormat?: string | null;
  userId?: string;
  requestId?: string;
}): Promise<void> {
  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (state.latestInboundMessage === null || state.latestDrafts === null) {
    throw new Error("Generate draft replies before exporting one.");
  }

  const draftIndex = state.latestDrafts.output.drafts.findIndex(
    (item) => item.slotId === input.targetSlotId,
  );
  const draft = draftIndex >= 0 ? state.latestDrafts.output.drafts[draftIndex] : undefined;
  const record = draftIndex >= 0 ? state.latestDrafts.records[draftIndex] ?? null : null;

  if (!draft) {
    throw new Error("The requested draft reply could not be resolved.");
  }

  await recordReplyTrainingSignal({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    userId: input.userId,
    senderProfileId: record?.senderProfileId ?? null,
    artifactType: "draft_reply_option",
    artifactId: buildDraftReplyArtifactId(state.latestInboundMessage.id, input.targetSlotId),
    actionType: input.actionType,
    providerMetadata: record?.modelMetadata,
    afterText: serializeDraftReplyArtifact(draft),
    exportFormat: input.exportFormat ?? null,
    metadata: {
      messageId: state.latestInboundMessage.id,
      draftVersion: state.latestDrafts.version,
    },
    requestId: input.requestId,
  });
}












