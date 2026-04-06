import { randomUUID } from "node:crypto";

import type { ImportedMessageRef } from "@ceg/validation";

import type { ImportedMessageRefRepository } from "./imported-message-refs.js";
import {
  validateInboxAccountId,
  validateImportedThreadRefId,
  validateMessageId,
  validateUpsertImportedMessageRefInput,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryImportedMessageRefRepository(
  initialRefs: ImportedMessageRef[] = [],
): ImportedMessageRefRepository {
  const records = new Map(initialRefs.map((ref) => [ref.id, ref] as const));

  return {
    async upsertImportedMessageRef(input) {
      const values = validateUpsertImportedMessageRefInput(input);
      const existing = [...records.values()].find(
        (record) =>
          record.inboxAccountId === values.inboxAccountId &&
          record.providerMessageId === values.providerMessageId,
      );
      const now = new Date();
      const record: ImportedMessageRef = {
        id: existing?.id ?? randomUUID(),
        workspaceId: values.workspaceId,
        inboxAccountId: values.inboxAccountId,
        importedThreadRefId: values.importedThreadRefId,
        messageId: values.messageId ?? null,
        provider: values.provider,
        providerMessageId: values.providerMessageId,
        providerThreadId: values.providerThreadId,
        direction: values.direction,
        providerMessageType: values.providerMessageType,
        messageRole: values.messageRole,
        replyToProviderMessageId: values.replyToProviderMessageId ?? null,
        subject: values.subject ?? null,
        fromAddress: values.fromAddress ?? null,
        toAddresses: values.toAddresses,
        ccAddresses: values.ccAddresses,
        bccAddresses: values.bccAddresses,
        rawBodyText: values.rawBodyText ?? null,
        rawBodyHtml: values.rawBodyHtml ?? null,
        normalizedBodyText: values.normalizedBodyText ?? null,
        normalizedBodyHtml: values.normalizedBodyHtml ?? null,
        syncState: values.syncState,
        metadata: values.metadata,
        sentAt: values.sentAt ?? null,
        receivedAt: values.receivedAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async getImportedMessageRefByMessageId(workspaceId, messageId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedMessageId = validateMessageId(messageId);
      return (
        [...records.values()].find(
          (record) =>
            record.workspaceId === validatedWorkspaceId &&
            record.messageId === validatedMessageId,
        ) ?? null
      );
    },
    async getImportedMessageRefByProviderMessage(inboxAccountId, providerMessageId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      return (
        [...records.values()].find(
          (record) =>
            record.inboxAccountId === validatedInboxAccountId &&
            record.providerMessageId === providerMessageId,
        ) ?? null
      );
    },
    async listImportedMessageRefsByThreadRef(importedThreadRefId) {
      const validatedImportedThreadRefId =
        validateImportedThreadRefId(importedThreadRefId);
      return [...records.values()]
        .filter((record) => record.importedThreadRefId === validatedImportedThreadRefId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
  };
}
