import { randomUUID } from "node:crypto";

import type { InboxSyncRun } from "@ceg/validation";

import type { InboxSyncRunRepository } from "./inbox-sync-runs.js";
import {
  validateCompleteInboxSyncRunInput,
  validateCreateInboxSyncRunInput,
  validateInboxAccountId,
  validateInboxSyncRunId,
} from "./shared.js";

export function createInMemoryInboxSyncRunRepository(
  initialRuns: InboxSyncRun[] = [],
): InboxSyncRunRepository {
  const records = new Map(initialRuns.map((run) => [run.id, run] as const));

  return {
    async createInboxSyncRun(input) {
      const values = validateCreateInboxSyncRunInput(input);
      const now = new Date();
      const record: InboxSyncRun = {
        id: randomUUID(),
        workspaceId: values.workspaceId,
        inboxAccountId: values.inboxAccountId,
        provider: values.provider,
        status: values.status,
        syncMode: values.syncMode,
        cursorBefore: values.cursorBefore ?? null,
        cursorAfter: values.cursorAfter ?? null,
        importedThreadCount: values.importedThreadCount,
        importedMessageCount: values.importedMessageCount,
        startedAt: values.startedAt ?? now,
        finishedAt: values.finishedAt ?? null,
        errorSummary: values.errorSummary ?? null,
        metadata: values.metadata,
        createdAt: now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async completeInboxSyncRun(input) {
      const values = validateCompleteInboxSyncRunInput(input);
      const existing = records.get(validateInboxSyncRunId(values.inboxSyncRunId));

      if (!existing || existing.inboxAccountId !== values.inboxAccountId) {
        throw new Error("Inbox sync run not found for account.");
      }

      const updated: InboxSyncRun = {
        ...existing,
        status: values.status,
        cursorAfter:
          values.cursorAfter === undefined ? existing.cursorAfter : values.cursorAfter,
        importedThreadCount: values.importedThreadCount,
        importedMessageCount: values.importedMessageCount,
        finishedAt: values.finishedAt ?? new Date(),
        errorSummary: values.errorSummary ?? null,
        metadata: values.metadata,
        updatedAt: new Date(),
      };
      records.set(updated.id, updated);
      return updated;
    },
    async listInboxSyncRunsByAccount(inboxAccountId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      return [...records.values()]
        .filter((run) => run.inboxAccountId === validatedInboxAccountId)
        .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
    },
  };
}
