/* global URL, console, process */
import assert from "node:assert/strict";

const errorModuleUrl = new URL("../lib/server/user-facing-errors.ts", import.meta.url);
const onboardingStateModuleUrl = new URL("../lib/server/onboarding-state.ts", import.meta.url);
const emptyStateGuidanceModuleUrl = new URL("../lib/empty-state-guidance.ts", import.meta.url);
const onboardingGuidanceModuleUrl = new URL("../lib/onboarding-guidance.ts", import.meta.url);
const pricingContentModuleUrl = new URL("../lib/pricing-content.ts", import.meta.url);
const internalAdminModuleUrl = new URL("../lib/internal-admin-access.ts", import.meta.url);
const workspaceTeamPolicyModuleUrl = new URL("../lib/workspace-team-policy.ts", import.meta.url);
const demoSeedConfigModuleUrl = new URL("../lib/demo-seed-config.ts", import.meta.url);
const demoFixturesModuleUrl = new URL("../../../infrastructure/demo-data/fixtures.ts", import.meta.url);
const runtimeOriginModuleUrl = new URL("../lib/server/runtime-origin.ts", import.meta.url);
const aiProviderConfigModuleUrl = new URL("../lib/server/ai-provider-config.ts", import.meta.url);
const datasetExportUtilsModuleUrl = new URL("../lib/server/dataset-export-utils.ts", import.meta.url);
const inboxDraftLinksModuleUrl = new URL("../lib/inbox-draft-links.ts", import.meta.url);
const replyAnalysisGuidanceModuleUrl = new URL("../lib/reply-analysis-guidance.ts", import.meta.url);
const campaignPerformanceModuleUrl = new URL("../lib/campaign-performance.ts", import.meta.url);
const campaignOverviewModuleUrl = new URL("../lib/campaign-overview.ts", import.meta.url);
const performanceSummaryModuleUrl = new URL("../lib/performance-summary.ts", import.meta.url);
const replyOutcomesModuleUrl = new URL("../lib/reply-outcomes.ts", import.meta.url);
const generationPerformanceHintsModuleUrl = new URL("../lib/generation-performance-hints.ts", import.meta.url);
const upgradePromptsModuleUrl = new URL("../lib/upgrade-prompts.ts", import.meta.url);
const workflowVisibilityModuleUrl = new URL("../lib/workflow-visibility.ts", import.meta.url);
const authCallbackBridgeModuleUrl = new URL("../lib/auth-callback-bridge.ts", import.meta.url);
const authRedirectsModuleUrl = new URL("../lib/auth-redirects.ts", import.meta.url);
const {
  decodeUserFacingMessage,
  toUserFacingError,
} = await import(errorModuleUrl.href);
const {
  buildOnboardingStepViews,
  computeCurrentOnboardingStep,
  createOnboardingStatePatch,
  hasMeaningfulOnboardingSetup,
} = await import(onboardingStateModuleUrl.href);
const {
  getCampaignsEmptyState,
  getReplyDraftsEmptyState,
  getResearchEmptyState,
  getSenderProfilesEmptyState,
  getSequenceEmptyState,
} = await import(emptyStateGuidanceModuleUrl.href);
const {
  getOnboardingNextStepGuidance,
  getOnboardingPersonaGuidance,
} = await import(onboardingGuidanceModuleUrl.href);
const {
  getPricingPlanPresentation,
  pricingFeatureRows,
  pricingPlans,
} = await import(pricingContentModuleUrl.href);
const {
  canAccessInternalAdminView,
  parseInternalAdminEmails,
} = await import(internalAdminModuleUrl.href);
const {
  canEditWorkspaceSettings,
  canInviteRole,
  canRemoveMember,
  canUpdateMemberRole,
  getAllowedInviteRoles,
} = await import(workspaceTeamPolicyModuleUrl.href);
const {
  isDemoSeedEnabled,
  readDemoSeedLoadedAt,
  readDemoSeedVersion,
} = await import(demoSeedConfigModuleUrl.href);
const {
  demoReplyThreads,
  demoSeedSummary,
  demoSequenceSendPlans,
  demoSequences,
} = await import(demoFixturesModuleUrl.href);
const {
  createAppUrl,
  getOptionalAppOrigin,
} = await import(runtimeOriginModuleUrl.href);
const {
  getAiProviderForCapability,
  resolveAiProviderSelection,
} = await import(aiProviderConfigModuleUrl.href);
const {
  getDatasetExpectedPropertiesForArtifact,
  getDatasetTaskTypeForArtifact,
  matchesDatasetExportFilters,
} = await import(datasetExportUtilsModuleUrl.href);
const {
  buildReplyInboxDraftArtifactId,
  buildSequenceInboxDraftArtifactId,
  createInboxDraftLink,
  indexInboxDraftsByArtifact,
  updateInboxDraftLink,
} = await import(inboxDraftLinksModuleUrl.href);
const {
  getReplyAnalysisGuidance,
} = await import(replyAnalysisGuidanceModuleUrl.href);
const {
  buildCampaignPerformanceSnapshot,
  countCampaignPerformanceFromRecords,
  isCountedOutboundMessage,
  isPositiveReplyIntent,
} = await import(campaignPerformanceModuleUrl.href);
const {
  buildCampaignOverview,
  formatPerformanceRate,
} = await import(campaignOverviewModuleUrl.href);
const {
  buildShareablePerformanceSummary,
  formatShareablePerformanceSummaryText,
} = await import(performanceSummaryModuleUrl.href);
const {
  classifyReplyOutcome,
  resolveGeneratedArtifactForSentMessage,
} = await import(replyOutcomesModuleUrl.href);
const {
  buildGenerationPerformanceHintsFromSignals,
  extractHintSignalsFromUsageEvents,
} = await import(generationPerformanceHintsModuleUrl.href);
const {
  getUpgradePrompt,
} = await import(upgradePromptsModuleUrl.href);
const {
  buildVisibleWorkflowStages,
  getVisibleWorkflowNextAction,
} = await import(workflowVisibilityModuleUrl.href);
const {
  buildAuthCallbackBridgeHtml,
} = await import(authCallbackBridgeModuleUrl.href);
const {
  createDefaultPostAuthRedirectPath,
  normalizePostAuthRedirectPath,
  normalizeSignupPlanCode,
} = await import(authRedirectsModuleUrl.href);
const gated = toUserFacingError(new Error("Current workspace plan does not include sender-aware lrofiles."));
assert.equal(gated.code, "feature-not-included");
assert.match(gated.message, /not included/i);

