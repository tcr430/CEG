import type { ReplyAnalysis } from "@ceg/validation";

export type UpsertReplyAnalysisRecordInput = {
  workspaceId: string;
  threadId: string;
  messageId: string;
  promptTemplateId?: string | null;
  classification: ReplyAnalysis["classification"];
  sentiment?: ReplyAnalysis["sentiment"];
  urgency?: ReplyAnalysis["urgency"];
  intent?: string | null;
  confidence?: number | null;
  structuredOutput: ReplyAnalysis["structuredOutput"];
  modelMetadata: ReplyAnalysis["modelMetadata"];
};

export type ReplyAnalysisRepository = {
  upsertReplyAnalysis(
    input: UpsertReplyAnalysisRecordInput,
  ): Promise<ReplyAnalysis>;
  getReplyAnalysisByMessage(
    workspaceId: string,
    messageId: string,
  ): Promise<ReplyAnalysis | null>;
  listReplyAnalysesByThread(
    workspaceId: string,
    threadId: string,
  ): Promise<ReplyAnalysis[]>;
};
