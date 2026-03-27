import assert from "node:assert/strict";

import {
  companyProfileSchema,
  createResearchSnapshotInputSchema,
  createCampaignInputSchema,
  createProspectInputSchema,
  createSenderProfileInputSchema,
  prospectStatusSchema,
  senderProfileTypeSchema,
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

console.log("@ceg/validation entity contract tests passed");
