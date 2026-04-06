"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCampaignForWorkspace,
  createProspectForCampaign,
  updateCampaignForWorkspace,
} from "../../../lib/server/campaigns";
import { getServerAuthContext } from "../../../lib/server/auth";
import { runProspectResearchForCampaign } from "../../../lib/server/prospect-research";
import {
  createReplyDraftInInbox,
  createSequenceDraftInInbox,
  markProspectThreadMessageSent,
} from "../../../lib/server/inbox-drafts";
import {
  analyzeLatestReplyForProspect,
  appendLatestSequenceMessagesToProspectThread,
  createInboundReplyForProspect,
  createManualOutboundMessageForProspect,
  editDraftReplyForProspect,
  generateDraftRepliesForProspect,
  regenerateDraftReplyForProspect,
} from "../../../lib/server/replies";
import {
  editSequenceStepForProspect,
  generateSequenceForProspect,
  regenerateSequencePartForProspect,
} from "../../../lib/server/sequences";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

function readOptionalText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

function readList(formData: FormData, key: string): string[] {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readWorkspacePlanCode(auth: Awaited<ReturnType<typeof getServerAuthContext>>, workspaceId: string) {
  return auth.user?.memberships.find((membership) => membership.workspaceId === workspaceId)
    ?.billingPlanCode;
}

function redirectWithError(path: string, error: unknown, fallbackMessage: string) {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeUserFacingError(error, fallbackMessage)}`);
}

function redirectToProspect(workspaceId: string, campaignId: string, prospectId: string, success?: string) {
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath(`/app/campaigns/${campaignId}/prospects/${prospectId}`);
  const suffix = success ? `&success=${encodeURIComponent(success)}` : "";
  redirect(`/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}${suffix}`);
}

export async function createCampaignAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace id is required.");
  }

  const auth = await getServerAuthContext();

  try {
    await createCampaignForWorkspace({
      workspaceId,
      senderProfileId: readOptionalText(formData, "senderProfileId") ?? null,
      name: String(formData.get("name") ?? ""),
      offerSummary: readOptionalText(formData, "offerSummary"),
      targetIcp: readOptionalText(formData, "targetIcp"),
      targetIndustries: readList(formData, "targetIndustries"),
      tonePreferences: {
        style: readOptionalText(formData, "toneStyle"),
        do: readList(formData, "toneDo"),
        avoid: readList(formData, "toneAvoid"),
        notes: readOptionalText(formData, "toneNotes"),
      },
      frameworkPreferences: readList(formData, "frameworkPreferences"),
      settings: {},
      userId: auth.user?.userId,
      status: String(formData.get("status") ?? "draft") as
        | "draft"
        | "active"
        | "paused"
        | "completed"
        | "archived",
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/new?workspace=${workspaceId}`,
      error,
      "We could not create that campaign. Please review the brief and try again.",
    );
  }

  revalidatePath("/app/campaigns");
  redirect(`/app/campaigns?workspace=${workspaceId}&success=Campaign%20created.`);
}

export async function updateCampaignAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");

  if (typeof workspaceId !== "string" || typeof campaignId !== "string") {
    throw new Error("Workspace id and campaign id are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await updateCampaignForWorkspace({
      campaignId,
      workspaceId,
      senderProfileId: readOptionalText(formData, "senderProfileId") ?? null,
      name: String(formData.get("name") ?? ""),
      offerSummary: readOptionalText(formData, "offerSummary"),
      targetIcp: readOptionalText(formData, "targetIcp"),
      targetIndustries: readList(formData, "targetIndustries"),
      tonePreferences: {
        style: readOptionalText(formData, "toneStyle"),
        do: readList(formData, "toneDo"),
        avoid: readList(formData, "toneAvoid"),
        notes: readOptionalText(formData, "toneNotes"),
      },
      frameworkPreferences: readList(formData, "frameworkPreferences"),
      settings: {},
      userId: auth.user?.userId,
      status: String(formData.get("status") ?? "draft") as
        | "draft"
        | "active"
        | "paused"
        | "completed"
        | "archived",
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}?workspace=${workspaceId}`,
      error,
      "We could not save that campaign. Please try again.",
    );
  }

  revalidatePath("/app/campaigns");
  redirect(`/app/campaigns/${campaignId}?workspace=${workspaceId}&success=Campaign%20updated.`);
}

export async function createProspectAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");

  if (typeof workspaceId !== "string" || typeof campaignId !== "string") {
    throw new Error("Workspace id and campaign id are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await createProspectForCampaign({
      workspaceId,
      campaignId,
      companyName: readOptionalText(formData, "companyName"),
      companyWebsite: readOptionalText(formData, "companyWebsite"),
      contactName: readOptionalText(formData, "contactName"),
      email: readOptionalText(formData, "email"),
      status: String(formData.get("status") ?? "new") as
        | "new"
        | "researched"
        | "sequenced"
        | "contacted"
        | "replied"
        | "closed"
        | "archived",
      metadata: {},
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}?workspace=${workspaceId}`,
      error,
      "We could not add that prospect. Please review the details and try again.",
    );
  }

  revalidatePath(`/app/campaigns/${campaignId}`);
  redirect(`/app/campaigns/${campaignId}?workspace=${workspaceId}&success=Prospect%20added.`);
}

