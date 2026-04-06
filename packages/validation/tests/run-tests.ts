import assert from "node:assert/strict";

import {
  aiOperationMetadataSchema,
  companyProfileSchema,
  createWorkspaceRecordInputSchema,
  createResearchSnapshotInputSchema,
  createInboxAccountInputSchema,
  createInboxSyncRunInputSchema,
  campaignPerformanceSnapshotSchema,
  createCampaignInputSchema,
  createProspectInputSchema,
  createSenderProfileInputSchema,
  createWorkspaceInputSchema,
  draftInInboxActionRequestSchema,
  datasetEvaluationCaseRecordSchema,
  datasetExportBundleSchema,
  datasetExportFiltersSchema,
  datasetPreferenceExampleRecordSchema,
  datasetResearchProfileRecordSchema,
  datasetSupervisedExampleRecordSchema,
  draftReplyOutputSchema,
  generationPerformanceHintsSchema,
  feedbackCategorySchema,
  importedMessageRefSchema,
  importedThreadRefSchema,
  inboxAccountSchema,
  inboxDraftLinkSchema,
  inboxProviderSchema,
  inboxSyncRunSchema,
  onboardingStatusSchema,
  onboardingStepIdSchema,
  prospectStatusSchema,
  productAnalyticsEventSchema,
  recommendedActionSchema,
  replyAnalysisInputSchema,
  replyClassificationOutputSchema,
  replyIntentSchema,
  senderProfileTypeSchema,
  submitFeedbackInputSchema,
  trainingSignalActionTypeSchema,
  trainingSignalOutcomeSchema,
  trainingSignalPayloadSchema,
  upsertImportedMessageRefInputSchema,
  upsertImportedThreadRefInputSchema,
  updateWorkspaceInstitutionalControlsInputSchema,
  updateWorkspaceSettingsInputSchema,
  updateCampaignInputSchema,
  updateInboxAccountSyncStateInputSchema,
  updateProspectInputSchema,
  updateSenderProfileInputSchema,
  workspaceDataRetentionPreferenceSchema,
  workspaceInstitutionalControlsSchema,
  workspaceDataHandlingStateSchema,
  workspaceOnboardingStateSchema,
  sendViaProviderActionRequestSchema,
} from "../dist/index.js";

const createResult = createSenderProfileInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  name: "Founder Profile",
  senderType: "saas_founder",
  companyName: "Acme",
  productDescription: "Workflow software",
  targetCustomer: "B2B revenue teams",
  valueProposition: "Reduce manual outbound busywork.",
  differentiation: "Built for lean go-to-market teams.",
  proofPoints: ["Trusted by 30 outbound teams"],
  goals: ["Book qualified meetings"],
  tonePreferences: {
    style: "Direct but credible",
    do: ["Lead with clarity"],
    avoid: ["Do not overpromise"],
  },
  metadata: {},
});

assert.equal(createResult.senderType, "saas_founder");
assert.equal(createResult.tonePreferences.do[0], "Lead with clarity");
assert.equal(senderProfileTypeSchema.parse("basic"), "basic");

const workspaceCreateResult = createWorkspaceInputSchema.parse({
  slug: "acme-labs",
  name: "Acme Labs",
  settings: {},
});

assert.equal(workspaceCreateResult.slug, "acme-labs");

const workspaceRecordCreateResult = createWorkspaceRecordInputSchema.parse({
  id: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  slug: "acme-labs",
  name: "Acme Labs",
  settings: {},
});

assert.equal(workspaceRecordCreateResult.id, "5f07db2d-8abd-49db-a5ca-a877ef2fe53c");

const aiOperationMetadataResult = aiOperationMetadataSchema.parse({
  provider: "openai",
  model: "gpt-4.1-mini",
  promptVersion: "sequence.v1",
  latencyMs: 410,
  inputTokens: 1200,
  outputTokens: 340,
  totalTokens: 1540,
  costUsd: null,
  generatedAt: "2026-04-05T12:00:00.000Z",
});

assert.equal(aiOperationMetadataResult.latencyMs, 410);

