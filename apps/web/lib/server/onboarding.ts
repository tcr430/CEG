import type { WorkspaceMembership } from "@ceg/auth";
import {
  type SenderProfileType,
  type WorkspaceOnboardingState,
  workspaceOnboardingStateSchema,
} from "@ceg/validation";

import { listCampaignsForWorkspace, listProspectsForCampaign } from "./campaigns";
import { getWorkspaceBillingState } from "./billing";
import {
  buildOnboardingStepViews,
  computeCurrentOnboardingStep,
  createOnboardingStatePatch,
  hasMeaningfulOnboardingSetup,
  type OnboardingStepView,
} from "./onboarding-state";
import { listSenderProfilesForWorkspace } from "./sender-profiles";
import {
  ensureWorkspaceRecordForMembership,
  updateWorkspaceSettings,
} from "./workspaces";

export type WorkspaceOnboardingSummary = {
  workspaceId: string;
  workspaceName: string;
  state: WorkspaceOnboardingState;
  selectedUserType: SenderProfileType | null;
  senderProfileCount: number;
  campaignCount: number;
  prospectCount: number;
  hasMeaningfulSetup: boolean;
  isComplete: boolean;
  isSkipped: boolean;
  shouldRedirectToOnboarding: boolean;
  nextStep: OnboardingStepView["id"] | null;
  steps: OnboardingStepView[];
  billing: Awaited<ReturnType<typeof getWorkspaceBillingState>>;
};

function readWorkspaceOnboardingState(
  settings: Record<string, unknown>,
): WorkspaceOnboardingState {
  const onboarding =
    typeof settings.onboarding === "object" && settings.onboarding !== null
      ? settings.onboarding
      : {};

  return workspaceOnboardingStateSchema.parse(onboarding);
}

async function listProspectCountForWorkspace(
  workspaceId: string,
  campaignIds: string[],
): Promise<number> {
  const prospects = await Promise.all(
    campaignIds.map((campaignId) =>
      listProspectsForCampaign(workspaceId, campaignId),
    ),
  );

  return prospects.reduce((total, items) => total + items.length, 0);
}

export async function getWorkspaceOnboardingSummary(input: {
  membership: WorkspaceMembership;
  userId?: string | null;
}): Promise<WorkspaceOnboardingSummary> {
  const workspace = await ensureWorkspaceRecordForMembership({
    membership: input.membership,
    userId: input.userId,
  });
  const [senderProfiles, campaigns, billing] = await Promise.all([
    listSenderProfilesForWorkspace(input.membership.workspaceId),
    listCampaignsForWorkspace(input.membership.workspaceId),
    getWorkspaceBillingState({
      workspaceId: input.membership.workspaceId,
      workspacePlanCode: input.membership.billingPlanCode,
    }),
  ]);
  const prospectCount = await listProspectCountForWorkspace(
    input.membership.workspaceId,
    campaigns.map((campaign) => campaign.id),
  );
  const state = readWorkspaceOnboardingState(workspace.settings);
  const nextStep = computeCurrentOnboardingStep({
    state,
    senderProfileCount: senderProfiles.length,
    campaignCount: campaigns.length,
    prospectCount,
  });
  const meaningfulSetup = hasMeaningfulOnboardingSetup({
    state,
    senderProfileCount: senderProfiles.length,
    campaignCount: campaigns.length,
    prospectCount,
  });
  const isComplete = nextStep === null;
  const isSkipped = state.status === "skipped";

  return {
    workspaceId: input.membership.workspaceId,
    workspaceName:
      workspace.name ??
      input.membership.workspaceName ??
      input.membership.workspaceSlug ??
      input.membership.workspaceId,
    state,
    selectedUserType: state.selectedUserType ?? null,
    senderProfileCount: senderProfiles.length,
    campaignCount: campaigns.length,
    prospectCount,
    hasMeaningfulSetup: meaningfulSetup,
    isComplete,
    isSkipped,
    shouldRedirectToOnboarding:
      !isComplete &&
      !isSkipped &&
      (state.status === "in_progress" || meaningfulSetup === false),
    nextStep,
    steps: buildOnboardingStepViews({
      state,
      senderProfileCount: senderProfiles.length,
      campaignCount: campaigns.length,
      prospectCount,
    }),
    billing,
  };
}

export async function persistWorkspaceOnboardingState(input: {
  membership: WorkspaceMembership;
  patch: Partial<WorkspaceOnboardingState>;
  userId?: string | null;
}): Promise<WorkspaceOnboardingSummary> {
  const workspace = await ensureWorkspaceRecordForMembership({
    membership: input.membership,
    userId: input.userId,
  });
  const current = readWorkspaceOnboardingState(workspace.settings);
  const currentSummary = await getWorkspaceOnboardingSummary(input);
  const next = createOnboardingStatePatch({
    current,
    patch: input.patch,
    senderProfileCount: currentSummary.senderProfileCount,
    campaignCount: currentSummary.campaignCount,
    prospectCount: currentSummary.prospectCount,
  });

  await updateWorkspaceSettings({
    workspaceId: workspace.id,
    settings: {
      ...workspace.settings,
      onboarding: next,
    },
  });

  return getWorkspaceOnboardingSummary(input);
}

export async function reconcileWorkspaceOnboardingState(input: {
  membership: WorkspaceMembership;
  userId?: string | null;
}): Promise<WorkspaceOnboardingSummary> {
  const workspace = await ensureWorkspaceRecordForMembership({
    membership: input.membership,
    userId: input.userId,
  });
  const current = readWorkspaceOnboardingState(workspace.settings);
  const summary = await getWorkspaceOnboardingSummary(input);
  const next = createOnboardingStatePatch({
    current,
    patch: {},
    senderProfileCount: summary.senderProfileCount,
    campaignCount: summary.campaignCount,
    prospectCount: summary.prospectCount,
  });

  if (JSON.stringify(next) === JSON.stringify(current)) {
    return summary;
  }

  await updateWorkspaceSettings({
    workspaceId: workspace.id,
    settings: {
      ...workspace.settings,
      onboarding: next,
    },
  });

  return getWorkspaceOnboardingSummary(input);
}