const invalidUrl = toUserFacingError(new Error("Unsafe URL: localhost is blocked."));
assert.equal(invalidUrl.code, "invalid-website-url");

const untrustedRequest = toUserFacingError(new Error("Request origin could not be verified."));
assert.equal(untrustedRequest.code, "request-not-verified");

const workspaceSync = toUserFacingError(new Error("workspace sync failed"));
assert.equal(workspaceSync.code, "workspace-sync-failed");
assert.match(workspaceSync.message, /prepare your workspace/i);

const fallback = toUserFacingError(new Error("Totally unknown failure"), "Friendly fallback.");
assert.equal(fallback.code, "unknown-error");
assert.equal(fallback.message, "Friendly fallback.");

assert.equal(decodeUserFacingMessage("Signed%20out."), "Signed out.");
assert.equal(decodeUserFacingMessage(undefined), null);

const initialState = {
  status: "not_started",
  workspaceConfirmedAt: null,
  selectedUserType: null,
  skilledAt: null,
  completedAt: null,
  updatedAt: null,
};

assert.equal(
  computeCurrentOnboardingStep({
    state: initialState,
    senderProfileCount: 0,
    campaignCount: 0,
    prospectCount: 0,
  }),
  "workspace",
);

const inProgress = createOnboardingStatePatch({
  current: initialState,
  patch: {
    workspaceConfirmedAt: new Date("2026-04-02T10:00:00.000Z"),
    selectedUserType: "basic",
  },
  senderProfileCount: 0,
  campaignCount: 0,
  prospectCount: 0,
});

assert.equal(inProgress.status, "in_progress");
assert.equal(
  computeCurrentOnboardingStep({
    state: inProgress,
    senderProfileCount: 0,
    campaignCount: 0,
    prospectCount: 0,
  }),
  "campaign",
);
assert.equal(
  hasMeaningfulOnboardingSetup({
    state: inProgress,
    senderProfileCount: 0,
    campaignCount: 0,
    prospectCount: 0,
  }),
  true,
);

const completed = createOnboardingStatePatch({
  current: inProgress,
  patch: {},
  senderProfileCount: 0,
  campaignCount: 1,
  prospectCount: 1,
});

assert.equal(completed.status, "completed");
assert.ok(completed.completedAt instanceof Date);

const steps = buildOnboardingStepViews({
  state: completed,
  senderProfileCount: 0,
  campaignCount: 1,
  prospectCount: 1,
});
assert.equal(steps.every((step) => step.status === "complete"), true);

const senderAwareState = createOnboardingStatePatch({
  current: initialState,
  patch: {
    workspaceConfirmedAt: new Date("2026-04-02T10:00:00.000Z"),
    selectedUserType: "sdr",
  },
  senderProfileCount: 0,
  campaignCount: 0,
  prospectCount: 0,
});

