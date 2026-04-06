import { z } from "zod";

import {
  campaignIdSchema,
  prospectIdSchema,
  senderProfileTypeSchema,
  workspaceIdSchema,
} from "./primitives.js";

const uuidSchema = z.string().uuid();
const optionalTextSchema = z.string().trim().min(1).nullable().optional();
const optionalUrlSchema = z.string().trim().url().nullable().optional();
const metadataSchema = z.record(z.string(), z.unknown()).default({});
const stringListSchema = z.array(z.string().trim().min(1)).default([]);
const timestampSchema = z.coerce.date();
export const aiOperationMetadataSchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  promptVersion: optionalTextSchema,
  latencyMs: z.number().int().nonnegative().nullable().optional(),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
  totalTokens: z.number().int().nonnegative().nullable().optional(),
  costUsd: z.number().nonnegative().nullable().optional(),
  generatedAt: timestampSchema,
});
const tonePreferencesSchema = z.object({
  style: optionalTextSchema,
  do: stringListSchema,
  avoid: stringListSchema,
  notes: optionalTextSchema,
});
const confidenceScoreSchema = z.object({
  score: z.number().min(0).max(1),
  label: z.enum(["low", "medium", "high"]),
  reasons: stringListSchema,
});
const evidenceSnippetSchema = z.object({
  snippet: z.string().trim().min(1),
  sourceUrl: z.string().trim().url(),
  title: optionalTextSchema,
  selectorHint: optionalTextSchema,
  confidence: confidenceScoreSchema,
  supports: stringListSchema,
});
const evidenceFlagSchema = z.object({
  code: z.string().trim().min(1),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().trim().min(1),
});
const qualityOutcomeLabelSchema = z.enum(["strong", "review", "risky"]);
const qualityCheckResultSchema = z.object({
  code: z.string().trim().min(1),
  passed: z.boolean(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().trim().min(1),
  evidence: stringListSchema,
});
const qualityDimensionScoreSchema = z.object({
  name: z.string().trim().min(1),
  score: z.number().min(0).max(100),
  label: qualityOutcomeLabelSchema,
  details: z.string().trim().min(1),
});
const qualitySummarySchema = z.object({
  score: z.number().min(0).max(100),
  label: qualityOutcomeLabelSchema,
  blocked: z.boolean().default(false),
});
export const generationPerformanceHintConfidenceSchema = z.enum([
  "low",
  "medium",
  "high",
]);
export const generationPerformancePatternKeySchema = z.enum([
  "soft_cta",
  "direct_cta",
  "evidence_led_personalization",
  "concise_structure",
  "courteous_closure",
  "clarifying_question",
]);
export const generationPerformancePatternSchema = z.object({
  key: generationPerformancePatternKeySchema,
  guidance: z.string().trim().min(1),
  positiveSignals: z.number().int().nonnegative(),
  negativeSignals: z.number().int().nonnegative(),
});
export const generationPerformanceHintsSchema = z.object({
  available: z.boolean().default(false),
  sampleSize: z.number().int().nonnegative().default(0),
  sourceScope: z.enum(["campaign", "workspace", "none"]).default("none"),
  confidence: generationPerformanceHintConfidenceSchema.default("low"),
  preferredToneStyle: optionalTextSchema,
  effectivePatterns: z.array(generationPerformancePatternSchema).default([]),
  cautionPatterns: z.array(generationPerformancePatternSchema).default([]),
  notes: stringListSchema,
});
export const sequenceQualityReportSchema = z.object({
  generatedAt: timestampSchema,
  summary: qualitySummarySchema,
  dimensions: z.array(qualityDimensionScoreSchema).min(1),
  checks: z.array(qualityCheckResultSchema).default([]),
  notes: stringListSchema,
});
export const draftReplyQualityReportSchema = z.object({
  generatedAt: timestampSchema,
  summary: qualitySummarySchema,
  dimensions: z.array(qualityDimensionScoreSchema).min(1),
  checks: z.array(qualityCheckResultSchema).default([]),
  notes: stringListSchema,
});
export const generatedArtifactTypeSchema = z.enum([
  "sequence_subject_line_set",
  "sequence_opener_set",
  "sequence_initial_email",
  "sequence_follow_up_step",
  "sequence_subject_line_option",
  "sequence_opener_option",
  "sequence_bundle",
  "draft_reply_option",
  "draft_reply_bundle",
]);
export const trainingSignalActionTypeSchema = z.enum([
  "generated",
  "regenerated",
  "edited",
  "selected",
  "copied",
  "exported",
  "positive_outcome",
  "negative_outcome",
]);
export const productAnalyticsEventSchema = z.enum([
  "onboarding_completed",
  "sender_profile_created",
  "campaign_created",
  "prospect_created",
  "research_run_completed",
  "sequence_generated",
  "reply_analysis_completed",
  "billing_upgrade_clicked",
  "feedback_submitted",
]);
export const feedbackCategorySchema = z.enum([
  "bug",
  "workflow",
  "output_quality",
  "billing",
  "other",
]);
export const artifactEditRecordSchema = z.object({
  artifactType: generatedArtifactTypeSchema,
  artifactId: z.string().trim().min(1),
  originalText: z.string().trim().min(1),
  editedText: z.string().trim().min(1),
  editedAt: timestampSchema,
  editorUserId: uuidSchema.nullable().optional(),
});
const researchQualitySchema = z.object({
  overall: confidenceScoreSchema,
  dimensions: z
    .array(
      z.object({
        dimension: z.string().trim().min(1),
        confidence: confidenceScoreSchema,
      }),
    )
    .default([]),
  flags: z.array(evidenceFlagSchema).default([]),
});

export const userIdSchema = uuidSchema;
export const senderProfileIdSchema = uuidSchema;
export const brandVoiceProfileIdSchema = uuidSchema;
export const promptTemplateIdSchema = uuidSchema;
export const sequenceIdSchema = uuidSchema;
export const conversationThreadIdSchema = uuidSchema;
export const messageIdSchema = uuidSchema;
export const replyAnalysisIdSchema = uuidSchema;
export const draftReplyIdSchema = uuidSchema;
export const subscriptionIdSchema = uuidSchema;
export const inboxAccountIdSchema = uuidSchema;
export const inboxSyncRunIdSchema = uuidSchema;
export const importedThreadRefIdSchema = uuidSchema;
export const importedMessageRefIdSchema = uuidSchema;

export const workspaceStatusSchema = z.enum(["active", "suspended", "archived"]);
export const userStatusSchema = z.enum(["active", "invited", "disabled"]);
export const workspaceMemberRoleSchema = z.enum(["owner", "admin", "member"]);
export const workspaceMemberStatusSchema = z.enum([
  "invited",
  "active",
  "suspended",
]);
export const campaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);
export const prospectStatusSchema = z.enum([
  "new",
  "researched",
  "sequenced",
  "contacted",
  "replied",
  "closed",
  "archived",
]);
export const sequenceStatusSchema = z.enum([
  "draft",
  "approved",
  "sent",
  "archived",
]);
export const messageDirectionSchema = z.enum(["outbound", "inbound"]);
export const messageStatusSchema = z.enum([
  "draft",
  "queued",
  "sent",
  "delivered",
  "received",
  "failed",
  "archived",
]);
export const messageSourceSchema = z.enum(["generated", "manual", "imported"]);
export const objectionTypeSchema = z.enum([
  "price",
  "timing",
  "authority",
  "already_has_solution",
  "none",
  "other",
]);
export const replyIntentSchema = z.enum([
  "interested",
  "needs_more_info",
  "objection_price",
  "objection_timing",
  "objection_authority",
  "objection_already_has_solution",
  "referral_to_other_person",
  "soft_no",
  "hard_no",
  "unclear",
]);
export const subscriptionProviderSchema = z.enum(["stripe"]);
export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);
export const inboxProviderSchema = z.enum(["gmail", "microsoft365"]);
export const inboxAccountStatusSchema = z.enum([
  "active",
  "paused",
  "disconnected",
  "error",
]);
export const inboxSyncHealthStatusSchema = z.enum([
  "healthy",
  "warning",
  "error",
  "needs_reconnect",
]);
export const inboxSyncRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "partial",
]);
export const inboxSyncModeSchema = z.enum([
  "initial",
  "incremental",
  "manual",
  "backfill",
]);
export const asyncOperationKindSchema = z.enum([
  "prospect_research",
  "sequence_generation",
  "reply_analysis",
  "reply_drafting",
]);
export const asyncOperationRunStatusSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "failed",
]);
export const asyncOperationResultSummarySchema = metadataSchema;
export const asyncOperationRunStateSchema = z.object({
  kind: asyncOperationKindSchema,
  status: asyncOperationRunStatusSchema.default("idle"),
  idempotencyKey: optionalTextSchema,
  requestId: optionalTextSchema,
  attemptCount: z.number().int().nonnegative().default(0),
  startedAt: timestampSchema.nullable().optional(),
  finishedAt: timestampSchema.nullable().optional(),
  lastTriggeredAt: timestampSchema.nullable().optional(),
  lastSucceededAt: timestampSchema.nullable().optional(),
  errorSummary: optionalTextSchema,
  resultSummary: asyncOperationResultSummarySchema,
  updatedAt: timestampSchema.nullable().optional(),
});
export const prospectAsyncOperationsSchema = z.object({
  prospectResearch: asyncOperationRunStateSchema
    .extend({ kind: z.literal("prospect_research") })
    .optional(),
  sequenceGeneration: asyncOperationRunStateSchema
    .extend({ kind: z.literal("sequence_generation") })
    .optional(),
  replyAnalysis: asyncOperationRunStateSchema
    .extend({ kind: z.literal("reply_analysis") })
    .optional(),
  replyDrafting: asyncOperationRunStateSchema
    .extend({ kind: z.literal("reply_drafting") })
    .optional(),
});
export const importedParticipantRoleSchema = z.enum([
  "from",
  "to",
  "cc",
  "bcc",
  "reply_to",
  "unknown",
]);
export const importedProviderMessageTypeSchema = z.enum([
  "inbound",
  "outbound",
  "draft",
]);
export const importedMessageRoleSchema = z.enum([
  "reply",
  "outbound",
  "draft",
  "unclassified",
]);