const onboardingStateResult = workspaceOnboardingStateSchema.parse({
  status: "in_progress",
  workspaceConfirmedAt: "2026-04-02T10:00:00.000Z",
  selectedUserType: "agency",
  updatedAt: "2026-04-02T10:05:00.000Z",
});

assert.equal(onboardingStateResult.selectedUserType, "agency");
assert.equal(onboardingStatusSchema.parse("completed"), "completed");
assert.equal(onboardingStepIdSchema.parse("prospect"), "prospect");

const workspaceSettingsUpdateResult = updateWorkspaceSettingsInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  settings: {
    onboarding: onboardingStateResult,
  },
});

assert.equal(
  typeof workspaceSettingsUpdateResult.settings.onboarding,
  "object",
);

assert.throws(
  () =>
    createSenderProfileInputSchema.parse({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      name: "",
      senderType: "basic",
      proofPoints: [],
      goals: [],
      tonePreferences: {
        do: [],
        avoid: [],
      },
      metadata: {},
    }),
  /String must contain at least 1 character/,
);

const updateResult = updateSenderProfileInputSchema.parse({
  senderProfileId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  name: "Agency Profile",
  senderType: "agency",
  proofPoints: ["Managed 1M+ sends"],
  goals: ["Improve reply quality"],
  tonePreferences: {
    do: ["Stay crisp"],
    avoid: ["Avoid vague claims"],
  },
  metadata: {},
  status: "active",
  isDefault: true,
});

assert.equal(updateResult.isDefault, true);
assert.equal(updateResult.tonePreferences.avoid[0], "Avoid vague claims");

const campaignCreateResult = createCampaignInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  senderProfileId: null,
  name: "Founder outbound sprint",
  offerSummary: "Warm outbound support for founder-led sales",
  targetIcp: "Early-stage SaaS teams",
  targetIndustries: ["SaaS", "AI tooling"],
  tonePreferences: {
    style: "Consultative",
    do: ["Use clear specifics"],
    avoid: ["Avoid inflated claims"],
  },
  frameworkPreferences: ["Problem -> proof -> CTA"],
  settings: {},
});

assert.equal(campaignCreateResult.targetIndustries[1], "AI tooling");

const campaignUpdateResult = updateCampaignInputSchema.parse({
  campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  name: "Agency outbound sprint",
  offerSummary: "Managed outbound execution",
  targetIcp: "B2B services teams",
  targetIndustries: ["Services"],
  tonePreferences: {
    do: ["Be concise"],
    avoid: ["Avoid filler"],
  },
  frameworkPreferences: ["Personalization -> proof -> CTA"],
  status: "active",
  settings: {},
});

assert.equal(campaignUpdateResult.status, "active");

const campaignPerformanceSnapshotResult = campaignPerformanceSnapshotSchema.parse({
  outboundMessages: 12,
  replies: 4,
  positiveReplies: 2,
  replyRate: 4 / 12,
  positiveReplyRate: 2 / 12,
  positiveReplyIntents: ["interested", "needs_more_info"],
  calculatedAt: "2026-04-06T10:00:00.000Z",
  version: 1,
});

assert.equal(campaignPerformanceSnapshotResult.positiveReplies, 2);

const prospectCreateResult = createProspectInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  companyName: "Acme",
  companyWebsite: "https://acme.com",
  contactName: "Jamie Stone",
  email: "jamie@acme.com",
  status: "new",
  metadata: {},
});

assert.equal(prospectCreateResult.contactName, "Jamie Stone");
assert.equal(prospectStatusSchema.parse("contacted"), "contacted");

const prospectUpdateResult = updateProspectInputSchema.parse({
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  companyName: "Acme",
  companyWebsite: "https://acme.com",
  contactName: "Jamie Stone",
  email: "jamie@acme.com",
  status: "contacted",
  metadata: {},
});

assert.equal(prospectUpdateResult.status, "contacted");

