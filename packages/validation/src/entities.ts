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

export const workspaceStatusSchema = z.enum(["active", "suspended", "archived"]);
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

export type Workspace = z.infer<typeof workspaceSchema>;
export type SenderProfile = z.infer<typeof senderProfileSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type Prospect = z.infer<typeof prospectSchema>;
export type ResearchSnapshot = z.infer<typeof researchSnapshotSchema>;
export type Sequence = z.infer<typeof sequenceSchema>;
export type ConversationThread = z.infer<typeof conversationThreadSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageSource = z.infer<typeof messageSourceSchema>;
export type ReplyAnalysis = z.infer<typeof replyAnalysisSchema>;
export type DraftReply = z.infer<typeof draftReplySchema>;
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
export type UsageEvent = z.infer<typeof usageEventSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
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
export type CreateUsageEventInput = z.infer<typeof createUsageEventInputSchema>;
export type CreateAuditEventInput = z.infer<typeof createAuditEventInputSchema>;

