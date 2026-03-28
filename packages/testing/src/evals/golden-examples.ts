export type EvaluationExpectedProperty = {
  key: string;
  description: string;
  required: boolean;
};

export type GoldenExample = {
  id: string;
  operation:
    | "sequence_generation"
    | "sequence_regeneration"
    | "reply_analysis"
    | "reply_drafting";
  scenario: string;
  expectedProperties: EvaluationExpectedProperty[];
  discouragedPatterns: string[];
};

export const goldenExamples = {
  sequence: [
    {
      id: "founder-sequence-prospect-research",
      operation: "sequence_generation",
      scenario:
        "Founder-mode sequence should use supported pain points and include a soft CTA.",
      expectedProperties: [
        {
          key: "subjectLines",
          description: "At least one subject line should be present.",
          required: true,
        },
        {
          key: "openerOptions",
          description: "At least one opener option should be present.",
          required: true,
        },
        {
          key: "sequenceSteps",
          description: "Initial and follow-up steps should be present.",
          required: true,
        },
        {
          key: "rationale",
          description: "Generation should explain why the wording was chosen.",
          required: true,
        },
        {
          key: "qualityChecks",
          description: "Validated quality checks should accompany the output.",
          required: true,
        },
      ],
      discouragedPatterns: [
        "touching base",
        "guarantee results",
        "revolutionary",
      ],
    },
  ] satisfies GoldenExample[],
  replies: [
    {
      id: "timing-objection-needs-more-info",
      operation: "reply_drafting",
      scenario:
        "Timing-related reply should acknowledge the objection, answer the request, and stay low-pressure.",
      expectedProperties: [
        {
          key: "classification",
          description: "A structured reply classification should be present.",
          required: true,
        },
        {
          key: "recommendedAction",
          description: "A next action recommendation should be present.",
          required: true,
        },
        {
          key: "drafts",
          description: "Multiple response draft slots should be present.",
          required: true,
        },
        {
          key: "confidence",
          description: "The analysis should include confidence metadata.",
          required: true,
        },
      ],
      discouragedPatterns: [
        "ASAP",
        "guarantee results",
        "just checking in",
      ],
    },
  ] satisfies GoldenExample[],
} as const;