export const campaignPerformanceSnapshotSchema = z.object({
  outboundMessages: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  positiveReplies: z.number().int().nonnegative(),
  replyRate: z.number().min(0).max(1).nullable(),
  positiveReplyRate: z.number().min(0).max(1).nullable(),
  positiveReplyIntents: z.array(replyIntentSchema).default([]),
  calculatedAt: timestampSchema,
  version: z.number().int().positive().default(1),
});

export const performanceSummaryScopeSchema = z.enum(["workspace", "campaign"]);
export const shareablePerformanceSummarySchema = z.object({
  scope: performanceSummaryScopeSchema,
  title: z.string().min(1),
  subtitle: optionalTextSchema,
  outboundMessages: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  positiveReplies: z.number().int().nonnegative(),
  replyRate: z.number().min(0).max(1).nullable(),
  positiveReplyRate: z.number().min(0).max(1).nullable(),
  highlights: z.array(z.string().min(1)).max(4).default([]),
  generatedAt: timestampSchema,
  version: z.number().int().positive().default(1),
});
export const recommendedActionSchema = z.enum([
  "send_more_info",
  "ask_clarifying_question",
  "propose_meeting",
  "follow_up_later",
  "route_to_other_person",
  "stop_outreach",
  "close_lost",
  "escalate_to_human",
]);

