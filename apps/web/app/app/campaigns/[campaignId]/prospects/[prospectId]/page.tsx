import Link from "next/link";
import { notFound } from "next/navigation";

import type {
  AsyncOperationRunState,
  DraftReplyQualityReport,
  EvidenceFlag,
  EvidenceSnippet,
  SequenceQualityReport,
} from "@ceg/validation";

import { ActionEmptyState } from "../../../../../../components/action-empty-state";
import { ArtifactActionButtons } from "../../../../../../components/artifact-action-buttons";
import { WorkflowStageStrip } from "../../../../../../components/workflow-stage-strip";
import { FeedbackBanner } from "../../../../../../components/feedback-banner";
import { SubmitButton } from "../../../../../../components/submit-button";

import {
  getWorkspaceBillingState,
  requireActiveWorkspaceAppContext,
} from "../../../../../../lib/server/billing";
import { getUpgradePrompt } from "../../../../../../lib/upgrade-prompts";
import { UpgradePromptCard } from "../../../../../../components/upgrade-prompt-card";
import {
  getReplyDraftsEmptyState,
  getResearchEmptyState,
  getSequenceEmptyState,
} from "../../../../../../lib/empty-state-guidance";
import {
  buildReplyInboxDraftArtifactId,
  buildSequenceInboxDraftArtifactId,
  indexInboxDraftsByArtifact,
  readInboxDraftLinkFromMessage,
} from "../../../../../../lib/inbox-draft-links";
import { getProspectForCampaign } from "../../../../../../lib/server/campaigns";
import { getWorkspaceInboxState } from "../../../../../../lib/server/inbox/service";
import { getReplyAnalysisGuidance } from "../../../../../../lib/reply-analysis-guidance";
import {
  buildVisibleWorkflowStages,
  getVisibleWorkflowNextAction,
} from "../../../../../../lib/workflow-visibility";
import { getWorkspaceOnboardingSummary } from "../../../../../../lib/server/onboarding";
import { listProspectAsyncOperations } from "../../../../../../lib/server/prospect-job-runs";
import { getLatestResearchSnapshotForProspect } from "../../../../../../lib/server/prospect-research";
import { getReplyThreadStateForProspect } from "../../../../../../lib/server/replies";
import { getLatestSequenceForProspect } from "../../../../../../lib/server/sequences";
import {
  analyzeReplyAction,
  appendGeneratedSequenceMessagesAction,
  createInboundReplyAction,
  createManualOutboundMessageAction,
  createReplyInboxDraftAction,
  createSequenceInboxDraftAction,
  editReplyDraftAction,
  markOutboundMessageSentAction,
  editSequenceStepAction,
  generateProspectSequenceAction,
  generateReplyDraftsAction,
  regenerateReplyDraftAction,
  regenerateSequencePartAction,
  runProspectResearchAction,
} from "../../../actions";

type ProspectDetailPageProps = {
  params: Promise<{
    campaignId: string;
    prospectId: string;
  }>;
  searchParams?: Promise<{
    workspace?: string;
    error?: string;
    success?: string;
  }>;
};

function renderConfidenceLabel(score: number, label: string) {
  return `${label} confidence (${Math.round(score * 100)}%)`;
}

function softLead(label: "low" | "medium" | "high") {
  return label === "low" ? "Likely" : label === "medium" ? "Inferred" : "Observed";
}

function formatIntent(intent: string) {
  return intent.replaceAll("_", " ");
}

function readMessageMetaString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function readMessageMetaNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function formatMessageBadge(direction: string, source: string) {
  const directionLabel = direction === "inbound" ? "Inbound" : "Outbound";
  const sourceLabel = source.charAt(0).toUpperCase() + source.slice(1);
  return `${directionLabel} | ${sourceLabel}`;
}

function formatQualityName(value: string) {
  return value.replaceAll("_", " ");
}

function formatQualityScore(score: number) {
  return `${score}/100`;
}

function formatAllowance(value: number | null, label: string) {
  return value === null ? `Unlimited ${label}` : `${value} ${label} left this month`;
}

function formatInboxDraftStatus(status: "created" | "updated" | "sent") {
  if (status === "sent") {
    return "Sent";
  }

  return status === "created" ? "Draft in Gmail for review" : "Draft refreshed in Gmail for review";
}

function formatMessageStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getFailedQualityChecks(report: SequenceQualityReport | DraftReplyQualityReport | null) {
  return report?.checks.filter((check) => !check.passed) ?? [];
}

function formatAsyncOperationLabel(kind: AsyncOperationRunState["kind"]) {
  switch (kind) {
    case "prospect_research":
      return "Research";
    case "sequence_generation":
      return "Sequence generation";
    case "reply_analysis":
      return "Reply analysis";
    case "reply_drafting":
      return "Reply drafting";
  }
}

function formatAsyncOperationStatus(status: AsyncOperationRunState["status"]) {
  switch (status) {
    case "idle":
      return "Ready";
    case "running":
      return "Running";
    case "succeeded":
      return "Ready";
    case "failed":
      return "Needs review";
  }
}

function formatAsyncOperationTimestamp(value: Date | null | undefined) {
  return value ? value.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : null;
}

