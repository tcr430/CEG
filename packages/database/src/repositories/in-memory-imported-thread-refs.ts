import { randomUUID } from "node:crypto";

import type { ImportedThreadRef } from "@ceg/validation";

import type { ImportedThreadRefRepository } from "./imported-thread-refs.js";
import {
  validateConversationThreadId,
  validateInboxAccountId,
  validateUpsertImportedThreadRefInput,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryImportedThreadRefRepository(
  initialRefs: ImportedThreadRef[] = [],
): ImportedThreadRefRepository {
  const records = new Map(initialRefs.map((ref) => [ref.id, ref] as const));

  return {
    async upsertImportedThreadRef(input) {
      const values = validateUpsertImportedThreadRefInput(input);
      const existing = [...records.values()].find(
        (record) =>
          record.inboxAccountId === values.inboxAccountId &&
          record.providerThreadId === values.providerThreadId,
      );
      const now = new Date();
      const record: ImportedThreadRef = {
        id: existing?.id ?? randomUUID(),
        workspaceId: values.workspaceId,
        inboxAccountId: values.inboxAccountId,
        prospectId: values.prospectId ?? null,
        conversationThreadId: values.conversationThreadId ?? null,
        provider: values.provider,
        providerThreadId: values.providerThreadId,
        providerFolder: values.providerFolder ?? null,
        subject: values.subject ?? null,
        participants: values.participants,
        snippet: values.snippet ?? null,
        lastMessageReceivedAt: values.lastMessageReceivedAt ?? null,
        syncState: values.syncState,
        metadata: values.metadata,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async getImportedThreadRefByProviderThread(inboxAccountId, providerThreadId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      return (
        [...records.values()].find(
          (record) =>
            record.inboxAccountId === validatedInboxAccountId &&
            record.providerThreadId === providerThreadId,
        ) ?? null
      );
    },
    async listImportedThreadRefsByConversationThread(workspaceId, conversationThreadId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedConversationThreadId =
        validateConversationThreadId(conversationThreadId);
      return [...records.values()]
        .filter(
          (record) =>
            record.workspaceId === validatedWorkspaceId &&
            record.conversationThreadId === validatedConversationThreadId,
        )
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    },
  };
}
