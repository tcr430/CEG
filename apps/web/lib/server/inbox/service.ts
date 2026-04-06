import "server-only";

import { requireWorkspaceAccess, type AuthContext } from "@ceg/auth";
import type { ImportedInboxMessage } from "@ceg/inbox";
import type {
  DraftInInboxActionRequest,
  DraftInInboxActionResult,
  InboxAccount,
  InboxSyncRun,
  Prospect,
} from "@ceg/validation";

import { getSharedAuditEventRepository } from "../audit-events";
import { getWorkspaceCurrentSubscription } from "../billing";
import {
  getConversationThreadRepository,
  getImportedMessageRefRepository,
  getImportedThreadRefRepository,
  getInboxAccountRepository,
  getInboxSyncRunRepository,
  getMessageRepository,
  getProspectRepository,
} from "../database";
import { analyzeLatestReplyForProspect } from "../replies";
import { createOperationContext } from "../observability";
import { refreshCampaignPerformanceMetrics } from "../campaign-performance";
import { getSharedUsageEventRepository } from "../usage-events";
import { buildGmailAuthorizationUrl, hasGmailOauthConfigured } from "./gmail-config";
import {
  createGmailOAuthStateToken,
  decryptGmailTokenEnvelope,
  encryptGmailTokenEnvelope,
  parseGmailOAuthStateToken,
  type GmailOAuthState,
  type GmailTokenEnvelope,
} from "./credentials";
import {
  createGmailDraft,
  exchangeGmailAuthorizationCode,
  fetchGmailProfile,
  importRecentGmailThreads,
  refreshGmailAccessToken,
} from "./gmail-provider";

export type WorkspaceInboxAccountState = {
  account: InboxAccount;
  recentSyncRuns: InboxSyncRun[];
};

export type WorkspaceInboxState = {
  gmailConfigured: boolean;
  accounts: WorkspaceInboxAccountState[];
};

export type GmailImportResult = {
  inboxAccountId: string;
  importedThreadCount: number;
  importedMessageCount: number;
  linkedThreadCount: number;
  unmatchedThreadCount: number;
  ingestedInboundCount: number;
  analyzedReplyCount: number;
};

function buildHealthySyncState(input: {
  previous: InboxAccount["syncState"];
  syncCursor?: string | null;
  syncedAt: Date;
  metadata?: Record<string, unknown>;
}): InboxAccount["syncState"] {
  return {
    status: "healthy",
    syncCursor: input.syncCursor ?? input.previous.syncCursor ?? null,
    lastSyncedAt: input.syncedAt,
    lastSuccessAt: input.syncedAt,
    lastErrorAt: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    metadata: {
      ...input.previous.metadata,
      ...input.metadata,
    },
  };
}

function buildFailedSyncState(input: {
  previous: InboxAccount["syncState"];
  failedAt: Date;
  errorMessage: string;
}): InboxAccount["syncState"] {
  return {
    status: "error",
    syncCursor: input.previous.syncCursor ?? null,
    lastSyncedAt: input.failedAt,
    lastSuccessAt: input.previous.lastSuccessAt ?? null,
    lastErrorAt: input.failedAt,
    lastErrorMessage: input.errorMessage,
    consecutiveFailures: input.previous.consecutiveFailures + 1,
    metadata: {
      ...input.previous.metadata,
      lastFailureReason: input.errorMessage,
    },
  };
}

function mapImportedMessageStatus(message: ImportedInboxMessage): "draft" | "sent" | "received" {
  if (message.providerMessageType === "draft") {
    return "draft";
  }

  return message.direction === "outbound" ? "sent" : "received";
}

function getImportedMessageTimestamp(message: ImportedInboxMessage): Date | null {
  return message.receivedAt ?? message.sentAt ?? null;
}

function buildImportedExternalThreadRef(input: {
  provider: InboxAccount["provider"];
  providerThreadId: string;
}): string {
  return `${input.provider}:${input.providerThreadId}`;
}

