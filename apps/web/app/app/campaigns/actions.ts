"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "../../../lib/action-result";
import {
  actionError,
  actionOk,
} from "../../../lib/server/action-result";
import { getServerAuthContext } from "../../../lib/server/auth";
import { assertWorkspaceSubscriptionActive } from "../../../lib/server/billing";
import {
  createCampaignForWorkspace,
  createProspectForCampaign,
  updateCampaignForWorkspace,
} from "../../../lib/server/campaigns";
import {
  createReplyDraftInInbox,
  createSequenceDraftInInbox,
  markProspectThreadMessageSent,
} from "../../../lib/server/inbox-drafts";
import { runProspectResearchForCampaign } from "../../../lib/server/prospect-research";
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

function readWorkspacePlanCode(
  auth: Awaited<ReturnType<typeof getServerAuthContext>>,
  workspaceId: string,
) {
  return auth.user?.memberships.find(
    (membership) => membership.workspaceId === workspaceId,
  )?.billingPlanCode;
}

function revalidateProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
) {
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath(`/app/campaigns/${campaignId}/prospects/${prospectId}`);
}

export type CampaignActionData = {
  campaignId: string;
  workspaceId: string;
};

export async function createCampaignAction(
  formData: FormData,
): Promise<ActionResult<CampaignActionData>> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return actionError(
      new Error("Workspace id is required."),
      "Select a workspace and try again.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const created = await createCampaignForWorkspace({
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

    revalidatePath("/app/campaigns");
    return actionOk({ campaignId: created.id, workspaceId });
  } catch (error) {
    return actionError(
      error,
      "We could not create that campaign. Please review the brief and try again.",
    );
  }
}

export async function updateCampaignAction(
  formData: FormData,
): Promise<ActionResult<CampaignActionData>> {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");

  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return actionError(
      new Error("Workspace id is required."),
      "Select a workspace and try again.",
    );
  }
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return actionError(
      new Error("Campaign id is required."),
      "That campaign could not be found.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const updated = await updateCampaignForWorkspace({
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

    revalidatePath("/app/campaigns");
    revalidatePath(`/app/campaigns/${campaignId}`);
    return actionOk({ campaignId: updated.id, workspaceId });
  } catch (error) {
    return actionError(
      error,
      "We could not save that campaign. Please try again.",
    );
  }
}

export type ProspectActionData = {
  prospectId: string;
  campaignId: string;
  workspaceId: string;
};

export async function createProspectAction(
  formData: FormData,
): Promise<ActionResult<ProspectActionData>> {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");

  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return actionError(
      new Error("Workspace id is required."),
      "Select a workspace and try again.",
    );
  }
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return actionError(
      new Error("Campaign id is required."),
      "That campaign could not be found.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const created = await createProspectForCampaign({
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

    revalidatePath(`/app/campaigns/${campaignId}`);
    return actionOk({
      prospectId: created.id,
      campaignId,
      workspaceId,
    });
  } catch (error) {
    return actionError(
      error,
      "We could not add that prospect. Please review the details and try again.",
    );
  }
}

export async function runProspectResearchAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, and website URL are required."),
      "We could not complete website research for this prospect.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await runProspectResearchForCampaign({
      workspaceId,
      campaignId,
      prospectId,
      websiteUrl,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(
      error,
      "We could not complete website research for this prospect.",
    );
  }
}

export async function generateProspectSequenceAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    return actionError(
      new Error("Workspace, campaign, and prospect are required."),
      "We could not generate a sequence for this prospect yet.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await generateSequenceForProspect({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(
      error,
      "We could not generate a sequence for this prospect yet.",
    );
  }
}

export async function createInboundReplyAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, and reply body are required."),
      "We could not save that inbound reply.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
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

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not save that inbound reply.");
  }
}

export async function createManualOutboundMessageAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, and outbound body are required."),
      "We could not save that outbound draft.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await createManualOutboundMessageForProspect({
      workspaceId,
      campaignId,
      prospectId,
      subject: readOptionalText(formData, "subject") ?? null,
      bodyText,
      userId: auth.user?.userId,
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not save that outbound draft.");
  }
}

export async function appendGeneratedSequenceMessagesAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    return actionError(
      new Error("Workspace, campaign, and prospect are required."),
      "We could not add the latest sequence to the thread.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await appendLatestSequenceMessagesToProspectThread({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(
      error,
      "We could not add the latest sequence to the thread.",
    );
  }
}

