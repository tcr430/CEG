import type {
  SequenceGenerationInput,
  SequenceGenerationModelAdapter,
} from "@ceg/sequence-engine";
import {
  followUpSequenceGenerationOutputSchema,
  initialEmailGenerationOutputSchema,
  openerGenerationOutputSchema,
  regenerateSequencePartOutputSchema,
  subjectLineGenerationOutputSchema,
} from "@ceg/sequence-engine";

import { callAnthropicJson } from "./anthropic-json";

const DEFAULT_ANTHROPIC_SEQUENCE_MODEL = "claude-3-5-sonnet-latest";
const PROMPT_VERSION = "sequence.v1";

function getModelName(): string {
  return (
    process.env.ANTHROPIC_SEQUENCE_MODEL?.trim() ||
    DEFAULT_ANTHROPIC_SEQUENCE_MODEL
  );
}

function getConfidenceDirective(input: SequenceGenerationInput): string {
  const label = input.prospectCompanyProfile.confidence.label;

  if (label === "low") {
    return "Evidence is weak. Use softer phrasing like appears, likely, may, or seems. Do not present uncertain inferences as facts.";
  }

  if (label === "medium") {
    return "Evidence is moderate. Stay specific, but soften any inferred claims that are not directly stated on the website.";
  }

  return "Evidence is strong enough for direct references, but still avoid unsupported claims or invented specifics.";
}

