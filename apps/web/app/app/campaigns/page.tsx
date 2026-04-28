import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { ActionEmptyState } from "../../../components/action-empty-state";
import { WorkflowStageStrip } from "../../../components/workflow-stage-strip";
import { requireActiveWorkspaceAppContext } from "../../../lib/server/billing";
import { getCampaignsEmptyState } from "../../../lib/empty-state-guidance";
import { getWorkspaceOnboardingSummary } from "../../../lib/server/onboarding";
import { listCampaignsForWorkspace } from "../../../lib/server/campaigns";
import {
  buildCampaignOverview,
  formatPerformanceRate,
} from "../../../lib/campaign-overview";
import {
  buildVisibleWorkflowStages,
  getVisibleWorkflowNextAction,
} from "../../../lib/workflow-visibility";

export const metadata: Metadata = {
  title: "Campaigns",
  description: "View and manage workspace campaigns.",
};

type CampaignsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(params.workspace);

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
  const workflowStages = buildVisibleWorkflowStages({
    setupReady:
      onboarding.senderProfileCount > 0 || onboarding.selectedUserType === "basic",
    campaignReady: overview.campaignCount > 0,
    prospectReady: overview.campaignCount > 0,
    researchReady: overview.campaignCount > 0,
    draftReady: overview.totalOutboundMessages > 0,
    reviewReady: overview.totalOutboundMessages > 0,
    replyReady: overview.totalReplies > 0,
    iterationReady: overview.totalReplies > 0,
  });
  const workflowNextAction = getVisibleWorkflowNextAction(workflowStages);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Campaigns</p>
        <h1>Campaign workflow library</h1>
        <p className="lede">
          Keep multiple client-facing outbound workflows visible in one workspace, with enough grouping, review context, and performance signal to move from brief to replies without turning the app into a CRM.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href="/app">Back to dashboard</Link>
        </Button>
        <Button asChild>
          <Link href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}>
            New client workflow
          </Link>
        </Button>
      </div>

      <Card className="p-6 grid gap-6" aria-labelledby="campaigns-title">
        <WorkflowStageStrip
          label="Workflow moat"
          title="Campaigns should make the operating flow visible"
          description="The campaign library is where operators should be able to see the workflow chain clearly: from setup and briefing through live target accounts, drafting, reply handling, and iteration."
          stages={workflowStages}
          nextActionLabel={workflowNextAction ? "Current focus" : undefined}
          nextActionTitle={workflowNextAction?.label}
          nextActionNote={workflowNextAction?.note}
        />

        <div>
          <h2 id="campaigns-title">Client workflow portfolio</h2>
          <p>
            Campaigns stay scoped to the current workspace and can operate in basic mode or point at a dedicated sender profile, so each workflow keeps its own brief, prospect queue, downstream reply context, and early performance history.
          </p>
        </div>

        {campaigns.length > 0 ? (
          <>
            <div className="campaignPortfolioGrid">
              <Card className="p-4 nestedCard">
                <p className="cardLabel">Workflow coverage</p>
                <h3>{overview.campaignCount} campaign(s)</h3>
                <p>{overview.activeCount} active. {overview.senderAwareCount} sender-aware. {overview.basicModeCount} basic mode.</p>
              </Card>
              <Card className="p-4 nestedCard">
                <p className="cardLabel">Performance signals</p>
                <h3>{overview.totalOutboundMessages} outbound message(s)</h3>
                <p>{overview.totalReplies} replies. {overview.totalPositiveReplies} positive replies.</p>
              </Card>
              <Card className="p-4 nestedCard">
                <p className="cardLabel">Quick switching</p>
                <h3>Move between live client campaigns faster</h3>
                <div className="inlineActions compactInlineActions">
                  {overview.quickSwitchCampaigns.map((item) => (
                    <Button
                      key={item.campaign.id}
                      asChild
                      variant="secondary"
                      className="quickSwitchLink"
                    >
                      <Link href={`/app/campaigns/${item.campaign.id}?workspace=${workspace.workspaceId}`}>
                        {item.campaign.name}
                        <small>{item.campaign.status}</small>
                      </Link>
                    </Button>
                  ))}
                </div>
              </Card>
              <Card className="p-4 nestedCard">
                <p className="cardLabel">Campaign learning</p>
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
                  <p>Performance rankings will appear once client campaigns start sending and receiving replies. They are meant to surface early history, not claim automatic optimization.</p>
                )}
              </Card>
            </div>

            <div className="stack">
              {overview.groupedCampaigns.map((group) => (
                <section key={group.status} className="campaignGroupSection" aria-labelledby={`campaign-group-${group.status}`}>
                  <div className="campaignGroupHeader">
                    <div>
                      <p className="cardLabel">Grouping</p>
                      <h3 id={`campaign-group-${group.status}`}>{group.label}</h3>
                    </div>
                    <Badge variant="secondary">{group.campaigns.length}</Badge>
                  </div>

                  <div className="grid gap-4">
                    {group.campaigns.map((item) => (
                      <Link
                        key={item.campaign.id}
                        href={`/app/campaigns/${item.campaign.id}?workspace=${workspace.workspaceId}`}
                        className="block"
                      >
                        <Card className="p-5 cursor-pointer transition-shadow hover:shadow-md">
                          <div className="profileCardHeader">
                            <div>
                              <p className="cardLabel">{item.campaign.status}</p>
                              <h2>{item.campaign.name}</h2>
                            </div>
                            <Badge variant="secondary">
                              {item.isSenderAware ? "Sender-aware" : "Basic mode"}
                            </Badge>
                          </div>

                          <p>{item.campaign.offerSummary ?? "No offer summary yet."}</p>
                          <p>
                            {item.campaign.targetIcp ??
                              "Add an ICP so later research, drafting, and review stages stay focused on the right client motion."}
                          </p>
                          <p>
                            Open the campaign to manage the next stage directly: add target accounts, move them into research, review drafts, and track replies in one place. As reply history accumulates, the workflow can rely on more informed campaign-level guidance.
                          </p>
                          <div className="pillRow compactPillRow">
                            <Badge variant="secondary">
                              Outbound {item.performance?.outboundMessages ?? 0}
                            </Badge>
                            <Badge variant="secondary">
                              Replies {item.performance?.replies ?? 0}
                            </Badge>
                            <Badge variant="secondary">
                              Positive {item.performance?.positiveReplies ?? 0}
                            </Badge>
                            <Badge variant="secondary">
                              Reply rate {formatPerformanceRate(item.performance?.replyRate)}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-4">
            <ActionEmptyState
              label="No campaigns yet"
              title={emptyState.title}
              description={emptyState.description}
              nextAction={emptyState.nextAction}
              actions={
                <>
                  <Button asChild>
                    <Link href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}>
                      Create client workflow
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/app/sender-profiles?workspace=${workspace.workspaceId}`}>
                      Review sender profiles
                    </Link>
                  </Button>
                </>
              }
            />
          </div>
        )}
      </Card>
    </main>
  );
}
