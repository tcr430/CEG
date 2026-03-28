type EvaluationSenderProfile = {
  senderType: "sdr" | "saas_founder" | "agency" | "basic";
  name: string;
};

type EvaluationCompanyProfile = {
  companyName: string | null;
  domain: string;
  likelyPainPoints: string[];
  personalizationHooks: string[];
};

type EvaluationReplyClassification = {
  recommendedAction: string;
  objectionType?: string | null;
  confidence: {
    label: "low" | "medium" | "high";
  };
};

type EvaluationDraftReplyOutput = {
  drafts: Array<{
    slotId: string;
  }>;
};

const unsupportedClaimPatterns = [
  /\bguarantee\b/i,
  /\bdouble your pipeline\b/i,
  /\brevolutionary\b/i,
  /\bresults ASAP\b/i,
];

const pushyAfterHardNoPatterns = [
  /\bgrab 15 minutes\b/i,
  /\bcan we still hop on a call\b/i,
  /\bstill worth a call\b/i,
];

const discouragedFluffPatterns = [
  /\blove what your team is doing\b/i,
  /\bcrushing it\b/i,
  /\bjust checking in\b/i,
  /\btouching base\b/i,
];

export function assertRequiredStringFields(
  candidate: Record<string, unknown>,
  fieldNames: string[],
): string[] {
  return fieldNames.filter((fieldName) => {
    const value = candidate[fieldName];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function findUnsupportedClaims(text: string): string[] {
  return unsupportedClaimPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export function findHardNoPushiness(text: string): string[] {
  return pushyAfterHardNoPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export function findDiscouragedFluff(text: string): string[] {
  return discouragedFluffPatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export function buildSequenceEvaluationContext(input: {
  senderProfile: EvaluationSenderProfile;
  companyProfile: EvaluationCompanyProfile;
}) {
  return {
    senderType: input.senderProfile.senderType,
    senderName: input.senderProfile.name,
    companyName:
      input.companyProfile.companyName ?? input.companyProfile.domain ?? "Unknown company",
    groundedPainPoints: input.companyProfile.likelyPainPoints,
    groundedHooks: input.companyProfile.personalizationHooks,
  };
}

export function summarizeReplyExpectations(input: {
  analysis: EvaluationReplyClassification;
  draftOutput: EvaluationDraftReplyOutput;
}) {
  return {
    action: input.analysis.recommendedAction,
    objectionType: input.analysis.objectionType ?? "none",
    draftCount: input.draftOutput.drafts.length,
    lowConfidence: input.analysis.confidence.label === "low",
  };
}
