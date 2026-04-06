import {
  websiteResearchInputSchema,
  websiteResearchOutputSchema,
  type ResearchContentCleaner,
  type ResearchContentExtractor,
  type ResearchContentFetcher,
  type ResearchEngineService,
  type ResearchQualityScorer,
  type WebsiteResearchInput,
  type WebsiteResearchOutput,
} from "./contracts.js";
import { createResearchDocumentCleaner } from "./clean.js";
import { createResearchContentExtractor } from "./extract.js";
import { createSafeResearchFetcher, type SafeResearchFetcherOptions } from "./fetch.js";
import {
  createCompanyProfileSummarizer,
  type CompanyProfileSummarizerOptions,
} from "./summarize-profile.js";
import { createResearchQualityScorer } from "./score.js";

export type ResearchEngineOptions = {
  fetcher?: ResearchContentFetcher;
  cleaner?: ResearchContentCleaner;
  extractor?: ResearchContentExtractor;
  summarizer?: ReturnType<typeof createCompanyProfileSummarizer>;
  scorer?: ResearchQualityScorer;
  fetchOptions?: SafeResearchFetcherOptions;
  summarizerOptions?: CompanyProfileSummarizerOptions;
};

export function createResearchEngineService(
  options: ResearchEngineOptions = {},
): ResearchEngineService {
  const fetcher = options.fetcher ?? createSafeResearchFetcher(options.fetchOptions);
  const cleaner = options.cleaner ?? createResearchDocumentCleaner();
  const extractor = options.extractor ?? createResearchContentExtractor();
  const summarizer =
    options.summarizer ??
    createCompanyProfileSummarizer(options.summarizerOptions);
  const scorer = options.scorer ?? createResearchQualityScorer();

  return {
    async researchWebsite(input: WebsiteResearchInput): Promise<WebsiteResearchOutput> {
      const request = websiteResearchInputSchema.parse(input);
      const fetch = await fetcher.fetch(request);
      const cleaned = await cleaner.clean(fetch);
      const extracted = await extractor.extract(cleaned);
      const summary = await summarizer.summarize({ request, extracted });
      const scoring = await scorer.score({
        request,
        fetch,
        extracted,
        companyProfile: summary.companyProfile,
        evidence: summary.evidence,
        flags: summary.flags,
      });

      return websiteResearchOutputSchema.parse({
        input: request,
        fetch,
        cleaned,
        extracted,
        companyProfile: summary.companyProfile,
        evidence: summary.evidence,
        quality: scoring.quality,
        operationMetadata: {
          summarization: summary.operationMetadata,
        },
        trainingRecord: {
          sourceUrl: fetch.finalUrl,
          extractionVersion: "extract.v1",
          summarizerVersion:
            summary.operationMetadata?.provider === "internal"
              ? "summarizer.heuristic.v1"
              : "summarizer.adapter.v1",
          scoringVersion: "score.v1",
          metadata: {
            flags: summary.flags.map((flag) => flag.code),
            summarizationProvider: summary.operationMetadata?.provider ?? null,
            summarizationModel: summary.operationMetadata?.model ?? null,
          },
        },
      });
    },
  };
}
