import { companyProfileSchema } from "@ceg/validation";

import {
  researchConfidenceSchema,
  researchEvidenceFlagSchema,
  researchEvidenceSnippetSchema,
  type CompanyProfileSummarization,
  type CompanyProfileSummarizer,
  type ExtractedResearchDocument,
  type ResearchModelAdapter,
  type WebsiteResearchInput,
} from "./contracts.js";

export type CompanyProfileSummarizerOptions = {
  modelAdapter?: ResearchModelAdapter;
};

function inferCompanyName(title?: string | null): string | null {
  if (!title) {
    return null;
  }

    return title.split(/[|:-]/)[0]?.trim() || null;
}

function inferDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./i, "");
}

function buildEvidence(
  request: WebsiteResearchInput,
  extracted: ExtractedResearchDocument,
): CompanyProfileSummarization["evidence"] {
  const sourceUrl = extracted.sourceUrl || request.websiteUrl;
  const title = extracted.title ?? null;

  return extracted.paragraphs.slice(0, 4).map((paragraph, index) =>
    researchEvidenceSnippetSchema.parse({
      snippet: paragraph,
      sourceUrl,
      title,
      selectorHint: `paragraph:${index + 1}`,
      confidence: {
        score: paragraph.length > 90 ? 0.82 : 0.68,
        label: paragraph.length > 90 ? "high" : "medium",
        reasons: ["Captured directly from the public website text."],
      },
      supports: index === 0 ? ["summary"] : ["proof_points"],
    }),
  );
}

function buildFallbackSummary(
  request: WebsiteResearchInput,
  extracted: ExtractedResearchDocument,
): CompanyProfileSummarization {
  const evidence = buildEvidence(request, extracted);
  const summary = extracted.metaDescription ?? extracted.paragraphs[0] ?? null;
  const title = extracted.title ?? null;
  const companyName = inferCompanyName(title) ?? inferDomain(request.websiteUrl);
  const likelyTargetCustomer =
    extracted.headings.find((heading) =>
      /(teams|companies|founders|sales|marketing|revenue|businesses)/i.test(
        heading,
      ),
    ) ?? null;
  const likelyPainPoints = extracted.paragraphs
    .filter((paragraph) =>
      /(manual|slow|fragmented|busywork|inefficient|pipeline|reply|quality|personaliz)/i.test(
        paragraph,
      ),
    )
    .slice(0, 3);
  const personalizationHooks = [
    ...extracted.headings.slice(0, 3),
    ...extracted.callsToAction.slice(0, 2),
  ].slice(0, 4);
  const flags = [] as CompanyProfileSummarization["flags"];

  if (extracted.paragraphs.length < 2) {
    flags.push(
      researchEvidenceFlagSchema.parse({
        code: "sparse_public_content",
        severity: "warning",
        message: "The website did not provide much paragraph-level content.",
      }),
    );
  }

  return {
    companyProfile: companyProfileSchema.parse({
      domain: inferDomain(request.websiteUrl),
      websiteUrl: request.websiteUrl,
      canonicalUrl: extracted.sourceUrl,
      companyName,
      headline: title,
      summary,
      productDescription: summary,
      likelyTargetCustomer,
      targetCustomers: extracted.headings.slice(0, 2),
      industries: [],
      valuePropositions: extracted.paragraphs.slice(0, 2),
      proofPoints: extracted.paragraphs.slice(1, 3),
      differentiators: extracted.headings.slice(1, 3),
      likelyPainPoints,
      personalizationHooks,
      callsToAction: extracted.callsToAction,
      sourceEvidence: evidence,
      confidence: researchConfidenceSchema.parse({
        score: extracted.paragraphs.length >= 3 ? 0.76 : 0.58,
        label: extracted.paragraphs.length >= 3 ? "medium" : "low",
        reasons: ["Generated from deterministic website extraction heuristics."],
      }),
      flags,
      metadata: {
        summarizer: "fallback-heuristic",
      },
    }),
    evidence,
    flags,
  };
}

export function createCompanyProfileSummarizer(
  options: CompanyProfileSummarizerOptions = {},
): CompanyProfileSummarizer {
  return {
    async summarize({ request, extracted }) {
      if (options.modelAdapter !== undefined) {
        return options.modelAdapter.summarizeCompanyProfile({
          extracted,
          evidence: buildEvidence(request, extracted),
        });
      }

      return buildFallbackSummary(request, extracted);
    },
  };
}


