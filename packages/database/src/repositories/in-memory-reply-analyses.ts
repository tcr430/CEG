import { randomUUID } from "node:crypto";

import type { ReplyAnalysis } from "@ceg/validation";

import type {
  ReplyAnalysisRepository,
  UpsertReplyAnalysisRecordInput,
} from "./reply-analyses.js";
import {
  validateConversationThreadId,
  validateMessageId,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryReplyAnalysisRepository(
  initialAnalyses: ReplyAnalysis[] = [],
): ReplyAnalysisRepository {
  const records = new Map(
    initialAnalyses.map((analysis) => [analysis.id, analysis] as const),
  );

  return {
    async upsertReplyAnalysis(input: UpsertReplyAnalysisRecordInput) {
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const threadId = validateConversationThreadId(input.threadId);
      const messageId = validateMessageId(input.messageId);
      const now = new Date();
      const existing = [...records.values()].find(
        (analysis) =>
          analysis.workspaceId === workspaceId && analysis.messageId === messageId,
      );

      const record: ReplyAnalysis = {
        id: existing?.id ?? randomUUID(),
        workspaceId,
        threadId,
        messageId,
        promptTemplateId: input.promptTemplateId ?? null,
        classification: input.classification,
        sentiment: input.sentiment ?? null,
        urgency: input.urgency ?? null,
        intent: input.intent ?? null,
        confidence: input.confidence ?? null,
        structuredOutput: input.structuredOutput,
        modelMetadata: input.modelMetadata,
        analyzedAt: now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async getReplyAnalysisByMessage(messageId) {
      const validatedMessageId = validateMessageId(messageId);
      return (
        [...records.values()]
          .filter((analysis) => analysis.messageId === validatedMessageId)
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ??
        null
      );
    },
    async listReplyAnalysesByThread(threadId) {
      const validatedThreadId = validateConversationThreadId(threadId);
      return [...records.values()]
        .filter((analysis) => analysis.threadId === validatedThreadId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
  };
}