const companyProfileResult = companyProfileSchema.parse({
  domain: "acme.com",
  websiteUrl: "https://acme.com",
  companyName: "Acme",
  summary: "Acme helps lean SaaS teams run higher quality outbound.",
  targetCustomers: ["Lean SaaS teams"],
  industries: ["SaaS"],
  valuePropositions: ["Higher quality outbound with structured evidence"],
  proofPoints: ["Trusted by 30 growth teams"],
  differentiators: ["Evidence attached to every personalization claim"],
  callsToAction: ["Book a demo"],
  sourceEvidence: [
    {
      snippet: "Trusted by 30 growth teams.",
      sourceUrl: "https://acme.com",
      confidence: {
        score: 0.82,
        label: "high",
        reasons: ["Captured directly from the website."],
      },
      supports: ["proof_points"],
    },
  ],
  confidence: {
    score: 0.78,
    label: "medium",
    reasons: ["Structured from public website content."],
  },
  flags: [],
  metadata: {},
});

assert.equal(companyProfileResult.sourceEvidence[0]?.supports[0], "proof_points");

const researchSnapshotResult = createResearchSnapshotInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  sourceUrl: "https://acme.com",
  evidence: companyProfileResult.sourceEvidence,
  structuredData: {
    companyProfile: companyProfileResult,
    quality: {
      overall: {
        score: 0.72,
        label: "medium",
        reasons: ["Website copy was moderately informative."],
      },
      dimensions: [],
      flags: [],
    },
    trainingRecord: {},
  },
  rawCapture: {
    fetchedAt: "2026-03-27T10:00:00.000Z",
  },
});

assert.equal(researchSnapshotResult.fetchStatus, "captured");
assert.equal(inboxProviderSchema.parse("microsoft365"), "microsoft365");

const inboxAccountResult = createInboxAccountInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  userId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  provider: "gmail",
  emailAddress: "alex@acme.com",
  displayName: "Alex Morgan",
  providerAccountRef: "gmail-account-123",
  metadata: {},
});

assert.equal(inboxAccountResult.provider, "gmail");

const inboxAccountRecord = inboxAccountSchema.parse({
  id: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  userId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  provider: "gmail",
  emailAddress: "alex@acme.com",
  displayName: "Alex Morgan",
  providerAccountRef: "gmail-account-123",
  status: "active",
  syncState: {
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  },
  metadata: {},
  lastSyncedAt: "2026-04-04T10:00:00.000Z",
  createdAt: "2026-04-04T09:00:00.000Z",
  updatedAt: "2026-04-04T10:00:00.000Z",
});

assert.equal(inboxAccountRecord.emailAddress, "alex@acme.com");

const inboxSyncRunResult = createInboxSyncRunInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  provider: "gmail",
  metadata: {},
});

assert.equal(inboxSyncRunResult.status, "running");

const inboxSyncRunRecord = inboxSyncRunSchema.parse({
  id: "745dd8c2-eef2-4982-a53d-46d4f243a76a",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  provider: "gmail",
  status: "completed",
  syncMode: "incremental",
  cursorBefore: "cursor-0",
  cursorAfter: "cursor-1",
  importedThreadCount: 1,
  importedMessageCount: 2,
  startedAt: "2026-04-04T10:00:00.000Z",
  finishedAt: "2026-04-04T10:01:00.000Z",
  errorSummary: null,
  metadata: {},
  createdAt: "2026-04-04T10:00:00.000Z",
  updatedAt: "2026-04-04T10:01:00.000Z",
});

assert.equal(inboxSyncRunRecord.importedMessageCount, 2);

const importedThreadRefResult = upsertImportedThreadRefInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  conversationThreadId: "ba7a8384-f5f5-4c87-96cd-e2b36045dad0",
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  provider: "gmail",
  providerThreadId: "thread-123",
  participants: [
    {
      email: "jamie@acme.com",
      role: "from",
    },
  ],
  syncState: {
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  },
  metadata: {},
});

assert.equal(importedThreadRefResult.providerThreadId, "thread-123");