export const workspaceSchema = z.object({
  id: workspaceIdSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  ownerUserId: userIdSchema.nullable(),
  status: workspaceStatusSchema,
  settings: metadataSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const userSchema = z.object({
  id: userIdSchema,
  email: z.string().trim().email(),
  fullName: optionalTextSchema,
  avatarUrl: optionalUrlSchema,
  authProvider: optionalTextSchema,
  authProviderSubject: optionalTextSchema,
  status: userStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const workspaceMemberSchema = z.object({
  id: uuidSchema,
  workspaceId: workspaceIdSchema,
  userId: userIdSchema,
  role: workspaceMemberRoleSchema,
  status: workspaceMemberStatusSchema,
  invitedByUserId: userIdSchema.nullable().optional(),
  joinedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const workspaceProfileSettingsSchema = z.object({
  description: optionalTextSchema,
  websiteUrl: optionalUrlSchema,
  companyName: optionalTextSchema,
  supportEmail: optionalTextSchema,
});

export const workspaceDataRetentionPreferenceSchema = z.enum([
  "standard",
  "minimized",
  "extended",
]);

export const workspaceInstitutionalControlsSchema = z.object({
  dataRetention: z
    .object({
      preference: workspaceDataRetentionPreferenceSchema.default("standard"),
      notes: optionalTextSchema,
      updatedAt: timestampSchema.nullable().optional(),
    })
    .default({
      preference: "standard",
      notes: null,
      updatedAt: null,
    }),
  requestVisibility: z
    .object({
      exportRequestsVisible: z.boolean().default(true),
      deleteRequestsVisible: z.boolean().default(true),
      contactChannel: optionalTextSchema,
    })
    .default({
      exportRequestsVisible: true,
      deleteRequestsVisible: true,
      contactChannel: null,
    }),
  auditAccess: z
    .object({
      visibleToWorkspaceAdmins: z.boolean().default(true),
      internalSupportVisible: z.boolean().default(false),
      notes: optionalTextSchema,
    })
    .default({
      visibleToWorkspaceAdmins: true,
      internalSupportVisible: false,
      notes: null,
    }),
  providerVisibility: z
    .object({
      configurationSummaryVisible: z.boolean().default(true),
    })
    .default({
      configurationSummaryVisible: true,
    }),
});

export const workspaceDeletionRequestSchema = z.object({
  status: z.enum(["none", "requested"]).default("none"),
  requestedAt: timestampSchema.nullable().optional(),
  requestedByUserId: userIdSchema.nullable().optional(),
  requestedByEmail: optionalTextSchema,
  reason: optionalTextSchema,
  confirmationLabel: optionalTextSchema,
});

export const workspaceDataHandlingStateSchema = z.object({
  lastExportAt: timestampSchema.nullable().optional(),
  lastExportedByUserId: userIdSchema.nullable().optional(),
  deletionRequest: workspaceDeletionRequestSchema.default({
    status: "none",
    requestedAt: null,
    requestedByUserId: null,
    requestedByEmail: null,
    reason: null,
    confirmationLabel: null,
  }),
});

export const onboardingStepIdSchema = z.enum([
  "workspace",
  "user_type",
  "sender_profile",
  "campaign",
  "prospect",
]);

export const onboardingStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "skipped",
  "completed",
]);

export const workspaceOnboardingStateSchema = z.object({
  status: onboardingStatusSchema.default("not_started"),
  workspaceConfirmedAt: timestampSchema.nullable().optional(),
  selectedUserType: senderProfileTypeSchema.nullable().optional(),
  skippedAt: timestampSchema.nullable().optional(),
  completedAt: timestampSchema.nullable().optional(),
  updatedAt: timestampSchema.nullable().optional(),
});

export const senderProfileSchema = z.object({
  id: senderProfileIdSchema,
  workspaceId: workspaceIdSchema,
  name: z.string().min(1),
  senderType: senderProfileTypeSchema,
  companyName: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  productDescription: optionalTextSchema,
  targetCustomer: optionalTextSchema,
  valueProposition: optionalTextSchema,
  differentiation: optionalTextSchema,
  proofPoints: stringListSchema,
  goals: stringListSchema,
  tonePreferences: tonePreferencesSchema,
  metadata: metadataSchema,
  status: z.enum(["draft", "active", "archived"]),
  isDefault: z.boolean(),
  createdByUserId: userIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const campaignSchema = z.object({
  id: campaignIdSchema,
  workspaceId: workspaceIdSchema,
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  brandVoiceProfileId: brandVoiceProfileIdSchema.nullable().optional(),
  name: z.string().min(1),
  description: optionalTextSchema,
  objective: optionalTextSchema,
  offerSummary: optionalTextSchema,
  targetIcp: optionalTextSchema,
  targetPersona: optionalTextSchema,
  targetIndustries: stringListSchema,
  tonePreferences: tonePreferencesSchema,
  frameworkPreferences: stringListSchema,
  status: campaignStatusSchema,
  settings: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const prospectSchema = z.object({
  id: prospectIdSchema,
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema.nullable().optional(),
  contactName: optionalTextSchema,
  fullName: optionalTextSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
  email: z.string().email().nullable().optional(),
  title: optionalTextSchema,
  companyName: optionalTextSchema,
  companyDomain: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  linkedinUrl: optionalTextSchema,
  location: optionalTextSchema,
  source: optionalTextSchema,
  status: prospectStatusSchema,
  metadata: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const companyProfileSchema = z.object({
  domain: z.string().trim().min(1),
  websiteUrl: z.string().trim().url(),
  canonicalUrl: z.string().trim().url().nullable().optional(),
  companyName: optionalTextSchema,
  headline: optionalTextSchema,
  summary: optionalTextSchema,
  productDescription: optionalTextSchema,
  likelyTargetCustomer: optionalTextSchema,
  targetCustomers: stringListSchema,
  industries: stringListSchema,
  valuePropositions: stringListSchema,
  proofPoints: stringListSchema,
  differentiators: stringListSchema,
  likelyPainPoints: stringListSchema,
  personalizationHooks: stringListSchema,
  callsToAction: stringListSchema,
  sourceEvidence: z.array(evidenceSnippetSchema).default([]),
  confidence: confidenceScoreSchema,
  flags: z.array(evidenceFlagSchema).default([]),
  metadata: metadataSchema,
});

const researchSnapshotStructuredDataSchema = z.object({
  companyProfile: companyProfileSchema,
  quality: researchQualitySchema,
  trainingRecord: metadataSchema,
});

export const researchSnapshotSchema = z.object({
  id: uuidSchema,
  workspaceId: workspaceIdSchema,
  prospectId: prospectIdSchema,
  sourceUrl: z.string().url(),
  sourceType: z.enum(["website", "linkedin", "manual"]),
  fetchStatus: z.enum(["captured", "failed", "stale"]),
  snapshotHash: z.string().nullable().optional(),
  evidence: z.array(evidenceSnippetSchema).default([]),
  structuredData: researchSnapshotStructuredDataSchema,
  rawCapture: metadataSchema,
  capturedAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const sequenceSchema = z.object({
  id: sequenceIdSchema,
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema,
  prospectId: prospectIdSchema.nullable().optional(),
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  brandVoiceProfileId: brandVoiceProfileIdSchema.nullable().optional(),
  promptTemplateId: promptTemplateIdSchema.nullable().optional(),
  generationMode: z.enum(["basic", "sender_aware"]),
  channel: z.literal("email"),
  status: sequenceStatusSchema,
  content: metadataSchema,
  qualityChecksJson: sequenceQualityReportSchema.nullable().optional(),
  modelMetadata: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const conversationThreadSchema = z.object({
  id: conversationThreadIdSchema,
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema.nullable().optional(),
  prospectId: prospectIdSchema.nullable().optional(),
  status: z.enum(["open", "closed", "archived"]),
  externalThreadRef: optionalTextSchema,
  latestMessageAt: timestampSchema.nullable().optional(),
  metadata: metadataSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const messageSchema = z.object({
  id: messageIdSchema,
  workspaceId: workspaceIdSchema,
  threadId: conversationThreadIdSchema,
  campaignId: campaignIdSchema.nullable().optional(),
  prospectId: prospectIdSchema.nullable().optional(),
  sequenceId: sequenceIdSchema.nullable().optional(),
  replyToMessageId: messageIdSchema.nullable().optional(),
  direction: messageDirectionSchema,
  messageKind: z.enum(["email", "reply"]),
  status: messageStatusSchema,
  providerMessageId: optionalTextSchema,
  subject: optionalTextSchema,
  bodyText: optionalTextSchema,
  bodyHtml: optionalTextSchema,
  metadata: z
    .object({
      source: messageSourceSchema.default("manual"),
      generatedFrom: z.enum(["sequence", "reply_draft"]).nullable().optional(),
      messageVersion: z.number().int().positive().optional(),
      sequenceVersion: z.number().int().positive().optional(),
      draftVersion: z.number().int().positive().optional(),
      importedFrom: optionalTextSchema,
      timelineLabel: optionalTextSchema,
    })
    .catchall(z.unknown())
    .default({
      source: "manual",
    }),
  sentAt: timestampSchema.nullable().optional(),
  receivedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const replyAnalysisSchema = z.object({
  id: replyAnalysisIdSchema,
  workspaceId: workspaceIdSchema,
  threadId: conversationThreadIdSchema,
  messageId: messageIdSchema,
  promptTemplateId: promptTemplateIdSchema.nullable().optional(),
  classification: z.enum([
    "positive",
    "neutral",
    "negative",
    "objection",
    "unsubscribe",
    "unknown",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative"]).nullable().optional(),
  urgency: z.enum(["low", "medium", "high"]).nullable().optional(),
  intent: optionalTextSchema,
  confidence: z.number().min(0).max(1).nullable().optional(),
  structuredOutput: metadataSchema,
  modelMetadata: metadataSchema,
  analyzedAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const draftReplySchema = z.object({
  id: draftReplyIdSchema,
  workspaceId: workspaceIdSchema,
  threadId: conversationThreadIdSchema,
  messageId: messageIdSchema.nullable().optional(),
  replyAnalysisId: replyAnalysisIdSchema.nullable().optional(),
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  promptTemplateId: promptTemplateIdSchema.nullable().optional(),
  status: z.enum(["draft", "reviewed", "sent", "discarded"]),
  subject: optionalTextSchema,
  bodyText: optionalTextSchema,
  bodyHtml: optionalTextSchema,
  structuredOutput: metadataSchema,
  qualityChecksJson: draftReplyQualityReportSchema.nullable().optional(),
  modelMetadata: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const replyAnalysisMessageSchema = z.object({
  messageId: messageIdSchema,
  subject: optionalTextSchema,
  bodyText: z.string().trim().min(1),
});

const replyThreadMessageSchema = z.object({
  direction: messageDirectionSchema,
  subject: optionalTextSchema,
  bodyText: z.string().trim().min(1),
});

export const replyAnalysisInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema.nullable().optional(),
  prospectId: prospectIdSchema.nullable().optional(),
  threadId: conversationThreadIdSchema.nullable().optional(),
  latestInboundMessage: replyAnalysisMessageSchema,
  threadMessages: z.array(replyThreadMessageSchema).min(1),
  campaignSummary: optionalTextSchema,
  senderContextSummary: optionalTextSchema,
  prospectCompanyProfileSummary: optionalTextSchema,
});

export const replyClassificationOutputSchema = z.object({
  intent: replyIntentSchema,
  objectionType: objectionTypeSchema.nullable().optional(),
  classification: replyIntentSchema,
  confidence: confidenceScoreSchema,
  recommendedAction: recommendedActionSchema,
  rationale: z.string().trim().min(1),
  keySignals: stringListSchema,
  cautionFlags: stringListSchema,
});

export const responseStrategyRecommendationSchema = z.object({
  recommendedAction: recommendedActionSchema,
  draftingStrategy: z.string().trim().min(1),
  guardrails: stringListSchema,
  toneGuidance: stringListSchema,
  escalationNeeded: z.boolean().default(false),
});

const trainingSignalSenderProfileSnapshotSchema = z.object({
  id: senderProfileIdSchema,
  name: z.string().trim().min(1),
  senderType: senderProfileTypeSchema,
  companyName: optionalTextSchema,
  valueProposition: optionalTextSchema,
  toneStyle: optionalTextSchema,
});

const trainingSignalCampaignSnapshotSchema = z.object({
  id: campaignIdSchema,
  name: z.string().trim().min(1),
  status: campaignStatusSchema,
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  offerSummary: optionalTextSchema,
  targetIcp: optionalTextSchema,
  frameworkPreferences: stringListSchema,
  toneStyle: optionalTextSchema,
});

const trainingSignalProspectSnapshotSchema = z.object({
  id: prospectIdSchema,
  companyName: optionalTextSchema,
  companyDomain: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  status: prospectStatusSchema,
});

const trainingSignalResearchSnapshotSchema = z.object({
  snapshotId: uuidSchema,
  sourceUrl: z.string().trim().url(),
  capturedAt: timestampSchema,
  summary: optionalTextSchema,
  valuePropositions: stringListSchema,
  likelyPainPoints: stringListSchema,
  personalizationHooks: stringListSchema,
  confidence: confidenceScoreSchema,
});

export const trainingSignalOutcomeSchema = z.object({
  label: z.enum(["positive", "negative"]),
  sentMessageId: messageIdSchema,
  replyMessageId: messageIdSchema,
  replyAnalysisId: replyAnalysisIdSchema.nullable().optional(),
  replyIntent: replyIntentSchema.nullable().optional(),
  replyClassification: replyAnalysisSchema.shape.classification.nullable().optional(),
  recommendedAction: recommendedActionSchema.nullable().optional(),
  recordedAt: timestampSchema,
});

export const trainingSignalPayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  campaignId: campaignIdSchema.nullable().optional(),
  prospectId: prospectIdSchema.nullable().optional(),
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  artifactType: generatedArtifactTypeSchema,
  artifactId: z.string().trim().min(1),
  actionType: trainingSignalActionTypeSchema,
  provider: optionalTextSchema,
  model: optionalTextSchema,
  promptTemplateId: optionalTextSchema,
  promptVersion: optionalTextSchema,
  beforeText: optionalTextSchema,
  afterText: optionalTextSchema,
  selectedOptionId: optionalTextSchema,
  exportFormat: optionalTextSchema,
  senderProfileSnapshot: trainingSignalSenderProfileSnapshotSchema
    .nullable()
    .optional(),
  campaignSnapshot: trainingSignalCampaignSnapshotSchema.nullable().optional(),
  prospectSnapshot: trainingSignalProspectSnapshotSchema.nullable().optional(),
  researchSnapshot: trainingSignalResearchSnapshotSchema.nullable().optional(),
  outcomeSignal: trainingSignalOutcomeSchema.nullable().optional(),
  metadata: metadataSchema,
});

const datasetExportArtifactTypeValues = [
  "sequence_subject_line_set",
  "sequence_opener_set",
  "sequence_initial_email",
  "sequence_follow_up_step",
  "sequence_subject_line_option",
  "sequence_opener_option",
  "sequence_bundle",
  "draft_reply_option",
  "draft_reply_bundle",
  "reply_analysis",
  "research_snapshot",
] as const;

export const datasetExportArtifactTypeSchema = z.enum(datasetExportArtifactTypeValues);

export const datasetExportSignalModeSchema = z.enum([
  "all",
  "accepted_or_edited",
  "edited_only",
]);

export const datasetProviderReferenceSchema = z.object({
  provider: optionalTextSchema,
  model: optionalTextSchema,
  promptVersion: optionalTextSchema,
  promptTemplateId: optionalTextSchema,
});

export const datasetExportFiltersSchema = z.object({
  workspaceId: workspaceIdSchema,
  dateFrom: timestampSchema.nullable().optional(),
  dateTo: timestampSchema.nullable().optional(),
  artifactTypes: z.array(datasetExportArtifactTypeSchema).default([]),
  signalMode: datasetExportSignalModeSchema.default("all"),
});

export const datasetExportContextSchema = z.object({
  senderProfileSnapshot: trainingSignalPayloadSchema.shape.senderProfileSnapshot,
  campaignSnapshot: trainingSignalPayloadSchema.shape.campaignSnapshot,
  prospectSnapshot: trainingSignalPayloadSchema.shape.prospectSnapshot,
  researchSnapshot: trainingSignalPayloadSchema.shape.researchSnapshot,
});

export const datasetExportTaskTypeSchema = z.enum([
  "research_profile_extraction",
  "sequence_generation",
  "reply_analysis",
  "reply_drafting",
  "artifact_edit",
]);

export const datasetResearchProfileRecordSchema = z.object({
  recordType: z.literal("research_profile"),
  workspaceId: workspaceIdSchema,
  prospectId: prospectIdSchema,
  sourceArtifactType: z.literal("research_snapshot"),
  sourceArtifactId: uuidSchema,
  capturedAt: timestampSchema,
  sourceUrl: z.string().trim().url(),
  provider: datasetProviderReferenceSchema,
  companyProfile: companyProfileSchema,
  quality: researchQualitySchema,
  metadata: metadataSchema,
});

export const datasetSupervisedExampleRecordSchema = z.object({
  recordType: z.literal("supervised_example"),
  workspaceId: workspaceIdSchema,
  occurredAt: timestampSchema,
  taskType: datasetExportTaskTypeSchema,
  sourceArtifactType: datasetExportArtifactTypeSchema,
  sourceArtifactId: z.string().trim().min(1),
  actionType: trainingSignalActionTypeSchema.nullable().optional(),
  provider: datasetProviderReferenceSchema,
  context: datasetExportContextSchema,
  targetText: optionalTextSchema,
  targetStructured: metadataSchema.nullable().optional(),
  metadata: metadataSchema,
});

export const datasetPreferenceExampleRecordSchema = z.object({
  recordType: z.literal("preference_example"),
  workspaceId: workspaceIdSchema,
  occurredAt: timestampSchema,
  sourceArtifactType: datasetExportArtifactTypeSchema,
  sourceArtifactId: z.string().trim().min(1),
  selectedOptionId: z.string().trim().min(1),
  provider: datasetProviderReferenceSchema,
  context: datasetExportContextSchema,
  chosenText: optionalTextSchema,
  metadata: metadataSchema,
});

export const datasetEvaluationCaseRecordSchema = z.object({
  recordType: z.literal("evaluation_case"),
  workspaceId: workspaceIdSchema,
  occurredAt: timestampSchema,
  sourceArtifactType: datasetExportArtifactTypeSchema,
  sourceArtifactId: z.string().trim().min(1),
  taskType: datasetExportTaskTypeSchema,
  provider: datasetProviderReferenceSchema,
  expectedProperties: stringListSchema,
  acceptanceSignals: stringListSchema,
  referenceText: optionalTextSchema,
  referenceStructured: metadataSchema.nullable().optional(),
  metadata: metadataSchema,
});

export const datasetExportBundleSchema = z.object({
  exportedAt: timestampSchema,
  workspaceId: workspaceIdSchema,
  filters: datasetExportFiltersSchema,
  records: z.object({
    researchProfiles: z.array(datasetResearchProfileRecordSchema).default([]),
    supervisedExamples: z.array(datasetSupervisedExampleRecordSchema).default([]),
    preferenceExamples: z.array(datasetPreferenceExampleRecordSchema).default([]),
    evaluationCases: z.array(datasetEvaluationCaseRecordSchema).default([]),
  }),
  counts: z.object({
    researchProfiles: z.number().int().nonnegative(),
    supervisedExamples: z.number().int().nonnegative(),
    preferenceExamples: z.number().int().nonnegative(),
    evaluationCases: z.number().int().nonnegative(),
  }),
  metadata: metadataSchema,
});

const draftReplySlotSchema = z.object({
  slotId: z.string().trim().min(1),
  label: z.string().trim().min(1),
  subject: optionalTextSchema,
  bodyText: z.string().trim().min(1),
  strategyNote: z.string().trim().min(1),
});

export const draftReplyOutputSchema = z.object({
  recommendedAction: recommendedActionSchema,
  draftingStrategy: z.string().trim().min(1),
  confidence: confidenceScoreSchema,
  drafts: z.array(draftReplySlotSchema).min(1).max(5),
  guardrails: stringListSchema,
});

export const subscriptionSchema = z.object({
  id: subscriptionIdSchema,
  workspaceId: workspaceIdSchema,
  provider: subscriptionProviderSchema,
  providerCustomerId: optionalTextSchema,
  providerSubscriptionId: optionalTextSchema,
  planCode: z.enum(["free", "pro", "agency"]),
  status: subscriptionStatusSchema,
  seats: z.number().int().positive(),
  billingEmail: optionalTextSchema,
  currentPeriodStart: timestampSchema.nullable().optional(),
  currentPeriodEnd: timestampSchema.nullable().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  metadata: metadataSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const importedParticipantSchema = z.object({
  email: z.string().trim().email(),
  name: optionalTextSchema,
  role: importedParticipantRoleSchema.default("unknown"),
});

export const inboxSyncStateSchema = z.object({
  status: inboxSyncHealthStatusSchema,
  syncCursor: optionalTextSchema,
  lastSyncedAt: timestampSchema.nullable().optional(),
  lastSuccessAt: timestampSchema.nullable().optional(),
  lastErrorAt: timestampSchema.nullable().optional(),
  lastErrorMessage: optionalTextSchema,
  consecutiveFailures: z.number().int().nonnegative().default(0),
  metadata: metadataSchema,
});

export const inboxAccountSchema = z.object({
  id: inboxAccountIdSchema,
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  provider: inboxProviderSchema,
  emailAddress: z.string().trim().email(),
  displayName: optionalTextSchema,
  providerAccountRef: z.string().trim().min(1),
  status: inboxAccountStatusSchema,
  syncState: inboxSyncStateSchema,
  metadata: metadataSchema,
  lastSyncedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const inboxSyncRunSchema = z.object({
  id: inboxSyncRunIdSchema,
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  provider: inboxProviderSchema,
  status: inboxSyncRunStatusSchema,
  syncMode: inboxSyncModeSchema,
  cursorBefore: optionalTextSchema,
  cursorAfter: optionalTextSchema,
  importedThreadCount: z.number().int().nonnegative(),
  importedMessageCount: z.number().int().nonnegative(),
  startedAt: timestampSchema,
  finishedAt: timestampSchema.nullable().optional(),
  errorSummary: optionalTextSchema,
  metadata: metadataSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const importedThreadRefSchema = z.object({
  id: importedThreadRefIdSchema,
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  prospectId: prospectIdSchema.nullable().optional(),
  conversationThreadId: conversationThreadIdSchema.nullable().optional(),
  provider: inboxProviderSchema,
  providerThreadId: z.string().trim().min(1),
  providerFolder: optionalTextSchema,
  subject: optionalTextSchema,
  participants: z.array(importedParticipantSchema).default([]),
  snippet: optionalTextSchema,
  lastMessageReceivedAt: timestampSchema.nullable().optional(),
  syncState: inboxSyncStateSchema,
  metadata: metadataSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const importedMessageRefSchema = z.object({
  id: importedMessageRefIdSchema,
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  importedThreadRefId: importedThreadRefIdSchema,
  messageId: messageIdSchema.nullable().optional(),
  provider: inboxProviderSchema,
  providerMessageId: z.string().trim().min(1),
  providerThreadId: z.string().trim().min(1),
  direction: messageDirectionSchema,
  providerMessageType: importedProviderMessageTypeSchema,
  messageRole: importedMessageRoleSchema,
  replyToProviderMessageId: optionalTextSchema,
  subject: optionalTextSchema,
  fromAddress: z.string().trim().email().nullable().optional(),
  toAddresses: z.array(z.string().trim().email()).default([]),
  ccAddresses: z.array(z.string().trim().email()).default([]),
  bccAddresses: z.array(z.string().trim().email()).default([]),
  rawBodyText: optionalTextSchema,
  rawBodyHtml: optionalTextSchema,
  normalizedBodyText: optionalTextSchema,
  normalizedBodyHtml: optionalTextSchema,
  syncState: inboxSyncStateSchema,
  metadata: metadataSchema,
  sentAt: timestampSchema.nullable().optional(),
  receivedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const draftInInboxActionRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  conversationThreadId: conversationThreadIdSchema.nullable().optional(),
  draftReplyId: draftReplyIdSchema.nullable().optional(),
  toRecipients: z.array(z.string().trim().email()).min(1),
  ccRecipients: z.array(z.string().trim().email()).default([]),
  bccRecipients: z.array(z.string().trim().email()).default([]),
  subject: z.string().trim().min(1),
  bodyText: z.string().trim().min(1),
  bodyHtml: z.string().trim().min(1).nullable().optional(),
  metadata: metadataSchema,
});

export const draftInInboxActionResultSchema = z.object({
  inboxAccountId: inboxAccountIdSchema,
  provider: inboxProviderSchema,
  providerDraftId: z.string().trim().min(1),
  providerMessageId: z.string().trim().min(1).nullable().optional(),
  providerThreadId: z.string().trim().min(1).nullable().optional(),
  status: z.enum(["created", "updated"]),
  createdAt: timestampSchema,
  metadata: metadataSchema,
});

export const inboxDraftArtifactKindSchema = z.enum([
  "sequence_initial_email",
  "sequence_follow_up_step",
  "draft_reply_option",
]);

export const inboxDraftLinkSchema = z.object({
  artifactId: z.string().trim().min(1),
  artifactKind: inboxDraftArtifactKindSchema,
  inboxAccountId: inboxAccountIdSchema,
  provider: inboxProviderSchema,
  providerDraftId: z.string().trim().min(1),
  providerMessageId: z.string().trim().min(1).nullable().optional(),
  providerThreadId: z.string().trim().min(1).nullable().optional(),
  status: z.enum(["created", "updated", "sent"]),
  createdAt: timestampSchema,
  sentAt: timestampSchema.nullable().optional(),
});

export const sendViaProviderActionRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  conversationThreadId: conversationThreadIdSchema.nullable().optional(),
  messageId: messageIdSchema.nullable().optional(),
  toRecipients: z.array(z.string().trim().email()).min(1),
  ccRecipients: z.array(z.string().trim().email()).default([]),
  bccRecipients: z.array(z.string().trim().email()).default([]),
  subject: z.string().trim().min(1),
  bodyText: z.string().trim().min(1),
  bodyHtml: z.string().trim().min(1).nullable().optional(),
  metadata: metadataSchema,
});

export const sendViaProviderActionResultSchema = z.object({
  inboxAccountId: inboxAccountIdSchema,
  provider: inboxProviderSchema,
  providerMessageId: z.string().trim().min(1),
  providerThreadId: z.string().trim().min(1).nullable().optional(),
  acceptedAt: timestampSchema,
  status: z.enum(["accepted", "queued"]),
  metadata: metadataSchema,
});

export const promptTemplateSchema = z.object({
  id: promptTemplateIdSchema,
  workspaceId: workspaceIdSchema.nullable().optional(),
  name: z.string().min(1),
  templateKind: z.enum([
    "research_snapshot",
    "sequence_generation",
    "reply_analysis",
    "draft_reply",
    "system",
  ]),
  version: z.number().int().positive(),
  status: z.enum(["draft", "active", "retired"]),
  templateBody: z.string().min(1),
  inputSchema: metadataSchema,
  outputSchema: metadataSchema,
  metadata: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createWorkspaceInputSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  ownerUserId: userIdSchema.nullable().optional(),
  status: workspaceStatusSchema.default("active"),
  settings: metadataSchema,
});

export const createWorkspaceRecordInputSchema = createWorkspaceInputSchema.extend({
  id: workspaceIdSchema,
});

export const upsertUserInputSchema = z.object({
  id: userIdSchema,
  email: z.string().trim().email(),
  fullName: optionalTextSchema,
  avatarUrl: optionalUrlSchema,
  authProvider: optionalTextSchema,
  authProviderSubject: optionalTextSchema,
  status: userStatusSchema.default("active"),
});

export const upsertWorkspaceMemberInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema,
  role: workspaceMemberRoleSchema,
  status: workspaceMemberStatusSchema.default("active"),
  invitedByUserId: userIdSchema.nullable().optional(),
  joinedAt: timestampSchema.nullable().optional(),
});

export const updateWorkspaceSettingsInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  settings: metadataSchema,
});

export const updateWorkspaceProfileInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().trim().min(1).max(160),
  profile: workspaceProfileSettingsSchema,
});

export const updateWorkspaceInstitutionalControlsInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  controls: workspaceInstitutionalControlsSchema,
});

export const inviteWorkspaceMemberInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  email: z.string().trim().email(),
  role: workspaceMemberRoleSchema.exclude(["owner"]),
  invitedByUserId: userIdSchema,
});

export const updateWorkspaceMemberRoleInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema,
  role: workspaceMemberRoleSchema.exclude(["owner"]),
  updatedByUserId: userIdSchema,
});

export const removeWorkspaceMemberInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema,
  removedByUserId: userIdSchema,
});

export const createSenderProfileInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().trim().min(1).max(160),
  senderType: senderProfileTypeSchema,
  companyName: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  productDescription: optionalTextSchema,
  targetCustomer: optionalTextSchema,
  valueProposition: optionalTextSchema,
  differentiation: optionalTextSchema,
  proofPoints: stringListSchema,
  goals: stringListSchema,
  tonePreferences: tonePreferencesSchema.default({
    do: [],
    avoid: [],
  }),
  metadata: metadataSchema,
  status: z.enum(["draft", "active", "archived"]).default("active"),
  isDefault: z.boolean().default(false),
  createdByUserId: userIdSchema.nullable().optional(),
});

export const updateSenderProfileInputSchema = z.object({
  senderProfileId: senderProfileIdSchema,
  workspaceId: workspaceIdSchema,
  name: z.string().trim().min(1).max(160),
  senderType: senderProfileTypeSchema,
  companyName: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  productDescription: optionalTextSchema,
  targetCustomer: optionalTextSchema,
  valueProposition: optionalTextSchema,
  differentiation: optionalTextSchema,
  proofPoints: stringListSchema,
  goals: stringListSchema,
  tonePreferences: tonePreferencesSchema.default({
    do: [],
    avoid: [],
  }),
  metadata: metadataSchema,
  status: z.enum(["draft", "active", "archived"]),
  isDefault: z.boolean(),
});

export const createCampaignInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  brandVoiceProfileId: brandVoiceProfileIdSchema.nullable().optional(),
  name: z.string().trim().min(1).max(160),
  description: optionalTextSchema,
  objective: optionalTextSchema,
  offerSummary: optionalTextSchema,
  targetIcp: optionalTextSchema,
  targetPersona: optionalTextSchema,
  targetIndustries: stringListSchema,
  tonePreferences: tonePreferencesSchema.default({
    do: [],
    avoid: [],
  }),
  frameworkPreferences: stringListSchema,
  status: campaignStatusSchema.default("draft"),
  settings: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
});

export const updateCampaignInputSchema = z.object({
  campaignId: campaignIdSchema,
  workspaceId: workspaceIdSchema,
  senderProfileId: senderProfileIdSchema.nullable().optional(),
  brandVoiceProfileId: brandVoiceProfileIdSchema.nullable().optional(),
  name: z.string().trim().min(1).max(160),
  description: optionalTextSchema,
  objective: optionalTextSchema,
  offerSummary: optionalTextSchema,
  targetIcp: optionalTextSchema,
  targetPersona: optionalTextSchema,
  targetIndustries: stringListSchema,
  tonePreferences: tonePreferencesSchema.default({
    do: [],
    avoid: [],
  }),
  frameworkPreferences: stringListSchema,
  status: campaignStatusSchema,
  settings: metadataSchema,
});

export const createProspectInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema.nullable().optional(),
  contactName: optionalTextSchema,
  fullName: optionalTextSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
  email: z.string().email().nullable().optional(),
  title: optionalTextSchema,
  companyName: optionalTextSchema,
  companyDomain: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  linkedinUrl: optionalTextSchema,
  location: optionalTextSchema,
  source: optionalTextSchema,
  status: prospectStatusSchema.default("new"),
  metadata: metadataSchema,
  createdByUserId: userIdSchema.nullable().optional(),
});

export const updateProspectInputSchema = z.object({
  prospectId: prospectIdSchema,
  workspaceId: workspaceIdSchema,
  campaignId: campaignIdSchema.nullable().optional(),
  contactName: optionalTextSchema,
  fullName: optionalTextSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
  email: z.string().email().nullable().optional(),
  title: optionalTextSchema,
  companyName: optionalTextSchema,
  companyDomain: optionalTextSchema,
  companyWebsite: optionalUrlSchema,
  linkedinUrl: optionalTextSchema,
  location: optionalTextSchema,
  source: optionalTextSchema,
  status: prospectStatusSchema,
  metadata: metadataSchema,
});

export const createResearchSnapshotInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  prospectId: prospectIdSchema,
  sourceUrl: z.string().trim().url(),
  sourceType: z.enum(["website", "linkedin", "manual"]).default("website"),
  fetchStatus: z.enum(["captured", "failed", "stale"]).default("captured"),
  snapshotHash: z.string().trim().min(1).nullable().optional(),
  evidence: z.array(evidenceSnippetSchema).default([]),
  structuredData: researchSnapshotStructuredDataSchema,
  rawCapture: metadataSchema,
});

export const createInboxAccountInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  provider: inboxProviderSchema,
  emailAddress: z.string().trim().email(),
  displayName: optionalTextSchema,
  providerAccountRef: z.string().trim().min(1),
  status: inboxAccountStatusSchema.default("active"),
  syncState: inboxSyncStateSchema.default({
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  }),
  metadata: metadataSchema,
  lastSyncedAt: timestampSchema.nullable().optional(),
});

export const updateInboxAccountSyncStateInputSchema = z.object({
  inboxAccountId: inboxAccountIdSchema,
  workspaceId: workspaceIdSchema,
  status: inboxAccountStatusSchema.nullable().optional(),
  syncState: inboxSyncStateSchema,
  lastSyncedAt: timestampSchema.nullable().optional(),
});

export const createInboxSyncRunInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  provider: inboxProviderSchema,
  status: inboxSyncRunStatusSchema.default("running"),
  syncMode: inboxSyncModeSchema.default("incremental"),
  cursorBefore: optionalTextSchema,
  cursorAfter: optionalTextSchema,
  importedThreadCount: z.number().int().nonnegative().default(0),
  importedMessageCount: z.number().int().nonnegative().default(0),
  startedAt: timestampSchema.nullable().optional(),
  finishedAt: timestampSchema.nullable().optional(),
  errorSummary: optionalTextSchema,
  metadata: metadataSchema,
});

