export type RegressionCase = {
  id: string;
  concern: "unsupported_claims" | "pushiness_after_hard_no" | "generic_fluff";
  content: string;
  expectedFlag: string;
  explanation: string;
};

export const regressionCases = {
  unsupportedClaims: [
    {
      id: "sequence-claim-guarantee",
      concern: "unsupported_claims",
      content:
        "We can guarantee better outbound performance and double your pipeline fast.",
      expectedFlag: "unverifiable_claims",
      explanation:
        "Sequence outputs should be rejected or downgraded when they make outcome guarantees.",
    },
    {
      id: "reply-claim-guarantee",
      concern: "unsupported_claims",
      content:
        "We can guarantee results, so let's get on a call ASAP and I can walk through everything again.",
      expectedFlag: "unverifiable_claims",
      explanation:
        "Reply drafts should not invent performance certainty during objection handling.",
    },
  ] satisfies RegressionCase[],
  hardNoPushiness: [
    {
      id: "reply-hard-no-pressure",
      concern: "pushiness_after_hard_no",
      content:
        "I hear you, but can I still grab 15 minutes next week to explain why this is worth another look?",
      expectedFlag: "respect_hard_no",
      explanation:
        "Draft replies should not continue pushing once the prospect has issued a hard no.",
    },
  ] satisfies RegressionCase[],
  genericFluff: [
    {
      id: "sequence-empty-compliment",
      concern: "generic_fluff",
      content: "Love what your team is doing. You are clearly crushing it.",
      expectedFlag: "generic_fluff",
      explanation:
        "Outputs should avoid empty compliments that are not grounded in evidence.",
    },
  ] satisfies RegressionCase[],
} as const;
