import { randomUUID } from "node:crypto";

import type { InboxAccount } from "@ceg/validation";

import type {
  InboxAccountCredentialRecord,
  InboxAccountRepository,
} from "./inbox-accounts.js";
import {
  validateCreateInboxAccountInput,
  validateInboxAccountId,
  validateUpdateInboxAccountSyncStateInput,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryInboxAccountRepository(
  initialAccounts: InboxAccount[] = [],
): InboxAccountRepository {
  const records = new Map(
    initialAccounts.map((account) => [account.id, account] as const),
  );
  const credentials = new Map<string, string | null>();

  return {
    async createInboxAccount(input) {
      const values = validateCreateInboxAccountInput(input);
      const now = new Date();
      const record: InboxAccount = {
        id: randomUUID(),
        workspaceId: values.workspaceId,
        userId: values.userId ?? null,
        provider: values.provider,
        emailAddress: values.emailAddress,
        displayName: values.displayName ?? null,
        providerAccountRef: values.providerAccountRef,
        status: values.status,
        syncState: values.syncState,
        metadata: values.metadata,
        lastSyncedAt: values.lastSyncedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async updateInboxAccountSyncState(input) {
      const values = validateUpdateInboxAccountSyncStateInput(input);
      const existing = records.get(validateInboxAccountId(values.inboxAccountId));

      if (!existing || existing.workspaceId !== values.workspaceId) {
        throw new Error("Inbox account not found for workspace.");
      }

      const updated: InboxAccount = {
        ...existing,
        status: values.status ?? existing.status,
        syncState: values.syncState,
        lastSyncedAt:
          values.lastSyncedAt === undefined
            ? existing.lastSyncedAt ?? null
            : values.lastSyncedAt,
        updatedAt: new Date(),
      };
      records.set(updated.id, updated);
      return updated;
    },
    async getInboxAccountById(inboxAccountId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      return records.get(validatedInboxAccountId) ?? null;
    },
    async listInboxAccountsByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((account) => account.workspaceId === validatedWorkspaceId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
    async getInboxAccountByProviderRef(workspaceId, provider, providerAccountRef) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return (
        [...records.values()].find(
          (account) =>
            account.workspaceId === validatedWorkspaceId &&
            account.provider === provider &&
          account.providerAccountRef === providerAccountRef,
        ) ?? null
      );
    },
    async setInboxAccountCredentials(input) {
      const validatedInboxAccountId = validateInboxAccountId(input.inboxAccountId);
      const account = records.get(validatedInboxAccountId);

      if (!account || account.workspaceId !== input.workspaceId) {
        throw new Error("Inbox account not found for workspace.");
      }

      credentials.set(validatedInboxAccountId, input.encryptedCredentials);
    },
    async getInboxAccountCredentials(inboxAccountId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      if (!records.has(validatedInboxAccountId)) {
        return null;
      }

      const record: InboxAccountCredentialRecord = {
        inboxAccountId: validatedInboxAccountId,
        encryptedCredentials: credentials.get(validatedInboxAccountId) ?? null,
      };

      return record;
    },
  };
}
