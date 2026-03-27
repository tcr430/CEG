import {
  emailDraftSchema,
  followUpSequenceGenerationOutputSchema,
  initialEmailGenerationOutputSchema,
  openerGenerationOutputSchema,
  regenerateSequencePartOutputSchema,
  subjectLineGenerationOutputSchema,
  type EmailDraft,
  type FollowUpSequenceGenerationOutput,
  type InitialEmailGenerationOutput,
  type OpenerGenerationOutput,
  type RegenerateSequencePartOutput,
  type SequenceGenerationInput,
  type SequenceQualityCheck,
  type SequenceStep,
  type SubjectLineGenerationOutput,
  type SequenceValidationContext,
} from "./contracts.js";

const GENERIC_FLUFF_PATTERNS = [
  /just checking in/i,
  /hope you('?| a)re well/i,
  /world[- ]class/i,
  /game[- ]changer/i,
  /revolutionary/i,
  /best-in-class/i,
];

const UNSUPPORTED_CLAIM_PATTERNS = [
  /guarantee/i,
  /always/i,
  /never miss/i,
  /100%/i,
  /proven ROI/i,
];

const CTA_PATTERNS = [
  /open to/i,
  /worth a conversation/i,
  /book/i,
  /demo/i,
  /chat/i,
  /reply/i,
  /connect/i,
];

function includesPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function flattenToneWords(context: SequenceValidationContext): string[] {
  return [
    context.promptContext.tone.style,
    ...context.promptContext.tone.do,
    ...context.promptContext.tone.avoid,
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);
}

export function validateNoGenericFluff(text: string): SequenceQualityCheck {
  const passed = !includesPattern(text, GENERIC_FLUFF_PATTERNS);

  return {
    name: "no_generic_fluff",
    passed,
    details: passed
      ? "The draft avoids common generic outreach filler."
      : "The draft contains generic outreach phrasing that should be rewritten.",
  };
}

export function validateCtaPresence(text: string): SequenceQualityCheck {
  const passed = includesPattern(text, CTA_PATTERNS);

  return {
    name: "cta_presence",
    passed,
    details: passed
      ? "A concrete call to action is present."
      : "No clear call to action was detected.",
  };
}

export function validateMaxLengthTargets(
  input: {
    subject?: string;
    opener?: string;
    body?: string;
  },
  generationInput: SequenceGenerationInput,
): SequenceQualityCheck {
  const { maxSubjectLength, maxOpenerLength, maxEmailBodyLength } =
    generationInput.promptContext.constraints;

  const passed =
    (input.subject === undefined || input.subject.length <= maxSubjectLength) &&
    (input.opener === undefined || input.opener.length <= maxOpenerLength) &&
    (input.body === undefined || input.body.length <= maxEmailBodyLength);

  return {
    name: "max_length_targets",
    passed,
    details: passed
      ? "Subject, opener, and body lengths are within target ranges."
      : "One or more generated parts exceed the configured length targets.",
  };
}

export function validateNoUnsupportedClaims(text: string): SequenceQualityCheck {
  const passed = !includesPattern(text, UNSUPPORTED_CLAIM_PATTERNS);

  return {
    name: "no_unsupported_claims",
    passed,
    details: passed
      ? "No unsupported certainty or guarantee language was detected."
      : "The draft contains certainty or guarantee language that needs evidence.",
  };
}

export function validateToneFit(
  text: string,
  context: SequenceValidationContext,
): SequenceQualityCheck {
  const avoidMatches = context.promptContext.tone.avoid.filter((phrase: string) =>
    text.toLowerCase().includes(phrase.toLowerCase()),
  );
  const styleMentioned = flattenToneWords(context).some((word) =>
    text.toLowerCase().includes(word),
  );
  const passed = avoidMatches.length === 0 && styleMentioned;

  return {
    name: "tone_fit",
    passed,
    details: passed
      ? "The draft appears aligned with the requested tone guidance."
      : avoidMatches.length > 0
        ? `The draft uses discouraged tone cues: ${avoidMatches.join(", ")}.`
        : "The requested tone guidance is not yet clearly reflected in the draft.",
  };
}

export function runSequenceQualityChecks(
  draft: {
    subject?: string;
    opener?: string;
    body?: string;
    cta?: string;
  },
  generationInput: SequenceGenerationInput,
): SequenceQualityCheck[] {
  const combinedText = [draft.subject, draft.opener, draft.body, draft.cta]
    .filter(Boolean)
    .join("\n\n");

  return [
    validateNoGenericFluff(combinedText),
    validateCtaPresence([draft.body, draft.cta].filter(Boolean).join("\n")),
    validateMaxLengthTargets(draft, generationInput),
    validateNoUnsupportedClaims(combinedText),
    validateToneFit(combinedText, generationInput),
  ];
}

export function attachQualityChecksToEmailDraft(
  draft: Omit<EmailDraft, "qualityChecks">,
  generationInput: SequenceGenerationInput,
): EmailDraft {
  return emailDraftSchema.parse({
    ...draft,
    qualityChecks: runSequenceQualityChecks(draft, generationInput),
  });
}

export function attachQualityChecksToSequenceSteps(
  steps: Omit<SequenceStep, "qualityChecks">[],
  generationInput: SequenceGenerationInput,
): SequenceStep[] {
  return steps.map((step) => ({
    ...step,
    qualityChecks: runSequenceQualityChecks(step, generationInput),
  }));
}

export function validateSubjectLineOutput(
  output: SubjectLineGenerationOutput,
  input: SequenceGenerationInput,
): SubjectLineGenerationOutput {
  return subjectLineGenerationOutputSchema.parse({
    ...output,
    qualityChecks: output.subjectLines.flatMap((candidate: { text: string }) =>
      runSequenceQualityChecks({ subject: candidate.text }, input),
    ),
  });
}

export function validateOpenerOutput(
  output: OpenerGenerationOutput,
  input: SequenceGenerationInput,
): OpenerGenerationOutput {
  return openerGenerationOutputSchema.parse({
    ...output,
    qualityChecks: output.openerOptions.flatMap((candidate: { text: string }) =>
      runSequenceQualityChecks({ opener: candidate.text }, input),
    ),
  });
}

export function validateInitialEmailOutput(
  output: InitialEmailGenerationOutput,
  input: SequenceGenerationInput,
): InitialEmailGenerationOutput {
  return initialEmailGenerationOutputSchema.parse({
    ...output,
    email: attachQualityChecksToEmailDraft(output.email, input),
    qualityChecks: runSequenceQualityChecks(output.email, input),
  });
}

export function validateFollowUpSequenceOutput(
  output: FollowUpSequenceGenerationOutput,
  input: SequenceGenerationInput,
): FollowUpSequenceGenerationOutput {
  const steps = attachQualityChecksToSequenceSteps(output.sequenceSteps, input);

  return followUpSequenceGenerationOutputSchema.parse({
    ...output,
    sequenceSteps: steps,
    qualityChecks: steps.flatMap((step) => step.qualityChecks),
  });
}

export function validateRegeneratedSequencePartOutput(
  output: RegenerateSequencePartOutput,
  input: SequenceGenerationInput,
): RegenerateSequencePartOutput {
  const regeneratedPart = { ...output.regeneratedPart };

  if (regeneratedPart.email) {
    regeneratedPart.email = attachQualityChecksToEmailDraft(
      regeneratedPart.email,
      input,
    );
  }

  if (regeneratedPart.sequenceStep) {
    regeneratedPart.sequenceStep = attachQualityChecksToSequenceSteps(
      [regeneratedPart.sequenceStep],
      input,
    )[0] as SequenceStep;
  }

  return regenerateSequencePartOutputSchema.parse({
    ...output,
    regeneratedPart,
    qualityChecks: output.qualityChecks.length > 0
      ? output.qualityChecks
      : runSequenceQualityChecks(
          {
            subject: regeneratedPart.email?.subject ?? regeneratedPart.sequenceStep?.subject,
            opener: regeneratedPart.email?.opener ?? regeneratedPart.sequenceStep?.opener,
            body: regeneratedPart.email?.body ?? regeneratedPart.sequenceStep?.body,
            cta: regeneratedPart.email?.cta ?? regeneratedPart.sequenceStep?.cta,
          },
          input,
        ),
  });
}

