import assert from "node:assert/strict";

import {
  assertFeatureEntitlement,
  checkUsageEntitlement,
  getBillingPlanDefinition,
  resolveBillingPlanCode,
  summarizeWorkspaceUsage,
} from "../dist/index.js";

const usage = summarizeWorkspaceUsage([
  {
    id: "e77877a2-a765-480d-8e9e-c2e1d5346bcb",
    workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    userId: null,
    campaignId: null,
    prospectId: null,
    eventName: "prospect_research_completed",
    entityType: "research_snapshot",
    entityId: null,
    quantity: 3,
    billable: false,
    inputTokens: 10,
    outputTokens: 20,
    costUsd: 0.12,
    metadata: {},
    occurredAt: new Date(),
    createdAt: new Date(),
  },
  {
    id: "45c403b7-6f4a-4f41-b663-c460b33544f3",
    workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
    userId: null,
    campaignId: null,
    prospectId: null,
    eventName: "sequence_generated",
    entityType: "sequence",
    entityId: null,
    quantity: 4,
    billable: false,
    inputTokens: 12,
    outputTokens: 30,
    costUsd: 0.21,
    metadata: {},
    occurredAt: new Date(),
    createdAt: new Date(),
  },
]);

assert.equal(resolveBillingPlanCode("agency"), "agency");
assert.equal(resolveBillingPlanCode("unknown"), "free");
assert.equal(getBillingPlanDefinition("pro").features.sender_aware_profiles, true);
assert.equal(usage.counters.websiteResearchRuns, 3);
assert.equal(usage.counters.sequenceGenerations, 4);
assert.equal(usage.totalCostUsd, 0.32999999999999996);

const freeSequenceAllowance = checkUsageEntitlement({
  planCode: "free",
  usage,
  meterKey: "sequenceGenerations",
  quantity: 17,
});

assert.equal(freeSequenceAllowance.allowed, false);
assert.match(freeSequenceAllowance.reason ?? "", /includes 20 sequenceGenerations per month/);

assert.doesNotThrow(() =>
  assertFeatureEntitlement("pro", "sender_aware_profiles"),
);
assert.throws(() => assertFeatureEntitlement("free", "sender_aware_profiles"));

console.log("@ceg/billing contract tests passed");
