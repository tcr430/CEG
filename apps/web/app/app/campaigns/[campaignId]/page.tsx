import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActionEmptyState } from "../../../../components/action-empty-state";
import { FeedbackBanner } from "../../../../components/feedback-banner";
import { PerformanceSummaryCard } from "../../../../components/performance-summary-card";
import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import {
  getCampaignForWorkspace,
  listProspectsForCampaign,
} from "../../../../lib/server/campaigns";
import { getProspectsEmptyState } from "../../../../lib/empty-state-guidance";
import { getWorkspaceOnboardingSummary } from "../../../../lib/server/onboarding";
import { getCampaignPerformanceMetrics } from "../../../../lib/server/campaign-performance";
import { buildShareablePerformanceSummary } from "../../../../lib/performance-summary";
import { listSenderProfilesForWorkspace } from "../../../../lib/server/sender-profiles";
import { createProspectAction, updateCampaignAction } from "../actions";
import { CampaignForm } from "../campaign-form";
import { ProspectForm } from "../prospect-form";
import { getUpgradePrompt } from "../../../../lib/upgrade-prompts";
import { UpgradePromptCard } from "../../../../components/upgrade-prompt-card";
import { getWorkspaceBillingState } from "../../../../lib/server/billing";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    workspace?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(resolvedSearchParams.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;
  const campaign = await getCampaignForWorkspace(
    workspace.workspaceId,
    resolvedParams.campaignId,
  );

  if (campaign === null) {
    notFound();
  }

  const [senderProfiles, prospects, onboarding, performance, billing] = await Promise.all([
    listSenderProfilesForWorkspace(workspace.workspaceId),
    listProspectsForCampaign(workspace.workspaceId, campaign.id),
    getWorkspaceOnboardingSummary({
      membership: workspace,
      userId: context.user.userId,
    }),
    getCampaignPerformanceMetrics(workspace.workspaceId, campaign.id),
    getWorkspaceBillingState({
      workspaceId: workspace.workspaceId,
      workspacePlanCode: workspace.billingPlanCode,
    }),
  ]);
  const emptyState = getProspectsEmptyState(onboarding.selectedUserType);
  const performanceUpgradePrompt = getUpgradePrompt({
    surface: "campaign_performance",
    billing,
    performance,
  });
  const shareablePerformanceSummary = buildShareablePerformanceSummary({
    scope: "campaign",
    snapshot:
      performance ?? {
        outboundMessages: 0,
        replies: 0,
        positiveReplies: 0,
        replyRate: null,
        positiveReplyRate: null,
        positiveReplyIntents: [],
        calculatedAt: new Date(),
        version: 1,
      },
  });

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Campaigns</p>
        <h1>{campaign.name}</h1>
        <p className="lede">
          Keep the campaign brief, sender-profile choice, and prospect list in
          one protected workspace-scoped place before adding research or
          generation later on.
        </p>
      </section>

      <FeedbackBanner error={resolvedSearchParams.error} success={resolvedSearchParams.success} />

      <div className="inlineActions profileHeaderActions">
        <Link
          href={`/app/campaigns?workspace=${workspace.workspaceId}`}
          className="buttonSecondary"
        >
          Back to campaigns
        </Link>
      </div>

      <section className="profileDetailGrid">
        <div className="stack">
          <div className="dashboardCard">
            <p className="cardLabel">Campaign summary</p>
            <h2>{campaign.status}</h2>
            <p>{campaign.offerSummary ?? "No offer summary yet."}</p>
            <p>
              {campaign.targetIcp ??
                "Add ICP detail so future prospecting and generation stay focused."}
            </p>
            <div className="pillRow">
              <span className="pill">
                {campaign.senderProfileId ? "Sender-aware" : "Basic mode"}
              </span>
              {campaign.targetIndustries.map((industry) => (
                <span key={industry} className="pill">
                  {industry}
                </span>
              ))}
            </div>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Prospects</p>
            <h2>{prospects.length} in this campaign</h2>
            <p>
              Add prospects directly inside the campaign so workspace scoping and
              campaign membership remain explicit from the start.
            </p>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Outbound performance</p>
            <h2>{performance?.outboundMessages ?? 0} outbound message(s)</h2>
            <p>Replies: {performance?.replies ?? 0}. Positive replies: {performance?.positiveReplies ?? 0}.</p>
            <div className="pillRow">
              <span className="pill">Reply rate: {performance?.replyRate === null || performance?.replyRate === undefined ? "n/a" : `${Math.round(performance.replyRate * 100)}%`}</span>
              <span className="pill">Positive reply rate: {performance?.positiveReplyRate === null || performance?.positiveReplyRate === undefined ? "n/a" : `${Math.round(performance.positiveReplyRate * 100)}%`}</span>
            </div>
          </div>

          <PerformanceSummaryCard summary={shareablePerformanceSummary} />

          {performanceUpgradePrompt ? (
            <UpgradePromptCard
              workspaceId={workspace.workspaceId}
              prompt={performanceUpgradePrompt}
            />
          ) : null}

          <div id="prospect-form">
            <ProspectForm
              action={createProspectAction}
              workspaceId={workspace.workspaceId}
              campaignId={campaign.id}
            />
          </div>

          <div className="profileList">
            {prospects.length > 0 ? (
              prospects.map((prospect) => (
                <Link
                  key={prospect.id}
                  href={`/app/campaigns/${campaign.id}/prospects/${prospect.id}?workspace=${workspace.workspaceId}`}
                  className="profileCard"
                >
                  <div className="profileCardHeader">
                    <div>
                      <p className="cardLabel">{prospect.status}</p>
                      <h2>{prospect.companyName ?? "Unnamed company"}</h2>
                    </div>
                    <div className="pillRow compactPillRow">
                      {prospect.contactName ? (
                        <span className="pill">{prospect.contactName}</span>
                      ) : null}
                      {prospect.status === "researched" ? (
                        <span className="pill">Research ready</span>
                      ) : null}
                    </div>
                  </div>
                  <p>{prospect.companyWebsite ?? "No website yet"}</p>
                  <p>{prospect.email ?? "No contact email yet"}</p>
                </Link>
              ))
            ) : (
              <ActionEmptyState
                label="No prospects yet"
                title={emptyState.title}
                description={emptyState.description}
                nextAction={emptyState.nextAction}
                actions={
                  <a href="#prospect-form" className="buttonPrimary">
                    Add prospect
                  </a>
                }
              />
            )}
          </div>
        </div>

        <CampaignForm
          action={updateCampaignAction}
          workspaceId={workspace.workspaceId}
          senderProfiles={senderProfiles}
          submitLabel="Save campaign"
          campaign={campaign}
        />
      </section>
    </main>
  );
}

