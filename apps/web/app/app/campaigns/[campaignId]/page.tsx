import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { ActionEmptyState } from "../../../../components/action-empty-state";
import { PerformanceSummaryCard } from "../../../../components/performance-summary-card";
import { UpgradePromptCard } from "../../../../components/upgrade-prompt-card";
import { WorkflowStageStrip } from "../../../../components/workflow-stage-strip";
import {
  getCampaignForWorkspace,
  listProspectsForCampaign,
} from "../../../../lib/server/campaigns";
import { getProspectsEmptyState } from "../../../../lib/empty-state-guidance";
import { getWorkspaceOnboardingSummary } from "../../../../lib/server/onboarding";
import { getCampaignPerformanceMetrics } from "../../../../lib/server/campaign-performance";
import { buildShareablePerformanceSummary } from "../../../../lib/performance-summary";
import { listSenderProfilesForWorkspace } from "../../../../lib/server/sender-profiles";
import { updateCampaignAction } from "../actions";
import { CampaignForm } from "../campaign-form";
import { ProspectForm } from "../prospect-form";
import { getUpgradePrompt } from "../../../../lib/upgrade-prompts";
import {
  getWorkspaceBillingState,
  requireActiveWorkspaceAppContext,
} from "../../../../lib/server/billing";
import {
  buildVisibleWorkflowStages,
  getVisibleWorkflowNextAction,
} from "../../../../lib/workflow-visibility";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(resolvedSearchParams.workspace);

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
  const workflowStages = buildVisibleWorkflowStages({
    setupReady: campaign.senderProfileId != null || onboarding.selectedUserType === "basic",
    campaignReady: true,
    prospectReady: prospects.length > 0,
    researchReady: prospects.length > 0,
    draftReady: (performance?.outboundMessages ?? 0) > 0,
    reviewReady: (performance?.outboundMessages ?? 0) > 0,
    replyReady: (performance?.replies ?? 0) > 0,
    iterationReady: (performance?.replies ?? 0) > 0,
  });
  const workflowNextAction = getVisibleWorkflowNextAction(workflowStages);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Campaigns</p>
        <h1>{campaign.name}</h1>
        <p className="lede">
          Keep the campaign brief, sender-profile choice, target account list, and workflow history in one protected workspace-scoped place before adding research, generation, reply handling, and performance-aware iteration.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href={`/app/campaigns?workspace=${workspace.workspaceId}`}>
            Back to campaigns
          </Link>
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full max-w-[1080px] items-start">
        <div className="stack">
          <WorkflowStageStrip
            label="Workflow progression"
            title="This campaign should carry the full outbound path"
            description="A campaign is more than a brief. It is the operational spine that links setup context, target accounts, research, drafting, review, reply handling, and later iteration in one place, with campaign history preserved for more informed guidance."
            stages={workflowStages}
            nextActionLabel={workflowNextAction ? "Current focus" : undefined}
            nextActionTitle={workflowNextAction?.label}
            nextActionNote={workflowNextAction?.note}
          />

          <Card className="p-5">
            <p className="cardLabel">Workflow brief</p>
            <h2>{campaign.status}</h2>
            <p>{campaign.offerSummary ?? "No offer summary yet."}</p>
            <p>
              {campaign.targetIcp ??
                "Add ICP detail so future research, personalization, and review stay focused."}
            </p>
            <div className="pillRow">
              <Badge variant="secondary">
                {campaign.senderProfileId ? "Sender-aware" : "Basic mode"}
              </Badge>
              {campaign.targetIndustries.map((industry) => (
                <Badge key={industry} variant="secondary">
                  {industry}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Workflow queue</p>
            <h2>{prospects.length} target account(s)</h2>
            <p>
              Add target accounts directly inside the campaign so workspace scoping,
              campaign membership, and client context remain explicit from the start.
            </p>
            <p className="text-sm text-muted-foreground">
              Next best action: {prospects.length > 0
                ? "Open a live target account and move into research, drafts, review, and reply handling."
                : "Add the first target account so this campaign can move beyond briefing and into live execution."}
            </p>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Performance signals</p>
            <h2>{performance?.outboundMessages ?? 0} outbound message(s)</h2>
            <p>Replies: {performance?.replies ?? 0}. Positive replies: {performance?.positiveReplies ?? 0}.</p>
            <div className="pillRow">
              <Badge variant="secondary">Reply rate: {performance?.replyRate === null || performance?.replyRate === undefined ? "n/a" : `${Math.round(performance.replyRate * 100)}%`}</Badge>
              <Badge variant="secondary">Positive reply rate: {performance?.positiveReplyRate === null || performance?.positiveReplyRate === undefined ? "n/a" : `${Math.round(performance.positiveReplyRate * 100)}%`}</Badge>
            </div>
            <p>
              These metrics are intentionally lightweight today, but they give the campaign real performance history that can inform comparisons, prompts, and next-step recommendations over time.
            </p>
          </Card>

          <PerformanceSummaryCard summary={shareablePerformanceSummary} />

          {performanceUpgradePrompt ? (
            <UpgradePromptCard
              workspaceId={workspace.workspaceId}
              prompt={performanceUpgradePrompt}
            />
          ) : null}

          <div id="prospect-form">
            <ProspectForm
              workspaceId={workspace.workspaceId}
              campaignId={campaign.id}
            />
          </div>

          <div className="grid gap-4">
            {prospects.length > 0 ? (
              prospects.map((prospect) => (
                <Link
                  key={prospect.id}
                  href={`/app/campaigns/${campaign.id}/prospects/${prospect.id}?workspace=${workspace.workspaceId}`}
                  className="block"
                >
                  <Card className="p-5 cursor-pointer transition-shadow hover:shadow-md">
                    <div className="profileCardHeader">
                      <div>
                        <p className="cardLabel">{prospect.status}</p>
                        <h2>{prospect.companyName ?? "Unnamed company"}</h2>
                      </div>
                      <div className="pillRow compactPillRow">
                        {prospect.contactName ? (
                          <Badge variant="secondary">{prospect.contactName}</Badge>
                        ) : null}
                        {prospect.status === "researched" ? (
                          <Badge variant="secondary">Research ready</Badge>
                        ) : null}
                      </div>
                    </div>
                    <p>{prospect.companyWebsite ?? "No website yet"}</p>
                    <p>{prospect.email ?? "No contact email yet"}</p>
                    <p>
                      Open this target account to run the rest of the workflow in order: research, draft, review, reply handling, and outcome-aware iteration informed by the campaign history around it.
                    </p>
                  </Card>
                </Link>
              ))
            ) : (
              <ActionEmptyState
                label="No prospects yet"
                title={emptyState.title}
                description={emptyState.description}
                nextAction={emptyState.nextAction}
                actions={
                  <Button asChild>
                    <a href="#prospect-form">Add target account to workflow</a>
                  </Button>
                }
              />
            )}
          </div>
        </div>

        <CampaignForm
          action={updateCampaignAction}
          workspaceId={workspace.workspaceId}
          senderProfiles={senderProfiles}
          submitLabel="Save workflow brief"
          campaign={campaign}
        />
      </section>
    </main>
  );
}
