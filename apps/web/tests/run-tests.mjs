/* global URL, console, process */
import assert from "node:assert/strict";

const errorModuleUrl = new URL("../lib/server/user-facing-errors.ts", import.meta.url);
const onboardingStateModuleUrl = new URL("../lib/server/onboarding-state.ts", import.meta.url);
const emptyStateGuidanceModuleUrl = new URL("../lib/empty-state-guidance.ts", import.meta.url);
const pricingContentModuleUrl = new URL("../lib/pricing-content.ts", import.meta.url);
const internalAdminModuleUrl = new URL("../lib/internal-admin-access.ts", import.meta.url);
const demoSeedConfigModuleUrl = new URL("../lib/demo-seed-config.ts", import.meta.url);
const runtimeOriginModuleUrl = new URL("../lib/server/runtime-origin.ts", import.meta.url);
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
  getPricingPlanPresentation,
  pricingFeatureRows,
  pricingPlans,
} = await import(pricingContentModuleUrl.href);
const {
  canAccessInternalAdminView,
  parseInternalAdminEmails,
} = await import(internalAdminModuleUrl.href);
const {
  isDemoSeedEnabled,
  readDemoSeedLoadedAt,
  readDemoSeedVersion,
} = await import(demoSeedConfigModuleUrl.href);
const {
  createAppUrl,
  getOptionalAppOrigin,
} = await import(runtimeOriginModuleUrl.href);

const gated = toUserFacingError(new Error("Current workspace plan does not include sender-aware profiles."));
assert.equal(gated.code, "feature-not-included");
assert.match(gated.message, /not included/i);

const invalidUrl = toUserFacingError(new Error("Unsafe URL: localhost is blocked."));
assert.equal(invalidUrl.code, "invalid-website-url");

const untrustedRequest = toUserFacingError(new Error("Request origin could not be verified."));
assert.equal(untrustedRequest.code, "request-not-verified");

const fallback = toUserFacingError(new Error("Totally unknown failure"), "Friendly fallback.");
assert.equal(fallback.code, "unknown-error");
assert.equal(fallback.message, "Friendly fallback.");

assert.equal(decodeUserFacingMessage("Signed%20out."), "Signed out.");
assert.equal(decodeUserFacingMessage(undefined), null);

const initialState = {
  status: "not_started",
  workspaceConfirmedAt: null,
  selectedUserType: null,
  skippedAt: null,
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

process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
assert.equal(getOptionalAppOrigin(), "https://app.example.com");
assert.equal(createAppUrl("/auth/callback"), "https://app.example.com/auth/callback");

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

console.log("apps/web user-facing error, onboarding state, pricing content, internal admin, demo seed config, and runtime origin tests passed");
