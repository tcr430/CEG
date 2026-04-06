import { randomUUID } from "node:crypto";

import type { DraftReply } from "@ceg/validation";

import type {
  CreateDraftReplyRecordInput,
  DraftReplyRepository,
} from "./draft-replies.js";
import {
  validateConversationThreadId,
  validateMessageId,
  validateSenderProfileId,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryDraftReplyRepository(
  initialDraftReplies: DraftReply[] = [],
): DraftReplyRepository {
  const records = new Map(
    initialDraftReplies.map((draft) => [draft.id, draft] as const),
  );

  return {
    async createDraftReply(input: CreateDraftReplyRecordInput) {
      const now = new Date();
      const record: DraftReply = {
        id: randomUUID(),
        workspaceId: validateWorkspaceId(input.workspaceId),
        threadId: validateConversationThreadId(input.threadId),
        messageId:
          input.messageId === undefined || input.messageId === null
            ? null
            : validateMessageId(input.messageId),
        replyAnalysisId: input.replyAnalysisId ?? null,
        senderProfileId:
          input.senderProfileId === undefined || input.senderProfileId === null
            ? null
            : validateSenderProfileId(input.senderProfileId),
        promptTemplateId: input.promptTemplateId ?? null,
        status: input.status ?? "draft",
        subject: input.subject ?? null,
        bodyText: input.bodyText ?? null,
        bodyHtml: input.bodyHtml ?? null,
        structuredOutput: input.structuredOutput,
        qualityChecksJson: input.qualityChecksJson ?? null,
        modelMetadata: input.modelMetadata,
        createdByUserId: input.createdByUserId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async listDraftRepliesByMessage(workspaceId, messageId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedMessageId = validateMessageId(messageId);
      return [...records.values()]
        .filter(
          (draft) =>
            draft.workspaceId === validatedWorkspaceId &&
            draft.messageId === validatedMessageId,
        )
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    },
    async listDraftRepliesByThread(workspaceId, threadId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedThreadId = validateConversationThreadId(threadId);
      return [...records.values()]
        .filter(
          (draft) =>
            draft.workspaceId === validatedWorkspaceId &&
            draft.threadId === validatedThreadId,
        )
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
  };
}
