import { randomUUID } from "node:crypto";

import type { Message } from "@ceg/validation";

import type {
  CreateMessageRecordInput,
  MessageRepository,
  UpdateMessageRecordInput,
} from "./messages.js";
import {
  validateCampaignId,
  validateConversationThreadId,
  validateMessageId,
  validateProspectId,
  validateSequenceId,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryMessageRepository(
  initialMessages: Message[] = [],
): MessageRepository {
  const records = new Map(
    initialMessages.map((message) => [message.id, message] as const),
  );

  return {
    async createMessage(input: CreateMessageRecordInput) {
      const now = new Date();
      const record: Message = {
        id: randomUUID(),
        workspaceId: validateWorkspaceId(input.workspaceId),
        threadId: validateConversationThreadId(input.threadId),
        campaignId:
          input.campaignId === undefined || input.campaignId === null
            ? null
            : validateCampaignId(input.campaignId),
        prospectId:
          input.prospectId === undefined || input.prospectId === null
            ? null
            : validateProspectId(input.prospectId),
        sequenceId:
          input.sequenceId === undefined || input.sequenceId === null
            ? null
            : validateSequenceId(input.sequenceId),
        replyToMessageId: input.replyToMessageId ?? null,
        direction: input.direction,
        messageKind: input.messageKind ?? "reply",
        status: input.status ?? "received",
        providerMessageId: input.providerMessageId ?? null,
        subject: input.subject ?? null,
        bodyText: input.bodyText ?? null,
        bodyHtml: input.bodyHtml ?? null,
        metadata: input.metadata ?? { source: "manual" },
        sentAt: input.sentAt ?? null,
        receivedAt: input.receivedAt ?? (input.direction === "inbound" ? now : null),
        createdAt: now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async updateMessage(input: UpdateMessageRecordInput) {
      const validatedWorkspaceId = validateWorkspaceId(input.workspaceId);
      const validatedMessageId = validateMessageId(input.messageId);
      const existing = records.get(validatedMessageId);

      if (!existing || existing.workspaceId !== validatedWorkspaceId) {
        throw new Error("Message not found for workspace.");
      }

      const updated: Message = {
        ...existing,
        status: input.status ?? existing.status,
        providerMessageId:
          input.providerMessageId === undefined
            ? existing.providerMessageId ?? null
            : input.providerMessageId,
        metadata: input.metadata ?? existing.metadata,
        sentAt: input.sentAt === undefined ? existing.sentAt ?? null : input.sentAt,
        receivedAt:
          input.receivedAt === undefined
            ? existing.receivedAt ?? null
            : input.receivedAt,
        updatedAt: new Date(),
      };

      records.set(updated.id, updated);
      return updated;
    },
    async listMessagesByThread(workspaceId, threadId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedThreadId = validateConversationThreadId(threadId);
      return [...records.values()]
        .filter(
          (message) =>
            message.workspaceId === validatedWorkspaceId &&
            message.threadId === validatedThreadId,
        )
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
    async listMessagesByCampaign(workspaceId, campaignId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      return [...records.values()]
        .filter(
          (message) =>
            message.workspaceId === validatedWorkspaceId &&
            message.campaignId === validatedCampaignId,
        )
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
    async getMessageById(workspaceId, messageId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedMessageId = validateMessageId(messageId);
      const record = records.get(validatedMessageId) ?? null;
      return record?.workspaceId === validatedWorkspaceId ? record : null;
    },
  };
}
