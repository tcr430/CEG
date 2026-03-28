import assert from "node:assert/strict";

import { createReplyEngineService, scoreDraftReplyQuality } from "../dist/index.js";
import type { ReplyGenerationModelAdapter } from "../dist/index.js";

const metadata = {
  provider: "test-provider",
  model: "test-model",
  promptVersion: "reply.v1",
  inputTokens: 20,
  outputTokens: 40,
  totalTokens: 60,
  costUsd: null,
  generatedAt: new Date("2026-03-28T10:00:00.000Z"),
} as const;

const request = {
  senderContext: {
    mode: "sender_aware",
    senderProfile: {
      id: "0bf58ec1-f61f-45a0-8eab-f56c53b4bd4b",
      workspaceId: "d2558988-0bf3-421c-922d-7dca0fd84838",
      name: "Founder profile",
      senderType: "saas_founder",
      companyName: "Acme",
      companyWebsite: "https://acme.com",
      productDescription: "Structured outbound copilot",
      targetCustomer: "Lean SaaS teams",
      valueProposition: "Improve outbound quality",
      differentiation: "Grounded personalization",
      proofPoints: ["Used by revenue teams"],
      goals: ["Book qualified meetings"],
      tonePreferences: {
        style: "calm and direct",
        do: ["be concise"],
        avoid: ["be pushy"],
      },
      metadata: {},
      status: "active",
      isDefault: true,
      createdByUserId: null,
      createdAt: new Date("2026-03-28T09:00:00.000Z"),
      updatedAt: new Date("2026-03-28T09:00:00.000Z"),
    },
    credibilityLevel: "balanced",
  },
  campaign: {
    id: "f197d80f-5709-4b4f-aa9c-610f1e991f62",
    workspaceId: "d2558988-0bf3-421c-922d-7dca0fd84838",
    senderProfileId: "0bf58ec1-f61f-45a0-8eab-f56c53b4bd4b",
    brandVoiceProfileId: null,
    name: "Founder outbound",
    description: null,
    objective: null,
    offerSummary: "Better outbound workflows",
    targetIcp: "Lean SaaS teams",
    targetPersona: null,
    targetIndustries: ["SaaS"],
    tonePreferences: {
      style: "clear",
      do: ["be concise"],
      avoid: ["be pushy"],
      notes: null,
    },
    frameworkPreferences: ["clarify -> value -> CTA"],
    status: "active",
    settings: {},
    createdByUserId: null,
    createdAt: new Date("2026-03-28T09:00:00.000Z"),
    updatedAt: new Date("2026-03-28T09:00:00.000Z"),
  },
  prospectCompanyProfile: {
    domain: "prospect.com",
    websiteUrl: "https://prospect.com",
    companyName: "ProspectCo",
    summary: "ProspectCo helps finance teams automate reporting.",
    targetCustomers: ["Finance teams"],
    industries: ["Fintech"],
    valuePropositions: ["Automated reporting"],
    proofPoints: [],
    differentiators: [],
    likelyPainPoints: ["Manual reporting"],
    personalizationHooks: ["Recent product launch"],
    callsToAction: [],
    sourceEvidence: [],
    confidence: {
      score: 0.42,
      label: "low",
      reasons: ["Only one source was available."],
    },
    flags: [],
    metadata: {},
  },
  analysisInput: {
    workspaceId: "d2558988-0bf3-421c-922d-7dca0fd84838",
    campaignId: "f197d80f-5709-4b4f-aa9c-610f1e991f62",
    prospectId: "90d113d3-b398-4820-8cd0-b09185220545",
    threadId: "b8fa04ac-430d-4a62-85be-e290be1d029a",
    latestInboundMessage: {
      messageId: "6127e49b-3e1a-494e-93c0-22256cf09d00",
      subject: "Re: outbound",
      bodyText: "Timing is not right for us this quarter. Can you send more context?",
    },
    threadMessages: [
      {
        direction: "outbound",
        subject: "Outbound",
        bodyText: "Open to a quick conversation next week?",
      },
      {
        direction: "inbound",
        subject: "Re: outbound",
        bodyText: "Timing is not right for us this quarter. Can you send more context?",
      },
    ],
    campaignSummary: "Founder-led outreach for outbound quality software.",
    senderContextSummary: "Founder writing directly with grounded tone.",
    prospectCompanyProfileSummary: "Finance workflow software company.",
  },
  promptContext: {
    tone: {
      style: "clear",
      do: ["be concise"],
      avoid: ["be pushy"],
    },
    productCredibility: "grounded",
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
} as const;

const adapter: ReplyGenerationModelAdapter = {
  async analyzeReply() {
    return {
      analysis: {
        intent: "needs_more_info",
        objectionType: "timing",
        classification: "needs_more_info",
        confidence: {
          score: 0.78,
          label: "medium",
          reasons: ["The prospect explicitly asked for more context."],
        },
        recommendedAction: "send_more_info",
        rationale:
          "The reply indicates interest but asks for more context while signaling timing friction.",
        keySignals: ["Timing is not right", "Can you send more context"],
        cautionFlags: [],
      },
      rationale: "The inbound reply is informative enough for a medium-confidence classification.",
      qualityChecks: [],
      analysisMetadata: metadata,
    };
  },
  async recommendResponseStrategy() {
    return {
      strategy: {
        recommendedAction: "send_more_info",
        draftingStrategy:
          "Acknowledge timing, answer the request for more context, and suggest a low-pressure next step.",
        guardrails: ["Do not overstate outcomes", "Keep the reply concise"],
        toneGuidance: ["Stay calm", "Use tentative language where evidence is thin"],
        escalationNeeded: false,
      },
      rationale: "A concise informational follow-up is the best next move.",
      qualityChecks: [],
      analysisMetadata: metadata,
    };
  },
  async generateDraftReplies() {
    return {
      output: {
        recommendedAction: "send_more_info",
        draftingStrategy:
          "Acknowledge timing, answer the request for more context, and suggest a light next step.",
        confidence: {
          score: 0.66,
          label: "medium",
          reasons: ["The prospect asked for more information explicitly."],
        },
        drafts: [
          {
            slotId: "option-1",
            label: "Concise context",
            subject: "More context on outbound workflow",
            bodyText:
              "Thanks for the quick reply. Understood on timing. At a high level, we help lean teams keep outbound messaging grounded in sender context and prospect evidence without adding extra manual work. If helpful, I can send a short example and you can decide if a conversation later makes sense.",
            strategyNote: "Useful when the prospect asked for more context but timing is uncertain.",
          },
          {
            slotId: "option-2",
            label: "Softer follow-up",
            subject: "Helpful context for later",
            bodyText:
              "Appreciate the note. Sounds like this quarter is tight, so I will keep this brief. We focus on helping teams produce more relevant outbound with less guesswork. If it is useful, I can send a one-paragraph summary for you to review when timing improves.",
            strategyNote: "Best when confidence is moderate and pressure should stay low.",
          },
        ],
        guardrails: ["Do not push for a meeting immediately"],
      },
      rationale: "Both drafts answer the request while respecting timing sensitivity.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
  async regenerateDraftReplyOption() {
    return {
      regeneratedDraft: {
        slotId: "option-2",
        label: "Refined softer follow-up",
        subject: "Context you can review later",
        bodyText:
          "Thanks for clarifying. I understand timing is not ideal right now. We help teams make outbound messaging more relevant and easier to manage, and I am happy to send a short summary you can review later if that is helpful.",
        strategyNote: "Keeps pressure low and avoids repeating the full thread.",
      },
      rationale: "The regenerated draft is shorter and softer.",
      qualityChecks: [],
      generationMetadata: metadata,
    };
  },
};

const service = createReplyEngineService(adapter);
const analysis = await service.analyzeReply(request);
assert.equal(analysis.analysis.intent, "needs_more_info");

const strategy = await service.recommendResponseStrategy({
  request,
  analysis: analysis.analysis,
});
assert.equal(strategy.strategy.recommendedAction, "send_more_info");

const drafts = await service.generateDraftReplies({
  request,
  analysis: analysis.analysis,
  strategy: strategy.strategy,
});
assert.equal(drafts.output.drafts.length, 2);
assert.equal(
  drafts.qualityChecks.some((check) => check.name === "no_invented_facts"),
  true,
);

const scoredDraft = scoreDraftReplyQuality(
  {
    slotId: "option-risky",
    label: "Pushy draft",
    subject: "Amazing fit for ProspectCo",
    bodyText:
      "Love what you are doing. We can guarantee results, so let's get on a call ASAP and I can walk through everything again.",
    strategyNote: "Intentionally risky for quality test coverage.",
  },
  {
    request,
    analysis: analysis.analysis,
    strategy: strategy.strategy,
  },
);

assert.ok(scoredDraft.summary.score < 80);
assert.equal(
  scoredDraft.checks.some((check) => check.code === "unverifiable_claims" && !check.passed),
  true,
);
assert.equal(
  scoredDraft.checks.some((check) => check.code === "spammy_or_overhyped_language" && !check.passed),
  true,
);

const regenerated = await service.regenerateDraftReplyOption({
  baseInput: {
    request,
    analysis: analysis.analysis,
    strategy: strategy.strategy,
  },
  targetSlotId: "option-2",
  currentOutput: drafts.output,
  feedback: "Make it a little shorter and softer.",
});
assert.equal(regenerated.regeneratedDraft.slotId, "option-2");

console.log("@ceg/reply-engine contract tests passed");
