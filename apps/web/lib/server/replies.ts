import { randomUUID } from "node:crypto";

import {
  createInMemoryAuditEventRepository,
  createInMemoryConversationThreadRepository,
  createInMemoryDraftReplyRepository,
  createInMemoryMessageRepository,
  createInMemoryReplyAnalysisRepository,
  createInMemoryUsageEventRepository,
  type AuditEventRepository,
  type ConversationThreadRepository,
  type DraftReplyRepository,
  type MessageRepository,
  type ReplyAnalysisRepository,
  type UsageEventRepository,
} from "@ceg/database";
import { createConsoleLogger } from "@ceg/observability";
import {
  createReplyEngineService,
  replyAnalysisOutputSchema,
  responseStrategyRecommendationOutputSchema,
  type DraftReplyGenerationOutput,
  type ReplyAnalysisOutput,
  type ReplyAnalysisRequest,
  type ReplyEngineService,
  type ResponseStrategyRecommendationOutput,
} from "@ceg/reply-engine";
import { draftReplyOutputSchema, type ConversationThread, type DraftReply, type Message, type Prospect } from "@ceg/validation";

import { getCampaignForWorkspace, getProspectForCampaign, updateProspectForCampaign } from "./campaigns";
import { createOpenAiReplyModelAdapter } from "./openai-reply-provider";
import { getLatestResearchSnapshotForProspect } from "./prospect-research";
import { getSenderProfileForWorkspace } from "./sender-profiles";

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

type ReplyThreadState = {
  thread: ConversationThread | null;
  messages: Message[];
  latestInboundMessage: Message | null;
  latestAnalysis: PersistedReplyAnalysisRecord | null;
  latestDrafts: {
    version: number;
    bundleId: string;
    output: DraftReplyGenerationOutput["output"];
    records: DraftReply[];
  } | null;
};

declare global {
  var __cegConversationThreadRepository: ConversationThreadRepository | undefined;
  var __cegMessageRepository: MessageRepository | undefined;
  var __cegReplyAnalysisRepository: ReplyAnalysisRepository | undefined;
  var __cegDraftReplyRepository: DraftReplyRepository | undefined;
  var __cegReplyUsageEventRepository: UsageEventRepository | undefined;
  var __cegReplyAuditEventRepository: AuditEventRepository | undefined;
  var __cegReplyEngineService: ReplyEngineService | undefined;
}

const logger = createConsoleLogger({ area: "reply_intelligence" });
const REPLY_PROMPT_TEMPLATE_ID = "reply.v1";

function getConversationThreadRepository(): ConversationThreadRepository {
  if (globalThis.__cegConversationThreadRepository === undefined) {
    globalThis.__cegConversationThreadRepository = createInMemoryConversationThreadRepository();
  }

  return globalThis.__cegConversationThreadRepository;
}

function getMessageRepository(): MessageRepository {
  if (globalThis.__cegMessageRepository === undefined) {
    globalThis.__cegMessageRepository = createInMemoryMessageRepository();
  }

  return globalThis.__cegMessageRepository;
}

function getReplyAnalysisRepository(): ReplyAnalysisRepository {
  if (globalThis.__cegReplyAnalysisRepository === undefined) {
    globalThis.__cegReplyAnalysisRepository = createInMemoryReplyAnalysisRepository();
  }

  return globalThis.__cegReplyAnalysisRepository;
}

function getDraftReplyRepository(): DraftReplyRepository {
  if (globalThis.__cegDraftReplyRepository === undefined) {
    globalThis.__cegDraftReplyRepository = createInMemoryDraftReplyRepository();
  }

  return globalThis.__cegDraftReplyRepository;
}

function getUsageEventRepository(): UsageEventRepository {
  if (globalThis.__cegReplyUsageEventRepository === undefined) {
    globalThis.__cegReplyUsageEventRepository = createInMemoryUsageEventRepository();
  }

  return globalThis.__cegReplyUsageEventRepository;
}

function getAuditEventRepository(): AuditEventRepository {
  if (globalThis.__cegReplyAuditEventRepository === undefined) {
    globalThis.__cegReplyAuditEventRepository = createInMemoryAuditEventRepository();
  }

  return globalThis.__cegReplyAuditEventRepository;
}

function getReplyEngine(): ReplyEngineService {
  if (globalThis.__cegReplyEngineService === undefined) {
    globalThis.__cegReplyEngineService = createReplyEngineService(
      createOpenAiReplyModelAdapter(),
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

async function getProspectAndThread(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
}) {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  const thread = await getConversationThreadRepository().findOrCreateThreadForProspect({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    metadata: {},
  });

  return { prospect, thread };
}

async function buildReplyAnalysisRequest(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  latestInboundMessage: Message;
  threadMessages: Message[];
}): Promise<ReplyAnalysisRequest> {
  const campaign = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (campaign === null) {
    throw new Error("Campaign not found for workspace.");
  }

  const senderContext = campaign.senderProfileId
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
        basicModeReason: "Campaign does not currently have a sender profile attached.",
        credibilityLevel: "cautious" as const,
      };

  const researchSnapshot = await getLatestResearchSnapshotForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

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

export async function getReplyThreadStateForProspect(
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
      latestInboundMessage: null,
      latestAnalysis: null,
      latestDrafts: null,
    };
  }

  const messages = await getMessageRepository().listMessagesByThread(thread.id);
  const latestInboundMessage = getLatestInboundMessage(messages);
  const latestAnalysis =
    latestInboundMessage === null
      ? null
      : parsePersistedReplyAnalysis(
          (
            await getReplyAnalysisRepository().getReplyAnalysisByMessage(
              latestInboundMessage.id,
            )
          )?.structuredOutput,
        );

  const draftRecords =
    latestInboundMessage === null
      ? []
      : await getDraftReplyRepository().listDraftRepliesByMessage(
          latestInboundMessage.id,
        );

  const parsedDrafts = draftRecords
    .map((record) => ({
      record,
      parsed: parsePersistedDraftReply(record.structuredOutput),
    }))
    .filter(
      (item): item is { record: DraftReply; parsed: PersistedDraftReplyRecord } =>
        item.parsed !== null,
    )
    .sort((left, right) => right.parsed.draftVersion - left.parsed.draftVersion);

  const latestDraft = parsedDrafts[0];

  return {
    thread,
    messages,
    latestInboundMessage,
    latestAnalysis,
    latestDrafts:
      latestDraft === undefined
        ? null
        : {
            version: latestDraft.parsed.draftVersion,
            bundleId: latestDraft.parsed.bundleId,
            output: latestDraft.parsed.bundleOutput,
            records: parsedDrafts
              .filter(
                (item) =>
                  item.parsed.draftVersion === latestDraft.parsed.draftVersion &&
                  item.parsed.bundleId === latestDraft.parsed.bundleId,
              )
              .map((item) => item.record),
          },
  };
}