const importedThreadRefRecord = importedThreadRefSchema.parse({
  id: "af7c0cea-ef32-4c84-b97d-d24f327a0912",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  conversationThreadId: "ba7a8384-f5f5-4c87-96cd-e2b36045dad0",
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  provider: "gmail",
  providerThreadId: "thread-123",
  providerFolder: "INBOX",
  subject: "Re: outbound",
  participants: [
    {
      email: "jamie@acme.com",
      role: "from",
    },
  ],
  snippet: "Can you send more information?",
  lastMessageReceivedAt: "2026-04-04T10:02:00.000Z",
  syncState: {
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  },
  metadata: {},
  createdAt: "2026-04-04T10:02:00.000Z",
  updatedAt: "2026-04-04T10:02:00.000Z",
});

assert.equal(importedThreadRefRecord.participants[0]?.email, "jamie@acme.com");

const importedMessageRefResult = upsertImportedMessageRefInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  importedThreadRefId: "af7c0cea-ef32-4c84-b97d-d24f327a0912",
  messageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
  provider: "gmail",
  providerMessageId: "message-123",
  providerThreadId: "thread-123",
  direction: "inbound",
  providerMessageType: "inbound",
  toAddresses: ["alex@acme.com"],
  ccAddresses: [],
  bccAddresses: [],
  rawBodyText: "Can you send more information?\n\nOn Mon, Alex wrote:",
  rawBodyHtml: "<p>Can you send more information?</p>",
  normalizedBodyText: "Can you send more information?",
  normalizedBodyHtml: "<p>Can you send more information?</p>",
  syncState: {
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  },
  metadata: {},
});

assert.equal(importedMessageRefResult.direction, "inbound");

const importedMessageRefRecord = importedMessageRefSchema.parse({
  id: "727fd676-bcbd-49f0-af73-71f4c6014e16",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  importedThreadRefId: "af7c0cea-ef32-4c84-b97d-d24f327a0912",
  messageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
  provider: "gmail",
  providerMessageId: "message-123",
  providerThreadId: "thread-123",
  direction: "inbound",
  providerMessageType: "inbound",
  messageRole: "reply",
  replyToProviderMessageId: "<thread-ref@example.com>",
  subject: "Re: outbound",
  fromAddress: "jamie@acme.com",
  toAddresses: ["alex@acme.com"],
  ccAddresses: [],
  bccAddresses: [],
  rawBodyText: "Can you send more information?\n\nOn Mon, Alex wrote:",
  rawBodyHtml: "<p>Can you send more information?</p>",
  normalizedBodyText: "Can you send more information?",
  normalizedBodyHtml: "<p>Can you send more information?</p>",
  syncState: {
    status: "healthy",
    consecutiveFailures: 0,
    metadata: {},
  },
  metadata: {},
  receivedAt: "2026-04-04T10:02:00.000Z",
  sentAt: null,
  createdAt: "2026-04-04T10:02:00.000Z",
  updatedAt: "2026-04-04T10:02:00.000Z",
});

assert.equal(importedMessageRefRecord.fromAddress, "jamie@acme.com");

const inboxSyncStateUpdate = updateInboxAccountSyncStateInputSchema.parse({
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  syncState: {
    status: "warning",
    consecutiveFailures: 1,
    metadata: {},
  },
});

assert.equal(inboxSyncStateUpdate.syncState.status, "warning");

const draftInInboxAction = draftInInboxActionRequestSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  conversationThreadId: "ba7a8384-f5f5-4c87-96cd-e2b36045dad0",
  draftReplyId: "11301dc9-b55e-45f6-adb8-7a4f96866f90",
  toRecipients: ["jamie@acme.com"],
  subject: "More context",
  bodyText: "Happy to share a short summary.",
  metadata: {},
});

assert.equal(draftInInboxAction.subject, "More context");

const inboxDraftLinkResult = inboxDraftLinkSchema.parse({
  artifactId: "sequence-1:initial_email",
  artifactKind: "sequence_initial_email",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  provider: "gmail",
  providerDraftId: "draft_123",
  providerMessageId: "message_123",
  providerThreadId: "thread_123",
  status: "sent",
  createdAt: "2026-04-04T10:00:00.000Z",
  sentAt: "2026-04-04T10:05:00.000Z",
});

assert.equal(inboxDraftLinkResult.status, "sent");
assert.equal(inboxDraftLinkResult.sentAt?.toISOString(), "2026-04-04T10:05:00.000Z");

