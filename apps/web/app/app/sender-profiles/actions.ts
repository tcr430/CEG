"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  createSenderProfileForWorkspace,
  updateSenderProfileForWorkspace,
} from "../../../lib/server/sender-profiles";
import { getServerAuthContext } from "../../../lib/server/auth";
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

function readWorkspacePlanCode(
  auth: Awaited<ReturnType<typeof getServerAuthContext>>,
  workspaceId: string,
) {
  return auth.user?.memberships.find((membership) => membership.workspaceId === workspaceId)
    ?.billingPlanCode;
}

function redirectWithError(path: string, error: unknown, fallbackMessage: string) {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeUserFacingError(error, fallbackMessage)}`);
}

export async function createSenderProfileAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace id is required.");
  }

  const auth = await getServerAuthContext();
  const requestId = randomUUID();

  try {
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
  } catch (error) {
    redirectWithError(
      `/app/sender-profiles/new?workspace=${workspaceId}`,
      error,
      "We could not create that sender profile. Please review the form and try again.",
    );
  }

  revalidatePath("/app/sender-profiles");
  redirect(`/app/sender-profiles?workspace=${workspaceId}&success=Sender%20profile%20created.`);
}

export async function updateSenderProfileAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const senderProfileId = formData.get("senderProfileId");

  if (typeof workspaceId !== "string" || typeof senderProfileId !== "string") {
    throw new Error("Workspace id and sender profile id are required.");
  }

  const auth = await getServerAuthContext();
  const requestId = randomUUID();

  try {
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
      userId: auth.user?.userId,
      requestId,
    });
  } catch (error) {
    redirectWithError(
      `/app/sender-profiles/${senderProfileId}?workspace=${workspaceId}`,
      error,
      "We could not save that sender profile. Please try again.",
    );
  }

  revalidatePath("/app/sender-profiles");
  redirect(`/app/sender-profiles/${senderProfileId}?workspace=${workspaceId}&success=Sender%20profile%20updated.`);
}
