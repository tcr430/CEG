import { randomUUID } from "node:crypto";

import type { AuditEvent, CreateAuditEventInput } from "@ceg/validation";

import type { AuditEventRepository } from "./audit-events.js";
import { validateCreateAuditEventInput, validateWorkspaceId } from "./shared.js";

export function createInMemoryAuditEventRepository(
  initialEvents: AuditEvent[] = [],
): AuditEventRepository {
  const records = new Map(initialEvents.map((event) => [event.id, event] as const));

  return {
    async createAuditEvent(input: CreateAuditEventInput) {
      const values = validateCreateAuditEventInput(input);
      const now = new Date();
      const record: AuditEvent = {
        id: randomUUID(),
        workspaceId: values.workspaceId,
        userId: values.userId ?? null,
        actorType: values.actorType,
        action: values.action,
        entityType: values.entityType,
        entityId: values.entityId ?? null,
        requestId: values.requestId ?? null,
        changes: values.changes,
        metadata: values.metadata,
        createdAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async listAuditEventsByWorkspace(workspaceId: string) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((record) => record.workspaceId === validatedWorkspaceId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
    async listRecentAuditEventsByWorkspace(input) {
      const validatedWorkspaceId = validateWorkspaceId(input.workspaceId);
      const limit = input.limit ?? 25;

      return [...records.values()]
        .filter((record) => record.workspaceId === validatedWorkspaceId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit);
    },
  };
}
