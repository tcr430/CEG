import { z } from "zod";

import {
  aiOperationMetadataSchema,
  companyProfileSchema,
  type AiOperationMetadata,
  type CompanyProfile,
  type ConfidenceScore,
  type EvidenceFlag,
  type EvidenceSnippet,
  workspaceIdSchema,
} from "@ceg/validation";

export const researchConfidenceLabelSchema = z.enum(["low", "medium", "high"]);

export const researchConfidenceSchema = z.object({
  score: z.number().min(0).max(1),
  label: researchConfidenceLabelSchema,
  reasons: z.array(z.string().trim().min(1)).default([]),
});

export const researchEvidenceFlagSchema = z.object({
  code: z.string().trim().min(1),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().trim().min(1),
});

export const researchEvidenceSnippetSchema = z.object({
  snippet: z.string().trim().min(1),
  sourceUrl: z.string().trim().url(),
  title: z.string().trim().min(1).nullable().optional(),
  selectorHint: z.string().trim().min(1).nullable().optional(),
  confidence: researchConfidenceSchema,
  supports: z.array(z.string().trim().min(1)).default([]),
});

export const websiteResearchInputSchema = z.object({
  workspaceId: workspaceIdSchema.optional(),
  websiteUrl: z.string().trim().url(),
  prospectId: z.string().uuid().optional(),
  captureHtml: z.boolean().default(true),
  captureText: z.boolean().default(true),
  mode: z.literal("company_profile").default("company_profile"),
});

export const researchFetchResultSchema = z.object({
  requestedUrl: z.string().trim().url(),
  finalUrl: z.string().trim().url(),
  statusCode: z.number().int().nonnegative(),
  contentType: z.string().trim().min(1).nullable().optional(),
  fetchedAt: z.coerce.date(),
  html: z.string(),
  text: z.string().default(""),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const cleanedResearchDocumentSchema = z.object({
  sourceUrl: z.string().trim().url(),
  title: z.string().trim().min(1).nullable().optional(),
  html: z.string(),
  cleanText: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const extractedResearchDocumentSchema = z.object({
  sourceUrl: z.string().trim().url(),
  title: z.string().trim().min(1).nullable().optional(),
  metaDescription: z.string().trim().min(1).nullable().optional(),
  headings: z.array(z.string().trim().min(1)).default([]),
  paragraphs: z.array(z.string().trim().min(1)).default([]),
  callsToAction: z.array(z.string().trim().min(1)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const researchQualityDimensionSchema = z.object({
  dimension: z.enum([
    "fetch_safety",
    "content_completeness",
    "extraction_quality",
    "profile_confidence",
    "evidence_strength",
  ]),
  confidence: researchConfidenceSchema,
});

export const researchQualityReportSchema = z.object({
  overall: researchConfidenceSchema,
  dimensions: z.array(researchQualityDimensionSchema).default([]),
  flags: z.array(researchEvidenceFlagSchema).default([]),
});

export const researchOperationMetadataSchema = z.object({
  summarization: aiOperationMetadataSchema.nullable().default(null),
});

export const websiteResearchOutputSchema = z.object({
  input: websiteResearchInputSchema,
  fetch: researchFetchResultSchema,
  cleaned: cleanedResearchDocumentSchema,
  extracted: extractedResearchDocumentSchema,
  companyProfile: companyProfileSchema,
  evidence: z.array(researchEvidenceSnippetSchema).default([]),
  quality: researchQualityReportSchema,
  operationMetadata: researchOperationMetadataSchema,
  trainingRecord: z.object({
    sourceUrl: z.string().trim().url(),
    extractionVersion: z.string().trim().min(1),
    summarizerVersion: z.string().trim().min(1),
    scoringVersion: z.string().trim().min(1),
    metadata: z.record(z.string(), z.unknown()).default({}),
  }),
});

export type WebsiteResearchInput = z.infer<typeof websiteResearchInputSchema>;
export type ResearchFetchResult = z.infer<typeof researchFetchResultSchema>;
export type CleanedResearchDocument = z.infer<typeof cleanedResearchDocumentSchema>;
export type ExtractedResearchDocument = z.infer<typeof extractedResearchDocumentSchema>;
export type ResearchQualityDimension = z.infer<typeof researchQualityDimensionSchema>;
export type ResearchQualityReport = z.infer<typeof researchQualityReportSchema>;
export type ResearchOperationMetadata = z.infer<typeof researchOperationMetadataSchema>;
export type WebsiteResearchOutput = z.infer<typeof websiteResearchOutputSchema>;

export type CompanyProfileSummarization = {
  companyProfile: CompanyProfile;
  evidence: EvidenceSnippet[];
  flags: EvidenceFlag[];
  operationMetadata: AiOperationMetadata | null;
};

export type ResearchScoringResult = {
  quality: ResearchQualityReport;
};

export type ResearchModelAdapter = {
  summarizeCompanyProfile(input: {
    request: WebsiteResearchInput;
    extracted: ExtractedResearchDocument;
    evidence: EvidenceSnippet[];
  }): Promise<CompanyProfileSummarization>;
};

export type ResearchContentFetcher = {
  fetch(input: WebsiteResearchInput): Promise<ResearchFetchResult>;
};

export type ResearchContentCleaner = {
  clean(fetchResult: ResearchFetchResult): Promise<CleanedResearchDocument>;
};

export type ResearchContentExtractor = {
  extract(document: CleanedResearchDocument): Promise<ExtractedResearchDocument>;
};

export type CompanyProfileSummarizer = {
  summarize(input: {
    request: WebsiteResearchInput;
    extracted: ExtractedResearchDocument;
  }): Promise<CompanyProfileSummarization>;
};

export type ResearchQualityScorer = {
  score(input: {
    request: WebsiteResearchInput;
    fetch: ResearchFetchResult;
    extracted: ExtractedResearchDocument;
    companyProfile: CompanyProfile;
    evidence: EvidenceSnippet[];
    flags: EvidenceFlag[];
  }): Promise<ResearchScoringResult>;
};

export type ResearchEngineService = {
  researchWebsite(input: WebsiteResearchInput): Promise<WebsiteResearchOutput>;
};

export type ResearchContractExports = {
  companyProfileSchema: typeof companyProfileSchema;
  researchConfidenceSchema: typeof researchConfidenceSchema;
  researchEvidenceFlagSchema: typeof researchEvidenceFlagSchema;
  researchEvidenceSnippetSchema: typeof researchEvidenceSnippetSchema;
};

export type ResearchConfidence = ConfidenceScore;
