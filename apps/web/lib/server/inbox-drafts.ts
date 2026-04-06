import "server-only";

import {
  getConversationThreadRepository,
  getImportedMessageRefRepository,
  getImportedThreadRefRepository,
  getInboxAccountRepository,
  getMessageRepository,
} from "./database";
import {
  appendMessageToProspectThread,
  ensureThreadForProspect,
  getReplyThreadStateForProspect,
} from "./replies";
import { getProspectForCampaign } from "./campaigns";
import { refreshCampaignPerformanceMetrics } from "./campaign-performance";
import { getSharedAuditEventRepository } from "./audit-events";
import { getSharedUsageEventRepository } from "./usage-events";
import { getLatestSequenceForProspect } from "./sequences";
import { createDraftInInbox } from "./inbox/service";
import {
  buildReplyInboxDraftArtifactId,
  buildSequenceInboxDraftArtifactId,
  createInboxDraftLink,
  readInboxDraftLinkFromMessage,
  updateInboxDraftLink,
} from "../inbox-draft-links";

function getPrimaryActiveInboxAccount(workspaceId: string) {
  return getInboxAccountRepository()
    .listInboxAccountsByWorkspace(workspaceId)
    .then((accounts) =>
      accounts.find((account) => account.provider === "gmail" && account.status === "active") ?? null,
    );
}

async function resolveProspectEmail(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
}): Promise<string> {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  if (!prospect.email) {
    throw new Error("Prospect email is required before creating an inbox draft.");
  }

  return prospect.email;
}

async function getProviderThreadId(input: {
  workspaceId: string;
  conversationThreadId: string;
  inboxAccountId: string;
}): Promise<string | null> {
  const refs = await getImportedThreadRefRepository().listImportedThreadRefsByConversationThread(
    input.workspaceId,
    input.conversationThreadId,
  );
  const match = refs.find((ref) => ref.inboxAccountId === input.inboxAccountId) ?? null;
  return match?.providerThreadId ?? null;
}

async function upsertImportedDraftThreadRef(input: {
  workspaceId: string;
  inboxAccountId: string;
  conversationThreadId: string;
  prospectId: string;
  providerThreadId: string;
  subject: string;
  accountEmail: string;
  prospectEmail: string;
}) {
  return getImportedThreadRefRepository().upsertImportedThreadRef({
    workspaceId: input.workspaceId,
    inboxAccountId: input.inboxAccountId,
    prospectId: input.prospectId,
    conversationThreadId: input.conversationThreadId,
    provider: "gmail",
    providerThreadId: input.providerThreadId,
    providerFolder: "drafts",
    subject: input.subject,
    participants: [
      {
        email: input.accountEmail,
        name: null,
        role: "from",
      },
      {
        email: input.prospectEmail,
        name: null,
        role: "to",
      },
    ],
    snippet: null,
    lastMessageReceivedAt: null,
    syncState: {
      status: "healthy",
      syncCursor: null,
      lastSyncedAt: new Date(),
      lastSuccessAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      metadata: {
        source: "draft_create",
      },
    },
    metadata: {
      source: "draft_create",
    },
  });
}

