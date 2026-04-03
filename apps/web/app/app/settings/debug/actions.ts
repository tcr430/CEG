"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import {
  getWorkspaceDemoSeedStatus,
  seedWorkspaceDemoData,
} from "../../../../lib/server/demo-seed";
import {
  canAccessInternalAdminView,
  getInternalAdminAllowedEmails,
  isInternalAdminEnabled,
} from "../../../../lib/internal-admin-access";
import { encodeUserFacingError } from "../../../../lib/server/user-facing-errors";

async function requireInternalAdminWorkspaceAccess(workspaceId: string) {
  const context = await getWorkspaceAppContext(workspaceId);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;
  const canAccess =
    isInternalAdminEnabled() &&
    canAccessInternalAdminView({
      email: context.user.email,
      membership: workspace,
      allowedEmails: getInternalAdminAllowedEmails(),
    });

  if (!canAccess) {
    redirect(
      `/app/settings?workspace=${workspaceId}&error=${encodeURIComponent("Internal admin access is not available for this workspace.")}`,
    );
  }

  return {
    ...context,
    workspace,
    needsWorkspaceSelection: false as const,
  };
}

export async function seedDemoWorkspaceAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace id is required.");
  }

  const requestId = randomUUID();
  const context = await requireInternalAdminWorkspaceAccess(workspaceId);

  try {
    const result = await seedWorkspaceDemoData({
      workspaceId,
      userId: context.user.userId,
      workspacePlanCode: context.workspace.billingPlanCode,
      requestId,
    });

    revalidatePath("/app");
    revalidatePath("/app/campaigns");
    revalidatePath("/app/sender-profiles");
    revalidatePath("/app/settings/debug");

    const message =
      result.status === "already_seeded"
        ? `Demo data version ${result.version} is already loaded for this workspace.`
        : `Demo data loaded. ${result.summary.campaignCount} campaigns and ${result.summary.prospectCount} prospects are ready.`;

    redirect(`/app/settings/debug?workspace=${workspaceId}&success=${encodeURIComponent(message)}`);
  } catch (error) {
    redirect(
      `/app/settings/debug?workspace=${workspaceId}&error=${encodeUserFacingError(
        error,
        "We could not load demo data for this workspace.",
      )}`,
    );
  }
}

export async function refreshDemoSeedStatusAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    throw new Error("Workspace id is required.");
  }

  await requireInternalAdminWorkspaceAccess(workspaceId);
  const status = await getWorkspaceDemoSeedStatus(workspaceId);
  redirect(
    `/app/settings/debug?workspace=${workspaceId}&notice=${encodeURIComponent(
      status.version
        ? `Demo seed version ${status.version} was loaded${status.loadedAt ? ` at ${status.loadedAt}.` : "."}`
        : "No demo seed has been loaded for this workspace yet.",
    )}`,
  );
}
