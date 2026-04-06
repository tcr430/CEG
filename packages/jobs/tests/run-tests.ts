import assert from "node:assert/strict";

import {
  beginAsyncOperationRun,
  buildProspectAsyncOperationsMetadata,
  completeAsyncOperationRun,
  failAsyncOperationRun,
  getAsyncOperationState,
  readProspectAsyncOperations,
} from "../dist/index.js";

const startedAt = new Date("2026-04-05T10:00:00.000Z");
const beginResult = beginAsyncOperationRun({
  operations: {},
  kind: "prospect_research",
  requestId: "req-1",
  idempotencyKey: "research:prospect-1:https://example.com",
  now: startedAt,
});

assert.equal(beginResult.accepted, true);
assert.equal(beginResult.state.status, "running");
assert.equal(beginResult.state.attemptCount, 1);

const duplicateWhileFresh = beginAsyncOperationRun({
  operations: beginResult.nextOperations,
  kind: "prospect_research",
  requestId: "req-2",
  idempotencyKey: "research:prospect-1:https://example.com",
  now: new Date("2026-04-05T10:04:00.000Z"),
});

assert.equal(duplicateWhileFresh.accepted, false);
assert.equal(duplicateWhileFresh.reason, "already_running");

const afterSuccess = completeAsyncOperationRun({
  operations: beginResult.nextOperations,
  kind: "prospect_research",
  requestId: "req-1",
  resultSummary: {
    snapshotId: "snapshot-1",
  },
  now: new Date("2026-04-05T10:06:00.000Z"),
});

assert.equal(getAsyncOperationState(afterSuccess, "prospect_research").status, "succeeded");
assert.equal(
  getAsyncOperationState(afterSuccess, "prospect_research").resultSummary.snapshotId,
  "snapshot-1",
);

const staleRetry = beginAsyncOperationRun({
  operations: beginResult.nextOperations,
  kind: "prospect_research",
  requestId: "req-3",
  idempotencyKey: "research:prospect-1:https://example.com",
  now: new Date("2026-04-05T10:30:00.000Z"),
});
assert.equal(staleRetry.accepted, true);
assert.equal(staleRetry.state.attemptCount, 2);

const afterFailure = failAsyncOperationRun({
  operations: staleRetry.nextOperations,
  kind: "prospect_research",
  requestId: "req-3",
  errorSummary: "Network timeout",
  now: new Date("2026-04-05T10:31:00.000Z"),
});
assert.equal(getAsyncOperationState(afterFailure, "prospect_research").status, "failed");
assert.equal(
  getAsyncOperationState(afterFailure, "prospect_research").errorSummary,
  "Network timeout",
);

const metadata = buildProspectAsyncOperationsMetadata({
  metadata: {
    existing: true,
  },
  operations: afterFailure,
});
const parsed = readProspectAsyncOperations(metadata);
assert.equal(parsed.prospectResearch?.status, "failed");
assert.equal((metadata as { existing?: boolean }).existing, true);

console.log("@ceg/jobs async orchestration tests passed");
