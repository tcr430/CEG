import { randomUUID } from "node:crypto";

import type { Subscription, UpsertSubscriptionInput } from "@ceg/validation";

import type { SubscriptionRepository } from "./subscriptions.js";
import { validateUpsertSubscriptionInput, validateWorkspaceId } from "./shared.js";

export function createInMemorySubscriptionRepository(
  initialSubscriptions: Subscription[] = [],
): SubscriptionRepository {
  const records = new Map(
    initialSubscriptions.map((subscription) => [subscription.id, subscription] as const),
  );

  return {
    async upsertSubscription(input: UpsertSubscriptionInput) {
      const values = validateUpsertSubscriptionInput(input);
      const existing = [...records.values()].find(
        (subscription) =>
          subscription.provider === values.provider &&
          subscription.providerSubscriptionId !== null &&
          subscription.providerSubscriptionId === (values.providerSubscriptionId ?? null),
      );
      const now = new Date();
      const record: Subscription = {
        id: existing?.id ?? randomUUID(),
        workspaceId: values.workspaceId,
        provider: values.provider,
        providerCustomerId: values.providerCustomerId ?? null,
        providerSubscriptionId: values.providerSubscriptionId ?? null,
        planCode: values.planCode,
        status: values.status,
        seats: values.seats,
        billingEmail: values.billingEmail ?? null,
        currentPeriodStart: values.currentPeriodStart ?? null,
        currentPeriodEnd: values.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        metadata: values.metadata,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async getLatestSubscriptionByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((subscription) => subscription.workspaceId === validatedWorkspaceId)
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
    },
    async getSubscriptionByProviderSubscriptionId(provider, providerSubscriptionId) {
      return (
        [...records.values()].find(
          (subscription) =>
            subscription.provider === provider &&
            subscription.providerSubscriptionId === providerSubscriptionId,
        ) ?? null
      );
    },
    async getSubscriptionByProviderCustomerId(provider, providerCustomerId) {
      return (
        [...records.values()]
          .filter(
            (subscription) =>
              subscription.provider === provider &&
              subscription.providerCustomerId === providerCustomerId,
          )
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null
      );
    },
  };
}
