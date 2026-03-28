import type { Message } from "@ceg/validation";

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

export type MessageRepository = {
  createMessage(input: CreateMessageRecordInput): Promise<Message>;
  listMessagesByThread(threadId: string): Promise<Message[]>;
  getMessageById(messageId: string): Promise<Message | null>;
};
