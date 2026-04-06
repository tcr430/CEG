"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getWorkspaceAppContext } from "../../../lib/server/auth";
import { requestWorkspaceDeletion } from "../../../lib/server/data-handling";
import { submitWorkspaceFeedback } from "../../../lib/server/feedback";
import { importRecentThreadsFromGmail } from "../../../lib/server/inbox/service";
import { updateInstitutionalControls } from "../../../lib/server/institutional-controls";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";
import {
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  updateWorkspaceProfileSettings,
} from "../../../lib/server/workspace-team";

function redirectSettingsError(workspaceId: string, error: unknown, fallbackMessage: string) {
  redirect(
    `/app/settings?workspace=${workspaceId}&error=${encodeUserFacingError(error, fallbackMessage)}`,
  );
}

export async function submitWorkspaceFeedbackAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const pagePath = formData.get("pagePath");
  const category = formData.get("category");
  const message = formData.get("message");

  if (
    typeof workspaceId !== "string" ||
    typeof pagePath !== "string" ||
    typeof category !== "string" ||
    typeof message !== "string"
  ) {
    throw new Error("Workspace, page path, category, and feedback message are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await submitWorkspaceFeedback({
      workspaceId,
      pagePath,
      category: category as "bug" | "workflow" | "output_quality" | "billing" | "other",
      message,
      userId: context.user.userId,
      userEmail: context.user.email ?? "",
      userName: null,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not submit that feedback right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Feedback%20received.`);
}

export async function importRecentGmailThreadsAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const inboxAccountId = formData.get("inboxAccountId");
  const maxResultsValue = formData.get("maxResults");

  if (
    typeof workspaceId !== "string" ||
    typeof inboxAccountId !== "string"
  ) {
    throw new Error("Workspace and inbox account are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const parsedMaxResults =
    typeof maxResultsValue === "string" && maxResultsValue.trim().length > 0
      ? Number.parseInt(maxResultsValue, 10)
      : 10;
  const maxResults =
    Number.isNaN(parsedMaxResults) || parsedMaxResults <= 0
      ? 10
      : Math.min(parsedMaxResults, 25);

  try {
    const result = await importRecentThreadsFromGmail({
      workspaceId,
      inboxAccountId,
      userId: context.user.userId,
      requestId: randomUUID(),
      maxResults,
    });

    revalidatePath(`/app/settings?workspace=${workspaceId}`);
    redirect(
      `/app/settings?workspace=${workspaceId}&success=${encodeURIComponent(`Imported ${result.importedThreadCount} Gmail threads, stored ${result.importedMessageCount} new messages, and auto-analyzed ${result.analyzedReplyCount} reply threads.`)}`,
    );
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not import recent Gmail threads right now.");
  }
}

export async function updateWorkspaceProfileAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const name = formData.get("name");
  const description = formData.get("description");
  const websiteUrl = formData.get("websiteUrl");
  const companyName = formData.get("companyName");
  const supportEmail = formData.get("supportEmail");

  if (typeof workspaceId !== "string" || typeof name !== "string") {
    throw new Error("Workspace and name are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);
  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await updateWorkspaceProfileSettings({
      workspaceId,
      actorUserId: context.user.userId,
      actorMembership: context.workspace,
      name,
      profile: {
        description: typeof description === "string" && description.trim().length > 0 ? description : null,
        websiteUrl: typeof websiteUrl === "string" && websiteUrl.trim().length > 0 ? websiteUrl : null,
        companyName: typeof companyName === "string" && companyName.trim().length > 0 ? companyName : null,
        supportEmail: typeof supportEmail === "string" && supportEmail.trim().length > 0 ? supportEmail : null,
      },
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not update workspace settings right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Workspace%20settings%20updated.`);
}