export async function runProspectResearchAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const websiteUrl = formData.get("websiteUrl");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof websiteUrl !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, and website URL are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await runProspectResearchForCampaign({
      workspaceId,
      campaignId,
      prospectId,
      websiteUrl,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not complete website research for this prospect.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Research%20snapshot%20saved.".replace(/%20/g, ' '));
}

export async function generateProspectSequenceAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    throw new Error("Workspace, campaign, and prospect are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await generateSequenceForProspect({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not generate a sequence for this prospect yet.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Sequence generated.");
}

export async function createInboundReplyAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const bodyText = formData.get("bodyText");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof bodyText !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, and reply body are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await createInboundReplyForProspect({
      workspaceId,
      campaignId,
      prospectId,
      subject: readOptionalText(formData, "subject") ?? null,
      bodyText,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
      autoAnalyze: true,
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not save that inbound reply.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Inbound reply saved and analyzed.");
}

export async function createManualOutboundMessageAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const bodyText = formData.get("bodyText");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof bodyText !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, and outbound body are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await createManualOutboundMessageForProspect({
      workspaceId,
      campaignId,
      prospectId,
      subject: readOptionalText(formData, "subject") ?? null,
      bodyText,
      userId: auth.user?.userId,
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not save that outbound draft.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Outbound draft added to thread.");
}

export async function appendGeneratedSequenceMessagesAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    throw new Error("Workspace, campaign, and prospect are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await appendLatestSequenceMessagesToProspectThread({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not add the latest sequence to the thread.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Generated sequence added to thread.");
}

export async function analyzeReplyAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    throw new Error("Workspace, campaign, and prospect are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await analyzeLatestReplyForProspect({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not analyze that reply yet.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Reply analysis saved.");
}

export async function generateReplyDraftsAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    throw new Error("Workspace, campaign, and prospect are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await generateDraftRepliesForProspect({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not generate reply drafts for that thread yet.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Reply drafts generated.");
}