function mapImportedMessageKind(message: ImportedInboxMessage): "email" | "reply" {
  return message.direction === "inbound" || message.messageRole === "reply"
    ? "reply"
    : "email";
}

function buildImportedTimelineLabel(message: ImportedInboxMessage): string {
  if (message.providerMessageType === "draft") {
    return "Gmail draft";
  }

  if (message.messageRole === "reply") {
    return "Gmail reply";
  }

  return message.direction === "outbound" ? "Gmail outbound" : "Gmail inbound";
}

function findLatestOutboundMessageId(
  messages: Array<{ id: string; direction: string; status?: string | null }>,
): string | null {
  const latestSent = [...messages]
    .reverse()
    .find(
      (message) =>
        message.direction === "outbound" &&
        (message.status === "sent" || message.status === "delivered"),
    );

  if (latestSent) {
    return latestSent.id;
  }

  return (
    [...messages]
      .reverse()
      .find((message) => message.direction === "outbound")?.id ?? null
  );
}


function collectProspectEmails(input: {
  accountEmail: string;
  threadParticipants: Array<{ email: string }>;
  message: ImportedInboxMessage;
}): string[] {
  const addresses = [
    ...input.threadParticipants.map((participant) => participant.email),
    input.message.fromAddress ?? null,
    ...input.message.toAddresses,
    ...input.message.ccAddresses,
    ...input.message.bccAddresses,
  ];

  const unique = new Set<string>();
  for (const value of addresses) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized || normalized === input.accountEmail.toLowerCase()) {
      continue;
    }

    unique.add(normalized);
  }

  return [...unique];
}

async function matchProspectForImportedMessage(input: {
  workspaceId: string;
  accountEmail: string;
  threadParticipants: Array<{ email: string }>;
  message: ImportedInboxMessage;
}): Promise<Prospect | null> {
  const candidateEmails = collectProspectEmails(input);

  for (const email of candidateEmails) {
    const prospect = await getProspectRepository().getProspectByEmail(
      input.workspaceId,
      email,
    );

    if (prospect !== null) {
      return prospect;
    }
  }

  return null;
}

async function resolveUsableGmailEnvelope(account: InboxAccount): Promise<GmailTokenEnvelope> {
  const credentialRecord = await getInboxAccountRepository().getInboxAccountCredentials(account.id);

  if (
    credentialRecord === null ||
    credentialRecord.encryptedCredentials === null
  ) {
    throw new Error("Gmail account credentials are missing. Reconnect the inbox and try again.");
  }

  const envelope = decryptGmailTokenEnvelope(credentialRecord.encryptedCredentials);
  const expiresAt = envelope.expiresAt ? new Date(envelope.expiresAt) : null;
  const shouldRefresh =
    expiresAt !== null && expiresAt.getTime() <= Date.now() + 60_000;

  if (!shouldRefresh) {
    return envelope;
  }

  if (!envelope.refreshToken) {
    throw new Error("Gmail account credentials expired. Reconnect the inbox and try again.");
  }

  const refreshed = await refreshGmailAccessToken(envelope.refreshToken);

  await getInboxAccountRepository().setInboxAccountCredentials({
    inboxAccountId: account.id,
    workspaceId: account.workspaceId,
    encryptedCredentials: encryptGmailTokenEnvelope(refreshed),
  });

  return refreshed;
}

export async function getWorkspaceInboxState(
  workspaceId: string,
): Promise<WorkspaceInboxState> {
  const accounts = await getInboxAccountRepository().listInboxAccountsByWorkspace(
    workspaceId,
  );
  const recentRuns = await Promise.all(
    accounts.map(async (account) => ({
      account,
      recentSyncRuns: (
        await getInboxSyncRunRepository().listInboxSyncRunsByAccount(account.id)
      ).slice(0, 3),
    })),
  );

  return {
    gmailConfigured: hasGmailOauthConfigured(),
    accounts: recentRuns,
  };
}

