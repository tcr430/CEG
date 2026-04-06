import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../../components/feedback-banner";
import { SubmitButton } from "../../../components/submit-button";
import { getWorkspaceAppContext } from "../../../lib/server/auth";
import { getWorkspaceOnboardingSummary } from "../../../lib/server/onboarding";
import { getUserTypeLabel } from "../../../lib/server/onboarding-state";

import {
  confirmWorkspaceOnboardingAction,
  createOnboardingCampaignAction,
  createOnboardingProspectAction,
  createOnboardingSenderProfileAction,
  selectOnboardingUserTypeAction,
  skipOnboardingAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Complete the initial workspace setup flow.",
};

type OnboardingPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    error?: string;
    success?: string;
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
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const summary = await getWorkspaceOnboardingSummary({
    membership: context.workspace,
    userId: context.user.userId,
  });
  const completedSteps = summary.steps.filter((step) => step.status === "complete").length;
  const senderProfilesAllowed = summary.billing.features.senderAwareProfiles.allowed;

  return (
    <main className="shell">
      <section className="hero onboardingHero">
        <p className="eyebrow">First run</p>
        <h1>Set up your workspace in a few fast steps</h1>
        <p className="lede">
          Confirm the workspace, choose your outbound motion, and create just enough context to get to research and generation quickly.
        </p>
      </section>

      <FeedbackBanner error={params.error} success={params.success} notice={summary.isSkipped ? "Onboarding is paused. You can resume anytime from here or the dashboard." : undefined} />

      <div className="inlineActions profileHeaderActions">
        <Link href={`/app?workspace=${summary.workspaceId}`} className="buttonSecondary">
          Back to dashboard
        </Link>
        {!summary.isComplete ? (
          <form action={skipOnboardingAction}>
            <input type="hidden" name="workspaceId" value={summary.workspaceId} />
            <SubmitButton className="buttonGhost" pendingLabel="Pausing onboarding...">
              Return later
            </SubmitButton>
          </form>
        ) : null}
      </div>

      <section className="panel onboardingProgressPanel">
        <div className="threadTimelineHeader">
          <div>
            <p className="cardLabel">Progress</p>
            <h2>
              {completedSteps} of {summary.steps.length} steps complete
            </h2>
          </div>
          <span className="pill">
            {summary.workspaceName}
          </span>
        </div>

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

      {summary.isComplete ? (
        <section className="panel">
          <div>
            <p className="cardLabel">Ready to go</p>
            <h2>Workspace foundation is in place</h2>
            <p>
              You now have the core records needed to start prospect research, sequence generation, and reply intelligence.
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
          description="Confirm that this is the workspace you want to start in."
          status={summary.steps.find((step) => step.id === "workspace")?.status ?? "upcoming"}
        >
          <p>
            Current workspace: <strong>{summary.workspaceName}</strong>
          </p>
          {summary.state.workspaceConfirmedAt ? (
            <p className="statusMessage">Workspace confirmed.</p>
          ) : (
            <form action={confirmWorkspaceOnboardingAction} className="inlineActions">
              <input type="hidden" name="workspaceId" value={summary.workspaceId} />
              <SubmitButton className="buttonPrimary" pendingLabel="Confirming workspace...">
                Continue with this workspace
              </SubmitButton>
            </form>
          )}
        </StepCard>

        <StepCard
          title="User type"
          description="Choose the motion you want the product to optimize for first."
          status={summary.steps.find((step) => step.id === "user_type")?.status ?? "upcoming"}
        >
          <p>
            Selected: <strong>{getUserTypeLabel(summary.selectedUserType)}</strong>
          </p>
          {!senderProfilesAllowed ? (
            <p className="statusMessage">
              {summary.billing.planLabel} currently supports basic mode only. You can still finish onboarding and upgrade later.
            </p>
          ) : null}
          <div className="onboardingChoiceGrid">
            {[
              ["sdr", "SDR"],
              ["saas_founder", "SaaS founder"],
              ["agency", "Lead gen agency"],
              ["basic", "Basic mode"],
            ].map(([value, label]) => {
              const blocked = value !== "basic" && !senderProfilesAllowed;
              return (
                <form key={value} action={selectOnboardingUserTypeAction}>
                  <input type="hidden" name="workspaceId" value={summary.workspaceId} />
                  <input type="hidden" name="userType" value={value} />
                  <SubmitButton
                    className="buttonSecondary onboardingChoiceButton"
                    pendingLabel="Saving..."
                    disabled={blocked}
                  >
                    {label}
                  </SubmitButton>
                </form>
              );
            })}
          </div>
        </StepCard>

        <StepCard
          title="Sender context"
          description="Create a sender profile now, or continue in basic mode if you want the fastest path."
          status={summary.steps.find((step) => step.id === "sender_profile")?.status ?? "upcoming"}
        >
          {summary.selectedUserType === "basic" ? (
            <p className="statusMessage">
              Basic mode is selected, so sender-aware profile setup is optional for now.
            </p>
          ) : summary.senderProfileCount > 0 ? (
            <p className="statusMessage">
              {summary.senderProfileCount} sender profile{summary.senderProfileCount === 1 ? "" : "s"} ready for this workspace.
            </p>
          ) : summary.selectedUserType == null ? (
            <p>Select a user type first to unlock the right sender setup path.</p>
          ) : (
            <form action={createOnboardingSenderProfileAction} className="panel compactPanel senderProfileForm">
              <input type="hidden" name="workspaceId" value={summary.workspaceId} />
              <input type="hidden" name="senderType" value={summary.selectedUserType} />

              <div className="formGrid">
                <label className="field">
                  <span>Profile name</span>
                  <input name="name" defaultValue={`${getUserTypeLabel(summary.selectedUserType)} profile`} required />
                </label>
                <label className="field">
                  <span>Company name</span>
                  <input name="companyName" />
                </label>
              </div>

              <label className="field">
                <span>Product or service</span>
                <textarea name="productDescription" rows={3} />
              </label>

              <div className="formGrid">
                <label className="field">
                  <span>Target customer</span>
                  <textarea name="targetCustomer" rows={3} />
                </label>
                <label className="field">
                  <span>Value proposition</span>
                  <textarea name="valueProposition" rows={3} />
                </label>
              </div>

              <div className="formGrid">
                <label className="field">
                  <span>Proof points</span>
                  <textarea name="proofPoints" rows={4} />
                  <small>One proof point per line.</small>
                </label>
                <label className="field">
                  <span>Goals</span>
                  <textarea name="goals" rows={4} />
                  <small>One goal per line.</small>
                </label>
              </div>

              <label className="field">
                <span>Tone style</span>
                <input name="toneStyle" placeholder="Direct, consultative, executive" />
              </label>

              <div className="inlineActions">
                <SubmitButton className="buttonPrimary" pendingLabel="Creating sender profile...">
                  Create sender profile
                </SubmitButton>
              </div>
            </form>
          )}
        </StepCard>

        <StepCard
          title="First campaign"
          description="Capture the offer and ICP so the workspace has a real outbound brief to work from."
          status={summary.steps.find((step) => step.id === "campaign")?.status ?? "upcoming"}
        >
          {summary.campaignCount > 0 ? (
            <p className="statusMessage">
              {summary.campaignCount} campaign{summary.campaignCount === 1 ? "" : "s"} already created.
            </p>
          ) : summary.nextStep !== "campaign" && summary.steps.find((step) => step.id === "campaign")?.status !== "current" ? (
            <p>Complete the earlier setup steps first, then the first campaign form will unlock here.</p>
          ) : (
            <form action={createOnboardingCampaignAction} className="panel compactPanel senderProfileForm">
              <input type="hidden" name="workspaceId" value={summary.workspaceId} />

              <div className="formGrid">
                <label className="field">
                  <span>Campaign name</span>
                  <input name="name" placeholder="Q2 outbound sprint" required />
                </label>
                <label className="field">
                  <span>Target ICP</span>
                  <input name="targetIcp" placeholder="Series A SaaS teams" />
                </label>
              </div>

              <label className="field">
                <span>Offer summary</span>
                <textarea name="offerSummary" rows={3} />
              </label>

              <div className="formGrid">
                <label className="field">
                  <span>Target industries</span>
                  <textarea name="targetIndustries" rows={4} />
                  <small>One industry per line.</small>
                </label>
                <label className="field">
                  <span>Framework preferences</span>
                  <textarea name="frameworkPreferences" rows={4} />
                  <small>One framework per line.</small>
                </label>
              </div>

              <label className="field">
                <span>Tone style</span>
                <input name="toneStyle" placeholder="Sharp, credible, calm" />
              </label>

              <div className="inlineActions">
                <SubmitButton className="buttonPrimary" pendingLabel="Creating campaign...">
                  Create first campaign
                </SubmitButton>
              </div>
            </form>
          )}
        </StepCard>

        <StepCard
          title="First prospect"
          description="Add one real prospect so research and generation can start from real company context."
          status={summary.steps.find((step) => step.id === "prospect")?.status ?? "upcoming"}
        >
          {summary.prospectCount > 0 ? (
            <p className="statusMessage">
              {summary.prospectCount} prospect{summary.prospectCount === 1 ? "" : "s"} already added.
            </p>
          ) : summary.nextStep !== "prospect" && summary.steps.find((step) => step.id === "prospect")?.status !== "current" ? (
            <p>Create the first campaign first, then add a prospect here.</p>
          ) : (
            <form action={createOnboardingProspectAction} className="panel compactPanel prospectForm">
              <input type="hidden" name="workspaceId" value={summary.workspaceId} />

              <div className="formGrid">
                <label className="field">
                  <span>Company name</span>
                  <input name="companyName" required />
                </label>
                <label className="field">
                  <span>Website URL</span>
                  <input name="companyWebsite" type="url" placeholder="https://example.com" />
                </label>
              </div>

              <div className="formGrid">
                <label className="field">
                  <span>Contact name</span>
                  <input name="contactName" />
                </label>
                <label className="field">
                  <span>Contact email</span>
                  <input name="email" type="email" />
                </label>
              </div>

              <div className="inlineActions">
                <SubmitButton className="buttonPrimary" pendingLabel="Adding prospect...">
                  Add first prospect
                </SubmitButton>
              </div>
            </form>
          )}
        </StepCard>
      </div>
    </main>
  );
}


