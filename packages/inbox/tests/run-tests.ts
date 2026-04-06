import assert from "node:assert/strict";

import {
  draftInInboxActionRequestSchema,
  importedMessageRefSchema,
  importedThreadRefSchema,
  inboxAccountSchema,
  inboxSyncRunSchema,
  sendViaProviderActionRequestSchema,
} from "@ceg/validation";

import {
  importedInboxMessageSchema,
  importedInboxThreadSchema,
  inboxIntegrationBoundary,
  inboxSyncRequestSchema,
} from "../dist/index.js";

const inboxAccount = inboxAccountSchema.parse({
  id: "0ca2287f-b16c-4e04-b69b-f791b11dc4a3",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  userId: "a6092054-22bf-4a2e-bf5c-6ca287c3dab1",
  provider: "gmail",
  emailAddress: "alex@acme.com",
  displayName: "Alex Morgan",
  providerAccountRef: "gmail-account-123",
  status: "active",
  syncState: {
    status: "healthy",
    syncCursor: "cursor-1",
    lastSyncedAt: "2026-04-04T10:00:00.000Z",
    consecutiveFailures: 0,
    metadata: {},
  },
  metadata: {},
  lastSyncedAt: "2026-04-04T10:00:00.000Z",
  createdAt: "2026-04-04T09:00:00.000Z",
  updatedAt: "2026-04-04T10:00:00.000Z",
});

assert.equal(inboxIntegrationBoundary.name, "@ceg/inbox");
assert.equal(inboxAccount.provider, "gmail");

const syncRun = inboxSyncRunSchema.parse({
  id: "745dd8c2-eef2-4982-a53d-46d4f243a76a",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: inboxAccount.id,
  provider: "gmail",
  status: "completed",
  syncMode: "incremental",
  cursorBefore: "cursor-0",
  cursorAfter: "cursor-1",
  importedThreadCount: 1,
  importedMessageCount: 2,
  startedAt: "2026-04-04T10:00:00.000Z",
  finishedAt: "2026-04-04T10:01:00.000Z",
  errorSummary: null,
  metadata: {},
  createdAt: "2026-04-04T10:00:00.000Z",
  updatedAt: "2026-04-04T10:01:00.000Z",
});

assert.equal(syncRun.status, "completed");

const importedThread = importedThreadRefSchema.parse({
  id: "af7c0cea-ef32-4c84-b97d-d24f327a0912",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: inboxAccount.id,
  prospectId: "54ad043c-9435-4388-92b9-9e0becbeff74",
  conversationThreadId: "ba7a8384-f5f5-4c87-96cd-e2b36045dad0",
  provider: "gmail",
  providerThreadId: "thread-123",
  providerFolder: "INBOX",
  subject: "Re: outbound",
  participants: [
    {
      email: "jamie@acme.com",
      name: "Jamie Stone",
      role: "from",
    },
  ],
  snippet: "Can you send more information?",
  lastMessageReceivedAt: "2026-04-04T10:02:00.000Z",
  syncState: {
    status: "healthy",
    metadata: {},
  },
  metadata: {},
  createdAt: "2026-04-04T10:02:00.000Z",
  updatedAt: "2026-04-04T10:02:00.000Z",
});

assert.equal(importedThread.providerThreadId, "thread-123");

const importedMessage = importedMessageRefSchema.parse({
  id: "727fd676-bcbd-49f0-af73-71f4c6014e16",
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: inboxAccount.id,
  importedThreadRefId: importedThread.id,
  messageId: "aa532df5-fc7d-4e25-bb23-ee2476a57349",
  provider: "gmail",
  providerMessageId: "message-123",
  providerThreadId: "thread-123",
  direction: "inbound",
  providerMessageType: "inbound",
  messageRole: "reply",
  replyToProviderMessageId: "<thread-ref@example.com>",
  subject: "Re: outbound",
  fromAddress: "jamie@acme.com",
  toAddresses: ["alex@acme.com"],
  ccAddresses: [],
  bccAddresses: [],
  rawBodyText: "Can you send more information?\n\nOn Mon, Alex wrote:",
  rawBodyHtml: "<p>Can you send more information?</p>",
  normalizedBodyText: "Can you send more information?",
  normalizedBodyHtml: "<p>Can you send more information?</p>",
  syncState: {
    status: "healthy",
    metadata: {},
  },
  metadata: {},
  receivedAt: "2026-04-04T10:02:00.000Z",
  sentAt: null,
  createdAt: "2026-04-04T10:02:00.000Z",
  updatedAt: "2026-04-04T10:02:00.000Z",
});

assert.equal(importedMessage.providerMessageType, "inbound");

const syncRequest = inboxSyncRequestSchema.parse({
  account: inboxAccount,
  mode: "incremental",
  syncState: inboxAccount.syncState,
  requestedByUserId: inboxAccount.userId,
});

assert.equal(syncRequest.account.emailAddress, "alex@acme.com");

const importedInboxThread = importedInboxThreadSchema.parse({
  provider: "gmail",
  providerThreadId: "thread-123",
  subject: "Re: outbound",
  participants: importedThread.participants,
  lastMessageReceivedAt: "2026-04-04T10:02:00.000Z",
  snippet: "Can you send more information?",
  metadata: {},
});

assert.equal(importedInboxThread.subject, "Re: outbound");

const importedInboxMessage = importedInboxMessageSchema.parse({
  provider: "gmail",
  providerThreadId: "thread-123",
  providerMessageId: "message-123",
  direction: "inbound",
  providerMessageType: "inbound",
  messageRole: "reply",
  replyToProviderMessageId: "<thread-ref@example.com>",
  subject: "Re: outbound",
  bodyText: "Can you send more information?",
  fromAddress: "jamie@acme.com",
  toAddresses: ["alex@acme.com"],
  ccAddresses: [],
  bccAddresses: [],
  receivedAt: "2026-04-04T10:02:00.000Z",
  metadata: {},
});

assert.equal(importedInboxMessage.direction, "inbound");

const draftAction = draftInInboxActionRequestSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: inboxAccount.id,
  conversationThreadId: importedThread.conversationThreadId,
  draftReplyId: "11301dc9-b55e-45f6-adb8-7a4f96866f90",
  toRecipients: ["jamie@acme.com"],
  subject: "More context",
  bodyText: "Happy to share a short summary.",
  metadata: {},
});

assert.equal(draftAction.toRecipients[0], "jamie@acme.com");

const sendAction = sendViaProviderActionRequestSchema.parse({
  workspaceId: "5f07db2d-8abd-49db-a5ca-a877ef2fe53c",
  inboxAccountId: inboxAccount.id,
  conversationThreadId: importedThread.conversationThreadId,
  messageId: importedMessage.messageId,
  toRecipients: ["jamie@acme.com"],
  subject: "More context",
  bodyText: "Happy to share a short summary.",
  metadata: {},
});

assert.equal(sendAction.subject, "More context");

console.log("@ceg/inbox contract tests passed");