export function buildGmailConnectUrl(input: {
  workspaceId: string;
  userId: string;
  requestId?: string;
}): string {
  if (!hasGmailOauthConfigured()) {
    throw new Error("Gmail OAuth is not configured yet.");
  }

  const state = createGmailOAuthStateToken({
    workspaceId: input.workspaceId,
    userId: input.userId,
    requestId: input.requestId ?? "gmail-connect",
    returnPath: `/app/settings?workspace=${input.workspaceId}`,
  });

  return buildGmailAuthorizationUrl({
    state,
  });
}

export function readGmailOAuthState(stateToken: string): GmailOAuthState {
  return parseGmailOAuthStateToken(stateToken);
}

export async function handleGmailOAuthCallback(input: {
  workspaceId: string;
  userId: string;
  code: string;
  requestId?: string;
}): Promise<{ inboxAccountId: string; emailAddress: string }> {
  const operation = createOperationContext({
    operation: "inbox.gmail.connect",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId,
  });
  const tokenEnvelope = await exchangeGmailAuthorizationCode(input.code);
  const profile = await fetchGmailProfile(tokenEnvelope.accessToken);
  const encryptedCredentials = encryptGmailTokenEnvelope(tokenEnvelope);
  const existing = await getInboxAccountRepository().getInboxAccountByProviderRef(
    input.workspaceId,
    "gmail",
    profile.emailAddress,
  );
  const syncedAt = new Date();
  const syncState = buildHealthySyncState({
    previous:
      existing?.syncState ?? {
        status: "healthy",
        syncCursor: null,
        lastSyncedAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        consecutiveFailures: 0,
        metadata: {},
      },
    syncCursor: profile.historyId,
    syncedAt,
    metadata: {
      providerAccountRef: profile.emailAddress,
      lastConnectedAt: syncedAt.toISOString(),
    },
  });

  const account =
    existing === null
      ? await getInboxAccountRepository().createInboxAccount({
          workspaceId: input.workspaceId,
          userId: input.userId,
          provider: "gmail",
          emailAddress: profile.emailAddress,
          displayName: profile.emailAddress,
          providerAccountRef: profile.emailAddress,
          status: "active",
          syncState,
          metadata: {
            connectedAt: syncedAt.toISOString(),
          },
          lastSyncedAt: syncedAt,
        })
      : await getInboxAccountRepository().updateInboxAccountSyncState({
          inboxAccountId: existing.id,
          workspaceId: input.workspaceId,
          status: "active",
          syncState,
          lastSyncedAt: syncedAt,
        });

  await getInboxAccountRepository().setInboxAccountCredentials({
    inboxAccountId: account.id,
    workspaceId: input.workspaceId,
    encryptedCredentials,
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: "user",
    action: existing ? "inbox.gmail.reconnected" : "inbox.gmail.connected",
    entityType: "inbox_account",
    entityId: account.id,
    requestId: operation.requestId,
    changes: {
      provider: "gmail",
      emailAddress: profile.emailAddress,
      historyId: profile.historyId,
    },
    metadata: {},
  });

  operation.logger.info("Gmail inbox connected", {
    inboxAccountId: account.id,
    emailAddress: profile.emailAddress,
    reconnect: existing !== null,
  });

  return {
    inboxAccountId: account.id,
    emailAddress: profile.emailAddress,
  };
}

