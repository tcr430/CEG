"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionResult } from "../../../lib/action-result";
import {
  actionError,
  actionOk,
} from "../../../lib/server/action-result";
import { getWorkspaceAppContext } from "../../../lib/server/auth";
import {
  assertWorkspaceSubscriptionActive,
  getWorkspaceBillingState,
} from "../../../lib/server/billing";
import {
  createCampaignForWorkspace,
  createProspectForCampaign,
  listCampaignsForWorkspace,
} from "../../../lib/server/campaigns";
import {
  persistWorkspaceOnboardingState,
  reconcileWorkspaceOnboardingState,
} from "../../../lib/server/onboarding";
import {
  createSenderProfileForWorkspace,
  listSenderProfilesForWorkspace,
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

async function requireOnboardingWorkspace(workspaceId: string) {
  const context = await getWorkspaceAppContext(workspaceId);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  return {
    ...context,
    workspace: context.workspace,
  };
}

function revalidateOnboarding(workspaceId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/onboarding?workspace=${workspaceId}`);
  revalidatePath(`/app/campaigns?workspace=${workspaceId}`);
  revalidatePath(`/app/sender-profiles?workspace=${workspaceId}`);
}

export async function confirmWorkspaceOnboardingAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return actionError(
      new Error("Workspace id is required."),
      "We could not confirm the workspace right now.",
    );
  }

  const context = await requireOnboardingWorkspace(workspaceId);

  try {
    await persistWorkspaceOnboardingState({
      membership: context.workspace,
      userId: context.user.userId,
      patch: {
        workspaceConfirmedAt: new Date(),
        skippedAt: null,
      },
    });

    revalidateOnboarding(workspaceId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not confirm the workspace right now.");
  }
}

export async function selectOnboardingUserTypeAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");
  const userType = formData.get("userType");

  if (typeof workspaceId !== "string" || typeof userType !== "string") {
    return actionError(
      new Error("Workspace id and user type are required."),
      "We could not save that onboarding choice.",
    );
  }

  const context = await requireOnboardingWorkspace(workspaceId);

  try {
    if (userType !== "basic") {
      const billing = await getWorkspaceBillingState({
        workspaceId,
        workspacePlanCode: context.workspace.billingPlanCode,
      });

      if (!billing.features.senderAwareProfiles.allowed) {
        throw new Error(
          billing.features.senderAwareProfiles.reason ??
            "Current plan does not include sender-aware profiles.",
        );
      }
    }

    await persistWorkspaceOnboardingState({
      membership: context.workspace,
      userId: context.user.userId,
      patch: {
        workspaceConfirmedAt: new Date(),
        selectedUserType: userType as "sdr" | "saas_founder" | "agency" | "basic",
        skippedAt: null,
      },
    });

    revalidateOnboarding(workspaceId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not save that onboarding choice.");
  }
}

export async function skipOnboardingAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return actionError(
      new Error("Workspace id is required."),
      "We could not pause onboarding right now.",
    );
  }

  const context = await requireOnboardingWorkspace(workspaceId);

  try {
    await persistWorkspaceOnboardingState({
      membership: context.workspace,
      userId: context.user.userId,
      patch: {
        status: "skipped",
        skippedAt: new Date(),
      },
    });

    revalidatePath("/app");
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not pause onboarding right now.");
  }
}

export async function createOnboardingSenderProfileAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");
  const senderType = formData.get("senderType");

  if (typeof workspaceId !== "string" || typeof senderType !== "string") {
    return actionError(
      new Error("Workspace id and sender type are required."),
      "We could not create the sender profile yet.",
    );
  }

  const context = await requireOnboardingWorkspace(workspaceId);

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    await createSenderProfileForWorkspace({
      workspaceId,
      name: String(formData.get("name") ?? ""),
      senderType: senderType as "sdr" | "saas_founder" | "agency",
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
      metadata: {
        onboardingCreated: true,
      },
      status: "active",
      isDefault: true,
      workspacePlanCode: context.workspace.billingPlanCode,
      userId: context.user.userId,
      requestId: randomUUID(),
    });

    await reconcileWorkspaceOnboardingState({
      membership: context.workspace,
      userId: context.user.userId,
    });

    revalidateOnboarding(workspaceId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not create the sender profile yet.");
  }
}

export async function createOnboardingCampaignAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return actionError(
      new Error("Workspace id is required."),
      "We could not create the first campaign yet.",
    );
  }

  const context = await requireOnboardingWorkspace(workspaceId);

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const senderProfiles = await listSenderProfilesForWorkspace(workspaceId);
    const defaultSenderProfile =
      senderProfiles.find((profile) => profile.isDefault) ??
      senderProfiles[0] ??
      null;

    await createCampaignForWorkspace({
      workspaceId,
      senderProfileId: defaultSenderProfile?.id ?? null,
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
      settings: {
        onboardingCreated: true,
      },
      status: "draft",
      userId: context.user.userId,
      requestId: randomUUID(),
    });

    await reconcileWorkspaceOnboardingState({
      membership: context.workspace,
      userId: context.user.userId,
    });

    revalidateOnboarding(workspaceId);
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not create the first campaign yet.");
  }
}

export async function createOnboardingProspectAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return actionError(
      new Error("Workspace id is required."),
      "We could not add the first prospect yet.",
    );
  }

  const context = await requireOnboardingWorkspace(workspaceId);

  try {
    await assertWorkspaceSubscriptionActive({ workspaceId });
    const campaigns = await listCampaignsForWorkspace(workspaceId);
    const firstCampaign = campaigns[0];

    if (firstCampaign === undefined) {
      throw new Error("Create a campaign before adding a prospect.");
    }

    await createProspectForCampaign({
      workspaceId,
      campaignId: firstCampaign.id,
      companyName: readOptionalText(formData, "companyName"),
      companyWebsite: readOptionalText(formData, "companyWebsite"),
      contactName: readOptionalText(formData, "contactName"),
      email: readOptionalText(formData, "email"),
      status: "new",
      metadata: {
        onboardingCreated: true,
      },
      userId: context.user.userId,
      requestId: randomUUID(),
    });

    await reconcileWorkspaceOnboardingState({
      membership: context.workspace,
      userId: context.user.userId,
    });

    revalidatePath("/app");
    return actionOk();
  } catch (error) {
    return actionError(error, "We could not add the first prospect yet.");
  }
}
