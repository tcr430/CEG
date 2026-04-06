export const testingBoundary = {
  name: "@ceg/testing",
  purpose: "Shared evaluation fixtures, regression cases, and test helpers",
} as const;

export * from "./evals/fixtures.js";
export * from "./evals/golden-examples.js";
export * from "./evals/regression-cases.js";
export * from "./evals/harness.js";
export * from "./evals/workflow-harness.js";
export * from "./rls-fixtures.js";
export * from "./rls-contracts.js";
