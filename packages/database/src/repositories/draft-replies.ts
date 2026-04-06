import type { DraftReply } from "@ceg/validation";

export type CreateDraftReplyRecordInput = {
  workspaceId: string;
  threadId: string;
  messageId?: string | null;
  replyAnalysisId?: string | null;
  senderProfileId?: string | null;
  promptTemplateId?: string | null;
  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  structuredOutput: DraftReply["structuredOutput"];
  qualityChecksJson?: DraftReply["qualityChecksJson"];
  modelMetadata: DraftReply["modelMetadata"];
  createdByUserId?: string | null;
  status?: DraftReply["status"];
};

export type DraftReplyRepository = {
  createDraftReply(input: CreateDraftReplyRecordInput): Promise<DraftReply>;
  listDraftRepliesByMessage(
    workspaceId: string,
    messageId: string,
  ): Promise<DraftReply[]>;
  listDraftRepliesByThread(
    workspaceId: string,
    threadId: string,
  ): Promise<DraftReply[]>;
};
