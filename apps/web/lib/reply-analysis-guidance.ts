export function getReplyAnalysisGuidance(input: {
  intent: string;
  confidenceLabel: "low" | "medium" | "high";
}): string | null {
  if (input.intent === "hard_no") {
    return "This reply reads as a hard negative. Recommended action stays courteous and non-pushy.";
  }

  if (input.intent === "soft_no") {
    return "This reply leans negative. Keep any follow-up brief, respectful, and low-pressure.";
  }

  if (input.intent === "unclear" || input.confidenceLabel === "low") {
    return "This reply is ambiguous. Review the full message before acting on the recommendation.";
  }

  return null;
}
