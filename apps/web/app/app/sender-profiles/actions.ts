"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  createSenderProfileForWorkspace,
  updateSenderProfileForWorkspace,
} from "../../../lib/server/sender-profiles";
import { getServerAuthContext } from "../../../lib/server/auth";

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
  return auth.user?.memberships.find((membership) => membership.workspaceId === workspaceId)
    ?.billingPlanCode;
}

export async function createSenderProfileAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace id is required.");
  }

  const auth = await getServerAuthContext();
  const requestId = randomUUID();

  await createSenderProfileForWorkspace({
    workspaceId,
    name: String(formData.get("name") ?? ""),
    senderType: String(formData.get("senderType") ?? "basic") as
      | "sdr"
      | "saas_founder"
      | "agency"
      | "basic",
    companyName: readOptionalText(formData, "companyName"),
    productDescription: readOptionalText(formData, "productDescription"),
    targetCustomer: readOptionalText(formData, "targetCustomer"),
    valueProposition: readOptionalText(formData, "valueProposition"),
    differentiation: readOptionalText(formData, "differentiation"),
    proofPoints: readList(formData, "proofPoints"),
    goals: readList(formData, "goals"),
    tonePreferences: {
      style: readOptionalText(formData, "toneStyle"),
      do: readList(formData, "toneDo"),
      avoid: readList(formData, "toneAvoid"),
      notes: readOptionalText(formData, "toneNotes"),
    },
    metadata: {},
    status: String(formData.get("status") ?? "active") as
      | "draft"
      | "active"
      | "archived",
    isDefault: formData.get("isDefault") === "on",
    workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
    userId: auth.user?.userId,
    requestId,
  });

  revalidatePath("/app/sender-profiles");
  redirect(`/app/sender-profiles?workspace=${workspaceId}`);
}

export async function updateSenderProfileAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const senderProfileId = formData.get("senderProfileId");

  if (typeof workspaceId !== "string" || typeof senderProfileId !== "string") {
    throw new Error("Workspace id and sender profile id are required.");
  }

  const auth = await getServerAuthContext();
  const requestId = randomUUID();

  await updateSenderProfileForWorkspace({
    senderProfileId,
    workspaceId,
    name: String(formData.get("name") ?? ""),
    senderType: String(formData.get("senderType") ?? "basic") as
      | "sdr"
      | "saas_founder"
      | "agency"
      | "basic",
    companyName: readOptionalText(formData, "companyName"),
    productDescription: readOptionalText(formData, "productDescription"),
    targetCustomer: readOptionalText(formData, "targetCustomer"),
    valueProposition: readOptionalText(formData, "valueProposition"),
    differentiation: readOptionalText(formData, "differentiation"),
    proofPoints: readList(formData, "proofPoints"),
    goals: readList(formData, "goals"),
    tonePreferences: {
      style: readOptionalText(formData, "toneStyle"),
      do: readList(formData, "toneDo"),
      avoid: readList(formData, "toneAvoid"),
      notes: readOptionalText(formData, "toneNotes"),
    },
    metadata: {},
    status: String(formData.get("status") ?? "active") as
      | "draft"
      | "active"
      | "archived",
    isDefault: formData.get("isDefault") === "on",
    workspacePlanCode: readWorkspacePlanCode(auth, workspaceId),
    requestId,
  });

  revalidatePath("/app/sender-profiles");
  redirect(`/app/sender-profiles/${senderProfileId}?workspace=${workspaceId}`);
}
