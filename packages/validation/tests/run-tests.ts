import assert from "node:assert/strict";

import {
  companyProfileSchema,
  createResearchSnapshotInputSchema,
  createCampaignInputSchema,
  createProspectInputSchema,
  createSenderProfileInputSchema,
  draftReplyOutputSchema,
  prospectStatusSchema,
  recommendedActionSchema,
  replyAnalysisInputSchema,
  replyClassificationOutputSchema,
  replyIntentSchema,
  senderProfileTypeSchema,
  trainingSignalActionTypeSchema,
  trainingSignalPayloadSchema,
  updateCampaignInputSchema,
  updateProspectInputSchema,
  updateSenderProfileInputSchema,
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
  metadata: {
    targetSlotId: "option-1",
  },
});

assert.equal(trainingSignalResult.actionType, "edited");
assert.equal(trainingSignalActionTypeSchema.parse("copied"), "copied");

console.log("@ceg/validation entity contract tests passed");
