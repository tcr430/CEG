import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionEmptyState } from "../../../components/action-empty-state";
import { FeedbackBanner } from "../../../components/feedback-banner";
import { getWorkspaceAppContext } from "../../../lib/server/auth";
import { getCampaignsEmptyState } from "../../../lib/empty-state-guidance";
import { getWorkspaceOnboardingSummary } from "../../../lib/server/onboarding";
import { listCampaignsForWorkspace } from "../../../lib/server/campaigns";
import {
  buildCampaignOverview,
  formatPerformanceRate,
} from "../../../lib/campaign-overview";

export const metadata: Metadata = {
  title: "Campaigns",
  description: "View and manage workspace campaigns.",
};

type CampaignsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;
  const [campaigns, onboarding] = await Promise.all([
    listCampaignsForWorkspace(workspace.workspaceId),
    getWorkspaceOnboardingSummary({
      membership: workspace,
      userId: context.user.userId,
    }),
  ]);
  const emptyState = getCampaignsEmptyState(onboarding.selectedUserType);
  const overview = buildCampaignOverview(campaigns);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Campaigns</p>
        <h1>Campaign planning surface</h1>
        <p className="lede">
          Keep multiple outbound motions visible in one workspace, with enough grouping and performance context to stay useful for agency-style work without turning into a CRM.
        </p>
      </section>

      <FeedbackBanner error={params.error} success={params.success} />

      <div className="inlineActions profileHeaderActions">
        <Link href="/app" className="buttonSecondary">
          Back to dashboard
        </Link>
        <Link
          href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}
          className="buttonPrimary"
        >
          New campaign
        </Link>
      </div>

      <section className="panel" aria-labelledby="campaigns-title">
        <div>
          <h2 id="campaigns-title">Workspace campaigns</h2>
          <p>
            Campaigns stay scoped to the current workspace and can operate in basic mode or point at a dedicated sender profile.
          </p>
        </div>

        {campaigns.length > 0 ? (
          <>
            <div className="campaignPortfolioGrid">
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Coverage</p>
                <h3>{overview.campaignCount} campaign(s)</h3>
                <p>{overview.activeCount} active. {overview.senderAwareCount} sender-aware. {overview.basicModeCount} basic mode.</p>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Portfolio performance</p>
                <h3>{overview.totalOutboundMessages} outbound message(s)</h3>
                <p>{overview.totalReplies} replies. {overview.totalPositiveReplies} positive replies.</p>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Quick switching</p>
                <h3>Move between live campaigns faster</h3>
                <div className="inlineActions compactInlineActions">
                  {overview.quickSwitchCampaigns.map((item) => (
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
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Top performers</p>
                <h3>
                  {overview.topPerformers.length > 0
                    ? overview.topPerformers[0]?.campaign.name
                    : "No campaign performance yet"}
                </h3>
                {overview.topPerformers.length > 0 ? (
                  <ul className="researchList compactResearchList">
                    {overview.topPerformers.map((item) => (
                      <li key={item.campaign.id}>
                        <strong>{item.campaign.name}</strong>
                        <p>
                          Reply rate {formatPerformanceRate(item.performance?.replyRate)} | Positive {formatPerformanceRate(item.performance?.positiveReplyRate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Performance rankings will appear once campaigns start sending and receiving replies.</p>
                )}
              </div>
            </div>

            <div className="stack">
              {overview.groupedCampaigns.map((group) => (
                <section key={group.status} className="campaignGroupSection" aria-labelledby={`campaign-group-${group.status}`}>
                  <div className="campaignGroupHeader">
                    <div>
                      <p className="cardLabel">Grouping</p>
                      <h3 id={`campaign-group-${group.status}`}>{group.label}</h3>
                    </div>
                    <span className="pill">{group.campaigns.length}</span>
                  </div>

                  <div className="profileList">
                    {group.campaigns.map((item) => (
                      <Link
                        key={item.campaign.id}
                        href={`/app/campaigns/${item.campaign.id}?workspace=${workspace.workspaceId}`}
                        className="profileCard"
                      >
                        <div className="profileCardHeader">
                          <div>
                            <p className="cardLabel">{item.campaign.status}</p>
                            <h2>{item.campaign.name}</h2>
                          </div>
                          <span className="pill">
                            {item.isSenderAware ? "Sender-aware" : "Basic mode"}
                          </span>
                        </div>

                        <p>{item.campaign.offerSummary ?? "No offer summary yet."}</p>
                        <p>
                          {item.campaign.targetIcp ??
                            "Add an ICP so future research and sequencing can stay focused."}
                        </p>
                        <div className="pillRow compactPillRow">
                          <span className="pill">
                            Outbound {item.performance?.outboundMessages ?? 0}
                          </span>
                          <span className="pill">
                            Replies {item.performance?.replies ?? 0}
                          </span>
                          <span className="pill">
                            Positive {item.performance?.positiveReplies ?? 0}
                          </span>
                          <span className="pill">
                            Reply rate {formatPerformanceRate(item.performance?.replyRate)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="profileList">
            <ActionEmptyState
              label="No campaigns yet"
              title={emptyState.title}
              description={emptyState.description}
              nextAction={emptyState.nextAction}
              actions={
                <>
                  <Link
                    href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}
                    className="buttonPrimary"
                  >
                    Create campaign
                  </Link>
                  <Link
                    href={`/app/sender-profiles?workspace=${workspace.workspaceId}`}
                    className="buttonSecondary"
                  >
                    Review sender profiles
                  </Link>
                </>
              }
            />
          </div>
        )}
      </section>
    </main>
  );
}

