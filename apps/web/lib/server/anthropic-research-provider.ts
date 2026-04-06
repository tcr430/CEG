import type {
  CompanyProfileSummarization,
  ResearchModelAdapter,
} from "@ceg/research-engine";
import {
  researchConfidenceSchema,
  researchEvidenceFlagSchema,
} from "@ceg/research-engine";
import {
  aiOperationMetadataSchema,
  companyProfileSchema,
} from "@ceg/validation";

import { callAnthropicJson } from "./anthropic-json";

const DEFAULT_ANTHROPIC_RESEARCH_MODEL = "claude-3-5-sonnet-latest";
const PROMPT_VERSION = "research.v1";

function getModelName(): string {
  return (
    process.env.ANTHROPIC_RESEARCH_MODEL?.trim() ||
    DEFAULT_ANTHROPIC_RESEARCH_MODEL
  );
}

export function createAnthropicResearchModelAdapter(): ResearchModelAdapter {
  return {
    async summarizeCompanyProfile(input): Promise<CompanyProfileSummarization> {
      const model = getModelName();

      return callAnthropicJson({
        model,
        promptVersion: PROMPT_VERSION,
        system: [
          "You summarize public company website content into a structured B2B outbound research profile.",
          "Return valid JSON only. No markdown fences.",
          "Do not invent metrics, customers, proof points, or unsupported claims.",
          "If evidence is weak, lower confidence and use softer inferences.",
        ].join("\n\n"),
        user: [
          `Website URL: ${input.request.websiteUrl}`,
          input.extracted.title ? `Title: ${input.extracted.title}` : null,
          input.extracted.metaDescription
            ? `Meta description: ${input.extracted.metaDescription}`
            : null,
          input.extracted.headings.length > 0
            ? `Headings: ${input.extracted.headings.join(" | ")}`
            : null,
          input.extracted.paragraphs.length > 0
            ? `Paragraphs: ${input.extracted.paragraphs.slice(0, 8).join("\n\n")}`
            : null,
          input.extracted.callsToAction.length > 0
            ? `Calls to action: ${input.extracted.callsToAction.join(" | ")}`
            : null,
          input.evidence.length > 0
            ? `Evidence snippets: ${input.evidence.map((item) => item.snippet).join(" | ")}`
            : null,
          [
            "Return JSON with this shape:",
            '{"companyProfile":{"domain":"...","websiteUrl":"...","canonicalUrl":"...","companyName":"...","headline":"...","summary":"...","productDescription":"...","likelyTargetCustomer":"...","targetCustomers":["..."],"industries":["..."],"valuePropositions":["..."],"proofPoints":["..."],"differentiators":["..."],"likelyPainPoints":["..."],"personalizationHooks":["..."],"callsToAction":["..."],"confidence":{"score":0.0,"label":"low","reasons":["..."]}},"flags":[{"code":"...","severity":"warning","message":"..."}]}'
          ].join("\n"),
        ]
          .filter(Boolean)
          .join("\n\n"),
        validate: (payload) => {
          const parsed = payload as {
            companyProfile?: Record<string, unknown>;
            flags?: unknown[];
            analysisMetadata?: unknown;
            generationMetadata?: unknown;
          };
          const flags = Array.isArray(parsed.flags)
            ? parsed.flags.map((flag) => researchEvidenceFlagSchema.parse(flag))
            : [];
          const rawMetadata = parsed.generationMetadata ?? parsed.analysisMetadata ?? null;
          const operationMetadata = rawMetadata
            ? aiOperationMetadataSchema.parse(rawMetadata)
            : null;

          return {
            companyProfile: companyProfileSchema.parse({
              ...(parsed.companyProfile ?? {}),
              domain:
                typeof parsed.companyProfile?.domain === "string" &&
                parsed.companyProfile.domain.trim().length > 0
                  ? parsed.companyProfile.domain
                  : new URL(input.request.websiteUrl).hostname.replace(/^www\./i, ""),
              websiteUrl:
                typeof parsed.companyProfile?.websiteUrl === "string" &&
                parsed.companyProfile.websiteUrl.trim().length > 0
                  ? parsed.companyProfile.websiteUrl
                  : input.request.websiteUrl,
              sourceEvidence: input.evidence,
              confidence: researchConfidenceSchema.parse(
                parsed.companyProfile?.confidence ?? {
                  score: 0.45,
                  label: "low",
                  reasons: ["The model returned an incomplete confidence payload."],
                },
              ),
              flags,
              metadata: {
                summarizer: "anthropic",
                promptVersion: PROMPT_VERSION,
              },
            }),
            evidence: input.evidence,
            flags,
            operationMetadata,
          } satisfies CompanyProfileSummarization;
        },
      });
    },
  };
}
