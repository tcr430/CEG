import type {
  CompanyProfileSummarization,
  ResearchModelAdapter,
} from "@ceg/research-engine";
import {
  researchConfidenceSchema,
  researchEvidenceFlagSchema,
} from "@ceg/research-engine";
import { companyProfileSchema } from "@ceg/validation";
import { getRequiredEnv } from "@ceg/security";

import { createAiOperationMetadata, type OpenAiUsage } from "./ai-provider-metadata";

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: OpenAiUsage;
};

const DEFAULT_OPENAI_RESEARCH_MODEL = "gpt-4.1-mini";
const PROMPT_VERSION = "research.v1";

function getModelName(): string {
  return process.env.OPENAI_RESEARCH_MODEL?.trim() || DEFAULT_OPENAI_RESEARCH_MODEL;
}

export function createOpenAiResearchModelAdapter(): ResearchModelAdapter {
  return {
    async summarizeCompanyProfile(input): Promise<CompanyProfileSummarization> {
      const startedAt = Date.now();
      const apiKey = getRequiredEnv("OPENAI_API_KEY");
      const model = getModelName();
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: [
                "You summarize public company website content into a structured B2B outbound research profile.",
                "Return valid JSON only. No markdown fences.",
                "Do not invent metrics, customers, proof points, or unsupported claims.",
                "If evidence is weak, lower confidence and use softer inferences.",
              ].join("\n\n"),
            },
            {
              role: "user",
              content: [
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
            },
          ],
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`OpenAI research summarization failed: ${response.status} ${details}`);
      }

      const payload = (await response.json()) as OpenAiChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI research summarization returned no content.");
      }

      const parsed = JSON.parse(content) as {
        companyProfile?: Record<string, unknown>;
        flags?: unknown[];
      };
      const flags = Array.isArray(parsed.flags)
        ? parsed.flags.map((flag) => researchEvidenceFlagSchema.parse(flag))
        : [];
      const operationMetadata = createAiOperationMetadata({
        provider: "openai",
        model,
        promptVersion: PROMPT_VERSION,
        startedAt,
        usage: payload.usage ?? null,
      });

      return {
        companyProfile: companyProfileSchema.parse({
          ...(parsed.companyProfile ?? {}),
          domain:
            typeof parsed.companyProfile?.domain === "string" && parsed.companyProfile.domain.trim().length > 0
              ? parsed.companyProfile.domain
              : new URL(input.request.websiteUrl).hostname.replace(/^www\./i, ""),
          websiteUrl:
            typeof parsed.companyProfile?.websiteUrl === "string" && parsed.companyProfile.websiteUrl.trim().length > 0
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
            summarizer: "openai",
            promptVersion: PROMPT_VERSION,
          },
        }),
        evidence: input.evidence,
        flags,
        operationMetadata,
      };
    },
  };
}
