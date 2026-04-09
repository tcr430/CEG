import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../components/feedback-banner";
import { PerformanceSummaryCard } from "../../components/performance-summary-card";
import { UpgradePromptCard } from "../../components/upgrade-prompt-card";
import { WorkflowStageStrip } from "../../components/workflow-stage-strip";
import { getWorkspaceAppContext } from "../../lib/server/auth";
import {
  buildCampaignOverview,
  formatPerformanceRate,
} from "../../lib/campaign-overview";
import { buildShareablePerformanceSummary } from "../../lib/performance-summary";
import { listCampaignsForWorkspace } from "../../lib/server/campaigns";
import { getWorkspaceOnboardingSummary } from "../../lib/server/onboarding";
import { getUserTypeLabel } from "../../lib/server/onboarding-state";
import { getWorkspacePerformanceSummary } from "../../lib/server/campaign-performance";
import { getUpgradePrompt } from "../../lib/upgrade-prompts";
import {
  buildVisibleWorkflowStages,
  getVisibleWorkflowNextAction,
} from "../../lib/workflow-visibility";

export const metadata: Metadata = {
  title: "Dashboard",
};

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

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;

  const [onboarding, performance, campaigns] = await Promise.all([
    getWorkspaceOnboardingSummary({
      membership: workspace,
      userId: context.user.userId,
    }),
    getWorkspacePerformanceSummary(workspace.workspaceId),
    listCampaignsForWorkspace(workspace.workspaceId),
  ]);

  if (onboarding.shouldRedirectToOnboarding) {
    redirect(`/app/onboarding?workspace=${workspace.workspaceId}`);
  }

  const performanceUpgradePrompt = getUpgradePrompt({
    surface: "dashboard_performance",
    billing: onboarding.billing,
    performance,
  });
  const campaignOverview = buildCampaignOverview(campaigns);
  const shareablePerformanceSummary = buildShareablePerformanceSummary({
    scope: "workspace",
    snapshot: performance,
    campaignCount: campaignOverview.campaignCount,
  });
  const workflowStages = buildVisibleWorkflowStages({
    setupReady:
      onboarding.senderProfileCount > 0 || onboarding.selectedUserType === "basic",
    campaignReady: onboarding.campaignCount > 0,
    prospectReady: onboarding.prospectCount > 0,
    researchReady: onboarding.prospectCount > 0,
    draftReady: performance.outboundMessages > 0,
    reviewReady: performance.outboundMessages > 0,
    replyReady: performance.replies > 0,
    iterationReady: performance.replies > 0 || performance.positiveReplies > 0,
  });
  const workflowNextAction = getVisibleWorkflowNextAction(workflowStages);

  return (
    <main className="appShell">
      <aside className="sidebar">
        <p className="eyebrow">Workspace overview</p>
        <h1 className="appTitle">Run client outbound from one controlled workflow</h1>
        <p className="sidebarText">
          Move from sender and client context to campaign setup, prospect research, sequences,
          reply handling, and reusable workflow memory inside one workspace-scoped system.
        </p>

        <div className="workspaceBadge">
          <span>{workspace.workspaceName ?? "Unnamed workspace"}</span>
          <strong>{workspace.role}</strong>
        </div>

        <div className="inlineActions">
          <Link href="/app/workspaces" className="buttonSecondary">
            Switch workspace
          </Link>
          <Link
            href={`/app/onboarding?workspace=${workspace.workspaceId}`}
            className="buttonSecondary"
          >
            {onboarding.isComplete
              ? "Review onboarding"
              : onboarding.isSkipped
                ? "Resume onboarding"
                : "Continue onboarding"}
          </Link>
          <Link
            href={`/app/settings?workspace=${workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Settings
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

        <WorkflowStageStrip
          label="Workflow moat"
          title="One visible path from setup to iteration"
          description="The workspace is meant to help operators run the full outbound workflow in one place while also preserving reusable context over time: establish context, brief the campaign, add target accounts, ground drafts in research, review what AI proposes, handle replies, and learn from outcomes in a way that can inform better guidance later."
          stages={workflowStages}
          nextActionLabel={workflowNextAction ? "Current focus" : undefined}
          nextActionTitle={workflowNextAction?.label}
          nextActionNote={workflowNextAction?.note}
        />

        <div className="dashboardCard">
          <p className="cardLabel">Operator access</p>
          <h2>{context.user.email ?? "Signed-in user"}</h2>
          <p>
            Workspace access is resolved on the server from local user and membership
            records, with Supabase metadata used only as a bootstrap fallback.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Active workspace</p>
          <h2>{workspace.workspaceSlug ?? workspace.workspaceId}</h2>
          <p>
            Operating mode: {getUserTypeLabel(onboarding.selectedUserType)}. Plan: {onboarding.billing.planLabel}.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Core setup</p>
          <h2>
            {onboarding.isComplete
              ? "Ready for live client work"
              : onboarding.isSkipped
                ? "Onboarding paused"
                : "Client workflow setup in progress"}
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
          <p className="cardLabel">Workflow path</p>
          <h2>Move the next client workflow forward</h2>
          <p>
            These actions map to the operating sequence that creates the workflow moat: setup,
            brief, queue, research, draft, review, reply handling, and iteration.
          </p>
          <div className="launchPathGrid">
            <Link
              href={`/app/sender-profiles?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Setup</p>
              <h3>Capture sender context</h3>
              <p>Set the reusable positioning, proof points, and tone the workflow will carry forward into campaigns and drafts.</p>
            </Link>
            <Link
              href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Brief</p>
              <h3>Create campaign brief</h3>
              <p>Define the client offer, ICP, framework, and sender linkage before prospects move into research and drafting.</p>
            </Link>
            <Link
              href={`/app/campaigns?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Queue and research</p>
              <h3>Add prospects and move into live work</h3>
              <p>Bring real target accounts into the workflow so research, sequence drafts, review, and reply handling all start from stored context.</p>
            </Link>
            <Link
              href={`/app/settings?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Headroom</p>
              <h3>Check workflow headroom</h3>
              <p>Review limits before the workflow moves into heavier research, drafting, reply handling, and iteration.</p>
            </Link>
          </div>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Performance signals</p>
          <h2>{performance.outboundMessages} outbound message(s)</h2>
          <p>Replies: {performance.replies}. Positive replies: {performance.positiveReplies}.</p>
          <p>
            These snapshots are lightweight today, but they give the workspace real campaign history the product can use for more informed review and guidance over time.
          </p>
          <p>
            Reply rate: {performance.replyRate === null ? "No outbound volume yet" : `${Math.round(performance.replyRate * 100)}%`}.
            Positive reply rate: {performance.positiveReplyRate === null ? "No outbound volume yet" : `${Math.round(performance.positiveReplyRate * 100)}%`}.
          </p>
        </div>

        <PerformanceSummaryCard summary={shareablePerformanceSummary} />

        {performanceUpgradePrompt ? (
          <UpgradePromptCard
            workspaceId={workspace.workspaceId}
            prompt={performanceUpgradePrompt}
          />
        ) : null}

        <div className="campaignPortfolioGrid">
          <div className="dashboardCard nestedCard">
            <p className="cardLabel">Campaign portfolio</p>
            <h3>{campaignOverview.campaignCount} campaign(s)</h3>
            <p>{campaignOverview.activeCount} active. {campaignOverview.senderAwareCount} sender-aware. {campaignOverview.basicModeCount} basic mode.</p>
          </div>
          <div className="dashboardCard nestedCard">
            <p className="cardLabel">Quick switching</p>
            <h3>Move between client campaigns faster</h3>
            {campaignOverview.quickSwitchCampaigns.length > 0 ? (
              <div className="inlineActions compactInlineActions">
                {campaignOverview.quickSwitchCampaigns.map((item) => (
                  <Link
                    key={item.campaign.id}
                    href={`/app/campaigns/${item.campaign.id}?workspace=${workspace.workspaceId}`}
                    className="buttonSecondary quickSwitchLink"
                  >
                    {item.campaign.name}
                    <small>{item.campaign.status}</small>
                  </Link>
                ))}
              </div>
            ) : (
              <p>Create the first campaign to get quick switching here.</p>
            )}
          </div>
          <div className="dashboardCard nestedCard">
            <p className="cardLabel">Top performing campaigns</p>
            <h3>
              {campaignOverview.topPerformers.length > 0
                ? campaignOverview.topPerformers[0]?.campaign.name
                : "Waiting for campaign data"}
            </h3>
            {campaignOverview.topPerformers.length > 0 ? (
              <ul className="researchList compactResearchList">
                {campaignOverview.topPerformers.map((item) => (
                  <li key={item.campaign.id}>
                    <strong>{item.campaign.name}</strong>
                    <p>
                      Reply rate {formatPerformanceRate(item.performance?.replyRate)} | Positive {formatPerformanceRate(item.performance?.positiveReplyRate)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Once live campaigns start landing replies, the strongest client motions will surface here and give the team a conservative read on what has started working.</p>
            )}
          </div>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Stored context</p>
          <h2>{onboarding.senderProfileCount} sender profile(s)</h2>
          <p>
            {onboarding.senderProfileCount > 0
              ? "Reusable sender context is ready for campaign selection and higher-quality client work."
              : "Start with a sender profile, or continue in basic mode until reusable sender context is ready."}
          </p>
          <p>
            Campaigns: {onboarding.campaignCount}. Prospects: {onboarding.prospectCount}.
          </p>
          <p>
            The workspace becomes more useful as it accumulates sender context, campaign briefs, target accounts, stored reply history, and outcome signals that later workflows can reference. That foundation is what makes the product performance-aware rather than purely generative.
          </p>
        </div>
      </section>
    </main>
  );
}