export const completeInboxSyncRunInputSchema = z.object({
  inboxSyncRunId: inboxSyncRunIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  status: inboxSyncRunStatusSchema,
  cursorAfter: optionalTextSchema,
  importedThreadCount: z.number().int().nonnegative().default(0),
  importedMessageCount: z.number().int().nonnegative().default(0),
  finishedAt: timestampSchema.nullable().optional(),
  errorSummary: optionalTextSchema,
  metadata: metadataSchema,
});

export const upsertImportedThreadRefInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  prospectId: prospectIdSchema.nullable().optional(),
  conversationThreadId: conversationThreadIdSchema.nullable().optional(),
  provider: inboxProviderSchema,
  providerThreadId: z.string().trim().min(1),
  providerFolder: optionalTextSchema,
  subject: optionalTextSchema,
  participants: z.array(importedParticipantSchema).default([]),
  snippet: optionalTextSchema,
  lastMessageReceivedAt: timestampSchema.nullable().optional(),
  syncState: inboxSyncStateSchema.default({
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  }),
  metadata: metadataSchema,
});

export const upsertImportedMessageRefInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  inboxAccountId: inboxAccountIdSchema,
  importedThreadRefId: importedThreadRefIdSchema,
  messageId: messageIdSchema.nullable().optional(),
  provider: inboxProviderSchema,
  providerMessageId: z.string().trim().min(1),
  providerThreadId: z.string().trim().min(1),
  direction: messageDirectionSchema,
  providerMessageType: importedProviderMessageTypeSchema,
  messageRole: importedMessageRoleSchema.default("unclassified"),
  replyToProviderMessageId: optionalTextSchema,
  subject: optionalTextSchema,
  fromAddress: z.string().trim().email().nullable().optional(),
  toAddresses: z.array(z.string().trim().email()).default([]),
  ccAddresses: z.array(z.string().trim().email()).default([]),
  bccAddresses: z.array(z.string().trim().email()).default([]),
  rawBodyText: optionalTextSchema,
  rawBodyHtml: optionalTextSchema,
  normalizedBodyText: optionalTextSchema,
  normalizedBodyHtml: optionalTextSchema,
  syncState: inboxSyncStateSchema.default({
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  }),
  metadata: metadataSchema,
  sentAt: timestampSchema.nullable().optional(),
  receivedAt: timestampSchema.nullable().optional(),
});