export async function markProspectThreadMessageSent(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  messageId: string;
  userId?: string;
  requestId?: string;
  mode?: "manual" | "inferred";
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  sentAt?: Date | null;
}) {
  const state = await getReplyThreadStateForProspect(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );
  const message = state.messages.find((entry) => entry.id === input.messageId) ?? null;

  if (message === null || message.direction !== "outbound") {
    throw new Error("Outbound message not found for this prospect thread.");
  }

  const sentAt = input.sentAt ?? new Date();
  const sendMode =
    input.mode ??
    (readInboxDraftLinkFromMessage(message) !== null ? "inferred" : "manual");
  const existingDraftLink = readInboxDraftLinkFromMessage(message);
  const updatedDraftLink =
    existingDraftLink === null
      ? null
      : updateInboxDraftLink({
          link: existingDraftLink,
          providerMessageId:
            input.providerMessageId ??
            message.providerMessageId ??
            existingDraftLink.providerMessageId ??
            null,
          providerThreadId:
            input.providerThreadId ?? existingDraftLink.providerThreadId ?? null,
          status: "sent",
          sentAt,
        });

  const updatedMessage = await getMessageRepository().updateMessage({
    workspaceId: input.workspaceId,
    messageId: message.id,
    status: "sent",
    providerMessageId:
      input.providerMessageId ??
      message.providerMessageId ??
      updatedDraftLink?.providerMessageId ??
      null,
    metadata: {
      ...message.metadata,
      timelineLabel:
        sendMode === "inferred" ? "Sent from inbox" : "Outbound message sent",
      sendTracking: {
        status: "sent",
        mode: sendMode,
        sentAt: sentAt.toISOString(),
      },
      ...(updatedDraftLink ? { inboxDraft: updatedDraftLink } : {}),
    },
    sentAt,
  });

  if (state.thread !== null) {
    const currentLatest = state.thread.latestMessageAt ?? null;
    await getConversationThreadRepository().updateThread({
      threadId: state.thread.id,
      workspaceId: input.workspaceId,
      latestMessageAt:
        currentLatest === null || sentAt.getTime() > currentLatest.getTime()
          ? sentAt
          : currentLatest,
      metadata: {
        ...state.thread.metadata,
        latestMessageId: updatedMessage.id,
      },
    });
  }

  const importedRef = await getImportedMessageRefRepository().getImportedMessageRefByMessageId(
    input.workspaceId,
    message.id,
  );

  if (importedRef !== null) {
    await getImportedMessageRefRepository().upsertImportedMessageRef({
      workspaceId: importedRef.workspaceId,
      inboxAccountId: importedRef.inboxAccountId,
      importedThreadRefId: importedRef.importedThreadRefId,
      messageId: importedRef.messageId,
      provider: importedRef.provider,
      providerMessageId: input.providerMessageId ?? importedRef.providerMessageId,
      providerThreadId: input.providerThreadId ?? importedRef.providerThreadId,
      direction: "outbound",
      providerMessageType: "outbound",
      messageRole: "outbound",
      replyToProviderMessageId: importedRef.replyToProviderMessageId,
      subject: importedRef.subject,
      fromAddress: importedRef.fromAddress,
      toAddresses: importedRef.toAddresses,
      ccAddresses: importedRef.ccAddresses,
      bccAddresses: importedRef.bccAddresses,
      rawBodyText: importedRef.rawBodyText,
      rawBodyHtml: importedRef.rawBodyHtml,
      normalizedBodyText: importedRef.normalizedBodyText,
      normalizedBodyHtml: importedRef.normalizedBodyHtml,
      syncState: {
        ...importedRef.syncState,
        lastSyncedAt: sentAt,
        lastSuccessAt: sentAt,
        metadata: {
          ...importedRef.syncState.metadata,
          sendTrackingStatus: "sent",
          sendTrackingMode: sendMode,
        },
      },
      metadata: {
        ...importedRef.metadata,
        sendTrackingStatus: "sent",
        sendTrackingMode: sendMode,
      },
      sentAt,
      receivedAt: importedRef.receivedAt,
    });
  }

  await refreshCampaignPerformanceMetrics(input.workspaceId, input.campaignId);

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    eventName: "outbound_message_marked_sent",
    entityType: "message",
    entityId: updatedMessage.id,
    quantity: 1,
    billable: false,
    metadata: {
      sendMode,
      providerMessageId:
        input.providerMessageId ??
        message.providerMessageId ??
        updatedDraftLink?.providerMessageId ??
        null,
    },
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId,
    actorType: input.userId ? "user" : "system",
    action: "thread.message.outbound.sent_marked",
    entityType: "message",
    entityId: updatedMessage.id,
    requestId: input.requestId,
    changes: {
      status: "sent",
      sendMode,
      sentAt: sentAt.toISOString(),
    },
    metadata: {
      providerMessageId:
        input.providerMessageId ??
        message.providerMessageId ??
        updatedDraftLink?.providerMessageId ??
        null,
      providerThreadId:
        input.providerThreadId ?? updatedDraftLink?.providerThreadId ?? null,
    },
  });

  return updatedMessage;
}