const sendViaProviderAction = sendViaProviderActionRequestSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  messageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
  toRecipients: ["jamie@acme.com"],
  subject: "More context",
  bodyText: "Happy to share a short summary.",
  metadata: {},
});

assert.equal(sendViaProviderAction.toRecipients.length, 1);

const replyAnalysisInputResult = replyAnalysisInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  threadId: "ba7a8384-f5f5-4c87-96cd-e2b36045dad0",
  latestInboundMessage: {
    messageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
    subject: "Re: outbound",
    bodyText: "Can you send more information? Timing is difficult this month.",
  },
  threadMessages: [
    {
      direction: "outbound",
      subject: "Outbound",
      bodyText: "Open to a quick conversation?",
    },
    {
      direction: "inbound",
      subject: "Re: outbound",
      bodyText: "Can you send more information? Timing is difficult this month.",
    },
  ],
  campaignSummary: "Founder-led outbound support",
});

assert.equal(replyAnalysisInputResult.threadMessages.length, 2);
assert.equal(replyIntentSchema.parse("hard_no"), "hard_no");
assert.equal(recommendedActionSchema.parse("stop_outreach"), "stop_outreach");

const replyClassificationResult = replyClassificationOutputSchema.parse({
  intent: "objection_timing",
  objectionType: "timing",
  classification: "needs_more_info",
  confidence: {
    score: 0.7,
    label: "medium",
    reasons: ["Timing and information request were both explicit."],
  },
  recommendedAction: "send_more_info",
  rationale: "The prospect raised timing friction but did not close the door.",
  keySignals: ["timing is difficult", "send more information"],
  cautionFlags: ["avoid pressure"],
});

assert.equal(replyClassificationResult.objectionType, "timing");

const draftReplyOutputResult = draftReplyOutputSchema.parse({
  recommendedAction: "send_more_info",
  draftingStrategy: "Acknowledge timing and share concise context.",
  confidence: {
    score: 0.64,
    label: "medium",
    reasons: ["The ask for more information is explicit."],
  },
  drafts: [
    {
      slotId: "option-1",
      label: "Concise info",
      subject: "More context",
      bodyText: "Happy to send a short summary you can review when timing improves.",
      strategyNote: "Keeps the pressure low.",
    },
  ],
  guardrails: ["Do not overstate outcomes"],
});

assert.equal(draftReplyOutputResult.drafts[0]?.slotId, "option-1");

const trainingSignalResult = trainingSignalPayloadSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  artifactType: "draft_reply_option",
  artifactId: "option-1",
  actionType: "edited",
  provider: "openai",
  model: "gpt-4.1-mini",
  promptVersion: "reply.v1",
  beforeText: "Original draft",
  afterText: "Edited draft",
  senderProfileSnapshot: {
    id: "54ad043c-9435-4388-92b9-9e0becbeff74",
    name: "Founder Profile",
    senderType: "saas_founder",
    companyName: "Acme",
    valueProposition: "Reduce manual outbound work",
    toneStyle: "Direct but grounded",
  },
  campaignSnapshot: {
    id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
    name: "Founder outbound sprint",
    status: "active",
    senderProfileId: "54ad043c-9435-4388-92b9-9e0becbeff74",
    offerSummary: "Founder-led outbound support",
    targetIcp: "Early-stage SaaS teams",
    frameworkPreferences: ["Problem -> proof -> CTA"],
    toneStyle: "Consultative",
  },
  prospectSnapshot: {
    id: "54ad043c-9435-4388-92b9-9e0becbeff74",
    companyName: "Acme",
    companyDomain: "acme.com",
    companyWebsite: "https://acme.com",
    status: "replied",
  },
  researchSnapshot: {
    snapshotId: "3b460327-7bd9-43bf-902f-36e34a82bb75",
    sourceUrl: "https://acme.com",
    capturedAt: "2026-03-28T10:00:00.000Z",
    summary: "Acme helps lean SaaS teams run better outbound.",
    valuePropositions: ["Higher quality outbound"],
    likelyPainPoints: ["Low reply quality"],
    personalizationHooks: ["Messaging quality positioning"],
    confidence: {
      score: 0.76,
      label: "medium",
      reasons: ["Structured from public website content."],
    },
  },
  outcomeSignal: {
    label: "positive",
    sentMessageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
    replyMessageId: "bb532df5-fc7d-4e25-bb23-ee2476a57349",
    replyAnalysisId: "cc532df5-fc7d-4e25-bb23-ee2476a57349",
    replyIntent: "needs_more_info",
    replyClassification: "neutral",
    recommendedAction: "send_more_info",
    recordedAt: "2026-04-05T12:00:00.000Z",
  },
  metadata: {
    targetSlotId: "option-1",
  },
});

