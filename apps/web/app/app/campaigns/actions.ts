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

  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath(`/app/campaigns/${campaignId}/prospects/${prospectId}`);
  redirect(
    `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
  );
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

  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath(`/app/campaigns/${campaignId}/prospects/${prospectId}`);
  redirect(
    `/app/campaigns/${campaignId}/prospects/${prospectId}?workspace=${workspaceId}`,
  );
}