export async function createSequenceDraftInInbox(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  artifactType: "sequence_initial_email" | "sequence_follow_up_step";
  targetStepNumber?: number;
  userId?: string;
  requestId?: string;
}): Promise<{ status: "created" | "existing"; providerDraftId: string }> {
  const [thread, latestSequence, inboxAccount, replyState, prospectEmail] = await Promise.all([
    ensureThreadForProspect(input),
    getLatestSequenceForProspect(input.workspaceId, input.campaignId, input.prospectId),
    getPrimaryActiveInboxAccount(input.workspaceId),
    getReplyThreadStateForProspect(input.workspaceId, input.campaignId, input.prospectId),
    resolveProspectEmail(input),
  ]);

  if (latestSequence === null) {
    throw new Error("Generate a sequence before creating an inbox draft.");
  }

  if (inboxAccount === null) {
    throw new Error("Connect Gmail in Settings before creating an inbox draft.");
  }

  const artifactId = buildSequenceInboxDraftArtifactId({
    sequenceRecordId: latestSequence.recordId,
    targetPart: input.artifactType === "sequence_initial_email" ? "initial_email" : "follow_up_step",
    targetStepNumber: input.targetStepNumber,
  });
  const existingMessage = replyState.messages.find((message) => {
    const link = readInboxDraftLinkFromMessage(message);
    return link?.artifactId === artifactId;
  }) ?? null;
  const existingLink = existingMessage ? readInboxDraftLinkFromMessage(existingMessage) : null;

  if (existingLink !== null) {
    return {
      status: "existing",
      providerDraftId: existingLink.providerDraftId,
    };
  }

  const email =
    input.artifactType === "sequence_initial_email"
      ? latestSequence.initialEmail.email
      : latestSequence.followUpSequence.sequenceSteps.find(
          (step) => step.stepNumber === (input.targetStepNumber ?? 1),
        );

  if (!email) {
    throw new Error("The selected sequence step could not be resolved.");
  }

  const providerThreadId = await getProviderThreadId({
    workspaceId: input.workspaceId,
    conversationThreadId: thread.id,
    inboxAccountId: inboxAccount.id,
  });
  const providerResult = await createDraftInInbox({
    request: {
      workspaceId: input.workspaceId,
      inboxAccountId: inboxAccount.id,
      conversationThreadId: thread.id,
      toRecipients: [prospectEmail],
      ccRecipients: [],
      bccRecipients: [],
      subject: email.subject,
      bodyText: [email.opener, email.body, `CTA: ${email.cta}`].join("\n\n"),
      metadata: {
        artifactId,
      },
    },
    userId: input.userId,
    requestId: input.requestId,
    providerThreadId,
  });

  if (!providerResult.providerMessageId) {
    throw new Error("Inbox provider did not return a provider message id for the draft.");
  }

  const link = createInboxDraftLink({
    artifactId,
    artifactKind: input.artifactType,
    inboxAccountId: inboxAccount.id,
    provider: providerResult.provider,
    providerDraftId: providerResult.providerDraftId,
    providerMessageId: providerResult.providerMessageId,
    providerThreadId: providerResult.providerThreadId ?? null,
    status: providerResult.status,
    createdAt: providerResult.createdAt,
  });

  const localMessage = await appendMessageToProspectThread({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    direction: "outbound",
    messageKind: "email",
    status: "draft",
    subject: email.subject,
    bodyText: [email.opener, email.body, `CTA: ${email.cta}`].join("\n\n"),
    sequenceVersion: latestSequence.sequenceVersion,
    providerMessageId: providerResult.providerMessageId,
    source: "generated",
    generatedFrom: "sequence",
    timelineLabel: "Draft in Gmail",
    userId: input.userId,
    metadata: {
      source: "generated",
      generatedFrom: "sequence",
      sequenceVersion: latestSequence.sequenceVersion,
      timelineLabel: "Draft in Gmail",
      inboxDraft: link,
    },
  });

  const threadRef = await upsertImportedDraftThreadRef({
    workspaceId: input.workspaceId,
    inboxAccountId: inboxAccount.id,
    conversationThreadId: thread.id,
    prospectId: input.prospectId,
    providerThreadId: providerResult.providerThreadId ?? thread.externalThreadRef ?? thread.id,
    subject: email.subject,
    accountEmail: inboxAccount.emailAddress,
    prospectEmail,
  });

  await getImportedMessageRefRepository().upsertImportedMessageRef({
    workspaceId: input.workspaceId,
    inboxAccountId: inboxAccount.id,
    importedThreadRefId: threadRef.id,
    messageId: localMessage.id,
    provider: providerResult.provider,
    providerMessageId: providerResult.providerMessageId,
    providerThreadId: providerResult.providerThreadId ?? threadRef.providerThreadId,
    direction: "outbound",
    providerMessageType: "draft",
    messageRole: "draft",
    replyToProviderMessageId: null,
    subject: email.subject,
    fromAddress: inboxAccount.emailAddress,
    toAddresses: [prospectEmail],
    ccAddresses: [],
    bccAddresses: [],
    rawBodyText: [email.opener, email.body, `CTA: ${email.cta}`].join("\n\n"),
    rawBodyHtml: null,
    normalizedBodyText: [email.opener, email.body, `CTA: ${email.cta}`].join("\n\n"),
    normalizedBodyHtml: null,
    syncState: {
      status: "healthy",
      syncCursor: null,
      lastSyncedAt: providerResult.createdAt,
      lastSuccessAt: providerResult.createdAt,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      metadata: {
        providerDraftId: providerResult.providerDraftId,
      },
    },
    metadata: {
      source: "draft_create",
      providerDraftId: providerResult.providerDraftId,
      artifactId,
      artifactType: input.artifactType,
    },
    sentAt: null,
    receivedAt: null,
  });

  return {
    status: "created",
    providerDraftId: providerResult.providerDraftId,
  };
}

