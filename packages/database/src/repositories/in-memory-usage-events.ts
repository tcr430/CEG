import { randomUUID } from "node:crypto";

import type { CreateUsageEventInput, UsageEvent } from "@ceg/validation";

import type { UsageEventRepository } from "./usage-events.js";
import { validateCreateUsageEventInput, validateWorkspaceId } from "./shared.js";

export function createInMemoryUsageEventRepository(
  initialEvents: UsageEvent[] = [],
): UsageEventRepository {
  const records = new Map(initialEvents.map((event) => [event.id, event] as const));

  return {
    async createUsageEvent(input: CreateUsageEventInput) {
      const values = validateCreateUsageEventInput(input);
      const now = new Date();
      const record: UsageEvent = {
        id: randomUUID(),
        workspaceId: values.workspaceId,
        userId: values.userId ?? null,
        campaignId: values.campaignId ?? null,
        prospectId: values.prospectId ?? null,
        eventName: values.eventName,
        entityType: values.entityType ?? null,
        entityId: values.entityId ?? null,
        quantity: values.quantity,
        billable: values.billable,
        inputTokens: values.inputTokens ?? null,
        outputTokens: values.outputTokens ?? null,
        costUsd: values.costUsd ?? null,
        metadata: values.metadata,
        occurredAt: now,
        createdAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async listUsageEventsByWorkspace(workspaceId: string) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((record) => record.workspaceId === validatedWorkspaceId)
        .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    },
    async listUsageEventsByWorkspaceAndOccurredAtRange(input) {
      const validatedWorkspaceId = validateWorkspaceId(input.workspaceId);
      return [...records.values()]
        .filter(
          (record) =>
            record.workspaceId === validatedWorkspaceId &&
            record.occurredAt >= input.occurredFrom &&
            record.occurredAt < input.occurredTo,
        )
        .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    },
  };
}