export async function importRecentThreadsFromGmail(input: {
  workspaceId: string;
  inboxAccountId: string;
  userId: string;
  requestId?: string;
  maxResults?: number;
}): Promise<GmailImportResult> {
  const operation = createOperationContext({
    operation: "inbox.gmail.import",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId,
  });
  const inboxAccountRepository = getInboxAccountRepository();
  const syncRunRepository = getInboxSyncRunRepository();
  const threadRefRepository = getImportedThreadRefRepository();
  const messageRefRepository = getImportedMessageRefRepository();
  const threadRepository = getConversationThreadRepository();
  const messageRepository = getMessageRepository();
  const prospectRepository = getProspectRepository();

  const [account, currentSubscription] = await Promise.all([
    inboxAccountRepository.getInboxAccountById(input.inboxAccountId),
    getWorkspaceCurrentSubscription(input.workspaceId),
  ]);

  if (account === null || account.workspaceId !== input.workspaceId) {
    throw new Error("Inbox account not found for workspace.");
  }

  let syncRun: InboxSyncRun | null = null;
  let importedThreadCount = 0;
  let importedMessageCount = 0;
  let linkedThreadCount = 0;
  let unmatchedThreadCount = 0;
  let ingestedInboundCount = 0;
  let analyzedReplyCount = 0;
  const prospectsToAnalyze = new Map<string, { campaignId: string; prospectId: string }>();
  const touchedCampaignIds = new Set<string>();

  try {
    const envelope = await resolveUsableGmailEnvelope(account);
    const profile = await fetchGmailProfile(envelope.accessToken);
    syncRun = await syncRunRepository.createInboxSyncRun({
      workspaceId: input.workspaceId,
      inboxAccountId: account.id,
      provider: "gmail",
      status: "running",
      syncMode: account.syncState.syncCursor ? "incremental" : "manual",
      cursorBefore: account.syncState.syncCursor ?? null,
      importedThreadCount: 0,
      importedMessageCount: 0,
      metadata: {
        source: "gmail_manual_import",
      },
    });

    const threadBundles = await importRecentGmailThreads({
      accessToken: envelope.accessToken,
      maxResults: input.maxResults ?? 10,
    });

    for (const bundle of threadBundles) {
      const existingImportedThreadRef =
        await threadRefRepository.getImportedThreadRefByProviderThread(
          account.id,
          bundle.thread.providerThreadId,
        );

      let matchedProspect: Prospect | null =
        existingImportedThreadRef?.prospectId !== null && existingImportedThreadRef?.prospectId !== undefined
          ? await prospectRepository.getProspectById(existingImportedThreadRef.prospectId)
          : null;

      if (matchedProspect === null) {
        for (const message of bundle.messages) {
          matchedProspect = await matchProspectForImportedMessage({
            workspaceId: input.workspaceId,
            accountEmail: account.emailAddress,
            threadParticipants: bundle.thread.participants,
            message,
          });

          if (matchedProspect !== null) {
            break;
          }
        }
      }

      let conversationThread =
        existingImportedThreadRef?.conversationThreadId !== null &&
        existingImportedThreadRef?.conversationThreadId !== undefined
          ? await threadRepository.getThreadById(existingImportedThreadRef.conversationThreadId)
          : null;

      if (matchedProspect !== null) {
        conversationThread = await threadRepository.findOrCreateThreadForProspect({
          workspaceId: input.workspaceId,
          campaignId: matchedProspect.campaignId ?? null,
          prospectId: matchedProspect.id,
          externalThreadRef: buildImportedExternalThreadRef({
            provider: "gmail",
            providerThreadId: bundle.thread.providerThreadId,
          }),
          latestMessageAt: bundle.thread.lastMessageReceivedAt ?? null,
          metadata: {
            importedProvider: "gmail",
            inboxAccountId: account.id,
          },
        });
        linkedThreadCount += 1;
      } else if (conversationThread === null || conversationThread.workspaceId !== input.workspaceId) {
        conversationThread = await threadRepository.findOrCreateThreadByExternalRef({
          workspaceId: input.workspaceId,
          externalThreadRef: buildImportedExternalThreadRef({
            provider: "gmail",
            providerThreadId: bundle.thread.providerThreadId,
          }),
          latestMessageAt: bundle.thread.lastMessageReceivedAt ?? null,
          metadata: {
            importedProvider: "gmail",
            inboxAccountId: account.id,
            providerThreadId: bundle.thread.providerThreadId,
          },
        });
        unmatchedThreadCount += 1;
      } else {
        unmatchedThreadCount += matchedProspect === null ? 1 : 0;
      }

      const syncedAt = new Date();
      const importedThreadRef = await threadRefRepository.upsertImportedThreadRef({
        workspaceId: input.workspaceId,
        inboxAccountId: account.id,
        prospectId: matchedProspect?.id ?? null,
        conversationThreadId: conversationThread?.id ?? null,
        provider: "gmail",
        providerThreadId: bundle.thread.providerThreadId,
        providerFolder: "inbox",
        subject: bundle.thread.subject ?? null,
        participants: bundle.thread.participants,
        snippet: bundle.thread.snippet ?? null,
        lastMessageReceivedAt: bundle.thread.lastMessageReceivedAt ?? null,
        syncState: {
          status: "healthy",
          syncCursor: profile.historyId,
          lastSyncedAt: syncedAt,
          lastSuccessAt: syncedAt,
          lastErrorAt: null,
          lastErrorMessage: null,
          consecutiveFailures: 0,
          metadata: {},
        },
        metadata: bundle.thread.metadata,
      });

      const localThreadMessages = conversationThread
        ? await messageRepository.listMessagesByThread(input.workspaceId, conversationThread.id)
        : [];
      let latestMessageAt = conversationThread?.latestMessageAt ?? null;

      for (const message of bundle.messages) {
        const existingImportedMessage =
          await messageRefRepository.getImportedMessageRefByProviderMessage(
            account.id,
            message.providerMessageId,
          );

        let localMessageId = existingImportedMessage?.messageId ?? null;

        if (existingImportedMessage === null && conversationThread !== null) {
          const replyToMessageId =
            message.messageRole === "reply"
              ? findLatestOutboundMessageId(localThreadMessages)
              : null;
          const createdMessage = await messageRepository.createMessage({
            workspaceId: input.workspaceId,
            threadId: conversationThread.id,
            campaignId: matchedProspect?.campaignId ?? null,
            prospectId: matchedProspect?.id ?? null,
            direction: message.direction,
            messageKind: mapImportedMessageKind(message),
            status: mapImportedMessageStatus(message),
            providerMessageId: message.providerMessageId,
            replyToMessageId,
            subject: message.subject ?? bundle.thread.subject ?? null,
            bodyText: message.normalizedBodyText ?? message.bodyText ?? null,
            bodyHtml: message.rawBodyHtml ?? message.bodyHtml ?? null,
            metadata: {
              source: "imported",
              importedFrom: "gmail",
              timelineLabel: buildImportedTimelineLabel(message),
              messageRole: message.messageRole,
              rawBodyCaptured: Boolean(message.rawBodyText || message.rawBodyHtml),
              ...message.metadata,
            },
            sentAt: message.sentAt ?? null,
            receivedAt: message.receivedAt ?? null,
          });

          localMessageId = createdMessage.id;
          localThreadMessages.push(createdMessage);
          importedMessageCount += 1;

          if (createdMessage.campaignId) {
            touchedCampaignIds.add(createdMessage.campaignId);
          }

          if (message.direction === "inbound") {
            ingestedInboundCount += 1;

            await getSharedAuditEventRepository().createAuditEvent({
              workspaceId: input.workspaceId,
              userId: input.userId,
              actorType: "system",
              action: "inbox.message.ingested",
              entityType: "message",
              entityId: createdMessage.id,
              requestId: operation.requestId,
              changes: {
                provider: "gmail",
                messageRole: message.messageRole,
                providerMessageId: message.providerMessageId,
                linkedProspectId: matchedProspect?.id ?? null,
              },
              metadata: {
                inboxAccountId: account.id,
                importedThreadRefId: importedThreadRef.id,
                conversationThreadId: conversationThread.id,
              },
            });
          }

          if (
            matchedProspect?.campaignId &&
            message.direction === "inbound" &&
            message.messageRole === "reply"
          ) {
            prospectsToAnalyze.set(`${matchedProspect.campaignId}:${matchedProspect.id}`, {
              campaignId: matchedProspect.campaignId,
              prospectId: matchedProspect.id,
            });
          }
        }

        await messageRefRepository.upsertImportedMessageRef({
          workspaceId: input.workspaceId,
          inboxAccountId: account.id,
          importedThreadRefId: importedThreadRef.id,
          messageId: localMessageId,
          provider: "gmail",
          providerMessageId: message.providerMessageId,
          providerThreadId: message.providerThreadId,
          direction: message.direction,
          providerMessageType: message.providerMessageType,
          messageRole: message.messageRole,
          replyToProviderMessageId: message.replyToProviderMessageId ?? null,
          subject: message.subject ?? null,
          fromAddress: message.fromAddress ?? null,
          toAddresses: message.toAddresses,
          ccAddresses: message.ccAddresses,
          bccAddresses: message.bccAddresses,
          rawBodyText: message.rawBodyText ?? message.bodyText ?? null,
          rawBodyHtml: message.rawBodyHtml ?? message.bodyHtml ?? null,
          normalizedBodyText: message.normalizedBodyText ?? message.bodyText ?? null,
          normalizedBodyHtml: message.normalizedBodyHtml ?? message.bodyHtml ?? null,
          syncState: {
            status: "healthy",
            syncCursor: profile.historyId,
            lastSyncedAt: syncedAt,
            lastSuccessAt: syncedAt,
            lastErrorAt: null,
            lastErrorMessage: null,
            consecutiveFailures: 0,
            metadata: {},
          },
          metadata: message.metadata,
          sentAt: message.sentAt ?? null,
          receivedAt: message.receivedAt ?? null,
        });

        const messageTimestamp = getImportedMessageTimestamp(message);
        if (
          messageTimestamp !== null &&
          (latestMessageAt === null || messageTimestamp.getTime() > latestMessageAt.getTime())
        ) {
          latestMessageAt = messageTimestamp;
        }
      }

      if (conversationThread !== null) {
        await threadRepository.updateThread({
          threadId: conversationThread.id,
          workspaceId: input.workspaceId,
          latestMessageAt,
          metadata: {
            ...conversationThread.metadata,
            importedProvider: "gmail",
            importedThreadRefId: importedThreadRef.id,
          },
        });
      }

      importedThreadCount += 1;
    }

    for (const target of prospectsToAnalyze.values()) {
      try {
        await analyzeLatestReplyForProspect({
          workspaceId: input.workspaceId,
          campaignId: target.campaignId,
          prospectId: target.prospectId,
          userId: input.userId,
          workspacePlanCode: currentSubscription?.planCode ?? null,
          requestId: operation.requestId,
        });
        analyzedReplyCount += 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown automatic reply analysis error";
        operation.logger.error("Automatic reply analysis after Gmail ingestion failed", {
          campaignId: target.campaignId,
          prospectId: target.prospectId,
          error: errorMessage,
        });

        await getSharedAuditEventRepository().createAuditEvent({
          workspaceId: input.workspaceId,
          userId: input.userId,
          actorType: "system",
          action: "inbox.gmail.reply_analysis.failed",
          entityType: "prospect",
          entityId: target.prospectId,
          requestId: operation.requestId,
          changes: {
            campaignId: target.campaignId,
          },
          metadata: {
            error: errorMessage,
            source: "gmail_ingestion",
          },
        });
      }
    }

    for (const campaignId of touchedCampaignIds) {
      await refreshCampaignPerformanceMetrics(input.workspaceId, campaignId);
    }

    const completedAt = new Date();
    const nextSyncState = buildHealthySyncState({
      previous: account.syncState,
      syncCursor: profile.historyId,
      syncedAt: completedAt,
      metadata: {
        lastImportedThreadCount: importedThreadCount,
        lastImportedMessageCount: importedMessageCount,
        lastIngestedInboundCount: ingestedInboundCount,
        lastAutoAnalyzedReplyCount: analyzedReplyCount,
      },
    });

    await inboxAccountRepository.updateInboxAccountSyncState({
      inboxAccountId: account.id,
      workspaceId: input.workspaceId,
      status: "active",
      syncState: nextSyncState,
      lastSyncedAt: completedAt,
    });

    if (syncRun !== null) {
      await syncRunRepository.completeInboxSyncRun({
        inboxSyncRunId: syncRun.id,
        inboxAccountId: account.id,
        status: "completed",
        cursorAfter: profile.historyId,
        importedThreadCount,
        importedMessageCount,
        finishedAt: completedAt,
        metadata: {
          linkedThreadCount,
          unmatchedThreadCount,
          ingestedInboundCount,
          analyzedReplyCount,
        },
      });
    }

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      eventName: "gmail_threads_imported",
      entityType: "inbox_account",
      entityId: account.id,
      quantity: Math.max(importedMessageCount, 1),
      billable: false,
      metadata: {
        provider: "gmail",
        importedThreadCount,
        importedMessageCount,
        linkedThreadCount,
        unmatchedThreadCount,
        ingestedInboundCount,
        analyzedReplyCount,
      },
    });

    if (ingestedInboundCount > 0) {
      await getSharedUsageEventRepository().createUsageEvent({
        workspaceId: input.workspaceId,
        userId: input.userId,
        eventName: "gmail_inbound_replies_ingested",
        entityType: "inbox_account",
        entityId: account.id,
        quantity: ingestedInboundCount,
        billable: false,
        metadata: {
          provider: "gmail",
          analyzedReplyCount,
        },
      });
    }

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: "user",
      action: "inbox.gmail.import.completed",
      entityType: "inbox_account",
      entityId: account.id,
      requestId: operation.requestId,
      changes: {
        importedThreadCount,
        importedMessageCount,
        linkedThreadCount,
        unmatchedThreadCount,
        ingestedInboundCount,
        analyzedReplyCount,
      },
      metadata: {},
    });

    operation.logger.info("Gmail import completed", {
      inboxAccountId: account.id,
      importedThreadCount,
      importedMessageCount,
      linkedThreadCount,
      unmatchedThreadCount,
      ingestedInboundCount,
      analyzedReplyCount,
    });

    return {
      inboxAccountId: account.id,
      importedThreadCount,
      importedMessageCount,
      linkedThreadCount,
      unmatchedThreadCount,
      ingestedInboundCount,
      analyzedReplyCount,
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Gmail import failure";

    await inboxAccountRepository.updateInboxAccountSyncState({
      inboxAccountId: account.id,
      workspaceId: input.workspaceId,
      status: "error",
      syncState: buildFailedSyncState({
        previous: account.syncState,
        failedAt: completedAt,
        errorMessage,
      }),
      lastSyncedAt: completedAt,
    });

    if (syncRun !== null) {
      await syncRunRepository.completeInboxSyncRun({
        inboxSyncRunId: syncRun.id,
        inboxAccountId: account.id,
        status: "failed",
        cursorAfter: account.syncState.syncCursor ?? null,
        importedThreadCount,
        importedMessageCount,
        finishedAt: completedAt,
        errorSummary: errorMessage,
        metadata: {
          linkedThreadCount,
          unmatchedThreadCount,
          ingestedInboundCount,
          analyzedReplyCount,
        },
      });
    }

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: "user",
      action: "inbox.gmail.import.failed",
      entityType: "inbox_account",
      entityId: account.id,
      requestId: operation.requestId,
      changes: {
        importedThreadCount,
        importedMessageCount,
      },
      metadata: {
        error: errorMessage,
      },
    });

    operation.logger.error("Gmail import failed", {
      inboxAccountId: account.id,
      importedThreadCount,
      importedMessageCount,
      ingestedInboundCount,
      analyzedReplyCount,
      error: errorMessage,
    });

    throw error;
  }
}