export async function createReplyDraftInInbox(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  targetSlotId: string;
  userId?: string;
  requestId?: string;
}): Promise<{ status: "created" | "existing"; providerDraftId: string }> {
  const [thread, replyState, inboxAccount, prospectEmail] = await Promise.all([
    ensureThreadForProspect(input),
    getReplyThreadStateForProspect(input.workspaceId, input.campaignId, input.prospectId),
    getPrimaryActiveInboxAccount(input.workspaceId),
    resolveProspectEmail(input),
  ]);

  if (replyState.latestInboundMessage === null || replyState.latestDrafts === null) {
    throw new Error("Generate reply drafts before creating an inbox draft.");
  }

  if (inboxAccount === null) {
    throw new Error("Connect Gmail in Settings before creating an inbox draft.");
  }

  const draft = replyState.latestDrafts.output.drafts.find(
    (item) => item.slotId === input.targetSlotId,
  );

  if (!draft) {
    throw new Error("The selected draft reply could not be resolved.");
  }

  const artifactId = buildReplyInboxDraftArtifactId({
    inboundMessageId: replyState.latestInboundMessage.id,
    slotId: input.targetSlotId,
  });
  const existingMessage = replyState.messages.find((message) => {
    const link = readInboxDraftLinkFromMessage(message);
    return link?.artifactId === artifactId;
  }) ?? null;
  const existingLink = existingMessage ? readInboxDraftLinkFromMessage(existingMessage) : null;

  if (existingLink !== null) {
    return {
      status: "existing",
      providerDraftId: existingLink.providerDraftId,
    };
  }

  const providerThreadId = await getProviderThreadId({
    workspaceId: input.workspaceId,
    conversationThreadId: thread.id,
    inboxAccountId: inboxAccount.id,
  });
  const providerResult = await createDraftInInbox({
    request: {
      workspaceId: input.workspaceId,
      inboxAccountId: inboxAccount.id,
      conversationThreadId: thread.id,
      draftReplyId: replyState.latestDrafts.records.find((record) => record.bodyText === draft.bodyText)?.id ?? null,
      toRecipients: [prospectEmail],
      ccRecipients: [],
      bccRecipients: [],
      subject: draft.subject ?? "Re: your note",
      bodyText: draft.bodyText,
      metadata: {
        artifactId,
      },
    },
    userId: input.userId,
    requestId: input.requestId,
    providerThreadId,
  });

  if (!providerResult.providerMessageId) {
    throw new Error("Inbox provider did not return a provider message id for the draft.");
  }

  const link = createInboxDraftLink({
    artifactId,
    artifactKind: "draft_reply_option",
    inboxAccountId: inboxAccount.id,
    provider: providerResult.provider,
    providerDraftId: providerResult.providerDraftId,
    providerMessageId: providerResult.providerMessageId,
    providerThreadId: providerResult.providerThreadId ?? null,
    status: providerResult.status,
    createdAt: providerResult.createdAt,
  });

  const localMessage = await appendMessageToProspectThread({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
    direction: "outbound",
    messageKind: "reply",
    status: "draft",
    subject: draft.subject ?? "Re: your note",
    bodyText: draft.bodyText,
    replyToMessageId: replyState.latestInboundMessage.id,
    providerMessageId: providerResult.providerMessageId,
    source: "generated",
    generatedFrom: "reply_draft",
    timelineLabel: "Reply draft in Gmail",
    userId: input.userId,
    metadata: {
      source: "generated",
      generatedFrom: "reply_draft",
      draftVersion: replyState.latestDrafts.version,
      timelineLabel: "Reply draft in Gmail",
      inboxDraft: link,
    },
  });

  const threadRef = await upsertImportedDraftThreadRef({
    workspaceId: input.workspaceId,
    inboxAccountId: inboxAccount.id,
    conversationThreadId: thread.id,
    prospectId: input.prospectId,
    providerThreadId: providerResult.providerThreadId ?? thread.externalThreadRef ?? thread.id,
    subject: draft.subject ?? "Re: your note",
    accountEmail: inboxAccount.emailAddress,
    prospectEmail,
  });

  await getImportedMessageRefRepository().upsertImportedMessageRef({
    workspaceId: input.workspaceId,
    inboxAccountId: inboxAccount.id,
    importedThreadRefId: threadRef.id,
    messageId: localMessage.id,
    provider: providerResult.provider,
    providerMessageId: providerResult.providerMessageId,
    providerThreadId: providerResult.providerThreadId ?? threadRef.providerThreadId,
    direction: "outbound",
    providerMessageType: "draft",
    messageRole: "draft",
    replyToProviderMessageId: null,
    subject: draft.subject ?? "Re: your note",
    fromAddress: inboxAccount.emailAddress,
    toAddresses: [prospectEmail],
    ccAddresses: [],
    bccAddresses: [],
    rawBodyText: draft.bodyText,
    rawBodyHtml: null,
    normalizedBodyText: draft.bodyText,
    normalizedBodyHtml: null,
    syncState: {
      status: "healthy",
      syncCursor: null,
      lastSyncedAt: providerResult.createdAt,
      lastSuccessAt: providerResult.createdAt,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      metadata: {
        providerDraftId: providerResult.providerDraftId,
      },
    },
    metadata: {
      source: "draft_create",
      providerDraftId: providerResult.providerDraftId,
      artifactId,
      artifactType: "draft_reply_option",
    },
    sentAt: null,
    receivedAt: null,
  });

  return {
    status: "created",
    providerDraftId: providerResult.providerDraftId,
  };
}

