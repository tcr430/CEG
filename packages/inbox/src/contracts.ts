import { z } from "zod";

import {
  importedMessageRefSchema,
  importedThreadRefSchema,
  inboxAccountSchema,
  inboxProviderSchema,
  inboxSyncRunSchema,
  type DraftInInboxActionRequest,
  type DraftInInboxActionResult,
  type InboxAccount,
  type SendViaProviderActionRequest,
  type SendViaProviderActionResult,
} from "@ceg/validation";

export const inboxConnectionCapabilitiesSchema = z.object({
  supportsSync: z.boolean().default(true),
  supportsDraftCreation: z.boolean().default(true),
  supportsProviderSend: z.boolean().default(true),
  supportsWebhookSync: z.boolean().default(false),
});

export const importedInboxThreadSchema = z.object({
  provider: inboxProviderSchema,
  providerThreadId: z.string().trim().min(1),
  subject: z.string().trim().min(1).nullable().optional(),
  participants: importedThreadRefSchema.shape.participants,
  lastMessageReceivedAt: z.coerce.date().nullable().optional(),
  snippet: z.string().trim().min(1).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const importedInboxMessageSchema = z.object({
  provider: inboxProviderSchema,
  providerThreadId: z.string().trim().min(1),
  providerMessageId: z.string().trim().min(1),
  direction: importedMessageRefSchema.shape.direction,
  providerMessageType: importedMessageRefSchema.shape.providerMessageType,
  messageRole: importedMessageRefSchema.shape.messageRole,
  replyToProviderMessageId: z.string().trim().min(1).nullable().optional(),
  subject: z.string().trim().min(1).nullable().optional(),
  bodyText: z.string().trim().min(1).nullable().optional(),
  bodyHtml: z.string().trim().min(1).nullable().optional(),
  rawBodyText: z.string().trim().min(1).nullable().optional(),
  rawBodyHtml: z.string().trim().min(1).nullable().optional(),
  normalizedBodyText: z.string().trim().min(1).nullable().optional(),
  normalizedBodyHtml: z.string().trim().min(1).nullable().optional(),
  fromAddress: z.string().trim().email().nullable().optional(),
  toAddresses: importedMessageRefSchema.shape.toAddresses,
  ccAddresses: importedMessageRefSchema.shape.ccAddresses,
  bccAddresses: importedMessageRefSchema.shape.bccAddresses,
  sentAt: z.coerce.date().nullable().optional(),
  receivedAt: z.coerce.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const inboxSyncRequestSchema = z.object({
  account: inboxAccountSchema,
  mode: inboxSyncRunSchema.shape.syncMode.default("incremental"),
  syncState: inboxAccountSchema.shape.syncState,
  requestedByUserId: z.string().uuid().nullable().optional(),
});

export const inboxSyncResultSchema = z.object({
  run: inboxSyncRunSchema,
  importedThreads: z.array(importedInboxThreadSchema).default([]),
  importedMessages: z.array(importedInboxMessageSchema).default([]),
  linkedThreadRefs: z.array(importedThreadRefSchema).default([]),
  linkedMessageRefs: z.array(importedMessageRefSchema).default([]),
});

export type InboxConnectionCapabilities = z.infer<
  typeof inboxConnectionCapabilitiesSchema
>;
export type ImportedInboxThread = z.infer<typeof importedInboxThreadSchema>;
export type ImportedInboxMessage = z.infer<typeof importedInboxMessageSchema>;
export type InboxSyncRequest = z.infer<typeof inboxSyncRequestSchema>;
export type InboxSyncResult = z.infer<typeof inboxSyncResultSchema>;

export type InboxProviderAdapter = {
  provider: InboxAccount["provider"];
  capabilities: InboxConnectionCapabilities;
  importThreads(input: InboxSyncRequest): Promise<InboxSyncResult>;
  createDraftInInbox(
    input: DraftInInboxActionRequest,
  ): Promise<DraftInInboxActionResult>;
  sendViaProvider(
    input: SendViaProviderActionRequest,
  ): Promise<SendViaProviderActionResult>;
};

export type InboxIntegrationService = {
  syncInbox(input: InboxSyncRequest): Promise<InboxSyncResult>;
  createDraftInInbox(
    input: DraftInInboxActionRequest,
  ): Promise<DraftInInboxActionResult>;
  sendViaProvider(
    input: SendViaProviderActionRequest,
  ): Promise<SendViaProviderActionResult>;
};
