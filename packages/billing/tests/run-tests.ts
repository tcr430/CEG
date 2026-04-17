import assert from "node:assert/strict";

import {
  assertFeatureEntitlement,
  checkUsageEntitlement,
  createStripeBillingProvider,
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


const fakeStripeClient = {
  checkout: {
    sessions: {
      async create() {
        return { id: "cs_test_123", url: "https://checkout.stripe.test/session" };
      },
    },
  },
  billingPortal: {
    sessions: {
      async create() {
        return { url: "https://billing.stripe.test/session" };
      },
    },
  },
  webhooks: {
    constructEvent() {
      return {
        id: "evt_123",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "active",
            metadata: {
              workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
              planCode: "pro",
            },
            customer: {
              id: "cus_123",
              email: "owner@example.com",
              deleted: false,
            },
            items: {
              data: [
                {
                  quantity: 2,
                  price: {
                    id: "price_pro_monthly",
                  },
                },
              ],
            },
            current_period_start: 1_711_849_600,
            current_period_end: 1_714_441_600,
            cancel_at_period_end: false,
          },
        },
      };
    },
  },
  subscriptions: {
    async retrieve() {
      return {
        id: "sub_123",
        status: "active",
        metadata: {
          workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
          planCode: "pro",
        },
        customer: {
          id: "cus_123",
          email: "owner@example.com",
          deleted: false,
        },
        items: {
          data: [
            {
              quantity: 2,
              price: {
                id: "price_pro_monthly",
              },
            },
          ],
        },
        current_period_start: 1_711_849_600,
        current_period_end: 1_714_441_600,
        cancel_at_period_end: false,
      };
    },
  },
};

const stripeProvider = createStripeBillingProvider(
  {
    secretKey: "sk_test_123",
    webhookSecret: "whsec_123",
    appUrl: "http://localhost:3000",
    monthlyPriceIds: {
      free: "price_starter_monthly",
      pro: "price_pro_monthly",
      agency: "price_agency_monthly",
    },
  },
  {
    client: fakeStripeClient as never,
    logger: {
      info() {
        return;
      },
      warn() {
        return;
      },
      error() {
        return;
      },
    },
  },
);

const checkoutSession = await stripeProvider.createCheckoutSession({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  planCode: "pro",
  customerEmail: "owner@example.com",
  successUrl: "http://localhost:3000/success",
  cancelUrl: "http://localhost:3000/cancel",
});
const starterCheckoutSession = await stripeProvider.createCheckoutSession({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  planCode: "free",
  customerEmail: "owner@example.com",
  successUrl: "http://localhost:3000/success",
  cancelUrl: "http://localhost:3000/cancel",
});
const portalSession = await stripeProvider.createBillingPortalSession({
  customerId: "cus_123",
  returnUrl: "http://localhost:3000/app/settings",
});
const event = stripeProvider.verifyWebhook("payload", "signature");
const normalized = await stripeProvider.normalizeSubscriptionFromEvent(event);

assert.equal(checkoutSession.id, "cs_test_123");
assert.equal(starterCheckoutSession.id, "cs_test_123");
assert.equal(portalSession.url, "https://billing.stripe.test/session");
assert.equal(normalized?.providerSubscriptionId, "sub_123");
assert.equal(normalized?.planCode, "pro");
assert.equal(normalized?.seats, 2);
