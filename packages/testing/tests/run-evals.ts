import assert from "node:assert/strict";

import { compiledSequenceOutputSchema } from "../../sequence-engine/dist/index.js";
import {
  companyProfileSchema,
  draftReplyOutputSchema,
  replyClassificationOutputSchema,
} from "../../validation/dist/index.js";
import {
  goldenExamples,
  inboundReplyFixtures,
  prospectWebsiteSummaryFixtures,
  runWorkflowEvalSuite,
  senderProfileFixtures,
} from "../dist/index.js";

const metadata = {
  provider: "eval-provider",
  model: "eval-model",
  promptVersion: "eval.v1",
  inputTokens: 24,
  outputTokens: 68,
  totalTokens: 92,
  costUsd: null,
  generatedAt: new Date("2026-04-05T09:00:00.000Z"),
} as const;

const compiledSequence = compiledSequenceOutputSchema.parse({
  subjectLineSet: {
    subjectLines: [
      {
        text: "Reduce manual outbound work at ProspectCo",
        rationale: "Grounded in the prospect's public positioning.",
      },
    ],
    rationale: "Focused on a supported pain point.",
    qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
    generationMetadata: metadata,
  },
  openerSet: {
    openerOptions: [
      {
        text: "Your team appears focused on revenue workflow automation.",
        rationale: "Uses a supported personalization hook.",
        evidenceSupport: ["Revenue workflow automation"],
      },
    ],
    rationale: "Evidence-backed opener.",
    qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
    generationMetadata: metadata,
  },
  initialEmail: {
    email: {
      subject: "Reduce manual outbound work at ProspectCo",
      opener: "Your team appears focused on revenue workflow automation.",
      body: "You mentioned reducing manual outbound work. We help founder-led teams keep outbound messaging grounded in sender context and prospect evidence. Open to a short conversation next week?",
      cta: "Open to a short conversation next week?",
      rationale: "Specific and low-hype.",
      qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
    },
    rationale: "Aligned to the founder context.",
    qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
    generationMetadata: metadata,
  },
  followUpSequence: {
    sequenceSteps: [
      {
        stepNumber: 1,
        waitDays: 3,
        subject: "Worth a quick look?",
        opener: "Following up on the workflow angle.",
        body: "If reducing manual outbound work is still a focus, I can share a concise example.",
        cta: "Want me to send the concise example?",
        rationale: "Soft CTA with no unsupported claims.",
        qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
      },
      {
        stepNumber: 2,
        waitDays: 6,
        subject: "Should I close the loop?",
        opener: "Happy to close the loop if this is not a priority.",
        body: "I can leave it there, or send a short example for later review if helpful.",
        cta: "Prefer that I send the example or close the loop?",
        rationale: "Low-pressure close.",
        qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
      },
    ],
    rationale: "Short, evidence-aware follow-up sequence.",
    qualityChecks: [{ name: "no_unsupported_claims", passed: true, details: "Grounded output." }],
    generationMetadata: metadata,
  },
  sequenceVersion: 1,
  generatedForMode: "sender_aware",
});

const sequenceEvalSchema = compiledSequenceOutputSchema.transform((output) => ({
  subjectLines: output.subjectLineSet.subjectLines,
  openerOptions: output.openerSet.openerOptions,
  sequenceSteps: output.followUpSequence.sequenceSteps,
  rationale: [
    output.subjectLineSet.rationale,
    output.openerSet.rationale,
    output.initialEmail.rationale,
    output.followUpSequence.rationale,
  ].join(" "),
  qualityChecks: [
    ...output.subjectLineSet.qualityChecks,
    ...output.openerSet.qualityChecks,
    ...output.initialEmail.qualityChecks,
    ...output.followUpSequence.qualityChecks,
  ],
}));

const replyAnalysis = replyClassificationOutputSchema.parse({
  intent: "needs_more_info",
  objectionType: "timing",
  classification: "needs_more_info",
  confidence: {
    score: 0.76,
    label: "medium",
    reasons: ["Prospect asked for more context while pushing timing out."],
  },
  recommendedAction: "send_more_info",
  rationale: "The prospect did not reject the offer, but timing is constrained and more context was requested.",
  keySignals: ["Timing is not right", "send more context"],
  cautionFlags: [],
});

