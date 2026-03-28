import type { Subscription, UpsertSubscriptionInput } from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapSubscriptionRow,
  validateUpsertSubscriptionInput,
  validateWorkspaceId,
} from "./shared.js";

export type SubscriptionRepository = {
  upsertSubscription(input: UpsertSubscriptionInput): Promise<Subscription>;
  getLatestSubscriptionByWorkspace(workspaceId: string): Promise<Subscription | null>;
  getSubscriptionByProviderSubscriptionId(
    provider: Subscription["provider"],
    providerSubscriptionId: string,
  ): Promise<Subscription | null>;
  getSubscriptionByProviderCustomerId(
    provider: Subscription["provider"],
    providerCustomerId: string,
  ): Promise<Subscription | null>;
};

export function createSubscriptionRepository(
  client: DatabaseClient,
): SubscriptionRepository {
  return {
    async upsertSubscription(input) {
      const values = validateUpsertSubscriptionInput(input);
      const result = await client.query<Parameters<typeof mapSubscriptionRow>[0]>({
        statement: `
          INSERT INTO subscriptions (
            workspace_id,
            provider,
            provider_customer_id,
            provider_subscription_id,
            plan_code,
            status,
            seats,
            billing_email,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (provider, provider_subscription_id)
          WHERE provider_subscription_id IS NOT NULL
          DO UPDATE SET
            workspace_id = EXCLUDED.workspace_id,
            provider_customer_id = EXCLUDED.provider_customer_id,
            plan_code = EXCLUDED.plan_code,
            status = EXCLUDED.status,
            seats = EXCLUDED.seats,
            billing_email = EXCLUDED.billing_email,
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            cancel_at_period_end = EXCLUDED.cancel_at_period_end,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING
            id,
            workspace_id,
            provider,
            provider_customer_id,
            provider_subscription_id,
            plan_code,
            status,
            seats,
            billing_email,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.provider,
          values.providerCustomerId ?? null,
          values.providerSubscriptionId ?? null,
          values.planCode,
          values.status,
          values.seats,
          values.billingEmail ?? null,
          values.currentPeriodStart ?? null,
          values.currentPeriodEnd ?? null,
          values.cancelAtPeriodEnd,
          values.metadata,
        ],
      });

      return mapSubscriptionRow(getFirstRowOrThrow(result.rows, "subscription"));
    },
    async getLatestSubscriptionByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<Parameters<typeof mapSubscriptionRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            provider,
            provider_customer_id,
            provider_subscription_id,
            plan_code,
            status,
            seats,
            billing_email,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            metadata,
            created_at,
            updated_at
          FROM subscriptions
          WHERE workspace_id = $1
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [validatedWorkspaceId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapSubscriptionRow(row);
    },
    async getSubscriptionByProviderSubscriptionId(provider, providerSubscriptionId) {
      const result = await client.query<Parameters<typeof mapSubscriptionRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            provider,
            provider_customer_id,
            provider_subscription_id,
            plan_code,
            status,
            seats,
            billing_email,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            metadata,
            created_at,
            updated_at
          FROM subscriptions
          WHERE provider = $1
            AND provider_subscription_id = $2
          LIMIT 1
        `,
        params: [provider, providerSubscriptionId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapSubscriptionRow(row);
    },
    async getSubscriptionByProviderCustomerId(provider, providerCustomerId) {
      const result = await client.query<Parameters<typeof mapSubscriptionRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            provider,
            provider_customer_id,
            provider_subscription_id,
            plan_code,
            status,
            seats,
            billing_email,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            metadata,
            created_at,
            updated_at
          FROM subscriptions
          WHERE provider = $1
            AND provider_customer_id = $2
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [provider, providerCustomerId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapSubscriptionRow(row);
    },
  };
}
