import { randomUUID } from "node:crypto";

import type { Message } from "@ceg/validation";

import type { CreateMessageRecordInput, MessageRepository } from "./messages.js";
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
        metadata: input.metadata ?? {},
        sentAt: input.sentAt ?? null,
        receivedAt: input.receivedAt ?? (input.direction === "inbound" ? now : null),
        createdAt: now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async listMessagesByThread(threadId) {
      const validatedThreadId = validateConversationThreadId(threadId);
      return [...records.values()]
        .filter((message) => message.threadId === validatedThreadId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
    async getMessageById(messageId) {
      const validatedMessageId = validateMessageId(messageId);
      return records.get(validatedMessageId) ?? null;
    },
  };
}
