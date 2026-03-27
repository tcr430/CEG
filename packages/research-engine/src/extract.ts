import {
  extractedResearchDocumentSchema,
  type CleanedResearchDocument,
  type ExtractedResearchDocument,
  type ResearchContentExtractor,
} from "./contracts.js";

function extractSingle(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function extractAll(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)]
    .map((match) => match[1]?.replace(/\s+/g, " ").trim() || "")
    .filter(Boolean);
}

function topParagraphs(text: string, limit: number): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 40)
    .slice(0, limit);
}

export function createResearchContentExtractor(): ResearchContentExtractor {
  return {
    async extract(document: CleanedResearchDocument): Promise<ExtractedResearchDocument> {
      const title = document.title ?? extractSingle(document.html, /<title[^>]*>([\s\S]*?)<\/title>/i);
      const metaDescription = extractSingle(
        document.html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
      );

      return extractedResearchDocumentSchema.parse({
        sourceUrl: document.sourceUrl,
        title,
        metaDescription,
        headings: extractAll(document.html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).slice(0, 12),
        paragraphs: topParagraphs(document.cleanText, 8),
        callsToAction: topParagraphs(document.cleanText, 16).filter((paragraph) =>
          /(contact|book|demo|learn more|talk to|start|trial)/i.test(paragraph),
        ).slice(0, 5),
        metadata: {
          textLength: document.cleanText.length,
        },
      });
    },
  };
}
