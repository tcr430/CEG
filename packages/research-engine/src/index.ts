export * from "./contracts.js";
export * from "./fetch.js";
export * from "./clean.js";
export * from "./extract.js";
export * from "./summarize-profile.js";
export * from "./score.js";
export * from "./service.js";

export const researchEngineBoundary = {
  name: "@ceg/research-engine",
  purpose: "Safe public-website research contracts and placeholder pipeline",
} as const;
