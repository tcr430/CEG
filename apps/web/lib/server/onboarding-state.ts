import type {
  OnboardingStepId,
  SenderProfileType,
  WorkspaceOnboardingState,
} from "@ceg/validation";

export type OnboardingStepView = {
  id: OnboardingStepId;
  label: string;
  description: string;
  status: "complete" | "current" | "upcoming";
};

export const onboardingSteps: Array<{
  id: OnboardingStepId;
  label: string;
  description: string;
}> = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Confirm the workspace you want to start with.",
  },
  {
    id: "user_type",
    label: "User type",
    description: "Choose the motion that best fits your outbound workflow.",
  },
  {
    id: "sender_profile",
    label: "Sender context",
    description: "Create a sender profile or continue with basic mode.",
  },
  {
    id: "campaign",
    label: "First campaign",
    description: "Capture your offer, ICP, tone, and framework.",
  },
  {
    id: "prospect",
    label: "First prospect",
    description: "Add one prospect so research and generation start from real data.",
  },
];

export function computeCurrentOnboardingStep(input: {
  state: WorkspaceOnboardingState;
  senderProfileCount: number;
  campaignCount: number;
  prospectCount: number;
}): OnboardingStepId | null {
  if (input.state.workspaceConfirmedAt == null) {
    return "workspace";
  }

  if (input.state.selectedUserType == null) {
    return "user_type";
  }

  const senderStepRequired = input.state.selectedUserType !== "basic";
  if (senderStepRequired && input.senderProfileCount === 0) {
    return "sender_profile";
  }

  if (input.campaignCount === 0) {
    return "campaign";
  }

  if (input.prospectCount === 0) {
    return "prospect";
  }

  return null;
}

export function hasMeaningfulOnboardingSetup(input: {
  state: WorkspaceOnboardingState;
  senderProfileCount: number;
  campaignCount: number;
  prospectCount: number;
}) {
  return (
    input.senderProfileCount > 0 ||
    input.campaignCount > 0 ||
    input.prospectCount > 0 ||
    input.state.selectedUserType === "basic"
  );
}

export function buildOnboardingStepViews(input: {
  state: WorkspaceOnboardingState;
  senderProfileCount: number;
  campaignCount: number;
  prospectCount: number;
}): OnboardingStepView[] {
  const currentStep = computeCurrentOnboardingStep(input);
  const senderStepRequired = input.state.selectedUserType !== "basic";

  return onboardingSteps.map((step) => {
    const complete =
      step.id === "workspace"
        ? input.state.workspaceConfirmedAt != null
        : step.id === "user_type"
          ? input.state.selectedUserType != null
          : step.id === "sender_profile"
            ? !senderStepRequired || input.senderProfileCount > 0
            : step.id === "campaign"
              ? input.campaignCount > 0
              : input.prospectCount > 0;

    return {
      ...step,
      status: complete
        ? "complete"
        : currentStep === step.id
          ? "current"
          : "upcoming",
    };
  });
}

export function createOnboardingStatePatch(input: {
  current: WorkspaceOnboardingState;
  patch: Partial<WorkspaceOnboardingState>;
  senderProfileCount: number;
  campaignCount: number;
  prospectCount: number;
}): WorkspaceOnboardingState {
  const next: WorkspaceOnboardingState = {
    ...input.current,
    ...input.patch,
    updatedAt: new Date(),
  };

  const isComplete =
    computeCurrentOnboardingStep({
      state: next,
      senderProfileCount: input.senderProfileCount,
      campaignCount: input.campaignCount,
      prospectCount: input.prospectCount,
    }) === null;

  if (isComplete) {
    return {
      ...next,
      status: "completed",
      skippedAt: null,
      completedAt: next.completedAt ?? new Date(),
    };
  }

  if (next.status === "skipped") {
    return next;
  }

  if (
    next.workspaceConfirmedAt != null ||
    next.selectedUserType != null ||
    hasMeaningfulOnboardingSetup({
      state: next,
      senderProfileCount: input.senderProfileCount,
      campaignCount: input.campaignCount,
      prospectCount: input.prospectCount,
    })
  ) {
    return {
      ...next,
      status: "in_progress",
      completedAt: null,
      skippedAt: null,
    };
  }

  return next;
}

export function getUserTypeLabel(value: SenderProfileType | null | undefined) {
  switch (value) {
    case "sdr":
      return "SDR";
    case "saas_founder":
      return "SaaS founder";
    case "agency":
      return "Lead gen agency";
    case "basic":
      return "Basic mode";
    default:
      return "Not selected";
  }
}
