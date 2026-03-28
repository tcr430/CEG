export * from "./contracts.js";
export * from "./validators.js";
export * from "./service.js";
export * from "./quality.js";

export const replyEngineBoundary = {
  name: "@ceg/reply-engine",
  purpose: "Schema-validated inbound reply analysis and drafting contracts",
} as const;
