import type { ConversationThread } from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapConversationThreadRow,
  validateCampaignId,
  validateConversationThreadId,
  validateProspectId,
  validateWorkspaceId,
} from "./shared.js";

type ConversationThreadRow = Parameters<typeof mapConversationThreadRow>[0];


function buildCreateThreadParams(input: CreateConversationThreadInput) {
  const workspaceId = validateWorkspaceId(input.workspaceId);
  const campaignId =
    input.campaignId === undefined || input.campaignId === null
      ? null
      : validateCampaignId(input.campaignId);
  const prospectId =
    input.prospectId === undefined || input.prospectId === null
      ? null
      : validateProspectId(input.prospectId);

  return {
    workspaceId,
    campaignId,
    prospectId,
  };
}

export type CreateConversationThreadInput = {
  workspaceId: string;
  campaignId?: string | null;
  prospectId?: string | null;
  status?: ConversationThread["status"];
  externalThreadRef?: string | null;
  latestMessageAt?: Date | null;
  metadata?: ConversationThread["metadata"];
};

export type UpdateConversationThreadInput = {
  threadId: string;
  workspaceId: string;
  status?: ConversationThread["status"];
  latestMessageAt?: Date | null;
  metadata?: ConversationThread["metadata"];
};

export type ConversationThreadRepository = {
  findOrCreateThreadForProspect(
    input: CreateConversationThreadInput,
  ): Promise<ConversationThread>;
  findOrCreateThreadByExternalRef(
    input: CreateConversationThreadInput & { externalThreadRef: string },
  ): Promise<ConversationThread>;
  getThreadById(threadId: string): Promise<ConversationThread | null>;
  getThreadByExternalRef(
    workspaceId: string,
    externalThreadRef: string,
  ): Promise<ConversationThread | null>;
  getThreadByProspect(
    workspaceId: string,
    campaignId: string,
    prospectId: string,
  ): Promise<ConversationThread | null>;
  updateThread(input: UpdateConversationThreadInput): Promise<ConversationThread>;
};

export function createConversationThreadRepository(
  client: DatabaseClient,
): ConversationThreadRepository {
  return {
    async findOrCreateThreadForProspect(input) {
      const { workspaceId, campaignId, prospectId } = buildCreateThreadParams(input);

      const existing = await client.query<ConversationThread>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
          FROM conversation_threads
          WHERE workspace_id = $1
            AND campaign_id IS NOT DISTINCT FROM $2
            AND prospect_id IS NOT DISTINCT FROM $3
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [workspaceId, campaignId, prospectId],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      const current = existing.rows[0];
      if (current) {
        return current;
      }

      const created = await client.query<ConversationThread>({
        statement: `
          INSERT INTO conversation_threads (
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          workspaceId,
          campaignId,
          prospectId,
          input.status ?? "open",
          input.externalThreadRef ?? null,
          input.latestMessageAt ?? null,
          input.metadata ?? {},
        ],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      return getFirstRowOrThrow(created.rows, "conversation thread");
    },
    async findOrCreateThreadByExternalRef(input) {
      const { workspaceId, campaignId, prospectId } = buildCreateThreadParams(input);
      const externalThreadRef = input.externalThreadRef.trim();

      const existing = await client.query<ConversationThread>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
          FROM conversation_threads
          WHERE workspace_id = $1
            AND external_thread_ref = $2
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [workspaceId, externalThreadRef],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      const current = existing.rows[0];
      if (current) {
        return current;
      }

      const created = await client.query<ConversationThread>({
        statement: `
          INSERT INTO conversation_threads (
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          workspaceId,
          campaignId,
          prospectId,
          input.status ?? "open",
          externalThreadRef,
          input.latestMessageAt ?? null,
          input.metadata ?? {},
        ],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      return getFirstRowOrThrow(created.rows, "conversation thread");
    },
    async getThreadById(threadId) {
      const validatedThreadId = validateConversationThreadId(threadId);
      const result = await client.query<ConversationThread>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
          FROM conversation_threads
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedThreadId],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      return result.rows[0] ?? null;
    },
    async getThreadByExternalRef(workspaceId, externalThreadRef) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<ConversationThread>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
          FROM conversation_threads
          WHERE workspace_id = $1
            AND external_thread_ref = $2
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [validatedWorkspaceId, externalThreadRef],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      return result.rows[0] ?? null;
    },
    async getThreadByProspect(workspaceId, campaignId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      const validatedProspectId = validateProspectId(prospectId);
      const result = await client.query<ConversationThread>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
          FROM conversation_threads
          WHERE workspace_id = $1
            AND campaign_id = $2
            AND prospect_id = $3
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        params: [validatedWorkspaceId, validatedCampaignId, validatedProspectId],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      return result.rows[0] ?? null;
    },
    async updateThread(input) {
      const threadId = validateConversationThreadId(input.threadId);
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const result = await client.query<ConversationThread>({
        statement: `
          UPDATE conversation_threads
          SET
            status = COALESCE($3, status),
            latest_message_at = $4,
            metadata = $5,
            updated_at = NOW()
          WHERE id = $1
            AND workspace_id = $2
          RETURNING
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            status,
            external_thread_ref,
            latest_message_at,
            metadata,
            created_at,
            updated_at
        `,
        params: [
          threadId,
          workspaceId,
          input.status ?? null,
          input.latestMessageAt ?? null,
          input.metadata ?? {},
        ],
        mapper: (row) => mapConversationThreadRow(row as ConversationThreadRow),
      });

      return getFirstRowOrThrow(result.rows, "conversation thread");
    },
  };
}
