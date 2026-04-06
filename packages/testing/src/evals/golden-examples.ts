export type EvaluationExpectedProperty = {
  key: string;
  description: string;
  required: boolean;
};

export type GoldenExample = {
  id: string;
  operation:
    | "research_profile_extraction"
    | "sequence_generation"
    | "sequence_regeneration"
    | "reply_analysis"
    | "reply_drafting";
  scenario: string;
  expectedProperties: EvaluationExpectedProperty[];
  discouragedPatterns: string[];
};

export const goldenExamples = {
  research: [
    {
      id: "company-profile-public-site",
      operation: "research_profile_extraction",
      scenario:
        "Research output should produce a structured company profile with evidence and personalization hooks.",
      expectedProperties: [
        {
          key: "companyName",
          description: "A company name should be present when public evidence supports it.",
          required: true,
        },
        {
          key: "summary",
          description: "A company summary should be present.",
          required: true,
        },
        {
          key: "valuePropositions",
          description: "At least one supported value proposition should be present.",
          required: true,
        },
        {
          key: "likelyPainPoints",
          description: "At least one likely pain point should be present.",
          required: true,
        },
        {
          key: "personalizationHooks",
          description: "At least one personalization hook should be present.",
          required: true,
        },
      ],
      discouragedPatterns: ["revolutionary", "guarantee results"],
    },
  ] satisfies GoldenExample[],
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
  replyAnalysis: [
    {
      id: "timing-objection-analysis",
      operation: "reply_analysis",
      scenario:
        "Reply analysis should classify the objection clearly and recommend a grounded next action.",
      expectedProperties: [
        {
          key: "classification",
          description: "A structured classification should be present.",
          required: true,
        },
        {
          key: "recommendedAction",
          description: "A recommended next action should be present.",
          required: true,
        },
        {
          key: "confidence",
          description: "Confidence metadata should be present.",
          required: true,
        },
        {
          key: "rationale",
          description: "The analysis should explain its reasoning.",
          required: true,
        },
      ],
      discouragedPatterns: ["ASAP", "guarantee results", "touching base"],
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
          description: "The draft output should include confidence metadata.",
          required: true,
        },
        {
          key: "draftingStrategy",
          description: "A clear draft strategy should be present.",
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