export async function analyzeReplyAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    return actionError(
      new Error("Workspace, campaign, and prospect are required."),
      "We could not analyze that reply yet.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await analyzeLatestReplyForProspect({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not analyze that reply yet.");
  }
}

export async function generateReplyDraftsAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");
  const prospectId = formData.get("prospectId");

  if (
    typeof workspaceId !== "string" ||
    typeof campaignId !== "string" ||
    typeof prospectId !== "string"
  ) {
    return actionError(
      new Error("Workspace, campaign, and prospect are required."),
      "We could not generate reply drafts for that thread yet.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await generateDraftRepliesForProspect({
      workspaceId,
      campaignId,
      prospectId,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(
      error,
      "We could not generate reply drafts for that thread yet.",
    );
  }
}

export async function regenerateReplyDraftAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, target slot, and feedback are required."),
      "We could not regenerate that draft option.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await regenerateDraftReplyForProspect({
      workspaceId,
      campaignId,
      prospectId,
      targetSlotId,
      feedback,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not regenerate that draft option.");
  }
}

export async function regenerateSequencePartAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, target part, and feedback are required."),
      "We could not regenerate that sequence section.",
    );
  }

  const auth = await getServerAuthContext();
  const targetStepNumber =
    typeof targetStepNumberValue === "string" && targetStepNumberValue.trim() !== ""
      ? Number(targetStepNumberValue)
      : undefined;

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await regenerateSequencePartForProspect({
      workspaceId,
      campaignId,
      prospectId,
      targetPart: targetPart as
        | "subject_line"
        | "opener"
        | "initial_email"
        | "follow_up_step",
      targetStepNumber,
      feedback,
      userId: auth.user?.userId,
      workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not regenerate that sequence section.");
  }
}

export async function editSequenceStepAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Sequence edit fields are required."),
      "We could not save that sequence edit.",
    );
  }

  const auth = await getServerAuthContext();
  const targetStepNumber =
    typeof targetStepNumberValue === "string" && targetStepNumberValue.trim() !== ""
      ? Number(targetStepNumberValue)
      : undefined;

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
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

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not save that sequence edit.");
  }
}

export async function editReplyDraftAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Reply draft edit fields are required."),
      "We could not save that draft edit.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
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

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not save that draft edit.");
  }
}

export type CreateInboxDraftData = {
  status: "created" | "updated" | "existing";
};

export async function createSequenceInboxDraftAction(
  formData: FormData,
): Promise<ActionResult<CreateInboxDraftData>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, and artifact are required."),
      "We could not create that Gmail draft.",
    );
  }

  const auth = await getServerAuthContext();
  const targetStepNumber =
    typeof targetStepNumberValue === "string" && targetStepNumberValue.trim() !== ""
      ? Number(targetStepNumberValue)
      : undefined;

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const result = await createSequenceDraftInInbox({
      workspaceId,
      campaignId,
      prospectId,
      artifactType: artifactType as
        | "sequence_initial_email"
        | "sequence_follow_up_step",
      targetStepNumber,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk({ status: result.status });
  } catch (error) {
    return actionError(error, "We could not create that Gmail draft.");
  }
}

export async function createReplyInboxDraftAction(
  formData: FormData,
): Promise<ActionResult<CreateInboxDraftData>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, and target slot are required."),
      "We could not create that Gmail draft reply.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const result = await createReplyDraftInInbox({
      workspaceId,
      campaignId,
      prospectId,
      targetSlotId,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk({ status: result.status });
  } catch (error) {
    return actionError(error, "We could not create that Gmail draft reply.");
  }
}

export async function markOutboundMessageSentAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
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
    return actionError(
      new Error("Workspace, campaign, prospect, and message are required."),
      "We could not update that send state.",
    );
  }

  const auth = await getServerAuthContext();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await markProspectThreadMessageSent({
      workspaceId,
      campaignId,
      prospectId,
      messageId,
      mode:
        sendMode === "manual" || sendMode === "inferred" ? sendMode : undefined,
      providerMessageId: readOptionalText(formData, "providerMessageId") ?? null,
      providerThreadId: readOptionalText(formData, "providerThreadId") ?? null,
      userId: auth.user?.userId,
      requestId: randomUUID(),
    });

    revalidateProspect(workspaceId, campaignId, prospectId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not update that send state.");
  }
}
