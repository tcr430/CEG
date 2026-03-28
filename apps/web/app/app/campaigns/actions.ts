"use server";

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
  analyzeLatestReplyForProspect,
  appendLatestSequenceMessagesToProspectThread,
  createInboundReplyForProspect,
  createManualOutboundMessageForProspect,
  generateDraftRepliesForProspect,
  regenerateDraftReplyForProspect,
} from "../../../lib/server/replies";
import { generateSequenceForProspect } from "../../../lib/server/sequences";

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

function revalidateProspectPaths(workspaceId: string, campaignId: string, prospectId: string) {
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath(`/app/campaigns/${campaignId}/prospects/${prospectId}`);
  redirect(`/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`);
}

export async function createCampaignAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace id is required.");
  }

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
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "active"
      | "paused"
      | "completed"
      | "archived",
  });

  revalidatePath("/app/campaigns");
  redirect(`/app/campaigns?workspace=${workspaceId}`);
}

export async function updateCampaignAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");

  if (typeof workspaceId !== "string" || typeof campaignId !== "string") {
    throw new Error("Workspace id and campaign id are required.");
  }

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
    status: String(formData.get("status") ?? "draft") as
      | "draft"
      | "active"
      | "paused"
      | "completed"
      | "archived",
  });

  revalidatePath("/app/campaigns");
  redirect(`/app/campaigns/${campaignId}?workspace=${workspaceId}`);
}

export async function createProspectAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const campaignId = formData.get("campaignId");

  if (typeof workspaceId !== "string" || typeof campaignId !== "string") {
    throw new Error("Workspace id and campaign id are required.");
  }

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
  });

  revalidatePath(`/app/campaigns/${campaignId}`);
  redirect(`/app/campaigns/${campaignId}?workspace=${workspaceId}`);
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

  await runProspectResearchForCampaign({
    workspaceId,
    campaignId,
    prospectId,
    websiteUrl,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await generateSequenceForProspect({
    workspaceId,
    campaignId,
    prospectId,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await createInboundReplyForProspect({
    workspaceId,
    campaignId,
    prospectId,
    subject: readOptionalText(formData, "subject") ?? null,
    bodyText,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await createManualOutboundMessageForProspect({
    workspaceId,
    campaignId,
    prospectId,
    subject: readOptionalText(formData, "subject") ?? null,
    bodyText,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await appendLatestSequenceMessagesToProspectThread({
    workspaceId,
    campaignId,
    prospectId,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await analyzeLatestReplyForProspect({
    workspaceId,
    campaignId,
    prospectId,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await generateDraftRepliesForProspect({
    workspaceId,
    campaignId,
    prospectId,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
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

  await regenerateDraftReplyForProspect({
    workspaceId,
    campaignId,
    prospectId,
    targetSlotId,
    feedback,
    userId: auth.user?.userId,
  });

  revalidateProspectPaths(workspaceId, campaignId, prospectId);
}
