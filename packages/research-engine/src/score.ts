import {
  researchConfidenceSchema,
  researchQualityReportSchema,
  type ResearchQualityScorer,
  type ResearchScoringResult,
} from "./contracts.js";

export function createResearchQualityScorer(): ResearchQualityScorer {
  return {
    async score({ fetch, extracted, companyProfile, evidence, flags }): Promise<ResearchScoringResult> {
      const dimensions = [
        {
          dimension: "fetch_safety" as const,
          confidence: researchConfidenceSchema.parse({
            score: fetch.statusCode >= 200 && fetch.statusCode < 400 ? 0.9 : 0.2,
            label: fetch.statusCode >= 200 && fetch.statusCode < 400 ? "high" : "low",
            reasons: ["Based on fetch status code and safe URL policy pass."],
          }),
        },
        {
          dimension: "content_completeness" as const,
          confidence: researchConfidenceSchema.parse({
            score: Math.min(1, extracted.paragraphs.length / 4),
            label:
              extracted.paragraphs.length >= 4
                ? "high"
                : extracted.paragraphs.length >= 2
                  ? "medium"
                  : "low",
            reasons: ["Estimated from paragraph count after cleaning."],
          }),
        },
        {
          dimension: "extraction_quality" as const,
          confidence: researchConfidenceSchema.parse({
            score: extracted.title ? 0.82 : 0.55,
            label: extracted.title ? "medium" : "low",
            reasons: ["Title and structured sections improve extractability."],
          }),
        },
        {
          dimension: "profile_confidence" as const,
          confidence: companyProfile.confidence,
        },
        {
          dimension: "evidence_strength" as const,
          confidence: researchConfidenceSchema.parse({
            score: Math.min(1, evidence.length / 4),
            label:
              evidence.length >= 4 ? "high" : evidence.length >= 2 ? "medium" : "low",
            reasons: ["Measured by the number of evidence snippets preserved."],
          }),
        },
      ];

      const averageScore =
        dimensions.reduce((sum, item) => sum + item.confidence.score, 0) /
        Math.max(dimensions.length, 1);

      const quality = researchQualityReportSchema.parse({
        overall: {
          score: Number(averageScore.toFixed(2)),
          label: averageScore >= 0.8 ? "high" : averageScore >= 0.55 ? "medium" : "low",
          reasons: ["Combined from fetch, extraction, profile, and evidence signals."],
        },
        dimensions,
        flags,
      });

      return { quality };
    },
  };
}