export async function updateInstitutionalControlsAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const dataRetentionPreference = formData.get("dataRetentionPreference");
  const dataRetentionNotes = formData.get("dataRetentionNotes");
  const requestContactChannel = formData.get("requestContactChannel");
  const exportRequestsVisible = formData.get("exportRequestsVisible") === "on";
  const deleteRequestsVisible = formData.get("deleteRequestsVisible") === "on";
  const auditVisibleToWorkspaceAdmins = formData.get("auditVisibleToWorkspaceAdmins") === "on";
  const configurationSummaryVisible = formData.get("configurationSummaryVisible") === "on";

  if (
    typeof workspaceId !== "string" ||
    (dataRetentionPreference !== "standard" &&
      dataRetentionPreference !== "minimized" &&
      dataRetentionPreference !== "extended")
  ) {
    throw new Error("Workspace and data retention preference are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);
  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await updateInstitutionalControls({
      workspaceId,
      actorUserId: context.user.userId,
      actorMembership: context.workspace,
      actorEmail: context.user.email ?? "",
      requestId: randomUUID(),
      controls: {
        dataRetention: {
          preference: dataRetentionPreference,
          notes:
            typeof dataRetentionNotes === "string" && dataRetentionNotes.trim().length > 0
              ? dataRetentionNotes
              : null,
          updatedAt: new Date(),
        },
        requestVisibility: {
          exportRequestsVisible,
          deleteRequestsVisible,
          contactChannel:
            typeof requestContactChannel === "string" && requestContactChannel.trim().length > 0
              ? requestContactChannel
              : null,
        },
        auditAccess: {
          visibleToWorkspaceAdmins: auditVisibleToWorkspaceAdmins,
          internalSupportVisible: false,
          notes: null,
        },
        providerVisibility: {
          configurationSummaryVisible,
        },
      },
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not update institutional controls right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Institutional%20controls%20updated.`);
}

export async function requestWorkspaceDeletionAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const confirmationLabel = formData.get("confirmationLabel");
  const reason = formData.get("reason");

  if (typeof workspaceId !== "string" || typeof confirmationLabel !== "string") {
    throw new Error("Workspace and confirmation label are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);
  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await requestWorkspaceDeletion({
      workspaceId,
      actorUserId: context.user.userId,
      actorEmail: context.user.email ?? "",
      actorMembership: context.workspace,
      confirmationLabel,
      reason: typeof reason === "string" ? reason : null,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not record that deletion request right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Workspace%20deletion%20request%20recorded.`);
}

export async function inviteWorkspaceMemberAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const email = formData.get("email");
  const role = formData.get("role");

  if (
    typeof workspaceId !== "string" ||
    typeof email !== "string" ||
    (role !== "admin" && role !== "member")
  ) {
    throw new Error("Workspace, email, and role are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);
  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await inviteWorkspaceMember({
      workspaceId,
      actorUserId: context.user.userId,
      actorEmail: context.user.email ?? "",
      actorMembership: context.workspace,
      email,
      role,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not send that workspace invite right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Workspace%20invite%20saved.`);
}

export async function updateWorkspaceMemberRoleAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const targetUserId = formData.get("targetUserId");
  const role = formData.get("role");

  if (
    typeof workspaceId !== "string" ||
    typeof targetUserId !== "string" ||
    (role !== "admin" && role !== "member")
  ) {
    throw new Error("Workspace, member, and role are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);
  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await updateWorkspaceMemberRole({
      workspaceId,
      actorUserId: context.user.userId,
      actorMembership: context.workspace,
      targetUserId,
      role,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not update that workspace role right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Workspace%20role%20updated.`);
}

export async function removeWorkspaceMemberAction(formData: FormData) {
  const workspaceId = formData.get("workspaceId");
  const targetUserId = formData.get("targetUserId");

  if (typeof workspaceId !== "string" || typeof targetUserId !== "string") {
    throw new Error("Workspace and member are required.");
  }

  const context = await getWorkspaceAppContext(workspaceId);
  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  try {
    await removeWorkspaceMember({
      workspaceId,
      actorUserId: context.user.userId,
      actorMembership: context.workspace,
      targetUserId,
      requestId: randomUUID(),
    });
  } catch (error) {
    redirectSettingsError(workspaceId, error, "We could not remove that workspace member right now.");
  }

  revalidatePath(`/app/settings?workspace=${workspaceId}`);
  redirect(`/app/settings?workspace=${workspaceId}&success=Workspace%20member%20removed.`);
}

