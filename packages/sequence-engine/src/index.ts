export * from "./contracts.js";
export * from "./validators.js";
export * from "./service.js";

export const sequenceEngineBoundary = {
  name: "@ceg/sequence-engine",
  purpose: "Schema-validated outbound sequence generation contracts",
} as const;
