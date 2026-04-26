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
  createSenderProfileForWorkspace,
  updateSenderProfileForWorkspace,
} from "../../../lib/server/sender-profiles";

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

export type SenderProfileActionData = {
  senderProfileId: string;
  workspaceId: string;
};

export async function createSenderProfileAction(
  formData: FormData,
): Promise<ActionResult<SenderProfileActionData>> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return actionError(
      new Error("Workspace id is required."),
      "Select a workspace and try again.",
    );
  }

  const auth = await getServerAuthContext();
  const requestId = randomUUID();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const created = await createSenderProfileForWorkspace({
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
    return actionOk({ senderProfileId: created.id, workspaceId });
  } catch (error) {
    return actionError(
      error,
      "We could not create that sender profile. Please review the form and try again.",
    );
  }
}

export async function updateSenderProfileAction(
  formData: FormData,
): Promise<ActionResult<SenderProfileActionData>> {
  const workspaceId = formData.get("workspaceId");
  const senderProfileId = formData.get("senderProfileId");

  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return actionError(
      new Error("Workspace id is required."),
      "Select a workspace and try again.",
    );
  }
  if (typeof senderProfileId !== "string" || senderProfileId.length === 0) {
    return actionError(
      new Error("Sender profile id is required."),
      "That sender profile could not be found.",
    );
  }

  const auth = await getServerAuthContext();
  const requestId = randomUUID();

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const updated = await updateSenderProfileForWorkspace({
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

    revalidatePath("/app/sender-profiles");
    revalidatePath(`/app/sender-profiles/${senderProfileId}`);
    return actionOk({ senderProfileId: updated.id, workspaceId });
  } catch (error) {
    return actionError(
      error,
      "We could not save that sender profile. Please try again.",
    );
  }
}