assert.equal(trainingSignalResult.actionType, "edited");
assert.equal(trainingSignalResult.outcomeSignal?.label, "positive");
const outcomeSignalResult = trainingSignalOutcomeSchema.parse({
  label: "negative",
  sentMessageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
  replyMessageId: "bb532df5-fc7d-4e25-bb23-ee2476a57349",
  replyAnalysisId: "cc532df5-fc7d-4e25-bb23-ee2476a57349",
  replyIntent: "hard_no",
  replyClassification: "unsubscribe",
  recommendedAction: "stop_outreach",
  recordedAt: "2026-04-05T12:30:00.000Z",
});

assert.equal(outcomeSignalResult.label, "negative");

const datasetFiltersResult = datasetExportFiltersSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  artifactTypes: ["research_snapshot", "draft_reply_option"],
  signalMode: "accepted_or_edited",
});

assert.equal(datasetFiltersResult.signalMode, "accepted_or_edited");

const datasetResearchRecordResult = datasetResearchProfileRecordSchema.parse({
  recordType: "research_profile",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  sourceArtifactType: "research_snapshot",
  sourceArtifactId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  capturedAt: "2026-04-05T12:00:00.000Z",
  sourceUrl: "https://acme.com",
  provider: {
    provider: "openai",
    model: "gpt-4.1-mini",
    promptVersion: "research.v1",
    promptTemplateId: null,
  },
  companyProfile: companyProfileResult,
  quality: {
    overall: {
      score: 0.72,
      label: "medium",
      reasons: ["Website copy was moderately informative."],
    },
    dimensions: [],
    flags: [],
  },
  metadata: {},
});

assert.equal(datasetResearchRecordResult.recordType, "research_profile");

const datasetSupervisedRecordResult = datasetSupervisedExampleRecordSchema.parse({
  recordType: "supervised_example",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  occurredAt: "2026-04-05T12:00:00.000Z",
  taskType: "reply_drafting",
  sourceArtifactType: "draft_reply_option",
  sourceArtifactId: "option-1",
  actionType: "edited",
  provider: {
    provider: "openai",
    model: "gpt-4.1-mini",
    promptVersion: "reply.v1",
    promptTemplateId: null,
  },
  context: {
    senderProfileSnapshot: trainingSignalResult.senderProfileSnapshot,
    campaignSnapshot: trainingSignalResult.campaignSnapshot,
    prospectSnapshot: trainingSignalResult.prospectSnapshot,
    researchSnapshot: trainingSignalResult.researchSnapshot,
  },
  targetText: "Edited draft",
  targetStructured: null,
  metadata: {},
});

assert.equal(datasetSupervisedRecordResult.taskType, "reply_drafting");

const datasetPreferenceRecordResult = datasetPreferenceExampleRecordSchema.parse({
  recordType: "preference_example",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  occurredAt: "2026-04-05T12:00:00.000Z",
  sourceArtifactType: "sequence_subject_line_option",
  sourceArtifactId: "sequence-1:subject-line-option:1",
  selectedOptionId: "sequence-1:subject-line-option:1",
  provider: {
    provider: "openai",
    model: "gpt-4.1-mini",
    promptVersion: "sequence.v1",
    promptTemplateId: null,
  },
  context: {
    senderProfileSnapshot: trainingSignalResult.senderProfileSnapshot,
    campaignSnapshot: trainingSignalResult.campaignSnapshot,
    prospectSnapshot: trainingSignalResult.prospectSnapshot,
    researchSnapshot: trainingSignalResult.researchSnapshot,
  },
  chosenText: "Short, grounded subject",
  metadata: {},
});