export async function createInboundReplyForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  subject?: string | null;
  bodyText: string;
  userId?: string;
}): Promise<Message> {
  const { prospect, thread } = await getProspectAndThread(input);
  const existingMessages = await getMessageRepository().listMessagesByThread(thread.id);
  const messageVersion = existingMessages.length + 1;

  const message = await getMessageRepository().createMessage({
    workspaceId: input.workspaceId,
    threadId: thread.id,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    direction: "inbound",
    messageKind: "reply",
    status: "received",
    subject: input.subject ?? null,
    bodyText: input.bodyText,
    metadata: {
      messageVersion,
      capturedManually: true,
    },
    receivedAt: new Date(),
  });

  await getConversationThreadRepository().updateThread({
    threadId: thread.id,
    workspaceId: input.workspaceId,
    latestMessageAt: message.createdAt,
    metadata: {
      ...thread.metadata,
      latestInboundMessageId: message.id,
    },
  });

  await setProspectStatusToReplied(prospect, input.campaignId);

  await getUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "inbound_reply_created",
    entityType: "message",
    entityId: message.id,
    quantity: 1,
    billable: false,
    metadata: {
      direction: "inbound",
      messageVersion,
    },
  });

  await getAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "reply.inbound_message.created",
    entityType: "message",
    entityId: message.id,
    changes: {
      threadId: thread.id,
      messageVersion,
    },
    metadata: {},
  });

  return message;
}

export async function analyzeLatestReplyForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
}): Promise<PersistedReplyAnalysisRecord> {
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
  });

  const runLogger = logger.child({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    messageId: state.latestInboundMessage.id,
  });

  const analysisOutput = await getReplyEngine().analyzeReply(request);
  const strategyOutput = await getReplyEngine().recommendResponseStrategy({
    request,
    analysis: analysisOutput.analysis,
  });

  const nextVersion = (state.latestAnalysis?.analysisVersion ?? 0) + 1;
  const mapped = mapReplyClassification(analysisOutput.analysis.intent);

  await getReplyAnalysisRepository().upsertReplyAnalysis({
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

  await getUsageEventRepository().createUsageEvent({
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
    },
  });

  await getAuditEventRepository().createAuditEvent({
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

  runLogger.info("Reply analysis completed", {
    analysisVersion: nextVersion,
    intent: analysisOutput.analysis.intent,
  });

  return {
    analysisVersion: nextVersion,
    analysisOutput,
    strategyOutput,
  };
}

export async function generateDraftRepliesForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  userId?: string;
}): Promise<DraftReplyGenerationOutput["output"]> {
  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (state.latestInboundMessage === null || state.latestAnalysis === null) {
    throw new Error("Analyze the latest inbound reply before generating drafts.");
  }

  const latestInboundMessage = state.latestInboundMessage;

  const request = await buildReplyAnalysisRequest({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    latestInboundMessage,
    threadMessages: state.messages,
  });

  const generated = await getReplyEngine().generateDraftReplies({
    request,
    analysis: state.latestAnalysis.analysisOutput.analysis,
    strategy: state.latestAnalysis.strategyOutput.strategy,
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
        modelMetadata: generated.generationMetadata,
        createdByUserId: input.userId ?? null,
      }),
    ),
  );

  await getUsageEventRepository().createUsageEvent({
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
    },
  });

  await getAuditEventRepository().createAuditEvent({
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

  return generated.output;
}

export async function regenerateDraftReplyForProspect(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetSlotId: string;
  feedback: string;
  userId?: string;
}): Promise<DraftReplyGenerationOutput["output"]> {
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

  const request = await buildReplyAnalysisRequest({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    latestInboundMessage,
    threadMessages: state.messages,
  });

  const regenerated = await getReplyEngine().regenerateDraftReplyOption({
    baseInput: {
      request,
      analysis: state.latestAnalysis.analysisOutput.analysis,
      strategy: state.latestAnalysis.strategyOutput.strategy,
    },
    targetSlotId: input.targetSlotId,
    currentOutput: state.latestDrafts.output,
    feedback: input.feedback,
  });

  const nextDraftVersion = state.latestDrafts.version + 1;
  const updatedOutput = draftReplyOutputSchema.parse({
    ...state.latestDrafts.output,
    drafts: state.latestDrafts.output.drafts.map((draft) =>
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
        modelMetadata: regenerated.generationMetadata,
        createdByUserId: input.userId ?? null,
      }),
    ),
  );

  await getUsageEventRepository().createUsageEvent({
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
    },
  });

  await getAuditEventRepository().createAuditEvent({
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

  return updatedOutput;
}

