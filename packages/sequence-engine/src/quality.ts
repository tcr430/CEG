import type { SequenceQualityReport } from "@ceg/validation";

import type { CompiledSequenceOutput, SequenceGenerationInput } from "./contracts.js";
import {
  validateCtaPresence,
  validateMaxLengthTargets,
  validateNoGenericFluff,
  validateNoUnsupportedClaims,
  validateToneFit,
} from "./validators.js";

const EMPTY_COMPLIMENT_PATTERNS = [
  /impressed by/i,
  /love what you('?| a)re doing/i,
  /great company/i,
  /amazing team/i,
  /congrats on/i,
];
const SPAMMY_LANGUAGE_PATTERNS = [
  /revolutionary/i,
  /game[- ]changer/i,
  /world[- ]class/i,
  /best[- ]in[- ]class/i,
  /incredible/i,
  /must-have/i,
  /!!!/,
];
const UNSUPPORTED_CLAIM_PATTERNS = [
  /guarantee/i,
  /100%/i,
  /always/i,
  /never fail/i,
  /proven roi/i,
  /double your/i,
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function labelForScore(score: number): "strong" | "review" | "risky" {
  if (score >= 75) {
    return "strong";
  }

  if (score >= 50) {
    return "review";
  }

  return "risky";
}

function matches(text: string, patterns: RegExp[]) {
  return patterns.filter((pattern) => pattern.test(text));
}

function countPersonalizationSignals(text: string, input: SequenceGenerationInput) {
  const companyName = input.prospectCompanyProfile.companyName?.toLowerCase() ?? "";
  const domain = input.prospectCompanyProfile.domain.toLowerCase();
  const hooks = input.prospectCompanyProfile.personalizationHooks.map((item) => item.toLowerCase());
  const painPoints = input.prospectCompanyProfile.likelyPainPoints.map((item) => item.toLowerCase());
  const evidence = [...hooks, ...painPoints, companyName, domain].filter(Boolean);
  const lowered = text.toLowerCase();
  return evidence.filter((item) => lowered.includes(item)).length;
}

function overallFromDimensions(scores: number[]) {
  return clampScore(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export function scoreCompiledSequenceQuality(
  compiled: CompiledSequenceOutput,
  input: SequenceGenerationInput,
): SequenceQualityReport {
  const combinedText = [
    ...compiled.subjectLineSet.subjectLines.map((item) => item.text),
    ...compiled.openerSet.openerOptions.map((item) => item.text),
    compiled.initialEmail.email.subject,
    compiled.initialEmail.email.opener,
    compiled.initialEmail.email.body,
    compiled.initialEmail.email.cta,
    ...compiled.followUpSequence.sequenceSteps.flatMap((step) => [
      step.subject,
      step.opener,
      step.body,
      step.cta,
    ]),
  ].join("\n\n");

  const personalizationHits = countPersonalizationSignals(combinedText, input);
  const personalizationScore = clampScore(35 + personalizationHits * 18);
  const clarityPenalty =
    (combinedText.length > input.promptContext.constraints.maxEmailBodyLength * 4 ? 20 : 0) +
    (/[A-Z]{5,}/.test(combinedText) ? 10 : 0) +
    (combinedText.split(/[.!?]/).some((sentence) => sentence.trim().split(/\s+/).length > 28)
      ? 15
      : 0);
  const clarityScore = clampScore(92 - clarityPenalty);
  const ctaCheck = validateCtaPresence(compiled.initialEmail.email.cta);
  const ctaQuality = clampScore(
    ctaCheck.passed
      ? input.promptContext.constraints.preferredCallToActionStyle === "soft"
        ? 88
        : 80
      : 35,
  );
  const fluffMatches = matches(combinedText, [...EMPTY_COMPLIMENT_PATTERNS, ...SPAMMY_LANGUAGE_PATTERNS]);
  const fluffRisk = clampScore(fluffMatches.length * 22);
  const unsupportedMatches = matches(combinedText, UNSUPPORTED_CLAIM_PATTERNS);
  const unsupportedClaimRisk = clampScore(unsupportedMatches.length * 30);
  const toneCheck = validateToneFit(combinedText, {
    senderContext: input.senderContext,
    campaign: input.campaign,
    prospectCompanyProfile: input.prospectCompanyProfile,
    promptContext: input.promptContext,
  });
  const toneFit = clampScore(toneCheck.passed ? 86 : 45);

  const dimensions = [
    {
      name: "personalization_score",
      score: personalizationScore,
      label: labelForScore(personalizationScore),
      details:
        personalizationHits > 0
          ? `Detected ${personalizationHits} supported personalization signal(s) from the prospect profile.`
          : "No grounded personalization signals were detected in the generated sequence.",
    },
    {
      name: "clarity_score",
      score: clarityScore,
      label: labelForScore(clarityScore),
      details:
        clarityPenalty === 0
          ? "The sequence stays concise and readable against the configured limits."
          : "The sequence includes readability issues such as long sentences, excessive length, or shouty formatting.",
    },
    {
      name: "cta_quality",
      score: ctaQuality,
      label: labelForScore(ctaQuality),
      details: ctaCheck.details,
    },
    {
      name: "fluff_risk",
      score: clampScore(100 - fluffRisk),
      label: labelForScore(100 - fluffRisk),
      details:
        fluffMatches.length === 0
          ? "No generic compliments or spammy hype patterns were detected."
          : `Detected discouraged fluff patterns: ${fluffMatches.map((item) => item.source).join(", ")}.`,
    },
    {
      name: "unsupported_claim_risk",
      score: clampScore(100 - unsupportedClaimRisk),
      label: labelForScore(100 - unsupportedClaimRisk),
      details:
        unsupportedMatches.length === 0
          ? "No unverifiable certainty or ROI claims were detected."
          : `Detected unsupported-claim patterns: ${unsupportedMatches.map((item) => item.source).join(", ")}.`,
    },
    {
      name: "tone_fit",
      score: toneFit,
      label: labelForScore(toneFit),
      details: toneCheck.details,
    },
  ];

  const lengthCheck = validateMaxLengthTargets(
    {
      subject: compiled.initialEmail.email.subject,
      opener: compiled.initialEmail.email.opener,
      body: compiled.initialEmail.email.body,
    },
    input,
  );
  const genericCheck = validateNoGenericFluff(combinedText);
  const unsupportedCheck = validateNoUnsupportedClaims(combinedText);
  const summaryScore = overallFromDimensions(dimensions.map((dimension) => dimension.score));
  const checks = [
    {
      code: "generic_empty_compliments",
      passed: matches(combinedText, EMPTY_COMPLIMENT_PATTERNS).length === 0,
      severity: "warning" as const,
      message: "Avoid empty compliments that are not grounded in evidence.",
      evidence: matches(combinedText, EMPTY_COMPLIMENT_PATTERNS).map((item) => item.source),
    },
    {
      code: "spammy_or_overhyped_language",
      passed: matches(combinedText, SPAMMY_LANGUAGE_PATTERNS).length === 0,
      severity: "warning" as const,
      message: "Avoid spammy or overhyped language in institutional outbound copy.",
      evidence: matches(combinedText, SPAMMY_LANGUAGE_PATTERNS).map((item) => item.source),
    },
    {
      code: "unverifiable_claims",
      passed: unsupportedCheck.passed,
      severity: "critical" as const,
      message: unsupportedCheck.details,
      evidence: unsupportedMatches.map((item) => item.source),
    },
    {
      code: "excessive_length",
      passed: lengthCheck.passed,
      severity: "warning" as const,
      message: lengthCheck.details,
      evidence: [],
    },
    {
      code: "generic_fluff",
      passed: genericCheck.passed,
      severity: "warning" as const,
      message: genericCheck.details,
      evidence: fluffMatches.map((item) => item.source),
    },
  ];

  return {
    generatedAt: new Date(),
    summary: {
      score: summaryScore,
      label: labelForScore(summaryScore),
      blocked: checks.some((check) => !check.passed && check.severity === "critical"),
    },
    dimensions,
    checks,
    notes: checks.filter((check) => !check.passed).map((check) => check.message),
  };
}