assert.equal(
  computeCurrentOnboardingStep({
    state: senderAwareState,
    senderProfileCount: 0,
    campaignCount: 0,
    prospectCount: 0,
  }),
  "sender_profile",
);

const agencyOnboardingGuidance = getOnboardingPersonaGuidance("agency");
assert.match(agencyOnboardingGuidance.introBody, /outbound agencies/i);
assert.match(agencyOnboardingGuidance.recommendation, /client/i);
assert.match(agencyOnboardingGuidance.memoryNote, /memory/i);
const campaignStepGuidance = getOnboardingNextStepGuidance("campaign");
assert.match(campaignStepGuidance.title, /client brief/i);
assert.match(campaignStepGuidance.expectation, /unlock research|practical first brief/i);

const senderProfileGuidance = getSenderProfilesEmptyState("saas_founder");
assert.match(senderProfileGuidance.description, /founder/i);
assert.match(senderProfileGuidance.nextAction, /basic mode/i);

const campaignGuidance = getCampaignsEmptyState("agency");
assert.match(campaignGuidance.description, /agency/i);
assert.match(campaignGuidance.nextAction, /campaign/i);

const researchGuidance = getResearchEmptyState({
  userType: "sdr",
  hasWebsite: false,
});
assert.match(researchGuidance.title, /website/i);
assert.match(researchGuidance.nextAction, /website/i);

const sequenceGuidance = getSequenceEmptyState({
  userType: "basic",
  hasResearch: false,
});
assert.match(sequenceGuidance.description, /basic mode/i);
assert.match(sequenceGuidance.nextAction, /research/i);

const replyGuidance = getReplyDraftsEmptyState({
  userType: "sdr",
  state: "needs_analysis",
});
assert.match(replyGuidance.title, /Analyze/i);
assert.match(replyGuidance.nextAction, /analysis/i);

assert.equal(pricingPlans.length, 3);
assert.equal(getPricingPlanPresentation("pro").featured, true);
assert.equal(pricingFeatureRows[0]?.free, "Basic mode only");
assert.match(pricingFeatureRows[3]?.pro ?? "", /250 analyses/i);

const internalAdminEmails = parseInternalAdminEmails("Owner@Example.com, admin@example.com ");
assert.deepEqual(internalAdminEmails, ["owner@example.com", "admin@example.com"]);
assert.equal(
  canAccessInternalAdminView({
    email: "owner@example.com",
    membership: {
      workspaceId: "workspace-1",
      role: "owner",
      workspaceName: "Workspace One",
    },
    allowedEmails: internalAdminEmails,
  }),
  true,
);
assert.equal(
  canAccessInternalAdminView({
    email: "member@example.com",
    membership: {
      workspaceId: "workspace-1",
      role: "member",
      workspaceName: "Workspace One",
    },
    allowedEmails: internalAdminEmails,
  }),
  false,
);
assert.equal(canEditWorkspaceSettings("owner"), true);
assert.equal(canEditWorkspaceSettings("admin"), true);
assert.equal(canEditWorkspaceSettings("member"), false);
assert.equal(canInviteRole("owner", "admin"), true);
assert.equal(canInviteRole("admin", "admin"), false);
assert.equal(canInviteRole("admin", "member"), true);
assert.equal(
  canUpdateMemberRole({
    actorRole: "owner",
    targetRole: "admin",
    nextRole: "member",
  }),
  true,
);
assert.equal(
  canUpdateMemberRole({
    actorRole: "admin",
    targetRole: "member",
    nextRole: "member",
  }),
  true,
);
assert.equal(
  canUpdateMemberRole({
    actorRole: "admin",
    targetRole: "member",
    nextRole: "admin",
  }),
  false,
);
assert.equal(
  canRemoveMember({
    actorRole: "owner",
    targetRole: "admin",
    isSelf: false,
  }),
  true,
);
assert.equal(
  canRemoveMember({
    actorRole: "admin",
    targetRole: "admin",
    isSelf: false,
  }),
  false,
);
assert.deepEqual(getAllowedInviteRoles("owner"), ["admin", "member"]);
assert.deepEqual(getAllowedInviteRoles("admin"), ["member"]);
assert.deepEqual(getAllowedInviteRoles("member"), []);

