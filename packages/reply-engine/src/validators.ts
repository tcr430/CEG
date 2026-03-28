import {
  draftReplyGenerationOutputSchema,
  regenerateDraftReplyOutputSchema,
  replyAnalysisOutputSchema,
  responseStrategyRecommendationOutputSchema,
  type DraftReplyGenerationOutput,
  type DraftReplyGenerationInput,
  type RegenerateDraftReplyOutput,
  type ReplyAnalysisOutput,
  type ReplyAnalysisRequest,
  type ReplyQualityCheck,
  type ReplyValidationContext,
  type ResponseStrategyRecommendationOutput,
} from "./contracts.js";

const INVENTED_FACT_PATTERNS = [
  /guarantee/i,
  /definitely/i,
  /100%/i,
  /proven roi/i,
  /we already know/i,
];

function includesPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function validateRespectHardNo(context: ReplyValidationContext): ReplyQualityCheck {
  const passed =
    context.analysis.intent !== "hard_no" ||
    context.analysis.recommendedAction === "stop_outreach";

  return {
    name: "respect_hard_no",
    passed,
    details: passed
      ? "The recommended action respects explicit do-not-pursue replies."
      : "Hard-no replies must not recommend continued outbound pressure.",
  };
}

export function validateNoInventedFacts(text: string): ReplyQualityCheck {
  const passed = !includesPattern(text, INVENTED_FACT_PATTERNS);

  return {
    name: "no_invented_facts",
    passed,
    details: passed
      ? "No invented certainty or unsupported proof language was detected."
      : "The draft contains unsupported certainty or invented fact language.",
  };
}

export function validateNoThreadRepetition(
  text: string,
  context: ReplyValidationContext,
): ReplyQualityCheck {
  const latestReply = context.analysisInput.latestInboundMessage.bodyText.toLowerCase();
  const repeated = latestReply.length > 24 && text.toLowerCase().includes(latestReply);

  return {
    name: "no_thread_repetition",
    passed: !repeated,
    details: repeated
      ? "The output repeats too much of the inbound thread instead of moving the conversation forward."
      : "The output does not simply restate the inbound thread.",
  };
}

export function validateToneFit(
  text: string,
  context: ReplyValidationContext,
): ReplyQualityCheck {
  const avoidMatches = context.promptContext.tone.avoid.filter((phrase: string) =>
    text.toLowerCase().includes(phrase.toLowerCase()),
  );
  const desiredMatches = context.promptContext.tone.do.filter((phrase: string) =>
    text.toLowerCase().includes(phrase.toLowerCase()),
  );
  const passed =
    avoidMatches.length === 0 &&
    (desiredMatches.length > 0 || text.toLowerCase().includes(context.promptContext.tone.style.toLowerCase()));

  return {
    name: "tone_fit",
    passed,
    details: passed
      ? "The reply appears aligned with the requested sender tone and credibility."
      : avoidMatches.length > 0
        ? `The reply uses discouraged tone cues: ${avoidMatches.join(", ")}.`
        : "The requested tone guidance is not yet clearly reflected in the reply.",
  };
}

export function validateConfidenceLanguageFit(
  text: string,
  context: ReplyValidationContext,
): ReplyQualityCheck {
  const needsSoftLanguage =
    context.analysis.confidence.label === "low" &&
    context.promptContext.constraints.softerLanguageWhenLowConfidence;
  const hasAggressiveLanguage = /obviously|definitely|must|certainly/i.test(text);
  const passed = !needsSoftLanguage || !hasAggressiveLanguage;

  return {
    name: "confidence_language_fit",
    passed,
    details: passed
      ? "The wording matches the available confidence level."
      : "Low-confidence situations should use softer, more tentative language.",
  };
}

export function runReplyQualityChecks(
  text: string,
  context: ReplyValidationContext,
): ReplyQualityCheck[] {
  return [
    validateRespectHardNo(context),
    validateNoInventedFacts(text),
    validateNoThreadRepetition(text, context),
    validateToneFit(text, context),
    validateConfidenceLanguageFit(text, context),
  ];
}

export function validateReplyAnalysisOutput(
  output: ReplyAnalysisOutput,
  input: ReplyAnalysisRequest,
): ReplyAnalysisOutput {
  const context: ReplyValidationContext = {
    ...input,
    analysis: output.analysis,
  };

  return replyAnalysisOutputSchema.parse({
    ...output,
    qualityChecks:
      output.qualityChecks.length > 0
        ? output.qualityChecks
        : [validateRespectHardNo(context)],
  });
}

export function validateResponseStrategyRecommendationOutput(
  output: ResponseStrategyRecommendationOutput,
  input: {
    request: ReplyAnalysisRequest;
    analysis: ReplyAnalysisOutput["analysis"];
  },
): ResponseStrategyRecommendationOutput {
  const context: ReplyValidationContext = {
    ...input.request,
    analysis: input.analysis,
    strategy: output.strategy,
  };

  return responseStrategyRecommendationOutputSchema.parse({
    ...output,
    qualityChecks:
      output.qualityChecks.length > 0
        ? output.qualityChecks
        : [validateRespectHardNo(context)],
  });
}

export function validateDraftReplyGenerationOutput(
  output: DraftReplyGenerationOutput,
  input: DraftReplyGenerationInput,
): DraftReplyGenerationOutput {
  const context: ReplyValidationContext = {
    ...input.request,
    analysis: input.analysis,
    strategy: input.strategy,
  };

  const qualityChecks = output.output.drafts.flatMap((draft: DraftReplyGenerationOutput["output"]["drafts"][number]) =>
    runReplyQualityChecks([draft.subject, draft.bodyText].filter(Boolean).join("\n\n"), context),
  );

  return draftReplyGenerationOutputSchema.parse({
    ...output,
    qualityChecks,
  });
}

export function validateRegeneratedDraftReplyOutput(
  output: RegenerateDraftReplyOutput,
  input: DraftReplyGenerationInput,
): RegenerateDraftReplyOutput {
  const context: ReplyValidationContext = {
    ...input.request,
    analysis: input.analysis,
    strategy: input.strategy,
  };

  return regenerateDraftReplyOutputSchema.parse({
    ...output,
    qualityChecks:
      output.qualityChecks.length > 0
        ? output.qualityChecks
        : runReplyQualityChecks(
            [output.regeneratedDraft.subject, output.regeneratedDraft.bodyText]
              .filter(Boolean)
              .join("\n\n"),
            context,
          ),
  });
}
