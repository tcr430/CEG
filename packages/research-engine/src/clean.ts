import {
  cleanedResearchDocumentSchema,
  type CleanedResearchDocument,
  type ResearchContentCleaner,
  type ResearchFetchResult,
} from "./contracts.js";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

export function createResearchDocumentCleaner(): ResearchContentCleaner {
  return {
    async clean(fetchResult: ResearchFetchResult): Promise<CleanedResearchDocument> {
      const cleanText =
        fetchResult.text.trim() !== "" ? fetchResult.text.trim() : stripHtml(fetchResult.html);

      return cleanedResearchDocumentSchema.parse({
        sourceUrl: fetchResult.finalUrl,
        title: extractTitle(fetchResult.html),
        html: fetchResult.html,
        cleanText,
        metadata: {
          fetchedAt: fetchResult.fetchedAt.toISOString(),
        },
      });
    },
  };
}