assert.equal(
  isDemoSeedEnabled({ nodeEnv: "development", enabledFlag: "true" }),
  true,
);
assert.equal(
  isDemoSeedEnabled({ nodeEnv: "development", enabledFlag: "yes" }),
  true,
);
assert.equal(
  isDemoSeedEnabled({ nodeEnv: "development", enabledFlag: "0" }),
  false,
);
assert.equal(
  isDemoSeedEnabled({ nodeEnv: "production", enabledFlag: "true" }),
  false,
);
assert.equal(
  readDemoSeedVersion({ demoSeed: { version: "20260402140000" } }),
  "20260402140000",
);
assert.equal(
  readDemoSeedLoadedAt({ demoSeed: { loadedAt: "2026-04-02T14:00:00.000Z" } }),
  "2026-04-02T14:00:00.000Z",
);
assert.equal(readDemoSeedVersion({}), null);
assert.equal(readDemoSeedLoadedAt({}), null);
assert.equal(demoSeedSummary.sequenceCount, 4);
assert.equal(demoSeedSummary.replyThreadCount, 4);
assert.equal(demoSequences.some((sequence) => sequence.key === "ledgerloop_sequence"), true);
assert.equal(demoSequences.some((sequence) => sequence.key === "pipelinepilot_sequence"), true);
assert.equal(demoSequenceSendPlans.length, demoSequences.length);
assert.equal(demoReplyThreads.some((thread) => thread.analysis.intent === "interested"), true);
assert.equal(demoReplyThreads.some((thread) => thread.analysis.intent === "hard_no"), true);
assert.equal(demoReplyThreads.some((thread) => thread.analysis.intent === "objection_already_has_solution"), true);

process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
assert.equal(getOptionalAppOrigin(), "https://app.example.com");
assert.equal(createAppUrl("/auth/callback"), "https://app.example.com/auth/callback");

const authCallbackBridgeHtml = buildAuthCallbackBridgeHtml();
assert.match(authCallbackBridgeHtml, /access_token/);
assert.match(authCallbackBridgeHtml, /refresh_token/);
assert.match(authCallbackBridgeHtml, /\/auth\/session/);
assert.match(authCallbackBridgeHtml, /Completing sign-in/);

