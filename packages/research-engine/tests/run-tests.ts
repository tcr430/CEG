import assert from "node:assert/strict";

import {
  createResearchEngineService,
  websiteResearchInputSchema,
} from "../dist/index.js";

const html = `
<!doctype html>
<html>
  <head>
    <title>Acme | Outbound software for lean SaaS teams</title>
    <meta name="description" content="Acme helps lean SaaS teams run focused outbound with clear research and messaging." />
  </head>
  <body>
    <h1>Outbound software for lean SaaS teams</h1>
    <h2>Book more qualified demos</h2>
    <p>Acme helps revenue teams research accounts, personalize outbound, and keep evidence attached to every claim.</p>
    <p>Trusted by 30 growth teams across SaaS and fintech.</p>
    <p>Book a demo to see how structured outbound workflows improve reply quality.</p>
  </body>
</html>`;

const service = createResearchEngineService({
  fetchOptions: {
    fetchImplementation: async (input) => ({
      url: String(input),
      status: 200,
      headers: {
        get(name: string) {
          return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null;
        },
      },
      async text() {
        return html;
      },
    }),
  },
});

const input = websiteResearchInputSchema.parse({
  websiteUrl: "https://acme.com",
});

const result = await service.researchWebsite(input);

assert.equal(result.companyProfile.companyName, "Acme");
assert.equal(result.companyProfile.websiteUrl, "https://acme.com");
assert.ok(result.companyProfile.personalizationHooks.length >= 1);
assert.ok(result.evidence.length >= 2);
assert.ok(result.quality.overall.score > 0.5);
assert.equal(result.operationMetadata.summarization?.provider, "internal");
assert.equal(result.operationMetadata.summarization?.model, "heuristic-company-profile");
assert.equal(result.trainingRecord.extractionVersion, "extract.v1");

console.log("@ceg/research-engine contract tests passed");
