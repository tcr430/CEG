import type { GeneratedArtifactType, InboxDraftLink, Message, TrainingSignalOutcome } from "@ceg/validation";

function readInboxDraftLinkFromMessage(
  message: Pick<Message, "metadata">,
): InboxDraftLink | null {
  const candidate = message.metadata.inboxDraft;

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const record = candidate as Record<string, unknown>;

  if (
    typeof record.artifactId !== "string" ||
    typeof record.artifactKind !== "string" ||
    typeof record.providerDraftId !== "string"
  ) {
    return null;
  }

  return candidate as InboxDraftLink;
}

export function classifyReplyOutcome(intent: string | null | undefined): TrainingSignalOutcome["label"] | null {
  switch (intent) {
    case "interested":
    case "needs_more_info":
    case "referral_to_other_person":
      return "positive";
    case "objection_price":
    case "objection_timing":
    case "objection_authority":
    case "objection_already_has_solution":
    case "soft_no":
    case "hard_no":
      return "negative";
    default:
      return null;
  }
}

export function resolveGeneratedArtifactForSentMessage(
  message: Pick<Message, "sequenceId" | "metadata">,
): { artifactType: GeneratedArtifactType; artifactId: string } | null {
  const inboxDraft = readInboxDraftLinkFromMessage(message);

  if (inboxDraft !== null) {
    return {
      artifactType: inboxDraft.artifactKind,
      artifactId: inboxDraft.artifactId,
    };
  }

  if (message.metadata.generatedFrom !== "sequence" || !message.sequenceId) {
    return null;
  }

  const timelineLabel =
    typeof message.metadata.timelineLabel === "string"
      ? message.metadata.timelineLabel.toLowerCase()
      : "";

  if (timelineLabel.includes("initial")) {
    return {
      artifactType: "sequence_initial_email",
      artifactId: `${message.sequenceId}:initial_email`,
    };
  }

  if (timelineLabel.includes("final soft-close")) {
    return {
      artifactType: "sequence_follow_up_step",
      artifactId: `${message.sequenceId}:follow-up:3`,
    };
  }

  const followUpMatch = timelineLabel.match(/follow-up\s+(\d+)/i);
  if (followUpMatch) {
    return {
      artifactType: "sequence_follow_up_step",
      artifactId: `${message.sequenceId}:follow-up:${followUpMatch[1]}`,
    };
  }

  return null;
}
