import assert from "node:assert/strict";

import {
  companyProfileSchema,
  draftReplyOutputSchema,
  replyAnalysisInputSchema,
  replyClassificationOutputSchema,
  senderProfileSchema,
} from "../../validation/dist/index.js";

import {
  assertRequiredStringFields,
  buildSequenceEvaluationContext,
  findDiscouragedFluff,
  findHardNoPushiness,
  findUnsupportedClaims,
  goldenExamples,
  inboundReplyFixtures,
  prospectWebsiteSummaryFixtures,
  regressionCases,
  senderProfileFixtures,
  summarizeReplyExpectations,
} from "../dist/index.js";

const validatedFounder = senderProfileSchema.parse(
  senderProfileFixtures.saasFounder,
);
const validatedBasic = senderProfileSchema.parse(senderProfileFixtures.basic);
const validatedProspect = companyProfileSchema.parse(
  prospectWebsiteSummaryFixtures.revenueAutomation,
);

assert.equal(validatedFounder.senderType, "saas_founder");
assert.equal(validatedBasic.senderType, "basic");
assert.ok(validatedProspect.personalizationHooks.length > 0);

const validatedReplyInput = replyAnalysisInputSchema.parse(
  inboundReplyFixtures.needsMoreInfo,
);
assert.equal(validatedReplyInput.threadMessages.length >= 1, true);

const missingFields = assertRequiredStringFields(
  {
    rationale: "Grounded in supported pain points.",
    qualityChecks: "present",
    subjectLines: "present",
    openerOptions: "present",
    sequenceSteps: "present",
  },
  goldenExamples.sequence[0].expectedProperties
    .filter((property) => property.required)
    .map((property) => property.key),
);
assert.deepEqual(missingFields, []);

const unsupportedClaims = regressionCases.unsupportedClaims.flatMap((item) =>
  findUnsupportedClaims(item.content),
);
assert.ok(unsupportedClaims.length >= 2);

const pushyAfterHardNo = regressionCases.hardNoPushiness.flatMap((item) =>
  findHardNoPushiness(item.content),
);
assert.ok(pushyAfterHardNo.length >= 1);

const discouragedFluff = regressionCases.genericFluff.flatMap((item) =>
  findDiscouragedFluff(item.content),
);
assert.ok(discouragedFluff.length >= 1);

const sequenceContext = buildSequenceEvaluationContext({
  senderProfile: validatedFounder,
  companyProfile: validatedProspect,
});
assert.equal(sequenceContext.companyName, "ProspectCo");

const replySummary = summarizeReplyExpectations({
  analysis: replyClassificationOutputSchema.parse({
    intent: "hard_no",
    objectionType: "none",
    classification: "hard_no",
    confidence: {
      score: 0.9,
      label: "high",
      reasons: ["The prospect clearly asked for no more outreach."],
    },
    recommendedAction: "stop_outreach",
    rationale: "The prospect explicitly asked to stop contact.",
    keySignals: ["Please take me off this list"],
    cautionFlags: ["Hard no should not be challenged."],
  }),
  draftOutput: draftReplyOutputSchema.parse({
    recommendedAction: "stop_outreach",
    draftingStrategy: "Politely confirm removal and do not continue pitching.",
    confidence: {
      score: 0.88,
      label: "high",
      reasons: ["Explicit stop request"],
    },
    drafts: [
      {
        slotId: "stop-1",
        label: "Respectful close",
        subject: "Understood",
        bodyText:
          "Understood. I will close the loop here and make sure no further outreach is sent.",
        strategyNote: "Respect the request and avoid further persuasion.",
      },
    ],
    guardrails: ["Do not continue pitching after a hard no."],
  }),
});

assert.equal(replySummary.action, "stop_outreach");
assert.equal(replySummary.draftCount, 1);

console.log("@ceg/testing evaluation fixtures and harness tests passed");
