import type {
  CompleteInboxSyncRunInput,
  CreateInboxSyncRunInput,
  InboxSyncRun,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapInboxSyncRunRow,
  validateCompleteInboxSyncRunInput,
  validateCreateInboxSyncRunInput,
  validateInboxAccountId,
} from "./shared.js";

type InboxSyncRunRow = Parameters<typeof mapInboxSyncRunRow>[0];

export type InboxSyncRunRepository = {
  createInboxSyncRun(input: CreateInboxSyncRunInput): Promise<InboxSyncRun>;
  completeInboxSyncRun(
    input: CompleteInboxSyncRunInput,
  ): Promise<InboxSyncRun>;
  listInboxSyncRunsByAccount(inboxAccountId: string): Promise<InboxSyncRun[]>;
};

export function createInboxSyncRunRepository(
  client: DatabaseClient,
): InboxSyncRunRepository {
  return {
    async createInboxSyncRun(input) {
      const values = validateCreateInboxSyncRunInput(input);
      const result = await client.query<InboxSyncRun>({
        statement: `
          INSERT INTO inbox_sync_runs (
            workspace_id,
            inbox_account_id,
            provider,
            status,
            sync_mode,
            cursor_before,
            cursor_after,
            imported_thread_count,
            imported_message_count,
            started_at,
            finished_at,
            error_summary,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING
            id,
            workspace_id,
            inbox_account_id,
            provider,
            status,
            sync_mode,
            cursor_before,
            cursor_after,
            imported_thread_count,
            imported_message_count,
            started_at,
            finished_at,
            error_summary,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.inboxAccountId,
          values.provider,
          values.status,
          values.syncMode,
          values.cursorBefore ?? null,
          values.cursorAfter ?? null,
          values.importedThreadCount,
          values.importedMessageCount,
          values.startedAt ?? new Date(),
          values.finishedAt ?? null,
          values.errorSummary ?? null,
          values.metadata,
        ],
        mapper: (row) => mapInboxSyncRunRow(row as InboxSyncRunRow),
      });

      return getFirstRowOrThrow(result.rows, "inbox sync run");
    },
    async completeInboxSyncRun(input) {
      const values = validateCompleteInboxSyncRunInput(input);
      const result = await client.query<InboxSyncRun>({
        statement: `
          UPDATE inbox_sync_runs
          SET
            status = $3,
            cursor_after = $4,
            imported_thread_count = $5,
            imported_message_count = $6,
            finished_at = $7,
            error_summary = $8,
            metadata = $9,
            updated_at = NOW()
          WHERE id = $1
            AND inbox_account_id = $2
          RETURNING
            id,
            workspace_id,
            inbox_account_id,
            provider,
            status,
            sync_mode,
            cursor_before,
            cursor_after,
            imported_thread_count,
            imported_message_count,
            started_at,
            finished_at,
            error_summary,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          values.inboxSyncRunId,
          values.inboxAccountId,
          values.status,
          values.cursorAfter ?? null,
          values.importedThreadCount,
          values.importedMessageCount,
          values.finishedAt ?? new Date(),
          values.errorSummary ?? null,
          values.metadata,
        ],
        mapper: (row) => mapInboxSyncRunRow(row as InboxSyncRunRow),
      });

      return getFirstRowOrThrow(result.rows, "inbox sync run");
    },
    async listInboxSyncRunsByAccount(inboxAccountId) {
      const validatedInboxAccountId = validateInboxAccountId(inboxAccountId);
      const result = await client.query<InboxSyncRun>({
        statement: `
          SELECT
            id,
            workspace_id,
            inbox_account_id,
            provider,
            status,
            sync_mode,
            cursor_before,
            cursor_after,
            imported_thread_count,
            imported_message_count,
            started_at,
            finished_at,
            error_summary,
            metadata,
            created_at,
            updated_at
          FROM inbox_sync_runs
          WHERE inbox_account_id = $1
          ORDER BY started_at DESC
        `,
        params: [validatedInboxAccountId],
        mapper: (row) => mapInboxSyncRunRow(row as InboxSyncRunRow),
      });

      return result.rows;
    },
  };
}
