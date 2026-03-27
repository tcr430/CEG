import { validateSafeUrl, type SafeUrlPolicy } from "@ceg/security";

import {
  researchFetchResultSchema,
  websiteResearchInputSchema,
  type ResearchContentFetcher,
  type ResearchFetchResult,
  type WebsiteResearchInput,
} from "./contracts.js";

type FetchHeadersLike = {
  get(name: string): string | null;
};

type FetchResponseLike = {
  url: string;
  status: number;
  headers: FetchHeadersLike;
  text(): Promise<string>;
};

export type FetchImplementation = (
  input: string,
  init?: RequestInit,
) => Promise<FetchResponseLike>;

export type SafeResearchFetcherOptions = {
  fetchImplementation?: FetchImplementation;
  urlPolicy?: Partial<SafeUrlPolicy>;
  userAgent?: string;
};

const HTML_CONTENT_TYPE_PATTERN = /^(text\/html|text\/plain)/i;

function resolveFetchImplementation(
  fetchImplementation?: FetchImplementation,
): FetchImplementation {
  if (fetchImplementation !== undefined) {
    return fetchImplementation;
  }

  if (typeof globalThis.fetch !== "function") {
    throw new Error("No fetch implementation is available for research fetching.");
  }

  return globalThis.fetch.bind(globalThis) as FetchImplementation;
}

export function createSafeResearchFetcher(
  options: SafeResearchFetcherOptions = {},
): ResearchContentFetcher {
  const fetchImplementation = resolveFetchImplementation(options.fetchImplementation);

  return {
    async fetch(input: WebsiteResearchInput): Promise<ResearchFetchResult> {
      const request = websiteResearchInputSchema.parse(input);
      const safety = validateSafeUrl(request.websiteUrl, options.urlPolicy);

      if (!safety.ok) {
        throw new Error(safety.message);
      }

      const response = await fetchImplementation(safety.normalizedUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent":
            options.userAgent ??
            "CEG-ResearchBot/0.1 (+https://example.invalid/research-contract)",
          accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
        },
      });

      const contentType = response.headers.get("content-type");
      const html = await response.text();

      const result = researchFetchResultSchema.parse({
        requestedUrl: safety.normalizedUrl,
        finalUrl: response.url || safety.normalizedUrl,
        statusCode: response.status,
        contentType,
        fetchedAt: new Date(),
        html,
        text: HTML_CONTENT_TYPE_PATTERN.test(contentType ?? "") ? "" : html,
        metadata: {
          contentKind: HTML_CONTENT_TYPE_PATTERN.test(contentType ?? "")
            ? "html"
            : "text",
        },
      });

      return result;
    },
  };
}
