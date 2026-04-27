import type { Metadata } from "next";
import Link from "next/link";

import {
  getOnboardingNextStepGuidance,
  getOnboardingPersonaGuidance,
} from "../../../lib/onboarding-guidance";
import { requireActiveWorkspaceAppContext } from "../../../lib/server/billing";
import { getWorkspaceOnboardingSummary } from "../../../lib/server/onboarding";
import { getUserTypeLabel } from "../../../lib/server/onboarding-state";

import { ConfirmWorkspaceButton } from "./forms/confirm-workspace-button";
import { OnboardingCampaignForm } from "./forms/onboarding-campaign-form";
import { OnboardingProspectForm } from "./forms/onboarding-prospect-form";
import { OnboardingSenderProfileForm } from "./forms/onboarding-sender-profile-form";
import { SelectUserTypeButtons } from "./forms/select-user-type-buttons";
import { SkipOnboardingButton } from "./forms/skip-onboarding-button";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Complete the guided workspace setup flow for agency-grade outbound work.",
};

type OnboardingPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

function StepCard({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status: "complete" | "current" | "upcoming";
  children: React.ReactNode;
}) {
  return (
    <section className="dashboardCard onboardingStepCard">
      <div className="threadTimelineHeader">
        <div>
          <p className="cardLabel">{title}</p>
          <h2>{description}</h2>
        </div>
        <span className={`pill onboardingStatusPill onboardingStatusPill-${status}`}>
          {status === "complete"
            ? "Complete"
            : status === "current"
              ? "Current"
              : "Upcoming"}
        </span>
      </div>
      {children}
    </section>
  );
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(params.workspace);

  const summary = await getWorkspaceOnboardingSummary({
    membership: context.workspace,
    userId: context.user.userId,
  });
  const completedSteps = summary.steps.filter((step) => step.status === "complete").length;
  const senderProfilesAllowed = summary.billing.features.senderAwareProfiles.allowed;
  const personaGuidance = getOnboardingPersonaGuidance(summary.selectedUserType);
  const nextStepGuidance = getOnboardingNextStepGuidance(summary.nextStep);

  return (
    <main className="shell">
      <section className="hero onboardingHero">
        <p className="eyebrow">Agency onboarding</p>
        <h1>Launch the workspace in a few guided steps</h1>
        <p className="lede">
          Set the core context for agency-grade hyperpersonalized cold email quickly: confirm the
          workspace, define the workflow shape, capture sender context, create the first client
          brief, and add one target account. The product gets more useful as campaign memory builds,
          but human review stays in control from the start.
        </p>
      </section>

      {summary.isSkipped ? (
        <p className="statusMessage">
          Onboarding is paused. You can resume anytime from here or the dashboard.
        </p>
      ) : null}

      <div className="inlineActions profileHeaderActions">
        <Link href={`/app?workspace=${summary.workspaceId}`} className="buttonSecondary">
          Back to dashboard
        </Link>
        {!summary.isComplete ? (
          <SkipOnboardingButton workspaceId={summary.workspaceId} />
        ) : null}
      </div>

      <section className="panel onboardingProgressPanel">
        <div className="threadTimelineHeader">
          <div>
            <p className="cardLabel">Workflow setup progress</p>
            <h2>
              {completedSteps} of {summary.steps.length} steps complete
            </h2>
          </div>
          <span className="pill">{summary.workspaceName}</span>
        </div>
        <p>
          Guided setup stays self-service, but each step is meant to move the workspace from blank
          slate to live client workflow without losing review control.
        </p>

        <div className="onboardingProgressStrip" aria-label="Onboarding progress">
          {summary.steps.map((step, index) => (
            <div key={step.id} className="onboardingProgressItem">
              <div className={`onboardingProgressDot onboardingProgressDot-${step.status}`}>
                {index + 1}
              </div>
              <div>
                <strong>{step.label}</strong>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!summary.isComplete ? (
        <section className="panel">
          <div className="threadTimelineHeader">
            <div>
              <p className="cardLabel">Guided setup</p>
              <h2>{personaGuidance.introTitle}</h2>
            </div>
            <span className="pill">{personaGuidance.audienceLabel}</span>
          </div>
          <div className="dashboardPanel dashboardPanelDense">
            <section className="dashboardCard compactPanel">
              <p>{personaGuidance.introBody}</p>
              <p className="statusMessage">{personaGuidance.recommendation}</p>
            </section>
            <section className="dashboardCard compactPanel">
              <p className="cardLabel">Recommended next step</p>
              <h3>{nextStepGuidance.title}</h3>
              <p>{nextStepGuidance.description}</p>
              <p className="statusMessage">{nextStepGuidance.expectation}</p>
            </section>
            <section className="dashboardCard compactPanel">
              <p className="cardLabel">Why this matters</p>
              <p>{personaGuidance.setupFocus}</p>
              <p className="statusMessage">{personaGuidance.memoryNote}</p>
            </section>
          </div>
        </section>
      ) : null}

      {summary.isComplete ? (
        <section className="panel">
          <div>
            <p className="cardLabel">Ready to go</p>
            <h2>Workflow foundation is in place</h2>
            <p>
              You now have the core records needed to move from client brief to target-account
              research, reviewed drafts, reply handling, and reusable operational memory, with
              approval still staying with the team.
            </p>
          </div>
          <div className="inlineActions">
            <Link href={`/app?workspace=${summary.workspaceId}`} className="buttonPrimary">
              Open dashboard
            </Link>
            <Link href={`/app/campaigns?workspace=${summary.workspaceId}`} className="buttonSecondary">
              Review campaigns
            </Link>
            <Link href={`/app/sender-profiles?workspace=${summary.workspaceId}`} className="buttonSecondary">
              Review sender profiles
            </Link>
          </div>
        </section>
      ) : null}

      <div className="dashboardPanel onboardingStepGrid">
        <StepCard
          title="Workspace"
          description="Confirm the workspace that should hold this agency workflow."
          status={summary.steps.find((step) => step.id === "workspace")?.status ?? "upcoming"}
        >
          <p>
            Current workspace: <strong>{summary.workspaceName}</strong>
          </p>
          <p className="statusMessage">
            This keeps campaigns, target accounts, reply history, team review, and operational
            memory scoped to the right client workflow from the start.
          </p>
          {summary.state.workspaceConfirmedAt ? (
            <p className="statusMessage">
              Workspace confirmed. Next, choose the workflow shape so onboarding can tailor the
              guidance and examples.
            </p>
          ) : (
            <ConfirmWorkspaceButton workspaceId={summary.workspaceId} />
          )}
        </StepCard>

        <StepCard
          title="Workflow shape"
          description="Choose the operating shape you want the product to support first. Agency is the primary fit."
          status={summary.steps.find((step) => step.id === "user_type")?.status ?? "upcoming"}
        >
          <p>
            Current workflow shape: <strong>{getUserTypeLabel(summary.selectedUserType)}</strong>
          </p>
          {!senderProfilesAllowed ? (
            <p className="statusMessage">
              {summary.billing.planLabel} currently supports basic mode only. You can still
              establish the workflow, start research, and upgrade into richer sender context later.
            </p>
          ) : null}
          <p className="statusMessage">
            Agencies are the primary fit here: multi-client delivery, manual-heavy
            personalization, human review, and campaign memory. SDR, founder, and basic modes
            remain available when that better matches the current workflow.
          </p>
          <p>
            Recommendation: choose the shape that best matches how the team actually delivers work
            today. The rest of onboarding will adapt its examples and setup cues.
          </p>
          <SelectUserTypeButtons
            workspaceId={summary.workspaceId}
            currentSelection={summary.selectedUserType}
            senderProfilesAllowed={senderProfilesAllowed}
          />
          {summary.selectedUserType != null ? (
            <p className="statusMessage">
              {personaGuidance.recommendation}
            </p>
          ) : null}
        </StepCard>

        <StepCard
          title="Sender context"
          description="Capture reusable sender context now, or continue in basic mode if you want the fastest path into live workflow setup."
          status={summary.steps.find((step) => step.id === "sender_profile")?.status ?? "upcoming"}
        >
          <p>{personaGuidance.senderProfilePrompt}</p>
          {summary.selectedUserType === "basic" ? (
            <p className="statusMessage">
              Basic mode is selected, so sender-aware profile setup stays optional for now. You can
              still establish the campaign workflow first and add richer context later.
            </p>
          ) : summary.senderProfileCount > 0 ? (
            <>
              <p className="statusMessage">
                {summary.senderProfileCount} sender profile{summary.senderProfileCount === 1 ? "" : "s"} ready to support reusable workflow context in this workspace.
              </p>
              <p>
                That reusable context will now carry forward into campaigns and reviewed drafts so
                the team does not need to restate the same positioning every time.
              </p>
            </>
          ) : summary.selectedUserType == null ? (
            <p>Select a workflow shape first to unlock the right sender-context setup path.</p>
          ) : (
            <OnboardingSenderProfileForm
              workspaceId={summary.workspaceId}
              senderType={summary.selectedUserType}
              defaults={{
                name: personaGuidance.senderProfileDefaults.name,
                companyName: personaGuidance.senderProfileDefaults.companyName,
                offer: personaGuidance.senderProfileDefaults.offer,
                targetBuyer: personaGuidance.senderProfileDefaults.targetBuyer,
                valueProposition: personaGuidance.senderProfileDefaults.valueProposition,
                proofPoints: personaGuidance.senderProfileDefaults.proofPoints,
                goals: personaGuidance.senderProfileDefaults.goals,
                toneStyle: personaGuidance.senderProfileDefaults.toneStyle,
              }}
            />
          )}
        </StepCard>

        <StepCard
          title="First campaign"
          description="Capture the client offer and ICP so the workspace has a real workflow brief to work from."
          status={summary.steps.find((step) => step.id === "campaign")?.status ?? "upcoming"}
        >
          <p>{personaGuidance.campaignPrompt}</p>
          {summary.campaignCount > 0 ? (
            <>
              <p className="statusMessage">
                {summary.campaignCount} campaign{summary.campaignCount === 1 ? "" : "s"} already created for this workspace workflow.
              </p>
              <p>
                With a live campaign brief in place, the next step is to add a real target account so
                research and reviewed drafts can work on actual context.
              </p>
            </>
          ) : summary.nextStep !== "campaign" && summary.steps.find((step) => step.id === "campaign")?.status !== "current" ? (
            <p>Complete the earlier setup steps first, then the first client-workflow brief will unlock here.</p>
          ) : (
            <OnboardingCampaignForm
              workspaceId={summary.workspaceId}
              defaults={{
                name: personaGuidance.campaignDefaults.name,
                targetIcp: personaGuidance.campaignDefaults.targetIcp,
                offerSummary: personaGuidance.campaignDefaults.offerSummary,
                targetIndustries: personaGuidance.campaignDefaults.targetIndustries,
                frameworkPreferences: personaGuidance.campaignDefaults.frameworkPreferences,
                toneStyle: personaGuidance.campaignDefaults.toneStyle,
              }}
            />
          )}
        </StepCard>

        <StepCard
          title="First target account"
          description="Add one real target account so research, drafting, and replies start from real company context."
          status={summary.steps.find((step) => step.id === "prospect")?.status ?? "upcoming"}
        >
          <p>{personaGuidance.prospectPrompt}</p>
          {summary.prospectCount > 0 ? (
            <>
              <p className="statusMessage">
                {summary.prospectCount} target account{summary.prospectCount === 1 ? "" : "s"} already added to the workflow.
              </p>
              <p>
                That is enough to move into research, reviewed drafting, reply handling, and early
                performance learning from real activity.
              </p>
            </>
          ) : summary.nextStep !== "prospect" && summary.steps.find((step) => step.id === "prospect")?.status !== "current" ? (
            <p>Create the first client workflow first, then add a target account here.</p>
          ) : (
            <OnboardingProspectForm
              workspaceId={summary.workspaceId}
              defaults={{
                companyName: personaGuidance.prospectDefaults.companyName,
                companyWebsite: personaGuidance.prospectDefaults.companyWebsite,
                contactName: personaGuidance.prospectDefaults.contactName,
                email: personaGuidance.prospectDefaults.email,
              }}
            />
          )}
        </StepCard>
      </div>
    </main>
  );
}
