import type { Message } from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapMessageRow,
  validateCampaignId,
  validateConversationThreadId,
  validateMessageId,
  validateWorkspaceId,
} from "./shared.js";

type MessageRow = Parameters<typeof mapMessageRow>[0];

export type CreateMessageRecordInput = {
  workspaceId: string;
  threadId: string;
  campaignId?: string | null;
  prospectId?: string | null;
  sequenceId?: string | null;
  replyToMessageId?: string | null;
  direction: Message["direction"];
  messageKind?: Message["messageKind"];
  status?: Message["status"];
  providerMessageId?: string | null;
  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  metadata?: Message["metadata"];
  sentAt?: Date | null;
  receivedAt?: Date | null;
};

export type UpdateMessageRecordInput = {
  workspaceId: string;
  messageId: string;
  status?: Message["status"];
  providerMessageId?: string | null;
  metadata?: Message["metadata"];
  sentAt?: Date | null;
  receivedAt?: Date | null;
};

export type MessageRepository = {
  createMessage(input: CreateMessageRecordInput): Promise<Message>;
  updateMessage(input: UpdateMessageRecordInput): Promise<Message>;
  listMessagesByThread(workspaceId: string, threadId: string): Promise<Message[]>;
  listMessagesByCampaign(workspaceId: string, campaignId: string): Promise<Message[]>;
  getMessageById(workspaceId: string, messageId: string): Promise<Message | null>;
};

export function createMessageRepository(client: DatabaseClient): MessageRepository {
  return {
    async createMessage(input) {
      const result = await client.query<Message>({
        statement: `
          INSERT INTO messages (
            workspace_id,
            thread_id,
            campaign_id,
            prospect_id,
            sequence_id,
            reply_to_message_id,
            direction,
            message_kind,
            status,
            provider_message_id,
            subject,
            body_text,
            body_html,
            metadata,
            sent_at,
            received_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING
            id,
            workspace_id,
            thread_id,
            campaign_id,
            prospect_id,
            sequence_id,
            reply_to_message_id,
            direction,
            message_kind,
            status,
            provider_message_id,
            subject,
            body_text,
            body_html,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
        `,
        params: [
          input.workspaceId,
          input.threadId,
          input.campaignId ?? null,
          input.prospectId ?? null,
          input.sequenceId ?? null,
          input.replyToMessageId ?? null,
          input.direction,
          input.messageKind ?? "reply",
          input.status ?? "received",
          input.providerMessageId ?? null,
          input.subject ?? null,
          input.bodyText ?? null,
          input.bodyHtml ?? null,
          input.metadata ?? { source: "manual" },
          input.sentAt ?? null,
          input.receivedAt ?? null,
        ],
        mapper: (row) => mapMessageRow(row as MessageRow),
      });

      return getFirstRowOrThrow(result.rows, "message");
    },
    async updateMessage(input) {
      const validatedWorkspaceId = validateWorkspaceId(input.workspaceId);
      const validatedMessageId = validateMessageId(input.messageId);
      const result = await client.query<Message>({
        statement: `
          UPDATE messages
          SET
            status = COALESCE($3, status),
            provider_message_id = COALESCE($4, provider_message_id),
            metadata = COALESCE($5, metadata),
            sent_at = COALESCE($6, sent_at),
            received_at = COALESCE($7, received_at),
            updated_at = NOW()
          WHERE workspace_id = $1
            AND id = $2
          RETURNING
            id,
            workspace_id,
            thread_id,
            campaign_id,
            prospect_id,
            sequence_id,
            reply_to_message_id,
            direction,
            message_kind,
            status,
            provider_message_id,
            subject,
            body_text,
            body_html,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
        `,
        params: [
          validatedWorkspaceId,
          validatedMessageId,
          input.status ?? null,
          input.providerMessageId ?? null,
          input.metadata ?? null,
          input.sentAt ?? null,
          input.receivedAt ?? null,
        ],
        mapper: (row) => mapMessageRow(row as MessageRow),
      });

      return getFirstRowOrThrow(result.rows, "message");
    },
    async listMessagesByThread(workspaceId, threadId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedThreadId = validateConversationThreadId(threadId);
      const result = await client.query<Message>({
        statement: `
          SELECT
            id,
            workspace_id,
            thread_id,
            campaign_id,
            prospect_id,
            sequence_id,
            reply_to_message_id,
            direction,
            message_kind,
            status,
            provider_message_id,
            subject,
            body_text,
            body_html,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
          FROM messages
          WHERE workspace_id = $1
            AND thread_id = $2
          ORDER BY created_at ASC
        `,
        params: [validatedWorkspaceId, validatedThreadId],
        mapper: (row) => mapMessageRow(row as MessageRow),
      });

      return result.rows;
    },
    async listMessagesByCampaign(workspaceId, campaignId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      const result = await client.query<Message>({
        statement: `
          SELECT
            id,
            workspace_id,
            thread_id,
            campaign_id,
            prospect_id,
            sequence_id,
            reply_to_message_id,
            direction,
            message_kind,
            status,
            provider_message_id,
            subject,
            body_text,
            body_html,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
          FROM messages
          WHERE workspace_id = $1
            AND campaign_id = $2
          ORDER BY created_at ASC
        `,
        params: [validatedWorkspaceId, validatedCampaignId],
        mapper: (row) => mapMessageRow(row as MessageRow),
      });

      return result.rows;
    },
    async getMessageById(workspaceId, messageId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedMessageId = validateMessageId(messageId);
      const result = await client.query<Message>({
        statement: `
          SELECT
            id,
            workspace_id,
            thread_id,
            campaign_id,
            prospect_id,
            sequence_id,
            reply_to_message_id,
            direction,
            message_kind,
            status,
            provider_message_id,
            subject,
            body_text,
            body_html,
            metadata,
            sent_at,
            received_at,
            created_at,
            updated_at
          FROM messages
          WHERE workspace_id = $1
            AND id = $2
          LIMIT 1
        `,
        params: [validatedWorkspaceId, validatedMessageId],
        mapper: (row) => mapMessageRow(row as MessageRow),
      });

      return result.rows[0] ?? null;
    },
  };
}
