import type {
  ImportedThreadRef,
  UpsertImportedThreadRefInput,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapImportedThreadRefRow,
  validateConversationThreadId,
  validateInboxAccountId,
  validateUpsertImportedThreadRefInput,
  validateWorkspaceId,
} from "./shared.js";

type ImportedThreadRefRow = Parameters<typeof mapImportedThreadRefRow>[0];

export type ImportedThreadRefRepository = {
  upsertImportedThreadRef(
    input: UpsertImportedThreadRefInput,
  ): Promise<ImportedThreadRef>;
  getImportedThreadRefByProviderThread(
    inboxAccountId: string,
    providerThreadId: string,
  ): Promise<ImportedThreadRef | null>;
  listImportedThreadRefsByConversationThread(
    workspaceId: string,
    conversationThreadId: string,
  ): Promise<ImportedThreadRef[]>;
};

export function createImportedThreadRefRepository(
  client: DatabaseClient,
): ImportedThreadRefRepository {
  return {
    async upsertImportedThreadRef(input) {
      const values = validateUpsertImportedThreadRefInput(input);
      const result = await client.query<ImportedThreadRef>({
        statement: `
          INSERT INTO imported_thread_refs (
            workspace_id,
            inbox_account_id,
            prospect_id,
            conversation_thread_id,
            provider,
            provider_thread_id,
            provider_folder,
            subject,
            participants,
            snippet,
            last_message_received_at,
            sync_state,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (inbox_account_id, provider_thread_id)
          DO UPDATE SET
            prospect_id = EXCLUDED.prospect_id,
            conversation_thread_id = EXCLUDED.conversation_thread_id,
            provider_folder = EXCLUDED.provider_folder,
            subject = EXCLUDED.subject,
            participants = EXCLUDED.participants,
            snippet = EXCLUDED.snippet,
            last_message_received_at = EXCLUDED.last_message_received_at,
            sync_state = EXCLUDED.sync_state,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING
            id,
            workspace_id,
            inbox_account_id,
            prospect_id,
            conversation_thread_id,
            provider,
            provider_thread_id,
            provider_folder,
            subject,
            participants,
            snippet,
            last_message_received_at,
            sync_state,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.inboxAccountId,
          values.prospectId ?? null,
          values.conversationThreadId ?? null,
          values.provider,
          values.providerThreadId,
          values.providerFolder ?? null,
          values.subject ?? null,
          values.participants,
          values.snippet ?? null,
          values.lastMessageReceivedAt ?? null,
          values.syncState,
          values.metadata,
        ],
        mapper: (row) => mapImportedThreadRefRow(row as ImportedThreadRefRow),
      });

      return getFirstRowOrThrow(result.rows, "imported thread ref");
    },
    async getImportedThreadRefByProviderThread(inboxAccountId, providerThreadId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      const result = await client.query<ImportedThreadRef>({
        statement: `
          SELECT
            id,
            workspace_id,
            inbox_account_id,
            prospect_id,
            conversation_thread_id,
            provider,
            provider_thread_id,
            provider_folder,
            subject,
            participants,
            snippet,
            last_message_received_at,
            sync_state,
            metadata,
            created_at,
            updated_at
          FROM imported_thread_refs
          WHERE inbox_account_id = $1
            AND provider_thread_id = $2
          LIMIT 1
        `,
        params: [validatedInboxAccountId, providerThreadId],
        mapper: (row) => mapImportedThreadRefRow(row as ImportedThreadRefRow),
      });

      return result.rows[0] ?? null;
    },
    async listImportedThreadRefsByConversationThread(workspaceId, conversationThreadId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedConversationThreadId =
        validateConversationThreadId(conversationThreadId);
      const result = await client.query<ImportedThreadRef>({
        statement: `
          SELECT
            id,
            workspace_id,
            inbox_account_id,
            prospect_id,
            conversation_thread_id,
            provider,
            provider_thread_id,
            provider_folder,
            subject,
            participants,
            snippet,
            last_message_received_at,
            sync_state,
            metadata,
            created_at,
            updated_at
          FROM imported_thread_refs
          WHERE workspace_id = $1
            AND conversation_thread_id = $2
          ORDER BY updated_at DESC
        `,
        params: [validatedWorkspaceId, validatedConversationThreadId],
        mapper: (row) => mapImportedThreadRefRow(row as ImportedThreadRefRow),
      });

      return result.rows;
    },
  };
}
