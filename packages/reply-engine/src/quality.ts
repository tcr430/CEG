import type { DraftReplyQualityReport } from "@ceg/validation";

import type { DraftReplyGenerationInput, DraftReplyGenerationOutput } from "./contracts.js";
import {
  validateConfidenceLanguageFit,
  validateNoInventedFacts,
  validateNoThreadRepetition,
  validateToneFit,
} from "./validators.js";

const PUSHY_PATTERNS = [
  /let'?s get on a call/i,
  /book time/i,
  /asap/i,
  /right away/i,
  /must/i,
  /need to/i,
];
const SPAMMY_PATTERNS = [
  /amazing/i,
  /incredible/i,
  /game[- ]changer/i,
  /revolutionary/i,
  /!!!/,
];
const EMPTY_COMPLIMENT_PATTERNS = [
  /love what you('?| a)re doing/i,
  /impressed by your team/i,
  /great company/i,
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

function matchPatterns(text: string, patterns: RegExp[]) {
  return patterns.filter((pattern) => pattern.test(text));
}

function keywordOverlapScore(text: string, terms: string[]) {
  const lowered = text.toLowerCase();
  const matches = terms.filter((term) => term && lowered.includes(term.toLowerCase())).length;
  return clampScore(30 + matches * 22);
}

export function scoreDraftReplyQuality(
  draft: DraftReplyGenerationOutput["output"]["drafts"][number],
  input: DraftReplyGenerationInput,
): DraftReplyQualityReport {
  const combinedText = [draft.subject, draft.bodyText].filter(Boolean).join("\n\n");
  const inboundKeywords = [
    input.request.analysisInput.latestInboundMessage.bodyText,
    ...input.analysis.keySignals,
    ...(input.analysis.objectionType ? [input.analysis.objectionType.replaceAll("_", " ")] : []),
  ];
  const relevanceToInboundReply = keywordOverlapScore(combinedText, inboundKeywords);

  const objectionTerms = (() => {
    switch (input.analysis.intent) {
      case "objection_price":
        return ["budget", "cost", "price", "later", "summary"];
      case "objection_timing":
        return ["later", "when timing improves", "when it is useful", "this quarter"];
      case "objection_authority":
        return ["team", "loop in", "share internally", "owner"];
      case "objection_already_has_solution":
        return ["current process", "existing workflow", "comparison", "different"];
      case "needs_more_info":
        return ["summary", "context", "example", "details"];
      default:
        return ["helpful", "context", "summary"];
    }
  })();
  const objectionHandlingFit = keywordOverlapScore(combinedText, objectionTerms);

  const toneCheck = validateToneFit(combinedText, {
    ...input.request,
    analysis: input.analysis,
    strategy: input.strategy,
  });
  const toneFit = clampScore(toneCheck.passed ? 85 : 45);

  const pushyMatches = matchPatterns(combinedText, PUSHY_PATTERNS);
  const pushinessRisk = clampScore(
    pushyMatches.length * 28 + (input.analysis.intent === "hard_no" ? 40 : 0),
  );

  const unsupportedCheck = validateNoInventedFacts(combinedText);
  const unsupportedClaimRisk = clampScore(unsupportedCheck.passed ? 10 : 85);
  const repetitionCheck = validateNoThreadRepetition(combinedText, {
    ...input.request,
    analysis: input.analysis,
    strategy: input.strategy,
  });
  const confidenceCheck = validateConfidenceLanguageFit(combinedText, {
    ...input.request,
    analysis: input.analysis,
    strategy: input.strategy,
  });
  const summaryScore = clampScore(
    [
      relevanceToInboundReply,
      objectionHandlingFit,
      toneFit,
      100 - pushinessRisk,
      100 - unsupportedClaimRisk,
    ].reduce((sum, value) => sum + value, 0) / 5,
  );

  const dimensions = [
    {
      name: "relevance_to_inbound_reply",
      score: relevanceToInboundReply,
      label: labelForScore(relevanceToInboundReply),
      details:
        relevanceToInboundReply >= 70
          ? "The draft responds directly to the inbound reply and preserves the relevant thread context."
          : "The draft only weakly reflects the inbound reply or key signals.",
    },
    {
      name: "objection_handling_fit",
      score: objectionHandlingFit,
      label: labelForScore(objectionHandlingFit),
      details:
        objectionHandlingFit >= 70
          ? "The draft addresses the likely objection or information request directly."
          : "The draft should do a better job of addressing the objection or question at hand.",
    },
    {
      name: "tone_fit",
      score: toneFit,
      label: labelForScore(toneFit),
      details: toneCheck.details,
    },
    {
      name: "pushiness_risk",
      score: clampScore(100 - pushinessRisk),
      label: labelForScore(100 - pushinessRisk),
      details:
        pushyMatches.length === 0
          ? "The draft stays appropriately low-pressure for the conversation state."
          : `Pushy phrases were detected: ${pushyMatches.map((item) => item.source).join(", ")}.`,
    },
    {
      name: "unsupported_claim_risk",
      score: clampScore(100 - unsupportedClaimRisk),
      label: labelForScore(100 - unsupportedClaimRisk),
      details: unsupportedCheck.details,
    },
  ];

  const emptyCompliments = matchPatterns(combinedText, EMPTY_COMPLIMENT_PATTERNS);
  const spammyMatches = matchPatterns(combinedText, SPAMMY_PATTERNS);
  const excessiveLength = combinedText.length > input.request.promptContext.constraints.maxDraftReplyLength;
  const checks = [
    {
      code: "generic_empty_compliments",
      passed: emptyCompliments.length === 0,
      severity: "warning" as const,
      message: "Avoid generic compliments unless they are grounded in the thread or research evidence.",
      evidence: emptyCompliments.map((item) => item.source),
    },
    {
      code: "unverifiable_claims",
      passed: unsupportedCheck.passed,
      severity: "critical" as const,
      message: unsupportedCheck.details,
      evidence: unsupportedCheck.passed ? [] : ["unsupported certainty detected"],
    },
    {
      code: "excessive_length",
      passed: !excessiveLength,
      severity: "warning" as const,
      message: excessiveLength
        ? "The draft exceeds the configured reply-length target."
        : "The draft stays within the configured reply-length target.",
      evidence: excessiveLength ? [String(combinedText.length)] : [],
    },
    {
      code: "spammy_or_overhyped_language",
      passed: spammyMatches.length === 0,
      severity: "warning" as const,
      message: "Avoid spammy or overhyped language in reply drafts.",
      evidence: spammyMatches.map((item) => item.source),
    },
    {
      code: "thread_repetition",
      passed: repetitionCheck.passed,
      severity: "warning" as const,
      message: repetitionCheck.details,
      evidence: [],
    },
    {
      code: "confidence_language_fit",
      passed: confidenceCheck.passed,
      severity: "warning" as const,
      message: confidenceCheck.details,
      evidence: [],
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