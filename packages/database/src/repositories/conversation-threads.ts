import type { ConversationThread } from "@ceg/validation";

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
  getThreadById(threadId: string): Promise<ConversationThread | null>;
  getThreadByProspect(
    workspaceId: string,
    campaignId: string,
    prospectId: string,
  ): Promise<ConversationThread | null>;
  updateThread(input: UpdateConversationThreadInput): Promise<ConversationThread>;
};
