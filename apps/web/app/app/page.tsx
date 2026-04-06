import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../components/feedback-banner";
import { PerformanceSummaryCard } from "../../components/performance-summary-card";
import { UpgradePromptCard } from "../../components/upgrade-prompt-card";
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

  return (
    <main className="appShell">
      <aside className="sidebar">
        <p className="eyebrow">Workspace overview</p>
        <h1 className="appTitle">Launch your next outbound workflow</h1>
        <p className="sidebarText">
          Move from sender context to campaign setup, prospect research, sequences,
          and reply handling inside one workspace-scoped system.
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

        <div className="dashboardCard">
          <p className="cardLabel">Authenticated user</p>
          <h2>{context.user.email ?? "Signed-in user"}</h2>
          <p>
            Workspace access is resolved on the server from local user and membership
            records, with Supabase metadata used only as a bootstrap fallback.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Current workspace</p>
          <h2>{workspace.workspaceSlug ?? workspace.workspaceId}</h2>
          <p>
            User type: {getUserTypeLabel(onboarding.selectedUserType)}. Plan: {onboarding.billing.planLabel}.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Core setup</p>
          <h2>
            {onboarding.isComplete
              ? "Ready for live outreach"
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
          <p className="cardLabel">Quick start</p>
          <h2>Follow the strongest demo path</h2>
          <div className="launchPathGrid">
            <Link
              href={`/app/sender-profiles?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Step 1</p>
              <h3>Create sender profile</h3>
              <p>Capture positioning, value proposition, proof points, and tone.</p>
            </Link>
            <Link
              href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Step 2</p>
              <h3>Create campaign</h3>
              <p>Set offer summary, ICP, framework, and sender linkage.</p>
            </Link>
            <Link
              href={`/app/campaigns?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Step 3</p>
              <h3>Add prospects</h3>
              <p>Move from campaign brief into real companies and contacts.</p>
            </Link>
            <Link
              href={`/app/settings?workspace=${workspace.workspaceId}`}
              className="profileCard"
            >
              <p className="cardLabel">Plan</p>
              <h3>Check limits and upgrades</h3>
              <p>Review research, sequence, and reply-intelligence headroom.</p>
            </Link>
          </div>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Performance snapshot</p>
          <h2>{performance.outboundMessages} outbound message(s)</h2>
          <p>Replies: {performance.replies}. Positive replies: {performance.positiveReplies}.</p>
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
            <h3>Move between campaigns faster</h3>
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
              <p>Once outbound messages start landing replies, the strongest campaigns will surface here.</p>
            )}
          </div>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Coverage snapshot</p>
          <h2>{onboarding.senderProfileCount} sender profile(s)</h2>
          <p>
            {onboarding.senderProfileCount > 0
              ? "Sender context is ready for campaign selection and higher-quality generation."
              : "Start with a sender profile, or continue in basic mode until sender-specific context is ready."}
          </p>
          <p>
            Campaigns: {onboarding.campaignCount}. Prospects: {onboarding.prospectCount}.
          </p>
        </div>
      </section>
    </main>
  );
}
