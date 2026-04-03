import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../components/feedback-banner";
import { getWorkspaceAppContext } from "../../lib/server/auth";
import { getWorkspaceOnboardingSummary } from "../../lib/server/onboarding";
import { getUserTypeLabel } from "../../lib/server/onboarding-state";

type DashboardPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    notice?: string;
    error?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null) {
    redirect("/app/workspaces");
  }

  if (context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const onboarding = await getWorkspaceOnboardingSummary({
    membership: context.workspace,
    userId: context.user.userId,
  });

  if (onboarding.shouldRedirectToOnboarding) {
    redirect(`/app/onboarding?workspace=${context.workspace.workspaceId}`);
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <p className="eyebrow">Protected App</p>
        <h1 className="appTitle">Dashboard shell</h1>
        <p className="sidebarText">
          This area resolves workspace access on the server and now uses onboarding state to guide first-run users toward sender, campaign, and prospect setup.
        </p>

        <div className="workspaceBadge">
          <span>{context.workspace.workspaceName ?? "Unnamed workspace"}</span>
          <strong>{context.workspace.role}</strong>
        </div>

        <div className="inlineActions">
          <Link href="/app/workspaces" className="buttonSecondary">
            Switch workspace
          </Link>
          <Link
            href={`/app/onboarding?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            {onboarding.isComplete ? "Review onboarding" : onboarding.isSkipped ? "Resume onboarding" : "Continue onboarding"}
          </Link>
          <Link
            href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Sender profiles
          </Link>
          <Link
            href={`/app/campaigns?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Campaigns
          </Link>
          <Link
            href={`/app/settings?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Billing
          </Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="buttonGhost">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <section className="dashboardPanel">
        <FeedbackBanner error={params.error} notice={params.notice} />

        <div className="dashboardCard">
          <p className="cardLabel">Authenticated user</p>
          <h2>{context.user.email ?? "Signed-in user"}</h2>
          <p>
            Workspace context is loaded on the server using auth metadata and role-aware helpers from <code>@ceg/auth</code>.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Current workspace</p>
          <h2>{context.workspace.workspaceSlug ?? context.workspace.workspaceId}</h2>
          <p>
            User type: {getUserTypeLabel(onboarding.selectedUserType)}. Plan: {onboarding.billing.planLabel}.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Onboarding status</p>
          <h2>
            {onboarding.isComplete
              ? "Ready for production work"
              : onboarding.isSkipped
                ? "Onboarding paused"
                : "Setup still in progress"}
          </h2>
          <p>
            {onboarding.steps.filter((step) => step.status === "complete").length} of {onboarding.steps.length} setup steps are complete for this workspace.
          </p>
          <div className="pillRow">
            {onboarding.steps.map((step) => (
              <span key={step.id} className="pill">
                {step.label}: {step.status}
              </span>
            ))}
          </div>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Sender profile coverage</p>
          <h2>{onboarding.senderProfileCount} profile(s)</h2>
          <p>
            {onboarding.senderProfileCount > 0
              ? "Sender-aware context is ready for campaign selection and future generation quality improvements."
              : "Create a sender profile, or stay in basic mode when sender-specific context is not ready yet."}
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Campaign coverage</p>
          <h2>{onboarding.campaignCount} campaign(s)</h2>
          <p>
            {onboarding.campaignCount > 0
              ? `Prospects added so far: ${onboarding.prospectCount}.`
              : "Create a campaign to capture offer, ICP, tone, and optional sender-profile selection in one workspace-scoped record."}
          </p>
        </div>
      </section>
    </main>
  );
}