export default async function ProspectDetailPage({
  params,
  searchParams,
}: ProspectDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(resolvedSearchParams.workspace);

  const workspace = context.workspace;
  const [billing, prospect] = await Promise.all([
    getWorkspaceBillingState({
      workspaceId: workspace.workspaceId,
      workspacePlanCode: workspace.billingPlanCode,
    }),
    getProspectForCampaign(
      workspace.workspaceId,
      resolvedParams.campaignId,
      resolvedParams.prospectId,
    ),
  ]);

  if (prospect === null) {
    notFound();
  }

  const [latestSnapshot, latestSequence, replyState, onboarding, inboxState] = await Promise.all([
    getLatestResearchSnapshotForProspect(
      workspace.workspaceId,
      resolvedParams.campaignId,
      prospect.id,
    ),
    getLatestSequenceForProspect(
      workspace.workspaceId,
      resolvedParams.campaignId,
      prospect.id,
    ),
    getReplyThreadStateForProspect(
      workspace.workspaceId,
      resolvedParams.campaignId,
      prospect.id,
    ),
    getWorkspaceOnboardingSummary({
      membership: workspace,
      userId: context.user.userId,
    }),
    getWorkspaceInboxState(workspace.workspaceId),
  ]);

  const companyProfile = latestSnapshot?.structuredData.companyProfile;
  const quality = latestSnapshot?.structuredData.quality;
  const confidenceLabel = quality?.overall.label ?? "low";
  const evidence = (latestSnapshot?.evidence ?? []) as EvidenceSnippet[];
  const qualityFlags = (quality?.flags ?? []) as EvidenceFlag[];
  const painPoints = companyProfile?.likelyPainPoints ?? [];
  const hooks = companyProfile?.personalizationHooks ?? [];
  const sequenceQualityReport = latestSequence?.qualityReport ?? null;
  const sequenceFailedChecks = getFailedQualityChecks(sequenceQualityReport);
  const activeInboxAccount =
    inboxState.accounts.find(
      ({ account }) => account.provider === "gmail" && account.status === "active",
    )?.account ?? null;
  const inboxDraftsByArtifact = indexInboxDraftsByArtifact(replyState.messages);
  const hasDraftBundles = replyState.timeline.some((entry) => entry.draftBundles.length > 0);
  const replyDraftState = !replyState.latestInboundMessage
    ? "needs_inbound"
    : !replyState.latestAnalysis
      ? "needs_analysis"
      : "needs_drafts";
  const researchEmptyState = getResearchEmptyState({
    userType: onboarding.selectedUserType,
    hasWebsite: Boolean(prospect.companyWebsite),
  });
  const sequenceEmptyState = getSequenceEmptyState({
    userType: onboarding.selectedUserType,
    hasResearch: latestSnapshot !== null,
  });
  const replyDraftEmptyState = getReplyDraftsEmptyState({
    userType: onboarding.selectedUserType,
    state: replyDraftState,
  });
  const asyncOperations = listProspectAsyncOperations(prospect);
  const workflowUpgradePrompt = getUpgradePrompt({
    surface: "prospect_workflow",
    billing,
    performance: null,
  });
  const workflowStages = buildVisibleWorkflowStages({
    setupReady:
      onboarding.senderProfileCount > 0 || onboarding.selectedUserType === "basic",
    campaignReady: true,
    prospectReady: true,
    researchReady: latestSnapshot !== null,
    draftReady: latestSequence !== null,
    reviewReady: latestSequence !== null,
    replyReady:
      replyState.thread !== null || replyState.latestInboundMessage !== null || hasDraftBundles,
    iterationReady: replyState.latestAnalysis !== null || hasDraftBundles,
  });
  const workflowNextAction = getVisibleWorkflowNextAction(workflowStages);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Prospect workflow</p>
        <h1>{prospect.companyName ?? prospect.contactName ?? "Prospect detail"}</h1>
        <p className="lede">
          Run the full prospect workflow in order: grounded research, reviewed sequence drafts, thread-based reply handling, and outcome-aware iteration inside one workspace-scoped record.
        </p>
      </section>

      <FeedbackBanner error={resolvedSearchParams.error} success={resolvedSearchParams.success} />

      <div className="inlineActions profileHeaderActions">
        <Link
          href={`/app/campaigns/${resolvedParams.campaignId}?workspace=${workspace.workspaceId}`}
          className="buttonSecondary"
        >
          Back to campaign
        </Link>
      </div>

      <section className="profileDetailGrid">
        <div className="stack">
          <WorkflowStageStrip
            label="Workflow moat"
            title="Keep this account inside one end-to-end workflow"
            description="This screen is where the product should feel most productized: the same prospect record carries research, draft generation, human review, reply handling, and the structured signals that make later guidance more informed over time."
            stages={workflowStages}
            nextActionLabel={workflowNextAction ? "Current focus" : undefined}
            nextActionTitle={workflowNextAction?.label}
            nextActionNote={workflowNextAction?.note}
          />

          <div className="dashboardCard">
            <p className="cardLabel">Target account</p>
            <h2>{prospect.contactName ?? prospect.companyName ?? "Prospect"}</h2>
            <p>{prospect.companyWebsite ?? "Add a public website URL to run research."}</p>
            <p>
              This prospect record is the anchor for stored company context, research snapshots, draft history, and reply handling over time.
            </p>
            <div className="pillRow">
              <span className="pill">{prospect.status}</span>
              {latestSnapshot ? (
                <span className="pill">
                  {renderConfidenceLabel(quality?.overall.score ?? 0, confidenceLabel)}
                </span>
              ) : null}
              {latestSequence ? (
                <span className="pill">Sequence v{latestSequence.sequenceVersion}</span>
              ) : null}
              {replyState.thread ? <span className="pill">Thread active</span> : null}
              <span className="pill">{billing.planLabel} plan</span>
            </div>
          </div>
          <div className="dashboardCard">
            <p className="cardLabel">Run status</p>
            <h2>Current stage activity</h2>
            <p>
              Research and generation still complete inline today, but each run now records durable state so retries and future queue workers can resume safely.
            </p>
            <ul className="researchList compactResearchList">
              {asyncOperations.map((job) => {
                const lastTimestamp =
                  formatAsyncOperationTimestamp(job.lastTriggeredAt) ??
                  formatAsyncOperationTimestamp(job.lastSucceededAt) ??
                  formatAsyncOperationTimestamp(job.updatedAt);

                return (
                  <li key={job.kind}>
                    <strong>{formatAsyncOperationLabel(job.kind)}</strong>
                    <p>
                      {formatAsyncOperationStatus(job.status)}
                      {lastTimestamp ? ` | ${lastTimestamp}` : ""}
                    </p>
                    {job.status === "failed" && job.errorSummary ? <p>{job.errorSummary}</p> : null}
                    {job.status === "running" ? (
                      <p>Duplicate triggers are blocked while the current run is still fresh.</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Workflow headroom</p>
            <h2>Current workspace limits</h2>
            <ul className="researchList compactResearchList">
              <li>
                <strong>Sender-aware profiles</strong>
                <p>
                  {billing.features.senderAwareProfiles.allowed
                    ? "Included on this plan."
                    : "Basic mode only on this plan."}
                </p>
              </li>
              <li>
                <strong>Website research</strong>
                <p>{formatAllowance(billing.limits.websiteResearch.remaining, "research runs")}</p>
              </li>
              <li>
                <strong>Sequence generation</strong>
                <p>{formatAllowance(billing.limits.sequenceGeneration.remaining, "sequence runs")}</p>
              </li>
              <li>
                <strong>Reply intelligence</strong>
                <p>
                  {formatAllowance(billing.limits.replyAnalysis.remaining, "reply analyses")} and {" "}
                  {formatAllowance(billing.limits.replyDraftGeneration.remaining, "draft generations")}
                </p>
              </li>
              <li>
                <strong>Regenerations</strong>
                <p>{formatAllowance(billing.limits.regenerations.remaining, "regenerations")}</p>
              </li>
            </ul>
          </div>

          {workflowUpgradePrompt ? (
            <UpgradePromptCard
              workspaceId={workspace.workspaceId}
              prompt={workflowUpgradePrompt}
            />
          ) : null}

          <form id="research-form" action={runProspectResearchAction} className="panel prospectResearchForm">
            <p className="cardLabel">Stage 1</p>
            <h2>Research this target account</h2>
            <p>
              Start by grounding the workflow in real company evidence so later drafts and reviews stay specific. The resulting research snapshot becomes stored context the workflow can reuse later.
            </p>
            <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
            <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
            <input type="hidden" name="prospectId" value={prospect.id} />

            <label className="field">
              <span>Public website URL</span>
              <input
                name="websiteUrl"
                type="url"
                required
                defaultValue={prospect.companyWebsite ?? ""}
                placeholder="https://example.com"
              />
            </label>

            <p className="statusMessage">
              The workflow fetches one public page safely, extracts structured text,
              builds a confidence-aware company profile, and stores a research snapshot for review before generation.
            </p>

            <div className="inlineActions">
              <SubmitButton className="buttonPrimary" pendingLabel="Running research...">Run research step</SubmitButton>
            </div>
          </form>

          <form id="sequence-form" action={generateProspectSequenceAction} className="panel prospectResearchForm">
            <p className="cardLabel">Stage 2</p>
            <h2>Create a draft sequence for review</h2>
            <p>
              Draft only after the brief and research are ready, then treat the output as something to review, not something to send blindly.
            </p>
            <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
            <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
            <input type="hidden" name="prospectId" value={prospect.id} />

            <p className="statusMessage">
              Sequence generation uses the campaign brief, sender profile when available,
              and the latest research snapshot. If research confidence is low, the copy is
              instructed to stay softer and avoid unsupported specifics. The result is a draft sequence for review and editing before use.
            </p>

            <div className="inlineActions">
              <SubmitButton className="buttonPrimary" pendingLabel="Generating sequence...">Create sequence draft</SubmitButton>
            </div>
          </form>

          <div className="dashboardCard researchSnapshotCard">
            <p className="cardLabel">Stage 4</p>
            <h2>Handle replies and follow-through</h2>
            <p>
              Capture inbound replies, add manual outbound notes, and attach generated
              sequence drafts so the thread stays auditable and easy to scan. Reply analysis and draft replies are suggestions for review, not automatic decisions. The thread becomes stored inbox and reply context for later follow-through.
            </p>

            <div className="threadComposerGrid">
              <form id="inbound-reply-form" action={createInboundReplyAction} className="panel threadComposerCard">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                <input type="hidden" name="prospectId" value={prospect.id} />

                <label className="field">
                  <span>Inbound subject</span>
                  <input name="subject" type="text" placeholder="Re: outbound" />
                </label>

                <label className="field">
                  <span>Inbound reply</span>
                  <textarea
                    name="bodyText"
                    required
                    rows={5}
                    placeholder="Paste the latest inbound prospect reply here."
                  />
                </label>

                <div className="inlineActions">
                  <SubmitButton className="buttonPrimary" pendingLabel="Saving inbound reply...">
                    Save inbound reply
                  </SubmitButton>
                </div>
              </form>

              <form action={createManualOutboundMessageAction} className="panel threadComposerCard">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                <input type="hidden" name="prospectId" value={prospect.id} />

                <label className="field">
                  <span>Outbound subject</span>
                  <input name="subject" type="text" placeholder="Draft follow-up subject" />
                </label>

                <label className="field">
                  <span>Manual outbound message</span>
                  <textarea
                    name="bodyText"
                    required
                    rows={5}
                    placeholder="Add a manual outbound draft or note for this thread."
                  />
                </label>

                <div className="inlineActions">
                  <SubmitButton className="buttonSecondary" pendingLabel="Saving outbound note...">
                    Add manual outbound
                  </SubmitButton>
                </div>
              </form>
            </div>

            <div className="inlineActions">
              {replyState.latestInboundMessage ? (
                <form action={analyzeReplyAction}>
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <SubmitButton className="buttonPrimary" pendingLabel="Analyzing reply...">Run reply analysis</SubmitButton>
                </form>
              ) : null}

              {replyState.latestAnalysis ? (
                <form action={generateReplyDraftsAction}>
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Generating drafts...">Generate reply draft options</SubmitButton>
                </form>
              ) : null}

              {latestSequence ? (
                <form action={appendGeneratedSequenceMessagesAction}>
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Adding to thread...">Add latest sequence draft to thread</SubmitButton>
                </form>
              ) : null}
            </div>

            <p className="statusMessage compactStatusMessage">
              AI proposes reply analysis and draft responses here. Your team still decides what to send, edit, save, or move into Gmail.
            </p>

            {!hasDraftBundles ? (
              <ActionEmptyState
                label="No reply drafts yet"
                title={replyDraftEmptyState.title}
                description={replyDraftEmptyState.description}
                nextAction={replyDraftEmptyState.nextAction}
                actions={
                  replyDraftState === "needs_inbound" ? (
                    <a href="#inbound-reply-form" className="buttonPrimary">
                      Save inbound reply
                    </a>
                  ) : replyDraftState === "needs_analysis" ? (
                    <form action={analyzeReplyAction}>
                      <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                      <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                      <input type="hidden" name="prospectId" value={prospect.id} />
                      <SubmitButton className="buttonPrimary" pendingLabel="Analyzing reply...">Run reply analysis</SubmitButton>
                    </form>
                  ) : (
                    <form action={generateReplyDraftsAction}>
                      <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                      <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                      <input type="hidden" name="prospectId" value={prospect.id} />
                      <SubmitButton className="buttonPrimary" pendingLabel="Generating drafts...">Generate reply draft options</SubmitButton>
                    </form>
                  )
                }
              />
            ) : null}

            {replyState.timeline.length > 0 ? (
              <div className="threadTimeline">
                {/* If thread volume grows substantially, move this timeline to paginated server slices. */}
                {replyState.timeline.map((entry) => {
                  const messageSource = readMessageMetaString(
                    entry.message.metadata.source,
                    "manual",
                  );
                  const timelineLabel = readMessageMetaString(
                    entry.message.metadata.timelineLabel,
                    formatMessageBadge(entry.message.direction, messageSource),
                  );
                  const sequenceVersion = readMessageMetaNumber(
                    entry.message.metadata.sequenceVersion,
                  );
                  const inboxDraft = readInboxDraftLinkFromMessage(entry.message);
                  const sentTimestamp = entry.message.sentAt
                    ? entry.message.sentAt.toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : null;

                  const analysisGuidance = entry.analysis
                    ? getReplyAnalysisGuidance({
                        intent: entry.analysis.analysisOutput.analysis.intent,
                        confidenceLabel: entry.analysis.analysisOutput.analysis.confidence.label,
                      })
                    : null;

                  return (
                    <article key={entry.message.id} className="threadTimelineItem">
                      <div className="threadTimelineRail" />
                      <div className="threadTimelineCard">
                        <div className="threadTimelineHeader">
                          <div>
                            <p className="cardLabel">{timelineLabel}</p>
                            <h3>
                              {entry.message.subject ??
                                (entry.message.direction === "inbound"
                                  ? "Inbound message"
                                  : "Outbound message")}
                            </h3>
                          </div>
                          <div className="pillRow compactPillRow">
                            <span className="pill">
                              {formatMessageBadge(entry.message.direction, messageSource)}
                            </span>
                            <span className="pill">
                              {formatMessageStatus(entry.message.status)}
                            </span>
                            <span className="pill">
                              Message v{String(entry.message.metadata.messageVersion ?? 1)}
                            </span>
                            {sequenceVersion ? (
                              <span className="pill">Sequence v{sequenceVersion}</span>
                            ) : null}
                          </div>
                        </div>

                        <p className="threadMessageBody">
                          {entry.message.bodyText ?? "No text captured."}
                        </p>

                        {entry.message.direction === "outbound" ? (
                          <div className="inlineActions compactInlineActions">
                            {inboxDraft ? (
                              <p className="statusMessage compactStatusMessage">
                                {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                                {sentTimestamp ? ` | ${sentTimestamp}` : ""}
                              </p>
                            ) : sentTimestamp ? (
                              <p className="statusMessage compactStatusMessage">
                                Sent {sentTimestamp}
                              </p>
                            ) : null}
                            {entry.message.providerMessageId ? (
                              <p className="statusMessage compactStatusMessage">
                                Provider message id: {entry.message.providerMessageId}
                              </p>
                            ) : null}
                            {entry.message.status !== "sent" && entry.message.status !== "delivered" ? (
                              <form action={markOutboundMessageSentAction} className="inlineActions compactInlineActions">
                                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                                <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                                <input type="hidden" name="prospectId" value={prospect.id} />
                                <input type="hidden" name="messageId" value={entry.message.id} />
                                <input type="hidden" name="sendMode" value={inboxDraft ? "inferred" : "manual"} />
                                {inboxDraft?.providerMessageId ? (
                                  <input type="hidden" name="providerMessageId" value={inboxDraft.providerMessageId} />
                                ) : null}
                                {inboxDraft?.providerThreadId ? (
                                  <input type="hidden" name="providerThreadId" value={inboxDraft.providerThreadId} />
                                ) : null}
                                <SubmitButton
                                  className="buttonSecondary"
                                  pendingLabel="Updating send state..."
                                >
                                  {inboxDraft ? "Mark sent from inbox" : "Mark as sent"}
                                </SubmitButton>
                              </form>
                            ) : null}
                          </div>
                        ) : null}

                        {entry.analysis ? (
                          <div className="threadInsightCard">
                            <div className="pillRow">
                              <span className="pill">
                                Intent: {formatIntent(entry.analysis.analysisOutput.analysis.intent)}
                              </span>
                              <span className="pill">
                                Action: {formatIntent(entry.analysis.strategyOutput.strategy.recommendedAction)}
                              </span>
                              <span className="pill">
                                {renderConfidenceLabel(
                                  entry.analysis.analysisOutput.analysis.confidence.score,
                                  entry.analysis.analysisOutput.analysis.confidence.label,
                                )}
                              </span>
                              <span className="pill">Analysis v{entry.analysis.analysisVersion}</span>
                            </div>
                            {entry.analysis.analysisOutput.analysis.objectionType ? (
                              <p>
                                <strong>Objection type:</strong>{" "}
                                {formatIntent(entry.analysis.analysisOutput.analysis.objectionType)}
                              </p>
                            ) : null}
                            <p>
                              <strong>Rationale:</strong> {entry.analysis.analysisOutput.analysis.rationale}
                            </p>
                            <p>
                              <strong>Drafting strategy:</strong>{" "}
                              {entry.analysis.strategyOutput.strategy.draftingStrategy}
                            </p>
                            {analysisGuidance ? (
                              <p className="statusMessage">{analysisGuidance}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {entry.draftBundles.length > 0 ? (
                          <div className="threadInsightCard">
                            <h4>Draft reply versions</h4>
                            <p className="statusMessage compactStatusMessage">
                              Each version is a proposed response set. Review and edit before using it in a live client thread.
                            </p>
                            <div className="stack">
                              {entry.draftBundles.map((bundle, bundleIndex) => (
                                <section key={`${bundle.version}-${bundle.bundleId}`} className="threadDraftBundle">
                                  <div className="pillRow">
                                    <span className="pill">Drafts v{bundle.version}</span>
                                    <span className="pill">
                                      Action: {formatIntent(bundle.output.recommendedAction)}
                                    </span>
                                    <span className="pill">
                                      {renderConfidenceLabel(
                                        bundle.output.confidence.score,
                                        bundle.output.confidence.label,
                                      )}
                                    </span>
                                  </div>
                                  <p>
                                    <strong>Strategy:</strong> {bundle.output.draftingStrategy}
                                  </p>
                                  <ul className="researchList">
                                    {bundle.output.drafts.map((draft, draftIndex) => {
                                      const storedDraft = bundle.records[draftIndex] ?? null;
                                      const draftQuality = storedDraft?.qualityChecksJson ?? null;
                                      const failedDraftChecks = getFailedQualityChecks(draftQuality);

                                      return (
                                        <li key={draft.slotId}>
                                          <strong>{draft.label}</strong>
                                          {draft.subject ? <p><strong>{draft.subject}</strong></p> : null}
                                          <p>{draft.bodyText}</p>
                                          <p><strong>Strategy note:</strong> {draft.strategyNote}</p>
                                          {bundleIndex === 0 ? (
                                            <>
                                              <ArtifactActionButtons
                                                workspaceId={workspace.workspaceId}
                                                campaignId={resolvedParams.campaignId}
                                                prospectId={prospect.id}
                                                artifactType="draft_reply_option"
                                                targetSlotId={draft.slotId}
                                                copyText={[
                                                  draft.subject ?? null,
                                                  draft.bodyText,
                                                ].filter(Boolean).join("\n\n")}
                                                exportText={[
                                                  draft.subject ?? null,
                                                  draft.bodyText,
                                                ].filter(Boolean).join("\n\n")}
                                                exportFileName={`reply-draft-${draft.slotId}-${prospect.companyDomain ?? prospect.id}.txt`}
                                                allowSelect
                                                allowCopy
                                                allowExport
                                              />
                                              {(() => {
                                                const inboxDraft = inboxDraftsByArtifact.get(
                                                  buildReplyInboxDraftArtifactId({
                                                    inboundMessageId: entry.message.id,
                                                    slotId: draft.slotId,
                                                  }),
                                                );

                                                if (inboxDraft) {
                                                  return (
                                                    <p className="statusMessage compactStatusMessage">
                                                      {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                                                    </p>
                                                  );
                                                }

                                                if (!activeInboxAccount) {
                                                  return (
                                                    <p className="statusMessage compactStatusMessage">
                                                      Connect Gmail in Settings to turn this into a review draft.
                                                    </p>
                                                  );
                                                }

                                                if (!prospect.email) {
                                                  return (
                                                    <p className="statusMessage compactStatusMessage">
                                                      Add a prospect email before creating a Gmail draft.
                                                    </p>
                                                  );
                                                }

                                                return (
                                                  <form action={createReplyInboxDraftAction} className="inlineActions compactInlineActions">
                                                    <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                                                    <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                                                    <input type="hidden" name="prospectId" value={prospect.id} />
                                                    <input type="hidden" name="targetSlotId" value={draft.slotId} />
                                                    <SubmitButton className="buttonSecondary" pendingLabel="Creating draft...">Create Gmail draft</SubmitButton>
                                                  </form>
                                                );
                                              })()}
                                            </>
                                          ) : null}
                                          {draftQuality ? (
                                            <div className="researchSection compactSection">
                                              <div className="pillRow">
                                                <span className="pill">
                                                  Quality {formatQualityScore(draftQuality.summary.score)}
                                                </span>
                                                <span className="pill">
                                                  {draftQuality.summary.label}
                                                </span>
                                                {draftQuality.summary.blocked ? (
                                                  <span className="pill">Review before sending</span>
                                                ) : null}
                                              </div>
                                              <ul className="researchList compactResearchList">
                                                {draftQuality.dimensions.map((dimension) => (
                                                  <li key={dimension.name}>
                                                    <strong>{formatQualityName(dimension.name)}</strong>
                                                    <p>
                                                      {formatQualityScore(dimension.score)} | {dimension.details}
                                                    </p>
                                                  </li>
                                                ))}
                                              </ul>
                                              {failedDraftChecks.length > 0 ? (
                                                <ul className="researchList compactResearchList">
                                                  {failedDraftChecks.map((check) => (
                                                    <li key={check.code}>
                                                      <strong>{formatQualityName(check.code)}</strong>
                                                      <p>{check.message}</p>
                                                    </li>
                                                  ))}
                                                </ul>
                                              ) : (
                                                <p className="statusMessage compactStatusMessage">
                                                  Deterministic checks passed for this stored draft version.
                                                </p>
                                              )}
                                            </div>
                                          ) : null}
                                          {bundleIndex === 0 ? (
                                            <>
                                              <form action={regenerateReplyDraftAction} className="panel prospectResearchForm compactPanel">
                                                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                                                <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                                                <input type="hidden" name="prospectId" value={prospect.id} />
                                                <input type="hidden" name="targetSlotId" value={draft.slotId} />
                                                <label className="field">
                                                  <span>Regeneration feedback</span>
                                                  <textarea
                                                    name="feedback"
                                                    rows={3}
                                                    defaultValue="Make this a little shorter and softer."
                                                  />
                                                </label>
                                                <div className="inlineActions">
                                                  <button type="submit" className="buttonSecondary">
                                                    Regenerate this option
                                                  </button>
                                                </div>
                                              </form>
                                              <form action={editReplyDraftAction} className="panel prospectResearchForm compactPanel">
                                                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                                                <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                                                <input type="hidden" name="prospectId" value={prospect.id} />
                                                <input type="hidden" name="targetSlotId" value={draft.slotId} />
                                                <label className="field">
                                                  <span>Subject</span>
                                                  <input name="subject" defaultValue={draft.subject ?? ""} />
                                                </label>
                                                <label className="field">
                                                  <span>Body</span>
                                                  <textarea name="bodyText" rows={5} defaultValue={draft.bodyText} />
                                                </label>
                                                <label className="field">
                                                  <span>Strategy note</span>
                                                  <textarea name="strategyNote" rows={3} defaultValue={draft.strategyNote} />
                                                </label>
                                                <div className="inlineActions">
                                                  <button type="submit" className="buttonSecondary">
                                                    Save reviewed draft
                                                  </button>
                                                </div>
                                              </form>
                                            </>
                                          ) : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </section>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <ActionEmptyState
                label="No thread activity yet"
                title="Start the first prospect thread"
                description="Store the first inbound or outbound message so analysis, draft replies, and future inbox sync all attach to a clean timeline."
                nextAction="Save the first message, then use analysis and drafting from the stored thread history."
                actions={
                  <>
                    <a href="#inbound-reply-form" className="buttonPrimary">
                      Save inbound reply
                    </a>
                    {latestSequence ? (
                      <form action={appendGeneratedSequenceMessagesAction}>
                        <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                        <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                        <input type="hidden" name="prospectId" value={prospect.id} />
                        <SubmitButton className="buttonSecondary" pendingLabel="Adding to thread...">Add latest sequence draft to thread</SubmitButton>
                      </form>
                    ) : null}
                  </>
                }
              />
            )}
          </div>

          {latestSnapshot ? (
            <div className="dashboardCard researchSnapshotCard">
              <p className="cardLabel">Stage 1 | Research snapshot</p>
              <h2>{companyProfile?.companyName ?? prospect.companyName ?? "Company profile"}</h2>
              <p>
                {softLead(confidenceLabel)} summary: {companyProfile?.summary ?? "No summary extracted yet."}
              </p>
              <div className="researchSection">
                <h3>Value proposition</h3>
                <p>{companyProfile?.valuePropositions[0] ?? "No clear value proposition was extracted."}</p>
              </div>
              <div className="researchSection">
                <h3>Likely target customer</h3>
                <p>
                  {companyProfile?.likelyTargetCustomer ?? companyProfile?.targetCustomers[0] ??
                    "The target customer is still uncertain from the available public copy."}
                </p>
              </div>
              <div className="researchSection">
                <h3>Likely pain points</h3>
                <ul className="researchList">
                  {painPoints.length > 0 ? (
                    painPoints.map((item: string) => <li key={item}>{item}</li>)
                  ) : (
                    <li>Evidence is still too thin to state pain points confidently.</li>
                  )}
                </ul>
              </div>
              <div className="researchSection">
                <h3>Personalization hooks</h3>
                <ul className="researchList">
                  {hooks.length > 0 ? (
                    hooks.map((item: string) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No strong hooks surfaced from the latest snapshot yet.</li>
                  )}
                </ul>
              </div>
              <div className="researchSection">
                <h3>Evidence</h3>
                <ul className="researchList evidenceList">
                  {evidence.length > 0 ? (
                    evidence.map((item: EvidenceSnippet, index: number) => (
                      <li key={`${item.sourceUrl}-${index}`}>
                        <strong>{item.supports.join(", ") || "evidence"}</strong>
                        <p>{item.snippet}</p>
                        <small>{renderConfidenceLabel(item.confidence.score, item.confidence.label)}</small>
                      </li>
                    ))
                  ) : (
                    <li>No evidence snippets were preserved.</li>
                  )}
                </ul>
              </div>
              <div className="researchSection">
                <h3>Confidence flags</h3>
                <ul className="researchList">
                  {qualityFlags.length > 0 ? (
                    qualityFlags.map((flag: EvidenceFlag) => (
                      <li key={flag.code}>{flag.message}</li>
                    ))
                  ) : (
                    <li>No warning flags on the latest snapshot.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <ActionEmptyState
              label="No research snapshot yet"
              title={researchEmptyState.title}
              description={researchEmptyState.description}
              nextAction={researchEmptyState.nextAction}
              actions={
                <a href="#research-form" className="buttonPrimary">
                  Start research stage
                </a>
              }
            />
          )}

          {latestSequence ? (
            <div className="dashboardCard researchSnapshotCard">
              <p className="cardLabel">Stage 3 | Review sequence draft</p>
              <h2>Sequence version {latestSequence.sequenceVersion}</h2>
              <p>
                Generated for {latestSequence.generatedForMode.replaceAll("_", " ")} mode. This draft now joins the stored prospect workflow history.
              </p>
              <p className="statusMessage compactStatusMessage">
                This is the review stage: refine the draft, move the right parts into the thread, and only then create inbox drafts or mark messages as sent.
              </p>
              <div className="researchSection">
                <h3>Subject lines</h3>
                <ul className="researchList">
                  {
                  latestSequence.subjectLineSet.subjectLines.map((item, index) => (
                    <li key={item.text}>
                      <strong>{item.text}</strong>
                      <p>{item.rationale}</p>
                      <ArtifactActionButtons
                        workspaceId={workspace.workspaceId}
                        campaignId={resolvedParams.campaignId}
                        prospectId={prospect.id}
                        artifactType="sequence_subject_line_option"
                        optionIndex={index}
                        allowSelect
                      />
                    </li>
                  ))
                }
                </ul>
                <form action={regenerateSequencePartAction} className="panel prospectResearchForm compactPanel">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <input type="hidden" name="targetPart" value="subject_line" />
                  <label className="field">
                    <span>Regenerate subject lines</span>
                    <textarea
                      name="feedback"
                      rows={3}
                      defaultValue="Keep the set sharper and more specific to this prospect."
                    />
                  </label>
                  <div className="inlineActions">
                    <SubmitButton className="buttonSecondary" pendingLabel="Regenerating...">Regenerate subject set</SubmitButton>
                  </div>
                </form>
              </div>
              <div className="researchSection">
                <h3>Opener options</h3>
                <ul className="researchList">
                  {
                  latestSequence.openerSet.openerOptions.map((item, index) => (
                    <li key={item.text}>
                      <strong>{item.text}</strong>
                      <p>{item.rationale}</p>
                      <ArtifactActionButtons
                        workspaceId={workspace.workspaceId}
                        campaignId={resolvedParams.campaignId}
                        prospectId={prospect.id}
                        artifactType="sequence_opener_option"
                        optionIndex={index}
                        allowSelect
                      />
                    </li>
                  ))
                }
                </ul>
                <form action={regenerateSequencePartAction} className="panel prospectResearchForm compactPanel">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <input type="hidden" name="targetPart" value="opener" />
                  <label className="field">
                    <span>Regenerate opener options</span>
                    <textarea
                      name="feedback"
                      rows={3}
                      defaultValue="Make the openers more tailored to the strongest research hook."
                    />
                  </label>
                  <div className="inlineActions">
                    <SubmitButton className="buttonSecondary" pendingLabel="Regenerating...">Regenerate opener set</SubmitButton>
                  </div>
                </form>
              </div>
              <div className="researchSection">
                <h3>Initial email</h3>
                <p><strong>{latestSequence.initialEmail.email.subject}</strong></p>
                <p>{latestSequence.initialEmail.email.opener}</p>
                <p>{latestSequence.initialEmail.email.body}</p>
                <p><strong>CTA:</strong> {latestSequence.initialEmail.email.cta}</p>
                <p><strong>Rationale:</strong> {latestSequence.initialEmail.rationale}</p>
                <ArtifactActionButtons
                  workspaceId={workspace.workspaceId}
                  campaignId={resolvedParams.campaignId}
                  prospectId={prospect.id}
                  artifactType="sequence_initial_email"
                  copyText={[
                    latestSequence.initialEmail.email.subject,
                    latestSequence.initialEmail.email.opener,
                    latestSequence.initialEmail.email.body,
                    `CTA: ${latestSequence.initialEmail.email.cta}`,
                  ].join("\n\n")}
                  exportText={[
                    latestSequence.initialEmail.email.subject,
                    latestSequence.initialEmail.email.opener,
                    latestSequence.initialEmail.email.body,
                    `CTA: ${latestSequence.initialEmail.email.cta}`,
                  ].join("\n\n")}
                  exportFileName={`sequence-initial-${prospect.companyDomain ?? prospect.id}.txt`}
                  allowCopy
                  allowExport
                />
                {(() => {
                  const inboxDraft = inboxDraftsByArtifact.get(
                    buildSequenceInboxDraftArtifactId({
                      sequenceRecordId: latestSequence.recordId,
                      targetPart: "initial_email",
                    }),
                  );

                  if (inboxDraft) {
                    return (
                      <p className="statusMessage compactStatusMessage">
                        {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                      </p>
                    );
                  }

                  if (!activeInboxAccount) {
                    return (
                      <p className="statusMessage compactStatusMessage">
                        Connect Gmail in Settings to push this email into Gmail as a review draft.
                      </p>
                    );
                  }

                  if (!prospect.email) {
                    return (
                      <p className="statusMessage compactStatusMessage">
                        Add a prospect email before creating a Gmail draft.
                      </p>
                    );
                  }

                  return (
                    <form action={createSequenceInboxDraftAction} className="inlineActions compactInlineActions">
                      <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                      <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                      <input type="hidden" name="prospectId" value={prospect.id} />
                      <input type="hidden" name="artifactType" value="sequence_initial_email" />
                      <SubmitButton className="buttonSecondary" pendingLabel="Creating draft...">Create Gmail draft</SubmitButton>
                    </form>
                  );
                })()}
                <form action={regenerateSequencePartAction} className="panel prospectResearchForm compactPanel">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <input type="hidden" name="targetPart" value="initial_email" />
                  <label className="field">
                    <span>Regenerate this email step</span>
                    <textarea
                      name="feedback"
                      rows={3}
                      defaultValue="Keep the message concise and improve the CTA."
                    />
                  </label>
                  <div className="inlineActions">
                    <SubmitButton className="buttonSecondary" pendingLabel="Regenerating...">Regenerate initial email</SubmitButton>
                  </div>
                </form>
                <form action={editSequenceStepAction} className="panel prospectResearchForm compactPanel">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <input type="hidden" name="targetPart" value="initial_email" />
                  <label className="field">
                    <span>Subject</span>
                    <input name="subject" defaultValue={latestSequence.initialEmail.email.subject} />
                  </label>
                  <label className="field">
                    <span>Opener</span>
                    <textarea name="opener" rows={3} defaultValue={latestSequence.initialEmail.email.opener} />
                  </label>
                  <label className="field">
                    <span>Body</span>
                    <textarea name="body" rows={6} defaultValue={latestSequence.initialEmail.email.body} />
                  </label>
                  <label className="field">
                    <span>CTA</span>
                    <input name="cta" defaultValue={latestSequence.initialEmail.email.cta} />
                  </label>
                  <label className="field">
                    <span>Rationale</span>
                    <textarea name="rationale" rows={3} defaultValue={latestSequence.initialEmail.email.rationale} />
                  </label>
                  <div className="inlineActions">
                    <SubmitButton className="buttonSecondary" pendingLabel="Saving edit...">Save reviewed initial email</SubmitButton>
                  </div>
                </form>
              </div>
              <div className="researchSection">
                <h3>Follow-ups</h3>
                <ul className="researchList sequenceStepList">
                  {latestSequence.followUpSequence.sequenceSteps.map((step) => (
                    <li key={step.stepNumber} className="sequenceStepItem">
                      <strong>Step {step.stepNumber} | Wait {step.waitDays} day(s)</strong>
                      <p><strong>{step.subject}</strong></p>
                      <p>{step.opener}</p>
                      <p>{step.body}</p>
                      <p><strong>CTA:</strong> {step.cta}</p>
                      <p><strong>Rationale:</strong> {step.rationale}</p>
                      <ArtifactActionButtons
                        workspaceId={workspace.workspaceId}
                        campaignId={resolvedParams.campaignId}
                        prospectId={prospect.id}
                        artifactType="sequence_follow_up_step"
                        targetStepNumber={step.stepNumber}
                        copyText={[
                          step.subject,
                          step.opener,
                          step.body,
                          `CTA: ${step.cta}`,
                        ].join("\n\n")}
                        exportText={[
                          step.subject,
                          step.opener,
                          step.body,
                          `CTA: ${step.cta}`,
                        ].join("\n\n")}
                        exportFileName={`sequence-follow-up-${step.stepNumber}-${prospect.companyDomain ?? prospect.id}.txt`}
                        allowCopy
                        allowExport
                      />
                      {(() => {
                        const inboxDraft = inboxDraftsByArtifact.get(
                          buildSequenceInboxDraftArtifactId({
                            sequenceRecordId: latestSequence.recordId,
                            targetPart: "follow_up_step",
                            targetStepNumber: step.stepNumber,
                          }),
                        );

                        if (inboxDraft) {
                          return (
                            <p className="statusMessage compactStatusMessage">
                              {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                            </p>
                          );
                        }

                        if (!activeInboxAccount || !prospect.email) {
                          return null;
                        }

                        return (
                          <form action={createSequenceInboxDraftAction} className="inlineActions compactInlineActions">
                            <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                            <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                            <input type="hidden" name="prospectId" value={prospect.id} />
                            <input type="hidden" name="artifactType" value="sequence_follow_up_step" />
                            <input type="hidden" name="targetStepNumber" value={step.stepNumber} />
                            <SubmitButton className="buttonSecondary" pendingLabel="Creating draft...">Create Gmail draft</SubmitButton>
                          </form>
                        );
                      })()}
                      <form action={regenerateSequencePartAction} className="panel prospectResearchForm compactPanel">
                        <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                        <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                        <input type="hidden" name="prospectId" value={prospect.id} />
                        <input type="hidden" name="targetPart" value="follow_up_step" />
                        <input type="hidden" name="targetStepNumber" value={step.stepNumber} />
                        <label className="field">
                          <span>Regenerate this step</span>
                          <textarea
                            name="feedback"
                            rows={3}
                            defaultValue={`Refresh follow-up ${step.stepNumber} and keep it specific.`}
                          />
                        </label>
                        <div className="inlineActions">
                          <SubmitButton className="buttonSecondary" pendingLabel="Regenerating...">Regenerate step</SubmitButton>
                        </div>
                      </form>
                      <form action={editSequenceStepAction} className="panel prospectResearchForm compactPanel">
                        <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                        <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                        <input type="hidden" name="prospectId" value={prospect.id} />
                        <input type="hidden" name="targetPart" value="follow_up_step" />
                        <input type="hidden" name="targetStepNumber" value={step.stepNumber} />
                        <label className="field">
                          <span>Subject</span>
                          <input name="subject" defaultValue={step.subject} />
                        </label>
                        <label className="field">
                          <span>Opener</span>
                          <textarea name="opener" rows={3} defaultValue={step.opener} />
                        </label>
                        <label className="field">
                          <span>Body</span>
                          <textarea name="body" rows={5} defaultValue={step.body} />
                        </label>
                        <label className="field">
                          <span>CTA</span>
                          <input name="cta" defaultValue={step.cta} />
                        </label>
                        <label className="field">
                          <span>Rationale</span>
                          <textarea name="rationale" rows={3} defaultValue={step.rationale} />
                        </label>
                        <div className="inlineActions">
                          <SubmitButton className="buttonSecondary" pendingLabel="Saving edit...">Save reviewed step</SubmitButton>
                        </div>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
              {sequenceQualityReport ? (
                <div className="researchSection">
                  <h3>Quality review</h3>
                  <div className="pillRow">
                    <span className="pill">
                      Overall {formatQualityScore(sequenceQualityReport.summary.score)}
                    </span>
                    <span className="pill">{sequenceQualityReport.summary.label}</span>
                    {sequenceQualityReport.summary.blocked ? (
                      <span className="pill">Review before use</span>
                    ) : null}
                  </div>
                  <ul className="researchList compactResearchList">
                    {sequenceQualityReport.dimensions.map((dimension) => (
                      <li key={dimension.name}>
                        <strong>{formatQualityName(dimension.name)}</strong>
                        <p>
                          {formatQualityScore(dimension.score)} | {dimension.details}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {sequenceFailedChecks.length > 0 ? (
                    <ul className="researchList compactResearchList">
                      {sequenceFailedChecks.map((check) => (
                        <li key={check.code}>
                          <strong>{formatQualityName(check.code)}</strong>
                          <p>{check.message}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="statusMessage compactStatusMessage">
                      Deterministic quality checks passed for the current stored sequence.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <ActionEmptyState
              label="Stage 2 not started"
              title={sequenceEmptyState.title}
              description={sequenceEmptyState.description}
              nextAction={sequenceEmptyState.nextAction}
              actions={
                <a href="#sequence-form" className="buttonPrimary">
                  Create draft for review
                </a>
              }
            />
          )}
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Workflow memory</p>
          <h2>What this workflow preserves over time</h2>
          <p>
            The thread now preserves manual outbound messages, generated outbound sequence
            drafts, inbound prospect replies, reply analyses, and draft reply versions so
            future inbox sync can attach to a clean server-side timeline. That includes what the system proposed and what a human later edited or approved when the workflow captures it. In practical terms, this is where prospect-level operational memory is already real in the product today.
          </p>
        </div>
      </section>
    </main>
  );
}