function getSenderDirective(input: SequenceGenerationInput): string {
  if (input.senderContext.mode === "basic") {
    return `Use basic mode fallback. Do not imply a named sender persona. Reason: ${input.senderContext.basicModeReason}`;
  }

  const profile = input.senderContext.senderProfile;
  return [
    `Sender type: ${profile.senderType}`,
    `Profile name: ${profile.name}`,
    profile.companyName ? `Company: ${profile.companyName}` : null,
    profile.productDescription ? `Offer: ${profile.productDescription}` : null,
    profile.targetCustomer ? `Target customer: ${profile.targetCustomer}` : null,
    profile.valueProposition ? `Value proposition: ${profile.valueProposition}` : null,
    profile.differentiation ? `Differentiation: ${profile.differentiation}` : null,
    profile.proofPoints.length > 0
      ? `Supported proof points: ${profile.proofPoints.join(" | ")}`
      : null,
    profile.goals.length > 0 ? `Goals: ${profile.goals.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function getProspectEvidenceSummary(input: SequenceGenerationInput): string {
  const profile = input.prospectCompanyProfile;
  const evidence = profile.sourceEvidence
    .slice(0, 4)
    .map((item) => `- (${item.confidence.label}) ${item.snippet}`)
    .join("\n");

  return [
    `Prospect company: ${profile.companyName ?? profile.domain}`,
    profile.summary ? `Summary: ${profile.summary}` : null,
    profile.valuePropositions.length > 0
      ? `Observed value proposition cues: ${profile.valuePropositions.join(" | ")}`
      : null,
    profile.likelyTargetCustomer
      ? `Likely target customer: ${profile.likelyTargetCustomer}`
      : null,
    profile.likelyPainPoints.length > 0
      ? `Likely pain points: ${profile.likelyPainPoints.join(" | ")}`
      : null,
    profile.personalizationHooks.length > 0
      ? `Personalization hooks: ${profile.personalizationHooks.join(" | ")}`
      : null,
    evidence ? `Evidence snippets:\n${evidence}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function getPerformanceHintsDirective(input: SequenceGenerationInput): string | null {
  const hints = input.promptContext.performanceHints;

  if (!hints?.available) {
    return null;
  }

  return [
    `Performance hint confidence: ${hints.confidence}`,
    hints.preferredToneStyle
      ? `Preferred tone from better-performing history: ${hints.preferredToneStyle}`
      : null,
    hints.effectivePatterns.length > 0
      ? `Patterns that performed better: ${hints.effectivePatterns.map((pattern) => pattern.guidance).join(" | ")}`
      : null,
    hints.cautionPatterns.length > 0
      ? `Patterns to use cautiously: ${hints.cautionPatterns.map((pattern) => pattern.guidance).join(" | ")}`
      : null,
    hints.notes.length > 0 ? `Hint notes: ${hints.notes.join(" | ")}` : null,
    "Use these only as gentle historical bias. Current sender, prospect evidence, and safety constraints take priority.",
  ]
    .filter(Boolean)
    .join("\n");
}
function getSharedSystemPrompt(input: SequenceGenerationInput): string {
  return [
    "You generate institutional-grade outbound email sequences.",
    "Return valid JSON only. No markdown fences.",
    "Never invent metrics, customers, proof points, or outcomes.",
    "Do not use unsupported claims, guarantees, or certainty language.",
    "Avoid generic fluff like hope you are well or just checking in.",
    "Every email must include a concrete CTA.",
    getConfidenceDirective(input),
    getPerformanceHintsDirective(input),
    `Framework: ${input.promptContext.framework}`,
    `Tone style: ${input.promptContext.tone.style}`,
    `Tone do: ${input.promptContext.tone.do.join(" | ") || "none"}`,
    `Tone avoid: ${input.promptContext.tone.avoid.join(" | ") || "none"}`,
    `Objective: ${input.objective}`,
    getSenderDirective(input),
    getProspectEvidenceSummary(input),
  ].join("\n\n");
}

async function callSequenceJson<TOutput>(input: {
  sequenceInput: SequenceGenerationInput;
  task: string;
  outputInstructions: string;
  validate: (payload: unknown) => TOutput;
}): Promise<TOutput> {
  return callAnthropicJson({
    model: getModelName(),
    promptVersion: PROMPT_VERSION,
    system: getSharedSystemPrompt(input.sequenceInput),
    user: [`Task: ${input.task}`, input.outputInstructions, "Return JSON only."].join(
      "\n\n",
    ),
    validate: input.validate,
  });
}

export function createAnthropicSequenceModelAdapter(): SequenceGenerationModelAdapter {
  return {
    async generateSubjectLines(input) {
      return callSequenceJson({
        sequenceInput: input,
        task: "Generate multiple outbound email subject lines.",
        outputInstructions: [
          "Return exactly 3 distinct subject line options.",
          "Each subject must be specific to the campaign and prospect context.",
          "Prefer concise subjects under the configured target.",
          '{"subjectLines":[{"text":"...","rationale":"..."}],"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => subjectLineGenerationOutputSchema.parse(payload),
      });
    },
    async generateOpeners(input) {
      return callSequenceJson({
        sequenceInput: input,
        task: "Generate multiple opener options for an outbound email.",
        outputInstructions: [
          "Return exactly 3 opener options.",
          "Each opener should be grounded in the prospect evidence when available.",
          '{"openerOptions":[{"text":"...","rationale":"...","evidenceSupport":["..."]}],"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => openerGenerationOutputSchema.parse(payload),
      });
    },
    async generateInitialEmail(input) {
      return callSequenceJson({
        sequenceInput: input,
        task: "Generate the initial outbound email.",
        outputInstructions: [
          "Return one initial email with subject, opener, body, CTA, and rationale.",
          "Keep it concise and grounded in supported evidence.",
          '{"email":{"subject":"...","opener":"...","body":"...","cta":"...","rationale":"..."},"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => initialEmailGenerationOutputSchema.parse(payload),
      });
    },
    async generateFollowUpSequence(input) {
      return callSequenceJson({
        sequenceInput: input,
        task: "Generate follow-up sequence emails.",
        outputInstructions: [
          "Return exactly 3 follow-up steps: follow-up 1, follow-up 2, and a final soft-close or breakup email.",
          "Set step numbers to 1, 2, and 3.",
          "Use increasing wait days such as 3, 5, and 7.",
          '{"sequenceSteps":[{"stepNumber":1,"waitDays":3,"subject":"...","opener":"...","body":"...","cta":"...","rationale":"..."}],"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => followUpSequenceGenerationOutputSchema.parse(payload),
      });
    },
    async regenerateSequencePart(input) {
      return callSequenceJson({
        sequenceInput: input.baseInput,
        task: "Regenerate one specific part of an outbound sequence.",
        outputInstructions: [
          `Regenerate only the requested part: ${input.targetPart}.`,
          input.targetStepNumber
            ? `Target follow-up step number: ${input.targetStepNumber}.`
            : null,
          `Feedback: ${input.feedback}`,
          '{"regeneratedPart":{"part":"subject_line","subjectLines":[{"text":"...","rationale":"..."}]},"rationale":"..."}',
        ]
          .filter(Boolean)
          .join("\n"),
        validate: (payload) => regenerateSequencePartOutputSchema.parse(payload),
      });
    },
  };
}