export const usageEventSchema = z.object({
  id: uuidSchema,
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  campaignId: campaignIdSchema.nullable().optional(),
  prospectId: prospectIdSchema.nullable().optional(),
  eventName: z.string().trim().min(1),
  entityType: optionalTextSchema,
  entityId: uuidSchema.nullable().optional(),
  quantity: z.number().int().positive(),
  billable: z.boolean(),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
  costUsd: z.number().nonnegative().nullable().optional(),
  metadata: metadataSchema,
  occurredAt: timestampSchema,
  createdAt: timestampSchema,
});

export const createUsageEventInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  campaignId: campaignIdSchema.nullable().optional(),
  prospectId: prospectIdSchema.nullable().optional(),
  eventName: z.string().trim().min(1),
  entityType: optionalTextSchema,
  entityId: uuidSchema.nullable().optional(),
  quantity: z.number().int().positive().default(1),
  billable: z.boolean().default(false),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
  costUsd: z.number().nonnegative().nullable().optional(),
  metadata: metadataSchema,
});

export const auditEventSchema = z.object({
  id: uuidSchema,
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  actorType: z.enum(["user", "system", "api"]),
  action: z.string().trim().min(1),
  entityType: z.string().trim().min(1),
  entityId: uuidSchema.nullable().optional(),
  requestId: optionalTextSchema,
  changes: metadataSchema,
  metadata: metadataSchema,
  createdAt: timestampSchema,
});

