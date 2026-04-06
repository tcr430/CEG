import assert from "node:assert/strict";

import {
  getWorkspaceScopedTables,
  summarizeRestrictedTables,
  workspaceScopedRlsExpectations,
} from "../dist/index.js";

assert.equal(workspaceScopedRlsExpectations.length >= 10, true);
assert.equal(
  workspaceScopedRlsExpectations.every((expectation) => expectation.outsider === "deny"),
  true,
);
assert.deepEqual(summarizeRestrictedTables().sort(), [
  "audit_events",
  "subscriptions",
  "usage_events",
]);
assert.equal(getWorkspaceScopedTables().includes("campaigns"), true);

console.log("@ceg/testing RLS contract tests passed");