const replyDrafts = draftReplyOutputSchema.parse({
  recommendedAction: "stop_outreach",
  draftingStrategy: "Respect the hard no, confirm the request, and avoid further persuasion.",
  confidence: {
    score: 0.93,
    label: "high",
    reasons: ["The prospect explicitly asked for no more outreach."],
  },
  drafts: [
    {
      slotId: "hard-no-safe-1",
      label: "Respectful close",
      subject: "Understood",
      bodyText: "Understood. I will close the loop here and make sure no further outreach is sent.",
      strategyNote: "Acknowledge the request directly and stop outreach.",
    },
    {
      slotId: "hard-no-safe-2",
      label: "Brief confirmation",
      subject: "Confirmed",
      bodyText: "Thanks for letting me know. I will make sure the outreach stops here.",
      strategyNote: "Short confirmation with no additional pitch.",
    },
  ],
  guardrails: ["Do not push after a hard no."],
});

const suite = runWorkflowEvalSuite([
  {
    id: goldenExamples.research[0].id,
    workflow: "research_profile_extraction",
    description: goldenExamples.research[0].scenario,
    schema: companyProfileSchema,
    output: companyProfileSchema.parse(prospectWebsiteSummaryFixtures.revenueAutomation),
    expectedProperties: goldenExamples.research[0].expectedProperties,
    textBlocks: [
      prospectWebsiteSummaryFixtures.revenueAutomation.summary ?? "",
      ...prospectWebsiteSummaryFixtures.revenueAutomation.valuePropositions,
      ...prospectWebsiteSummaryFixtures.revenueAutomation.likelyPainPoints,
      ...prospectWebsiteSummaryFixtures.revenueAutomation.personalizationHooks,
    ],
    discouragedPatterns: goldenExamples.research[0].discouragedPatterns,
    toneAvoidPhrases: ["guarantee", "revolutionary"],
  },
  {
    id: goldenExamples.sequence[0].id,
    workflow: "sequence_generation",
    description: goldenExamples.sequence[0].scenario,
    schema: sequenceEvalSchema,
    output: compiledSequence,
    expectedProperties: goldenExamples.sequence[0].expectedProperties,
    textBlocks: [
      ...compiledSequence.subjectLineSet.subjectLines.map((item) => item.text),
      ...compiledSequence.openerSet.openerOptions.map((item) => item.text),
      compiledSequence.initialEmail.email.body,
      ...compiledSequence.followUpSequence.sequenceSteps.map((item) => item.body),
    ],
    discouragedPatterns: goldenExamples.sequence[0].discouragedPatterns,
    toneAvoidPhrases: senderProfileFixtures.saasFounder.tonePreferences.avoid,
  },
  {
    id: goldenExamples.replyAnalysis[0].id,
    workflow: "reply_analysis",
    description: goldenExamples.replyAnalysis[0].scenario,
    schema: replyClassificationOutputSchema,
    output: replyAnalysis,
    expectedProperties: goldenExamples.replyAnalysis[0].expectedProperties,
    textBlocks: [replyAnalysis.rationale, ...replyAnalysis.keySignals],
    discouragedPatterns: goldenExamples.replyAnalysis[0].discouragedPatterns,
    toneAvoidPhrases: ["guarantee", "ASAP"],
  },
  {
    id: goldenExamples.replies[0].id,
    workflow: "reply_drafting",
    description: goldenExamples.replies[0].scenario,
    schema: draftReplyOutputSchema,
    output: replyDrafts,
    expectedProperties: goldenExamples.replies[0].expectedProperties,
    textBlocks: replyDrafts.drafts.map((draft) => draft.bodyText),
    discouragedPatterns: goldenExamples.replies[0].discouragedPatterns,
    toneAvoidPhrases: senderProfileFixtures.basic.tonePreferences.avoid,
    enforceHardNoGuard: replyDrafts.recommendedAction === "stop_outreach",
  },
]);

assert.equal(suite.summary.totalCases, 4);
assert.equal(suite.summary.failedCases, 0);
assert.equal(suite.results.every((result) => result.passed), true);
assert.equal(
  suite.results.some((result) => result.workflow === "reply_drafting"),
  true,
);
assert.equal(inboundReplyFixtures.hardNo.latestInboundMessage.subject, "Re: outreach");

console.log("@ceg/testing workflow eval harness passed");
for (const result of suite.results) {
  console.log(`- ${result.workflow}:${result.id} => ${result.passed ? "pass" : "fail"}`);
}



