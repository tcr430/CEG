import type {
  ImportedMessageRef,
  UpsertImportedMessageRefInput,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapImportedMessageRefRow,
  validateInboxAccountId,
  validateMessageId,
  validateImportedThreadRefId,
  validateUpsertImportedMessageRefInput,
  validateWorkspaceId,
} from "./shared.js";

type ImportedMessageRefRow = Parameters<typeof mapImportedMessageRefRow>[0];

export type ImportedMessageRefRepository = {
  upsertImportedMessageRef(
    input: UpsertImportedMessageRefInput,
  ): Promise<ImportedMessageRef>;
  getImportedMessageRefByMessageId(
    workspaceId: string,
    messageId: string,
  ): Promise<ImportedMessageRef | null>;
  getImportedMessageRefByProviderMessage(
    inboxAccountId: string,
    providerMessageId: string,
  ): Promise<ImportedMessageRef | null>;
  listImportedMessageRefsByThreadRef(
    importedThreadRefId: string,
  ): Promise<ImportedMessageRef[]>;
};

export function createImportedMessageRefRepository(
  client: DatabaseClient,
): ImportedMessageRefRepository {
  return {
    async upsertImportedMessageRef(input) {
      const values = validateUpsertImportedMessageRefInput(input);
      const result = await client.query<ImportedMessageRef>({
        statement: `
          INSERT INTO imported_message_refs (
            workspace_id,
            inbox_account_id,
            imported_thread_ref_id,
            message_id,
            provider,
            provider_message_id,
            provider_thread_id,
            direction,
            provider_message_type,
            message_role,
            reply_to_provider_message_id,
            subject,
            from_address,
            to_addresses,
            cc_addresses,
            bcc_addresses,
            raw_body_text,
            raw_body_html,
            normalized_body_text,
            normalized_body_html,
            sync_state,
            metadata,
            sent_at,
            received_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (inbox_account_id, provider_message_id)
          DO UPDATE SET
            imported_thread_ref_id = EXCLUDED.imported_thread_ref_id,
            message_id = EXCLUDED.message_id,
            provider_thread_id = EXCLUDED.provider_thread_id,
            direction = EXCLUDED.direction,
            provider_message_type = EXCLUDED.provider_message_type,
            message_role = EXCLUDED.message_role,
            reply_to_provider_message_id = EXCLUDED.reply_to_provider_message_id,
            subject = EXCLUDED.subject,
            from_address = EXCLUDED.from_address,
            to_addresses = EXCLUDED.to_addresses,
            cc_addresses = EXCLUDED.cc_addresses,
            bcc_addresses = EXCLUDED.bcc_addresses,
            raw_body_text = EXCLUDED.raw_body_text,
            raw_body_html = EXCLUDED.raw_body_html,
            normalized_body_text = EXCLUDED.normalized_body_text,
            normalized_body_html = EXCLUDED.normalized_body_html,
            sync_state = EXCLUDED.sync_state,
            metadata = EXCLUDED.metadata,
            sent_at = EXCLUDED.sent_at,
            received_at = EXCLUDED.received_at,
            updated_at = NOW()
          RETURNING
            id,
            workspace_id,
            inbox_account_id,
            imported_thread_ref_id,
            message_id,
            provider,
            provider_message_id,
            provider_thread_id,
            direction,
            provider_message_type,
            message_role,
            reply_to_provider_message_id,
            subject,
            from_address,
            to_addresses,
            cc_addresses,
            bcc_addresses,
            raw_body_text,
            raw_body_html,
            normalized_body_text,
            normalized_body_html,
            sync_state,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.inboxAccountId,
          values.importedThreadRefId,
          values.messageId ?? null,
          values.provider,
          values.providerMessageId,
          values.providerThreadId,
          values.direction,
          values.providerMessageType,
          values.messageRole,
          values.replyToProviderMessageId ?? null,
          values.subject ?? null,
          values.fromAddress ?? null,
          values.toAddresses,
          values.ccAddresses,
          values.bccAddresses,
          values.rawBodyText ?? null,
          values.rawBodyHtml ?? null,
          values.normalizedBodyText ?? null,
          values.normalizedBodyHtml ?? null,
          values.syncState,
          values.metadata,
          values.sentAt ?? null,
          values.receivedAt ?? null,
        ],
        mapper: (row) => mapImportedMessageRefRow(row as ImportedMessageRefRow),
      });

      return getFirstRowOrThrow(result.rows, "imported message ref");
    },
    async getImportedMessageRefByMessageId(workspaceId, messageId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedMessageId = validateMessageId(messageId);
      const result = await client.query<ImportedMessageRef>({
        statement: `
          SELECT
            id,
            workspace_id,
            inbox_account_id,
            imported_thread_ref_id,
            message_id,
            provider,
            provider_message_id,
            provider_thread_id,
            direction,
            provider_message_type,
            message_role,
            reply_to_provider_message_id,
            subject,
            from_address,
            to_addresses,
            cc_addresses,
            bcc_addresses,
            raw_body_text,
            raw_body_html,
            normalized_body_text,
            normalized_body_html,
            sync_state,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
          FROM imported_message_refs
          WHERE workspace_id = $1
            AND message_id = $2
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [validatedWorkspaceId, validatedMessageId],
        mapper: (row) => mapImportedMessageRefRow(row as ImportedMessageRefRow),
      });

      return result.rows[0] ?? null;
    },
    async getImportedMessageRefByProviderMessage(inboxAccountId, providerMessageId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      const result = await client.query<ImportedMessageRef>({
        statement: `
          SELECT
            id,
            workspace_id,
            inbox_account_id,
            imported_thread_ref_id,
            message_id,
            provider,
            provider_message_id,
            provider_thread_id,
            direction,
            provider_message_type,
            message_role,
            reply_to_provider_message_id,
            subject,
            from_address,
            to_addresses,
            cc_addresses,
            bcc_addresses,
            raw_body_text,
            raw_body_html,
            normalized_body_text,
            normalized_body_html,
            sync_state,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
          FROM imported_message_refs
          WHERE inbox_account_id = $1
            AND provider_message_id = $2
          LIMIT 1
        `,
        params: [validatedInboxAccountId, providerMessageId],
        mapper: (row) => mapImportedMessageRefRow(row as ImportedMessageRefRow),
      });

      return result.rows[0] ?? null;
    },
    async listImportedMessageRefsByThreadRef(importedThreadRefId) {
      const validatedImportedThreadRefId =
        validateImportedThreadRefId(importedThreadRefId);
      const result = await client.query<ImportedMessageRef>({
        statement: `
          SELECT
            id,
            workspace_id,
            inbox_account_id,
            imported_thread_ref_id,
            message_id,
            provider,
            provider_message_id,
            provider_thread_id,
            direction,
            provider_message_type,
            message_role,
            reply_to_provider_message_id,
            subject,
            from_address,
            to_addresses,
            cc_addresses,
            bcc_addresses,
            raw_body_text,
            raw_body_html,
            normalized_body_text,
            normalized_body_html,
            sync_state,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
          FROM imported_message_refs
          WHERE imported_thread_ref_id = $1
          ORDER BY created_at ASC
        `,
        params: [validatedImportedThreadRefId],
        mapper: (row) => mapImportedMessageRefRow(row as ImportedMessageRefRow),
      });

      return result.rows;
    },
  };
}