const signupGrowthRedirect = createDefaultPostAuthRedirectPath({
  mode: "sign-up",
  planCode: "pro",
});
assert.match(signupGrowthRedirect, /^\/app\/settings\?upgrade=pro/);
assert.match(signupGrowthRedirect, /#billing-plans$/);
assert.equal(normalizeSignupPlanCode("agency"), "agency");
assert.equal(normalizeSignupPlanCode("enterprise"), null);
assert.equal(
  normalizePostAuthRedirectPath("/app/settings?upgrade=pro#billing-plans"),
  "/app/settings?upgrade=pro#billing-plans",
);
assert.equal(normalizePostAuthRedirectPath("https://evil.test/app"), null);
assert.equal(normalizePostAuthRedirectPath("//evil.test/app"), null);

delete process.env.NEXT_PUBLIC_APP_URL;
process.env.VERCEL_TARGET_ENV = "preview";
process.env.VERCEL_URL = "preview-outbound.vercel.app";
assert.equal(getOptionalAppOrigin(), "https://preview-outbound.vercel.app");

delete process.env.VERCEL_URL;
process.env.VERCEL_TARGET_ENV = "production";
process.env.VERCEL_PROJECT_PRODUCTION_URL = "outbound.example.com";
assert.equal(getOptionalAppOrigin(), "https://outbound.example.com");

delete process.env.VERCEL_TARGET_ENV;
delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

delete process.env.AI_DEFAULT_PROVIDER;
delete process.env.AI_RESEARCH_PROVIDER;
delete process.env.AI_SEQUENCE_PROVIDER;
delete process.env.AI_REPLY_PROVIDER;
assert.deepEqual(resolveAiProviderSelection(), {
  defaultProvider: "openai",
  providers: {
    research: "openai",
    sequence: "openai",
    reply: "openai",
  },
});
process.env.AI_DEFAULT_PROVIDER = "anthropic";
process.env.AI_SEQUENCE_PROVIDER = "openai";
assert.equal(getAiProviderForCapability("research"), "anthropic");
assert.equal(getAiProviderForCapability("reply"), "anthropic");
assert.equal(getAiProviderForCapability("sequence"), "openai");
process.env.AI_REPLY_PROVIDER = "openai";
assert.equal(getAiProviderForCapability("reply"), "openai");
delete process.env.AI_DEFAULT_PROVIDER;
delete process.env.AI_RESEARCH_PROVIDER;
delete process.env.AI_SEQUENCE_PROVIDER;
delete process.env.AI_REPLY_PROVIDER;

assert.equal(
  matchesDatasetExportFilters({
    occurredAt: new Date("2026-04-05T12:00:00.000Z"),
    artifactType: "draft_reply_option",
    actionType: "edited",
    filters: {
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      dateFrom: new Date("2026-04-05T00:00:00.000Z"),
      dateTo: new Date("2026-04-06T00:00:00.000Z"),
      artifactTypes: ["draft_reply_option"],
      signalMode: "edited_only",
    },
  }),
  true,
);
assert.equal(
  matchesDatasetExportFilters({
    occurredAt: new Date("2026-04-05T12:00:00.000Z"),
    artifactType: "sequence_bundle",
    actionType: "generated",
    filters: {
      workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
      artifactTypes: ["draft_reply_option"],
      signalMode: "all",
    },
  }),
  false,
);
assert.equal(
  getDatasetTaskTypeForArtifact({ artifactType: "reply_analysis" }),
  "reply_analysis",
);
assert.equal(
  getDatasetTaskTypeForArtifact({
    artifactType: "draft_reply_option",
    actionType: "edited",
  }),
  "artifact_edit",
);
assert.equal(
  getDatasetExpectedPropertiesForArtifact("research_snapshot").includes(
    "evidence_attached",
  ),
  true,
);

assert.equal(
  buildSequenceInboxDraftArtifactId({
    sequenceRecordId: "sequence-1",
    targetPart: "initial_email",
  }),
  "sequence-1:initial_email",
);
assert.equal(
  buildSequenceInboxDraftArtifactId({
    sequenceRecordId: "sequence-1",
    targetPart: "follow_up_step",
    targetStepNumber: 2,
  }),
  "sequence-1:follow-up:2",
);
assert.equal(
  buildReplyInboxDraftArtifactId({
    inboundMessageId: "message-1",
    slotId: "option-a",
  }),
  "message-1:draft:option-a",
);

const inboxDraftLink = createInboxDraftLink({
  artifactId: "sequence-1:initial_email",
  artifactKind: "sequence_initial_email",
  inboxAccountId: "7fbfe844-7b3c-4f1b-8046-77ea1e6f4831",
  provider: "gmail",
  providerDraftId: "draft_123",
  providerMessageId: "msg_123",
  providerThreadId: "thread_123",
  status: "created",
  createdAt: new Date("2026-04-05T10:00:00.000Z"),
});
const sentInboxDraftLink = updateInboxDraftLink({
  link: inboxDraftLink,
  status: "sent",
  sentAt: new Date("2026-04-06T10:00:00.000Z"),
});
const draftMal = indexInboxDraftsByArtifact([
  {
    metadata: {
      source: "generated",
      inboxDraft: sentInboxDraftLink,
    },
  },
]);
assert.equal(draftMal.get("sequence-1:initial_email")?.providerDraftId, "draft_123");
assert.equal(draftMal.get("sequence-1:initial_email")?.status, "sent");

assert.match(
  getReplyAnalysisGuidance({ intent: "hard_no", confidenceLabel: "high" }) ?? "",
  /hard negative/i,
);
assert.match(
  getReplyAnalysisGuidance({ intent: "unclear", confidenceLabel: "medium" }) ?? "",
  /ambiguous/i,
);
assert.equal(
  getReplyAnalysisGuidance({ intent: "interested", confidenceLabel: "high" }),
  null,
);
assert.equal(isPositiveReplyIntent("interested"), true);
assert.equal(isPositiveReplyIntent("soft_no"), false);
assert.equal(classifyReplyOutcome("needs_more_info"), "positive");
assert.equal(classifyReplyOutcome("hard_no"), "negative");
assert.equal(classifyReplyOutcome("unclear"), null);
assert.deepEqual(
  resolveGeneratedArtifactForSentMessage({
    sequenceId: "sequence-1",
    metadata: {
      source: "generated",
      generatedFrom: "sequence",
      timelineLabel: "Generated follow-up 2",
    },
  }),
  {
    artifactType: "sequence_follow_up_step",
    artifactId: "sequence-1:follow-up:2",
  },
);
assert.equal(
  isCountedOutboundMessage({ direction: "outbound", status: "sent" }),
  true,
);
assert.equal(
  isCountedOutboundMessage({ direction: "outbound", status: "draft" }),
  false,
);
const campaignPerformance = buildCampaignPerformanceSnapshot({
  outboundMessages: 10,
  replies: 3,
  positiveReplies: 2,
  calculatedAt: new Date("2026-04-06T10:00:00.000Z"),
});
assert.equal(campaignPerformance.replyRate, 0.3);
assert.equal(campaignPerformance.positiveReplyRate, 0.2);
const countedCampaignPerformance = countCampaignPerformanceFromRecords({
  messages: [
    { id: "m1", direction: "outbound", status: "sent" },
    { id: "m2", direction: "outbound", status: "draft" },
    { id: "m3", direction: "inbound", status: "received" },
  ],
  analyses: [
    { messageId: "m3", intent: "needs_more_info" },
  ],
});
assert.equal(countedCampaignPerformance.outboundMessages, 1);
assert.equal(countedCampaignPerformance.replies, 1);
assert.equal(countedCampaignPerformance.positiveReplies, 1);

const visibleWorkflowStages = buildVisibleWorkflowStages({
  setupReady: true,
  campaignReady: true,
  prospectReady: true,
  researchReady: false,
  draftReady: false,
  reviewReady: false,
  replyReady: false,
  iterationReady: false,
});
assert.equal(visibleWorkflowStages[0]?.status, "complete");
assert.equal(visibleWorkflowStages[3]?.status, "current");
assert.equal(getVisibleWorkflowNextAction(visibleWorkflowStages)?.label, "Run research");

const limitUpgradePrompt = getUpgradePrompt({
  surface: "prospect_workflow",
  billing: {
    planCode: "free",
    planLabel: "Starter",
    usage: {
      counters: {
        websiteResearchRuns: 12,
        sequenceGenerations: 20,
        replyAnalyses: 8,
        replyDraftGenerations: 7,
        regenerations: 4,
      },
    },
    limits: {
      websiteResearch: { allowed: true, limit: 15, used: 12, remaining: 3, reason: null },
      sequenceGeneration: { allowed: false, limit: 20, used: 20, remaining: 0, reason: "limit" },
      replyAnalysis: { allowed: true, limit: 20, used: 8, remaining: 12, reason: null },
      replyDraftGeneration: { allowed: true, limit: 20, used: 7, remaining: 13, reason: null },
      regenerations: { allowed: true, limit: 10, used: 4, remaining: 6, reason: null },
    },
  },
  performance: null,
});
assert.equal(limitUpgradePrompt?.id, "generation_limit");
assert.equal(limitUpgradePrompt?.targetPlanCode, "pro");

const performanceUpgradePrompt = getUpgradePrompt({
  surface: "dashboard_performance",
  billing: {
    planCode: "free",
    planLabel: "Starter",
    usage: {
      counters: {
        websiteResearchRuns: 5,
        sequenceGenerations: 6,
        replyAnalyses: 4,
        replyDraftGenerations: 3,
        regenerations: 1,
      },
    },
    limits: {
      websiteResearch: { allowed: true, limit: 15, used: 5, remaining: 10, reason: null },
      sequenceGeneration: { allowed: true, limit: 20, used: 6, remaining: 14, reason: null },
      replyAnalysis: { allowed: true, limit: 20, used: 4, remaining: 16, reason: null },
      replyDraftGeneration: { allowed: true, limit: 20, used: 3, remaining: 17, reason: null },
      regenerations: { allowed: true, limit: 10, used: 1, remaining: 9, reason: null },
    },
  },
  performance: {
    outboundMessages: 8,
    replies: 3,
    positiveReplies: 2,
    replyRate: 0.375,
    positiveReplyRate: 0.25,
    positiveReplyIntents: ["interested"],
    calculatedAt: new Date("2026-04-06T10:00:00.000Z"),
    version: 1,
  },
});
assert.equal(performanceUpgradePrompt?.id, "performance_visibility");

const replyUpgradePrompt = getUpgradePrompt({
  surface: "settings_billing",
  billing: {
    planCode: "free",
    planLabel: "Starter",
    usage: {
      counters: {
        websiteResearchRuns: 4,
        sequenceGenerations: 5,
        replyAnalyses: 12,
        replyDraftGenerations: 10,
        regenerations: 2,
      },
    },
    limits: {
      websiteResearch: { allowed: true, limit: 15, used: 4, remaining: 11, reason: null },
      sequenceGeneration: { allowed: true, limit: 20, used: 5, remaining: 15, reason: null },
      replyAnalysis: { allowed: true, limit: 20, used: 12, remaining: 8, reason: null },
      replyDraftGeneration: { allowed: true, limit: 20, used: 10, remaining: 10, reason: null },
      regenerations: { allowed: true, limit: 10, used: 2, remaining: 8, reason: null },
    },
  },
  performance: null,
});
assert.equal(replyUpgradePrompt?.id, "reply_intelligence");
const campaignOverview = buildCampaignOverview([
  {
    id: "campaign-1",
    workspaceId: "workspace-1",
    senderProfileId: "sender-1",
    name: "Allha",
    description: null,
    objective: null,
    offerSummary: "Offer A",
    targetIcl: "ICP A",
    targetIndustries: [],
    tonePreferences: { style: null, do: [], avoid: [], notes: null },
    frameworkPreferences: [],
    status: "active",
    settings: {
      performance: {
        outboundMessages: 10,
        replies: 3,
        positiveReplies: 2,
        replyRate: 0.3,
        positiveReplyRate: 0.2,
        positiveReplyIntents: ["interested"],
        calculatedAt: new Date("2026-04-06T10:00:00.000Z"),
        version: 1,
      },
    },
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-06T10:00:00.000Z"),
  },
  {
    id: "campaign-2",
    workspaceId: "workspace-1",
    senderProfileId: null,
    name: "Beta",
    description: null,
    objective: null,
    offerSummary: "Offer B",
    targetIcl: "ICP B",
    targetIndustries: [],
    tonePreferences: { style: null, do: [], avoid: [], notes: null },
    frameworkPreferences: [],
    status: "draft",
    settings: {},
    createdAt: new Date("2026-04-02T10:00:00.000Z"),
    updatedAt: new Date("2026-04-05T10:00:00.000Z"),
  },
  {
    id: "campaign-3",
    workspaceId: "workspace-1",
    senderProfileId: "sender-2",
    name: "Gamma",
    description: null,
    objective: null,
    offerSummary: "Offer C",
    targetIcl: "ICP C",
    targetIndustries: [],
    tonePreferences: { style: null, do: [], avoid: [], notes: null },
    frameworkPreferences: [],
    status: "active",
    settings: {
      performance: {
        outboundMessages: 6,
        replies: 1,
        positiveReplies: 1,
        replyRate: 1 / 6,
        positiveReplyRate: 1 / 6,
        positiveReplyIntents: ["needs_more_info"],
        calculatedAt: new Date("2026-04-06T09:00:00.000Z"),
        version: 1,
      },
    },
    createdAt: new Date("2026-04-03T10:00:00.000Z"),
    updatedAt: new Date("2026-04-04T10:00:00.000Z"),
  },
]);
assert.equal(campaignOverview.campaignCount, 3);
assert.equal(campaignOverview.activeCount, 2);
assert.equal(campaignOverview.senderAwareCount, 2);
assert.equal(campaignOverview.basicModeCount, 1);
assert.equal(campaignOverview.totalOutboundMessages, 16);
assert.equal(campaignOverview.groupedCampaigns[0]?.status, "active");
assert.equal(campaignOverview.quickSwitchCampaigns[0]?.campaign.name, "Allha");
assert.equal(campaignOverview.topPerformers[0]?.campaign.name, "Allha");
assert.equal(formatPerformanceRate(0.3), "30%");
assert.equal(formatPerformanceRate(null), "n/a");
const workspaceShareSummary = buildShareablePerformanceSummary({
  scope: "workspace",
  snapshot: {
    outboundMessages: 16,
    replies: 4,
    positiveReplies: 3,
    replyRate: 0.25,
    positiveReplyRate: 0.1875,
    positiveReplyIntents: ["interested", "needs_more_info"],
    calculatedAt: new Date("2026-04-06T10:30:00.000Z"),
    version: 1,
  },
  campaignCount: 3,
});
assert.equal(workspaceShareSummary.scope, "workspace");
assert.equal(workspaceShareSummary.highlights.includes("3 campaign(s) are included in this summary."), true);
const workspaceShareText = formatShareablePerformanceSummaryText(workspaceShareSummary);
assert.match(workspaceShareText, /Workspace performance summary/);
assert.match(workspaceShareText, /Reply rate: 25%/);
assert.doesNotMatch(workspaceShareText, /workspace-1/);
assert.doesNotMatch(workspaceShareText, /Allha/);
const sequenceHintSignals = extractHintSignalsFromUsageEvents({
  kind: "sequence",
  events: [
    {
      occurredAt: new Date("2026-04-06T09:00:00.000Z"),
      metadata: {
        trainingSignal: {
          workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
          campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
          prospectId: null,
          senderProfileId: null,
          artifactType: "sequence_initial_email",
          artifactId: "sequence-1:initial_email",
          actionType: "positive_outcome",
          provider: "openai",
          model: "glt-4.1-mini",
          promptTemplateId: null,
          promptVersion: "sequence.v1",
          beforeText: null,
          afterText: "Based on your site, would it be helpful if I sent a short summary?",
          selectedOptionId: null,
          exportFormat: null,
          senderProfileSnapshot: {
            id: "54ad043c-9435-4388-92b9-9e0becbeff74",
            name: "Founder Profile",
            senderType: "saas_founder",
            companyName: "Acme",
            valueProposition: "Reduce manual outbound work",
            toneStyle: "Consultative",
          },
          campaignSnapshot: {
            id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
            name: "Founder outbound sprint",
            status: "active",
            senderProfileId: "54ad043c-9435-4388-92b9-9e0becbeff74",
            offerSummary: "Founder-led outbound support",
            targetIcl: "Early-stage SaaS teams",
            frameworkPreferences: ["Problem -> proof -> CTA"],
            toneStyle: "Consultative",
          },
          prospectSnapshot: null,
          researchSnapshot: null,
          outcomeSignal: null,
          metadata: {},
        },
      },
    },
    {
      occurredAt: new Date("2026-04-05T09:00:00.000Z"),
      metadata: {
        trainingSignal: {
          workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
          campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
          prospectId: null,
          senderProfileId: null,
          artifactType: "sequence_initial_email",
          artifactId: "sequence-2:initial_email",
          actionType: "selected",
          provider: "openai",
          model: "glt-4.1-mini",
          promptTemplateId: null,
          promptVersion: "sequence.v1",
          beforeText: null,
          afterText: "We noticed your team is hiring SDRs. Open to a quick look at how others tighten messaging?",
          selectedOptionId: null,
          exportFormat: null,
          senderProfileSnapshot: {
            id: "54ad043c-9435-4388-92b9-9e0becbeff74",
            name: "Founder Profile",
            senderType: "saas_founder",
            companyName: "Acme",
            valueProposition: "Reduce manual outbound work",
            toneStyle: "Consultative",
          },
          campaignSnapshot: {
            id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
            name: "Founder outbound sprint",
            status: "active",
            senderProfileId: "54ad043c-9435-4388-92b9-9e0becbeff74",
            offerSummary: "Founder-led outbound support",
            targetIcl: "Early-stage SaaS teams",
            frameworkPreferences: ["Problem -> proof -> CTA"],
            toneStyle: "Consultative",
          },
          prospectSnapshot: null,
          researchSnapshot: null,
          outcomeSignal: null,
          metadata: {},
        },
      },
    },
    {
      occurredAt: new Date("2026-04-04T09:00:00.000Z"),
      metadata: {
        trainingSignal: {
          workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
          campaignId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
          prospectId: null,
          senderProfileId: null,
          artifactType: "sequence_subject_line_option",
          artifactId: "sequence-3:subject-line-option:1",
          actionType: "copied",
          provider: "openai",
          model: "glt-4.1-mini",
          promptTemplateId: null,
          promptVersion: "sequence.v1",
          beforeText: null,
          afterText: "Would it be helpful if I sent a short summary?",
          selectedOptionId: null,
          exportFormat: null,
          senderProfileSnapshot: null,
          campaignSnapshot: {
            id: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
            name: "Founder outbound sprint",
            status: "active",
            senderProfileId: "54ad043c-9435-4388-92b9-9e0becbeff74",
            offerSummary: "Founder-led outbound support",
            targetIcl: "Early-stage SaaS teams",
            frameworkPreferences: ["Problem -> proof -> CTA"],
            toneStyle: "Consultative",
          },
          prospectSnapshot: null,
          researchSnapshot: null,
          outcomeSignal: null,
          metadata: {},
        },
      },
    },
  ],
});
assert.equal(sequenceHintSignals.length, 3);
const sequenceHints = buildGenerationPerformanceHintsFromSignals({
  kind: "sequence",
  sourceScope: "campaign",
  signals: sequenceHintSignals,
  campaignPerformance: {
    outboundMessages: 10,
    replies: 3,
    positiveReplies: 2,
    replyRate: 0.3,
    positiveReplyRate: 0.2,
    positiveReplyIntents: ["interested", "needs_more_info"],
    calculatedAt: new Date("2026-04-06T09:30:00.000Z"),
    version: 1,
  },
});
assert.equal(sequenceHints.available, true);
assert.equal(sequenceHints.preferredToneStyle, "Consultative");
assert.equal(sequenceHints.sourceScope, "campaign");
assert.equal(sequenceHints.effectivePatterns.some((pattern) => pattern.key === "soft_cta"), true);

const emptyReplyHints = buildGenerationPerformanceHintsFromSignals({
  kind: "reply",
  sourceScope: "none",
  signals: [],
  campaignPerformance: null,
});
assert.equal(emptyReplyHints.available, false);
assert.equal(emptyReplyHints.sampleSize, 0);
console.log("apps/web user-facing error, onboarding state, pricing content, internal admin, workspace team policy, demo seed config, inbox draft links, reply analysis guidance, campaign performance, campaign overview, performance hints, upgrade prompts, and runtime origin tests passed");