export const upsertSubscriptionInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  provider: subscriptionProviderSchema.default("stripe"),
  providerCustomerId: optionalTextSchema,
  providerSubscriptionId: optionalTextSchema,
  planCode: z.enum(["free", "pro", "agency"]),
  status: subscriptionStatusSchema,
  seats: z.number().int().positive().default(1),
  billingEmail: optionalTextSchema,
  currentPeriodStart: timestampSchema.nullable().optional(),
  currentPeriodEnd: timestampSchema.nullable().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  metadata: metadataSchema,
});

export const createAuditEventInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: userIdSchema.nullable().optional(),
  actorType: z.enum(["user", "system", "api"]).default("system"),
  action: z.string().trim().min(1),
  entityType: z.string().trim().min(1),
  entityId: uuidSchema.nullable().optional(),
  requestId: optionalTextSchema,
  changes: metadataSchema,
  metadata: metadataSchema,
});

export const submitFeedbackInputSchema = z.object({
  workspaceId: workspaceIdSchema,
  pagePath: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .refine((value) => value.startsWith("/"), {
      message: "Page path must start with '/'.",
    }),
  category: feedbackCategorySchema,
  message: z.string().trim().min(10).max(1200),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type AiOperationMetadata = z.infer<typeof aiOperationMetadataSchema>;
export type GenerationPerformanceHintConfidence = z.infer<
  typeof generationPerformanceHintConfidenceSchema
>;
export type GenerationPerformancePatternKey = z.infer<
  typeof generationPerformancePatternKeySchema
>;
export type GenerationPerformancePattern = z.infer<
  typeof generationPerformancePatternSchema
>;
export type GenerationPerformanceHints = z.infer<
  typeof generationPerformanceHintsSchema
>;
export type User = z.infer<typeof userSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceProfileSettings = z.infer<
  typeof workspaceProfileSettingsSchema
>;
export type WorkspaceDataRetentionPreference = z.infer<
  typeof workspaceDataRetentionPreferenceSchema
>;
export type WorkspaceInstitutionalControls = z.infer<
  typeof workspaceInstitutionalControlsSchema
>;
export type WorkspaceDeletionRequest = z.infer<
  typeof workspaceDeletionRequestSchema
>;
export type WorkspaceDataHandlingState = z.infer<
  typeof workspaceDataHandlingStateSchema
>;
export type WorkspaceOnboardingState = z.infer<
  typeof workspaceOnboardingStateSchema
>;
export type OnboardingStepId = z.infer<typeof onboardingStepIdSchema>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type SenderProfile = z.infer<typeof senderProfileSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignPerformanceSnapshot = z.infer<typeof campaignPerformanceSnapshotSchema>;
export type PerformanceSummaryScope = z.infer<typeof performanceSummaryScopeSchema>;
export type ShareablePerformanceSummary = z.infer<typeof shareablePerformanceSummarySchema>;
export type Prospect = z.infer<typeof prospectSchema>;
export type ResearchSnapshot = z.infer<typeof researchSnapshotSchema>;
export type Sequence = z.infer<typeof sequenceSchema>;
export type ConversationThread = z.infer<typeof conversationThreadSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageSource = z.infer<typeof messageSourceSchema>;
export type ReplyAnalysis = z.infer<typeof replyAnalysisSchema>;
export type DraftReply = z.infer<typeof draftReplySchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type InboxAccount = z.infer<typeof inboxAccountSchema>;
export type InboxSyncRun = z.infer<typeof inboxSyncRunSchema>;
export type ImportedThreadRef = z.infer<typeof importedThreadRefSchema>;
export type ImportedMessageRef = z.infer<typeof importedMessageRefSchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type ConfidenceScore = z.infer<typeof confidenceScoreSchema>;
export type EvidenceSnippet = z.infer<typeof evidenceSnippetSchema>;
export type EvidenceFlag = z.infer<typeof evidenceFlagSchema>;
export type ReplyAnalysisInput = z.infer<typeof replyAnalysisInputSchema>;
export type ReplyClassificationOutput = z.infer<
  typeof replyClassificationOutputSchema
>;
export type ResponseStrategyRecommendation = z.infer<
  typeof responseStrategyRecommendationSchema
>;
export type DraftReplyOutput = z.infer<typeof draftReplyOutputSchema>;
export type SequenceQualityReport = z.infer<typeof sequenceQualityReportSchema>;
export type DraftReplyQualityReport = z.infer<typeof draftReplyQualityReportSchema>;
export type ArtifactEditRecord = z.infer<typeof artifactEditRecordSchema>;
export type TrainingSignalActionType = z.infer<
  typeof trainingSignalActionTypeSchema
>;
export type ProductAnalyticsEvent = z.infer<typeof productAnalyticsEventSchema>;
export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;
export type GeneratedArtifactType = z.infer<typeof generatedArtifactTypeSchema>;
export type TrainingSignalOutcome = z.infer<typeof trainingSignalOutcomeSchema>;
export type TrainingSignalPayload = z.infer<typeof trainingSignalPayloadSchema>;
export type DatasetExportArtifactType = z.infer<
  typeof datasetExportArtifactTypeSchema
>;
export type DatasetExportSignalMode = z.infer<
  typeof datasetExportSignalModeSchema
>;
export type DatasetProviderReference = z.infer<
  typeof datasetProviderReferenceSchema
>;
export type DatasetExportFilters = z.infer<typeof datasetExportFiltersSchema>;
export type DatasetExportContext = z.infer<typeof datasetExportContextSchema>;
export type DatasetExportTaskType = z.infer<typeof datasetExportTaskTypeSchema>;
export type DatasetResearchProfileRecord = z.infer<
  typeof datasetResearchProfileRecordSchema
>;
export type DatasetSupervisedExampleRecord = z.infer<
  typeof datasetSupervisedExampleRecordSchema
>;
export type DatasetPreferenceExampleRecord = z.infer<
  typeof datasetPreferenceExampleRecordSchema
>;
export type DatasetEvaluationCaseRecord = z.infer<
  typeof datasetEvaluationCaseRecordSchema
>;
export type DatasetExportBundle = z.infer<typeof datasetExportBundleSchema>;
export type AsyncOperationKind = z.infer<typeof asyncOperationKindSchema>;
export type AsyncOperationRunStatus = z.infer<typeof asyncOperationRunStatusSchema>;
export type AsyncOperationRunState = z.infer<typeof asyncOperationRunStateSchema>;
export type ProspectAsyncOperations = z.infer<typeof prospectAsyncOperationsSchema>;
export type UsageEvent = z.infer<typeof usageEventSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
export type CreateWorkspaceRecordInput = z.infer<
  typeof createWorkspaceRecordInputSchema
>;
export type UpsertUserInput = z.infer<typeof upsertUserInputSchema>;
export type UpsertWorkspaceMemberInput = z.infer<
  typeof upsertWorkspaceMemberInputSchema
>;
export type UpdateWorkspaceSettingsInput = z.infer<
  typeof updateWorkspaceSettingsInputSchema
>;
export type UpdateWorkspaceProfileInput = z.infer<
  typeof updateWorkspaceProfileInputSchema
>;
export type UpdateWorkspaceInstitutionalControlsInput = z.infer<
  typeof updateWorkspaceInstitutionalControlsInputSchema
>;
export type InviteWorkspaceMemberInput = z.infer<
  typeof inviteWorkspaceMemberInputSchema
>;
export type UpdateWorkspaceMemberRoleInput = z.infer<
  typeof updateWorkspaceMemberRoleInputSchema
>;
export type RemoveWorkspaceMemberInput = z.infer<
  typeof removeWorkspaceMemberInputSchema
>;
export type CreateSenderProfileInput = z.infer<
  typeof createSenderProfileInputSchema
>;
export type UpdateSenderProfileInput = z.infer<
  typeof updateSenderProfileInputSchema
>;
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;
export type CreateProspectInput = z.infer<typeof createProspectInputSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectInputSchema>;
export type CreateResearchSnapshotInput = z.infer<
  typeof createResearchSnapshotInputSchema
>;
export type CreateInboxAccountInput = z.infer<
  typeof createInboxAccountInputSchema
>;
export type UpdateInboxAccountSyncStateInput = z.infer<
  typeof updateInboxAccountSyncStateInputSchema
>;
export type CreateInboxSyncRunInput = z.infer<
  typeof createInboxSyncRunInputSchema
>;
export type CompleteInboxSyncRunInput = z.infer<
  typeof completeInboxSyncRunInputSchema
>;
export type UpsertImportedThreadRefInput = z.infer<
  typeof upsertImportedThreadRefInputSchema
>;
export type UpsertImportedMessageRefInput = z.infer<
  typeof upsertImportedMessageRefInputSchema
>;
export type CreateUsageEventInput = z.infer<typeof createUsageEventInputSchema>;
export type UpsertSubscriptionInput = z.infer<typeof upsertSubscriptionInputSchema>;
export type CreateAuditEventInput = z.infer<typeof createAuditEventInputSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackInputSchema>;
export type DraftInInboxActionRequest = z.infer<
  typeof draftInInboxActionRequestSchema
>;
export type DraftInInboxActionResult = z.infer<
  typeof draftInInboxActionResultSchema
>;
export type InboxDraftArtifactKind = z.infer<
  typeof inboxDraftArtifactKindSchema
>;
export type InboxDraftLink = z.infer<typeof inboxDraftLinkSchema>;
export type SendViaProviderActionRequest = z.infer<
  typeof sendViaProviderActionRequestSchema
>;
export type SendViaProviderActionResult = z.infer<
  typeof sendViaProviderActionResultSchema
>;







