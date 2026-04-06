import type {
  CreateInboxAccountInput,
  InboxAccount,
  UpdateInboxAccountSyncStateInput,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapInboxAccountRow,
  validateCreateInboxAccountInput,
  validateInboxAccountId,
  validateUpdateInboxAccountSyncStateInput,
  validateWorkspaceId,
} from "./shared.js";

type InboxAccountRow = Parameters<typeof mapInboxAccountRow>[0];

export type InboxAccountCredentialRecord = {
  inboxAccountId: string;
  encryptedCredentials: string | null;
};

export type SetInboxAccountCredentialsInput = {
  inboxAccountId: string;
  workspaceId: string;
  encryptedCredentials: string | null;
};

export type InboxAccountRepository = {
  createInboxAccount(input: CreateInboxAccountInput): Promise<InboxAccount>;
  updateInboxAccountSyncState(
    input: UpdateInboxAccountSyncStateInput,
  ): Promise<InboxAccount>;
  getInboxAccountById(inboxAccountId: string): Promise<InboxAccount | null>;
  listInboxAccountsByWorkspace(workspaceId: string): Promise<InboxAccount[]>;
  getInboxAccountByProviderRef(
    workspaceId: string,
    provider: InboxAccount["provider"],
    providerAccountRef: string,
  ): Promise<InboxAccount | null>;
  setInboxAccountCredentials(
    input: SetInboxAccountCredentialsInput,
  ): Promise<void>;
  getInboxAccountCredentials(
    inboxAccountId: string,
  ): Promise<InboxAccountCredentialRecord | null>;
};

export function createInboxAccountRepository(
  client: DatabaseClient,
): InboxAccountRepository {
  return {
    async createInboxAccount(input) {
      const values = validateCreateInboxAccountInput(input);
      const result = await client.query<InboxAccount>({
        statement: `
          INSERT INTO inbox_accounts (
            workspace_id,
            user_id,
            provider,
            email_address,
            display_name,
            provider_account_ref,
            status,
            sync_state,
            metadata,
            last_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING
            id,
            workspace_id,
            user_id,
            provider,
            email_address,
            display_name,
            provider_account_ref,
            status,
            sync_state,
            metadata,
            last_synced_at,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.userId ?? null,
          values.provider,
          values.emailAddress,
          values.displayName ?? null,
          values.providerAccountRef,
          values.status,
          values.syncState,
          values.metadata,
          values.lastSyncedAt ?? null,
        ],
        mapper: (row) => mapInboxAccountRow(row as InboxAccountRow),
      });

      return getFirstRowOrThrow(result.rows, "inbox account");
    },
    async updateInboxAccountSyncState(input) {
      const values = validateUpdateInboxAccountSyncStateInput(input);
      const result = await client.query<InboxAccount>({
        statement: `
          UPDATE inbox_accounts
          SET
            status = COALESCE($3, status),
            sync_state = $4,
            last_synced_at = $5,
            updated_at = NOW()
          WHERE id = $1
            AND workspace_id = $2
          RETURNING
            id,
            workspace_id,
            user_id,
            provider,
            email_address,
            display_name,
            provider_account_ref,
            status,
            sync_state,
            metadata,
            last_synced_at,
            created_at,
            updated_at
        `,
        params: [
          values.inboxAccountId,
          values.workspaceId,
          values.status ?? null,
          values.syncState,
          values.lastSyncedAt ?? null,
        ],
        mapper: (row) => mapInboxAccountRow(row as InboxAccountRow),
      });

      return getFirstRowOrThrow(result.rows, "inbox account");
    },
    async getInboxAccountById(inboxAccountId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      const result = await client.query<InboxAccount>({
        statement: `
          SELECT
            id,
            workspace_id,
            user_id,
            provider,
            email_address,
            display_name,
            provider_account_ref,
            status,
            sync_state,
            metadata,
            last_synced_at,
            created_at,
            updated_at
          FROM inbox_accounts
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedInboxAccountId],
        mapper: (row) => mapInboxAccountRow(row as InboxAccountRow),
      });

      return result.rows[0] ?? null;
    },
    async listInboxAccountsByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<InboxAccount>({
        statement: `
          SELECT
            id,
            workspace_id,
            user_id,
            provider,
            email_address,
            display_name,
            provider_account_ref,
            status,
            sync_state,
            metadata,
            last_synced_at,
            created_at,
            updated_at
          FROM inbox_accounts
          WHERE workspace_id = $1
          ORDER BY created_at ASC
        `,
        params: [validatedWorkspaceId],
        mapper: (row) => mapInboxAccountRow(row as InboxAccountRow),
      });

      return result.rows;
    },
    async getInboxAccountByProviderRef(workspaceId, provider, providerAccountRef) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<InboxAccount>({
        statement: `
          SELECT
            id,
            workspace_id,
            user_id,
            provider,
            email_address,
            display_name,
            provider_account_ref,
            status,
            sync_state,
            metadata,
            last_synced_at,
            created_at,
            updated_at
          FROM inbox_accounts
          WHERE workspace_id = $1
            AND provider = $2
            AND provider_account_ref = $3
          LIMIT 1
        `,
        params: [validatedWorkspaceId, provider, providerAccountRef],
        mapper: (row) => mapInboxAccountRow(row as InboxAccountRow),
      });

      return result.rows[0] ?? null;
    },
    async setInboxAccountCredentials(input) {
      const validatedInboxAccountId = validateInboxAccountId(input.inboxAccountId);
      const validatedWorkspaceId = validateWorkspaceId(input.workspaceId);
      await client.query({
        statement: `
          UPDATE inbox_accounts
          SET
            oauth_credentials_encrypted = $3,
            updated_at = NOW()
          WHERE id = $1
            AND workspace_id = $2
        `,
        params: [
          validatedInboxAccountId,
          validatedWorkspaceId,
          input.encryptedCredentials,
        ],
      });
    },
    async getInboxAccountCredentials(inboxAccountId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      const result = await client.query<InboxAccountCredentialRecord>({
        statement: `
          SELECT
            id AS "inboxAccountId",
            oauth_credentials_encrypted AS "encryptedCredentials"
          FROM inbox_accounts
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedInboxAccountId],
      });

      return result.rows[0] ?? null;
    },
  };
}