assert.equal(datasetPreferenceRecordResult.recordType, "preference_example");

const datasetEvaluationRecordResult = datasetEvaluationCaseRecordSchema.parse({
  recordType: "evaluation_case",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  occurredAt: "2026-04-05T12:00:00.000Z",
  sourceArtifactType: "reply_analysis",
  sourceArtifactId: "reply-analysis-1",
  taskType: "reply_analysis",
  provider: {
    provider: "openai",
    model: "gpt-4.1-mini",
    promptVersion: "reply.v1",
    promptTemplateId: null,
  },
  expectedProperties: ["intent_present", "recommended_action_present"],
  acceptanceSignals: ["edited"],
  referenceText: null,
  referenceStructured: {
    intent: "needs_more_info",
  },
  metadata: {},
});

assert.equal(datasetEvaluationRecordResult.sourceArtifactType, "reply_analysis");

const datasetExportBundleResult = datasetExportBundleSchema.parse({
  exportedAt: "2026-04-05T12:00:00.000Z",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  filters: datasetFiltersResult,
  records: {
    researchProfiles: [datasetResearchRecordResult],
    supervisedExamples: [datasetSupervisedRecordResult],
    preferenceExamples: [datasetPreferenceRecordResult],
    evaluationCases: [datasetEvaluationRecordResult],
  },
  counts: {
    researchProfiles: 1,
    supervisedExamples: 1,
    preferenceExamples: 1,
    evaluationCases: 1,
  },
  metadata: {},
});

assert.equal(datasetExportBundleResult.counts.evaluationCases, 1);
assert.equal(trainingSignalActionTypeSchema.parse("copied"), "copied");
assert.equal(trainingSignalActionTypeSchema.parse("positive_outcome"), "positive_outcome");
assert.equal(productAnalyticsEventSchema.parse("campaign_created"), "campaign_created");
assert.equal(feedbackCategorySchema.parse("output_quality"), "output_quality");

const feedbackResult = submitFeedbackInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  pagePath: "/app/settings",
  category: "workflow",
  message: "The sequence workflow is strong overall, but the onboarding handoff could be clearer.",
});

assert.equal(feedbackResult.pagePath, "/app/settings");

assert.throws(
  () =>
    submitFeedbackInputSchema.parse({
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      pagePath: "settings",
      category: "bug",
      message: "This is a valid-length message but the path is malformed.",
    }),
  /Page path must start with '\/'\./,
);

console.log("@ceg/validation entity contract tests passed");


const institutionalControlsResult = workspaceInstitutionalControlsSchema.parse({
  dataRetention: {
    preference: "extended",
    notes: "Retain approved launch artifacts for longitudinal review.",
  },
  requestVisibility: {
    exportRequestsVisible: true,
    deleteRequestsVisible: true,
    contactChannel: "support@acme.com",
  },
  auditAccess: {
    visibleToWorkspaceAdmins: true,
    internalSupportVisible: false,
    notes: null,
  },
  providerVisibility: {
    configurationSummaryVisible: true,
  },
});

assert.equal(institutionalControlsResult.dataRetention.preference, "extended");
assert.equal(workspaceDataRetentionPreferenceSchema.parse("minimized"), "minimized");

const institutionalControlsUpdateResult = updateWorkspaceInstitutionalControlsInputSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  controls: institutionalControlsResult,
});

assert.equal(
  institutionalControlsUpdateResult.controls.requestVisibility.contactChannel,
  "support@acme.com",
);


const dataHandlingStateResult = workspaceDataHandlingStateSchema.parse({
  lastExportAt: "2026-04-05T12:00:00.000Z",
  lastExportedByUserId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  deletionRequest: {
    status: "requested",
    requestedAt: "2026-04-05T12:10:00.000Z",
    requestedByUserId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    requestedByEmail: "owner@example.com",
    reason: "Closing this test workspace.",
    confirmationLabel: "Acme Labs",
  },
});

assert.equal(dataHandlingStateResult.deletionRequest.status, "requested");



