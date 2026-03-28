import assert from "node:assert/strict";

import {
  createConsoleLogger,
  listBufferedLogEntries,
} from "../src/index.ts";

const requestId = `req-${Date.now()}`;
const logger = createConsoleLogger({ requestId, workspaceId: "workspace-test" });
logger.info("test-log", {
  apiKey: "secret-value",
  plainField: "visible",
  stripeSignature: "abc123",
});

const entries = listBufferedLogEntries({ requestId, limit: 5 });
assert.equal(entries.length > 0, true);
assert.equal(entries[0]?.context.plainField, "visible");
assert.equal(entries[0]?.context.apiKey, "[REDACTED]");
assert.equal(entries[0]?.context.stripeSignature, "[REDACTED]");

console.log("@ceg/observability logging tests passed");