export async function regenerateReplyDraftAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const targetSlotId = formData.get("targetSlotId");
  const feedback = formData.get("feedback");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof targetSlotId !== "string" ||
    typeof feedback !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, target slot, and feedback are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await regenerateDraftReplyForProspect({
      workspaceId,
      campaignId,
      prospectId,
      targetSlotId,
      feedback,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not regenerate that draft option.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Draft option regenerated.");
}

export async function regenerateSequencePartAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const targetPart = formData.get("targetPart");
  const feedback = formData.get("feedback");
  const targetStepNumberValue = formData.get("targetStepNumber");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof targetPart !== "string" ||
    typeof feedback !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, target part, and feedback are required.");
  }

  const auth = await getServerAuthContext();
  const targetStepNumber =
    typeof targetStepNumberValue === "string" && targetStepNumberValue.trim() !== ""
      ? Number(targetStepNumberValue)
      : undefined;

  try {
    await regenerateSequencePartForProspect({
      workspaceId,
      campaignId,
      prospectId,
      targetPart: targetPart as "subject_line" | "opener" | "initial_email" | "follow_up_step",
      targetStepNumber,
      feedback,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not regenerate that sequence section.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Sequence section regenerated.");
}

export async function editSequenceStepAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const targetPart = formData.get("targetPart");
  const subject = formData.get("subject");
  const opener = formData.get("opener");
  const body = formData.get("body");
  const cta = formData.get("cta");
  const rationale = formData.get("rationale");
  const targetStepNumberValue = formData.get("targetStepNumber");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof targetPart !== "string" ||
    typeof subject !== "string" ||
    typeof opener !== "string" ||
    typeof body !== "string" ||
    typeof cta !== "string" ||
    typeof rationale !== "string"
  ) {
    throw new Error("Sequence edit fields are required.");
  }

  const auth = await getServerAuthContext();
  const targetStepNumber =
    typeof targetStepNumberValue === "string" && targetStepNumberValue.trim() !== ""
      ? Number(targetStepNumberValue)
      : undefined;

  try {
    await editSequenceStepForProspect({
      workspaceId,
      campaignId,
      prospectId,
      targetPart: targetPart as "initial_email" | "follow_up_step",
      targetStepNumber,
      subject,
      opener,
      body,
      cta,
      rationale,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not save that sequence edit.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Sequence edit saved.");
}

export async function editReplyDraftAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const targetSlotId = formData.get("targetSlotId");
  const bodyText = formData.get("bodyText");
  const strategyNote = formData.get("strategyNote");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof targetSlotId !== "string" ||
    typeof bodyText !== "string" ||
    typeof strategyNote !== "string"
  ) {
    throw new Error("Reply draft edit fields are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await editDraftReplyForProspect({
      workspaceId,
      campaignId,
      prospectId,
      targetSlotId,
      subject: readOptionalText(formData, "subject") ?? null,
      bodyText,
      strategyNote,
      userId: auth.user?.userId,
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not save that draft edit.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Reply draft saved.");
}


export async function createSequenceInboxDraftAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const artifactType = formData.get("artifactType");
  const targetStepNumberValue = formData.get("targetStepNumber");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof artifactType !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, and artifact are required.");
  }

  const auth = await getServerAuthContext();
  const targetStepNumber =
    typeof targetStepNumberValue === "string" && targetStepNumberValue.trim() !== ""
      ? Number(targetStepNumberValue)
      : undefined;

  let successMessage = "Draft created in Gmail.";

  try {
    const result = await createSequenceDraftInInbox({
      workspaceId,
      campaignId,
      prospectId,
      artifactType: artifactType as "sequence_initial_email" | "sequence_follow_up_step",
      targetStepNumber,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });

    successMessage =
      result.status === "existing" ? "Draft already available in Gmail." : "Draft created in Gmail.";
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not create that Gmail draft.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, successMessage);
}

export async function createReplyInboxDraftAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const targetSlotId = formData.get("targetSlotId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof targetSlotId !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, and target slot are required.");
  }

  const auth = await getServerAuthContext();

  let successMessage = "Draft reply created in Gmail.";

  try {
    const result = await createReplyDraftInInbox({
      workspaceId,
      campaignId,
      prospectId,
      targetSlotId,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });

    successMessage =
      result.status === "existing" ? "Draft already available in Gmail." : "Draft reply created in Gmail.";
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not create that Gmail draft reply.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, successMessage);
}


export async function markOutboundMessageSentAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");
  const messageId = formData.get("messageId");
  const sendMode = formData.get("sendMode");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string" ||
    typeof messageId !== "string"
  ) {
    throw new Error("Workspace, campaign, prospect, and message are required.");
  }

  const auth = await getServerAuthContext();

  try {
    await markProspectThreadMessageSent({
      workspaceId,
      campaignId,
      prospectId,
      messageId,
      mode:
        sendMode === "manual" || sendMode === "inferred"
          ? sendMode
          : undefined,
      providerMessageId: readOptionalText(formData, "providerMessageId") ?? null,
      providerThreadId: readOptionalText(formData, "providerThreadId") ?? null,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectWithError(
      `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
      error,
      "We could not update that send state.",
    );
  }

  redirectToProspect(workspaceId, campaignId, prospectId, "Message marked as sent.");
}
