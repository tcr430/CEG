import type { Message } from "@ceg/validation";
import {
  inboxDraftLinkSchema,
  type InboxDraftArtifactKind,
  type InboxDraftLink,
} from "@ceg/validation";

export function buildSequenceInboxDraftArtifactId(input: {
  sequenceRecordId: string;
  targetPart: "initial_email" | "follow_up_step";
  targetStepNumber?: number;
}): string {
  if (input.targetPart === "follow_up_step") {
    return `${input.sequenceRecordId}:follow-up:${input.targetStepNumber ?? 1}`;
  }

  return `${input.sequenceRecordId}:initial_email`;
}

export function buildReplyInboxDraftArtifactId(input: {
  inboundMessageId: string;
  slotId: string;
}): string {
  return `${input.inboundMessageId}:draft:${input.slotId}`;
}

export function readInboxDraftLink(value: unknown): InboxDraftLink | null {
  const parsed = inboxDraftLinkSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function readInboxDraftLinkFromMessage(
  message: Pick<Message, "metadata">,
): InboxDraftLink | null {
  if (typeof message.metadata !== "object" || message.metadata === null) {
    return null;
  }

  return readInboxDraftLink(
    (message.metadata as Record<string, unknown>).inboxDraft,
  );
}

export function indexInboxDraftsByArtifact(
  messages: Array<Pick<Message, "metadata">>,
): Map<string, InboxDraftLink> {
  const links = new Map<string, InboxDraftLink>();

  for (const message of messages) {
    const link = readInboxDraftLinkFromMessage(message);

    if (link !== null) {
      links.set(link.artifactId, link);
    }
  }

  return links;
}

export function createInboxDraftLink(input: {
  artifactId: string;
  artifactKind: InboxDraftArtifactKind;
  inboxAccountId: string;
  provider: "gmail" | "microsoft365";
  providerDraftId: string;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  status: "created" | "updated" | "sent";
  createdAt: Date;
  sentAt?: Date | null;
}): InboxDraftLink {
  return inboxDraftLinkSchema.parse(input);
}

export function updateInboxDraftLink(input: {
  link: InboxDraftLink;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  status?: "created" | "updated" | "sent";
  sentAt?: Date | null;
}): InboxDraftLink {
  return inboxDraftLinkSchema.parse({
    ...input.link,
    providerMessageId:
      input.providerMessageId === undefined
        ? input.link.providerMessageId ?? null
        : input.providerMessageId,
    providerThreadId:
      input.providerThreadId === undefined
        ? input.link.providerThreadId ?? null
        : input.providerThreadId,
    status: input.status ?? input.link.status,
    sentAt:
      input.sentAt === undefined
        ? input.link.sentAt ?? null
        : input.sentAt,
  });
}