export async function createDraftInInbox(input: {
  request: DraftInInboxActionRequest;
  userId?: string;
  requestId?: string;
  providerThreadId?: string | null;
}): Promise<DraftInInboxActionResult> {
  const operation = createOperationContext({
    operation: "inbox.draft.create",
    requestId: input.requestId,
    workspaceId: input.request.workspaceId,
    userId: input.userId ?? null,
  });
  const account = await getInboxAccountRepository().getInboxAccountById(
    input.request.inboxAccountId,
  );

  if (account === null || account.workspaceId !== input.request.workspaceId) {
    throw new Error("Inbox account not found for workspace.");
  }

  if (account.status !== "active") {
    throw new Error("Inbox account is not active. Reconnect Gmail and try again.");
  }

  try {
    const envelope = await resolveUsableGmailEnvelope(account);

    let result: DraftInInboxActionResult;
    switch (account.provider) {
      case "gmail": {
        const draft = await createGmailDraft({
          accessToken: envelope.accessToken,
          toRecipients: input.request.toRecipients,
          ccRecipients: input.request.ccRecipients,
          bccRecipients: input.request.bccRecipients,
          subject: input.request.subject,
          bodyText: input.request.bodyText,
          bodyHtml: input.request.bodyHtml ?? null,
          providerThreadId: input.providerThreadId ?? null,
        });

        result = {
          inboxAccountId: account.id,
          provider: "gmail",
          providerDraftId: draft.providerDraftId,
          providerMessageId: draft.providerMessageId,
          providerThreadId: draft.providerThreadId,
          status: draft.status,
          createdAt: draft.createdAt,
          metadata: {
            emailAddress: account.emailAddress,
          },
        };
        break;
      }
      default:
        throw new Error(`Inbox provider ${account.provider} does not support draft creation yet.`);
    }

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.request.workspaceId,
      userId: input.userId,
      eventName: "inbox_draft_created",
      entityType: "inbox_account",
      entityId: account.id,
      quantity: 1,
      billable: false,
      metadata: {
        provider: account.provider,
        providerDraftId: result.providerDraftId,
        providerMessageId: result.providerMessageId ?? null,
        providerThreadId: result.providerThreadId ?? null,
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.request.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "inbox.draft.created",
      entityType: "inbox_account",
      entityId: account.id,
      requestId: operation.requestId,
      changes: {
        provider: account.provider,
        providerDraftId: result.providerDraftId,
        providerMessageId: result.providerMessageId ?? null,
      },
      metadata: {
        providerThreadId: result.providerThreadId ?? null,
      },
    });

    operation.logger.info("Inbox draft created", {
      inboxAccountId: account.id,
      provider: account.provider,
      providerDraftId: result.providerDraftId,
      providerMessageId: result.providerMessageId ?? null,
      providerThreadId: result.providerThreadId ?? null,
    });

    return result;
  } catch (error) {
    operation.logger.error("Inbox draft creation failed", {
      inboxAccountId: account.id,
      provider: account.provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.request.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "inbox.draft.failed",
      entityType: "inbox_account",
      entityId: account.id,
      requestId: operation.requestId,
      changes: {},
      metadata: {
        error: error instanceof Error ? error.message : "Unknown inbox draft creation error",
      },
    });

    throw error;
  }
}
export async function assertWorkspaceInboxAccess(input: {
  auth: AuthContext;
  workspaceId: string;
}): Promise<void> {
  requireWorkspaceAccess(input.auth, input.workspaceId);
}






