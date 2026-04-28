import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  AnalyzeReplyButton,
  AppendSequenceButton,
  CreateReplyInboxDraftButton,
  CreateSequenceInboxDraftButton,
  EditReplyDraftForm,
  EditSequenceStepForm,
  GenerateReplyDraftsButton,
  GenerateSequenceForm,
  InboundReplyForm,
  ManualOutboundForm,
  MarkOutboundSentButton,
  RegenerateReplyDraftForm,
  RegenerateSequencePartForm,
  ResearchForm,
} from "./forms/prospect-action-forms";
import { ProspectDetailTabs } from "./prospect-detail-tabs";

const VALID_TABS = ["research", "sequence", "replies", "settings"] as const;

type ProspectDetailPageProps = {
  params: Promise<{
    campaignId: string;
    prospectId: string;
  }>;
  searchParams?: Promise<{
    workspace?: string;
    tab?: string;
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

  const commonIds = {
    workspaceId: workspace.workspaceId,
    campaignId: resolvedParams.campaignId,
    prospectId: prospect.id,
  };

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

  // Compute the smart default tab based on workflow progress, then honour a
  // valid ?tab= URL param so a page refresh stays on the same view.
  const computedDefault = !latestSnapshot ? "research" : !latestSequence ? "sequence" : "replies";
  const urlTab = resolvedSearchParams.tab;
  const defaultTab = VALID_TABS.includes(urlTab as (typeof VALID_TABS)[number])
    ? (urlTab as (typeof VALID_TABS)[number])
    : computedDefault;

  // ── Tab content ────────────────────────────────────────────────────────────

  const researchTabContent = (
    <>
      <ResearchForm
        {...commonIds}
        defaultWebsite={prospect.companyWebsite ?? ""}
      />

      {latestSnapshot ? (
        <Card className="p-5 researchSnapshotCard">
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
        </Card>
      ) : (
        <ActionEmptyState
          label="No research snapshot yet"
          title={researchEmptyState.title}
          description={researchEmptyState.description}
          nextAction={researchEmptyState.nextAction}
          actions={
            <Button asChild>
              <a href="#research-form">Start research stage</a>
            </Button>
          }
        />
      )}
    </>
  );

  const sequenceTabContent = (
    <>
      <GenerateSequenceForm {...commonIds} />

      {latestSequence ? (
        <Card className="p-5 researchSnapshotCard">
          <p className="cardLabel">Stage 3 | Review sequence draft</p>
          <h2>Sequence version {latestSequence.sequenceVersion}</h2>
          <p>
            Generated for {latestSequence.generatedForMode.replaceAll("_", " ")} mode. This draft now joins the stored prospect workflow history.
          </p>
          <p className="text-sm text-muted-foreground">
            This is the review stage: refine the draft, move the right parts into the thread, and only then create inbox drafts or mark messages as sent.
          </p>
          <div className="researchSection">
            <h3>Subject lines</h3>
            <ul className="researchList">
              {latestSequence.subjectLineSet.subjectLines.map((item, index) => (
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
              ))}
            </ul>
            <RegenerateSequencePartForm
              {...commonIds}
              targetPart="subject_line"
              defaultFeedback="Keep the set sharper and more specific to this prospect."
              buttonLabel="Regenerate subject set"
              fieldLabel="Regenerate subject lines"
            />
          </div>
          <div className="researchSection">
            <h3>Opener options</h3>
            <ul className="researchList">
              {latestSequence.openerSet.openerOptions.map((item, index) => (
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
              ))}
            </ul>
            <RegenerateSequencePartForm
              {...commonIds}
              targetPart="opener"
              defaultFeedback="Make the openers more tailored to the strongest research hook."
              buttonLabel="Regenerate opener set"
              fieldLabel="Regenerate opener options"
            />
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
                  <p className="text-sm text-muted-foreground">
                    {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                  </p>
                );
              }

              if (!activeInboxAccount) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Connect Gmail in Settings to push this email into Gmail as a review draft.
                  </p>
                );
              }

              if (!prospect.email) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Add a prospect email before creating a Gmail draft.
                  </p>
                );
              }

              return (
                <CreateSequenceInboxDraftButton
                  {...commonIds}
                  artifactType="sequence_initial_email"
                />
              );
            })()}
            <RegenerateSequencePartForm
              {...commonIds}
              targetPart="initial_email"
              defaultFeedback="Keep the message concise and improve the CTA."
              buttonLabel="Regenerate initial email"
              fieldLabel="Regenerate this email step"
            />
            <EditSequenceStepForm
              {...commonIds}
              targetPart="initial_email"
              buttonLabel="Save reviewed initial email"
              defaults={{
                subject: latestSequence.initialEmail.email.subject,
                opener: latestSequence.initialEmail.email.opener,
                body: latestSequence.initialEmail.email.body,
                cta: latestSequence.initialEmail.email.cta,
                rationale: latestSequence.initialEmail.email.rationale,
              }}
            />
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
                        <p className="text-sm text-muted-foreground">
                          {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                        </p>
                      );
                    }

                    if (!activeInboxAccount || !prospect.email) {
                      return null;
                    }

                    return (
                      <CreateSequenceInboxDraftButton
                        {...commonIds}
                        artifactType="sequence_follow_up_step"
                        targetStepNumber={step.stepNumber}
                      />
                    );
                  })()}
                  <RegenerateSequencePartForm
                    {...commonIds}
                    targetPart="follow_up_step"
                    targetStepNumber={step.stepNumber}
                    defaultFeedback={`Refresh follow-up ${step.stepNumber} and keep it specific.`}
                    buttonLabel="Regenerate step"
                    fieldLabel="Regenerate this step"
                  />
                  <EditSequenceStepForm
                    {...commonIds}
                    targetPart="follow_up_step"
                    targetStepNumber={step.stepNumber}
                    buttonLabel="Save reviewed step"
                    defaults={{
                      subject: step.subject,
                      opener: step.opener,
                      body: step.body,
                      cta: step.cta,
                      rationale: step.rationale,
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
          {sequenceQualityReport ? (
            <div className="researchSection">
              <h3>Quality review</h3>
              <div className="pillRow">
                <Badge variant="secondary">
                  Overall {formatQualityScore(sequenceQualityReport.summary.score)}
                </Badge>
                <Badge variant="secondary">{sequenceQualityReport.summary.label}</Badge>
                {sequenceQualityReport.summary.blocked ? (
                  <Badge variant="secondary">Review before use</Badge>
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
                <p className="text-sm text-muted-foreground">
                  Deterministic quality checks passed for the current stored sequence.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      ) : (
        <ActionEmptyState
          label="Stage 2 not started"
          title={sequenceEmptyState.title}
          description={sequenceEmptyState.description}
          nextAction={sequenceEmptyState.nextAction}
          actions={
            <Button asChild>
              <a href="#sequence-form">Create draft for review</a>
            </Button>
          }
        />
      )}
    </>
  );

  const repliesTabContent = (
    <Card className="p-5 researchSnapshotCard">
      <p className="cardLabel">Stage 4</p>
      <h2>Handle replies and follow-through</h2>
      <p>
        Capture inbound replies, add manual outbound notes, and attach generated
        sequence drafts so the thread stays auditable and easy to scan. Reply analysis and draft replies are suggestions for review, not automatic decisions. The thread becomes stored inbox and reply context for later follow-through.
      </p>

      <div className="threadComposerGrid">
        <InboundReplyForm {...commonIds} />
        <ManualOutboundForm {...commonIds} />
      </div>

      <div className="inlineActions">
        {replyState.latestInboundMessage ? (
          <AnalyzeReplyButton {...commonIds} />
        ) : null}

        {replyState.latestAnalysis ? (
          <GenerateReplyDraftsButton {...commonIds} />
        ) : null}

        {latestSequence ? (
          <AppendSequenceButton {...commonIds} />
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
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
              <Button asChild>
                <a href="#inbound-reply-form">Save inbound reply</a>
              </Button>
            ) : replyDraftState === "needs_analysis" ? (
              <AnalyzeReplyButton {...commonIds} />
            ) : (
              <GenerateReplyDraftsButton {...commonIds} variant="default" />
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
                      <Badge variant="secondary">
                        {formatMessageBadge(entry.message.direction, messageSource)}
                      </Badge>
                      <Badge variant="secondary">
                        {formatMessageStatus(entry.message.status)}
                      </Badge>
                      <Badge variant="secondary">
                        Message v{String(entry.message.metadata.messageVersion ?? 1)}
                      </Badge>
                      {sequenceVersion ? (
                        <Badge variant="secondary">Sequence v{sequenceVersion}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <p className="threadMessageBody">
                    {entry.message.bodyText ?? "No text captured."}
                  </p>

                  {entry.message.direction === "outbound" ? (
                    <div className="inlineActions compactInlineActions">
                      {inboxDraft ? (
                        <p className="text-sm text-muted-foreground">
                          {formatInboxDraftStatus(inboxDraft.status)} | {inboxDraft.providerDraftId}
                          {sentTimestamp ? ` | ${sentTimestamp}` : ""}
                        </p>
                      ) : sentTimestamp ? (
                        <p className="text-sm text-muted-foreground">
                          Sent {sentTimestamp}
                        </p>
                      ) : null}
                      {entry.message.providerMessageId ? (
                        <p className="text-sm text-muted-foreground">
                          Provider message id: {entry.message.providerMessageId}
                        </p>
                      ) : null}
                      {entry.message.status !== "sent" && entry.message.status !== "delivered" ? (
                        <MarkOutboundSentButton
                          {...commonIds}
                          messageId={entry.message.id}
                          sendMode={inboxDraft ? "inferred" : "manual"}
                          providerMessageId={inboxDraft?.providerMessageId ?? undefined}
                          providerThreadId={inboxDraft?.providerThreadId ?? undefined}
                          label={inboxDraft ? "Mark sent from inbox" : "Mark as sent"}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {entry.analysis ? (
                    <div className="threadInsightCard">
                      <div className="pillRow">
                        <Badge variant="secondary">
                          Intent: {formatIntent(entry.analysis.analysisOutput.analysis.intent)}
                        </Badge>
                        <Badge variant="secondary">
                          Action: {formatIntent(entry.analysis.strategyOutput.strategy.recommendedAction)}
                        </Badge>
                        <Badge variant="secondary">
                          {renderConfidenceLabel(
                            entry.analysis.analysisOutput.analysis.confidence.score,
                            entry.analysis.analysisOutput.analysis.confidence.label,
                          )}
                        </Badge>
                        <Badge variant="secondary">Analysis v{entry.analysis.analysisVersion}</Badge>
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
                        <p className="text-sm text-muted-foreground">{analysisGuidance}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {entry.draftBundles.length > 0 ? (
                    <div className="threadInsightCard">
                      <h4>Draft reply versions</h4>
                      <p className="text-sm text-muted-foreground">
                        Each version is a proposed response set. Review and edit before using it in a live client thread.
                      </p>
                      <div className="stack">
                        {entry.draftBundles.map((bundle, bundleIndex) => (
                          <section key={`${bundle.version}-${bundle.bundleId}`} className="threadDraftBundle">
                            <div className="pillRow">
                              <Badge variant="secondary">Drafts v{bundle.version}</Badge>
                              <Badge variant="secondary">
                                Action: {formatIntent(bundle.output.recommendedAction)}
                              </Badge>
                              <Badge variant="secondary">
                                {renderConfidenceLabel(
                                  bundle.output.confidence.score,
                                  bundle.output.confidence.label,
                                )}
                              </Badge>
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
                                          const replyInboxDraft = inboxDraftsByArtifact.get(
                                            buildReplyInboxDraftArtifactId({
                                              inboundMessageId: entry.message.id,
                                              slotId: draft.slotId,
                                            }),
                                          );

                                          if (replyInboxDraft) {
                                            return (
                                              <p className="text-sm text-muted-foreground">
                                                {formatInboxDraftStatus(replyInboxDraft.status)} | {replyInboxDraft.providerDraftId}
                                              </p>
                                            );
                                          }

                                          if (!activeInboxAccount) {
                                            return (
                                              <p className="text-sm text-muted-foreground">
                                                Connect Gmail in Settings to turn this into a review draft.
                                              </p>
                                            );
                                          }

                                          if (!prospect.email) {
                                            return (
                                              <p className="text-sm text-muted-foreground">
                                                Add a prospect email before creating a Gmail draft.
                                              </p>
                                            );
                                          }

                                          return (
                                            <CreateReplyInboxDraftButton
                                              {...commonIds}
                                              targetSlotId={draft.slotId}
                                            />
                                          );
                                        })()}
                                      </>
                                    ) : null}
                                    {draftQuality ? (
                                      <div className="researchSection compactSection">
                                        <div className="pillRow">
                                          <Badge variant="secondary">
                                            Quality {formatQualityScore(draftQuality.summary.score)}
                                          </Badge>
                                          <Badge variant="secondary">
                                            {draftQuality.summary.label}
                                          </Badge>
                                          {draftQuality.summary.blocked ? (
                                            <Badge variant="secondary">Review before sending</Badge>
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
                                          <p className="text-sm text-muted-foreground">
                                            Deterministic checks passed for this stored draft version.
                                          </p>
                                        )}
                                      </div>
                                    ) : null}
                                    {bundleIndex === 0 ? (
                                      <>
                                        <RegenerateReplyDraftForm
                                          {...commonIds}
                                          targetSlotId={draft.slotId}
                                          defaultFeedback="Make this a little shorter and softer."
                                        />
                                        <EditReplyDraftForm
                                          {...commonIds}
                                          targetSlotId={draft.slotId}
                                          defaults={{
                                            subject: draft.subject ?? "",
                                            bodyText: draft.bodyText,
                                            strategyNote: draft.strategyNote,
                                          }}
                                        />
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
              <Button asChild>
                <a href="#inbound-reply-form">Save inbound reply</a>
              </Button>
              {latestSequence ? (
                <AppendSequenceButton {...commonIds} />
              ) : null}
            </>
          }
        />
      )}
    </Card>
  );

  const settingsTabContent = (
    <>
      <Card className="p-5">
        <p className="cardLabel">Target account</p>
        <h2>{prospect.contactName ?? prospect.companyName ?? "Prospect"}</h2>
        <p>{prospect.companyWebsite ?? "Add a public website URL to run research."}</p>
        <p>
          This prospect record is the anchor for stored company context, research snapshots, draft history, and reply handling over time.
        </p>
        <div className="pillRow">
          <Badge variant="secondary">{prospect.status}</Badge>
          {latestSnapshot ? (
            <Badge variant="secondary">
              {renderConfidenceLabel(quality?.overall.score ?? 0, confidenceLabel)}
            </Badge>
          ) : null}
          {latestSequence ? (
            <Badge variant="secondary">Sequence v{latestSequence.sequenceVersion}</Badge>
          ) : null}
          {replyState.thread ? <Badge variant="secondary">Thread active</Badge> : null}
          <Badge variant="secondary">{billing.planLabel} plan</Badge>
        </div>
      </Card>

      <Card className="p-5">
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
      </Card>

      {workflowUpgradePrompt ? (
        <UpgradePromptCard
          workspaceId={workspace.workspaceId}
          prompt={workflowUpgradePrompt}
        />
      ) : null}

      <Card className="p-5">
        <p className="cardLabel">Workflow memory</p>
        <h2>What this workflow preserves over time</h2>
        <p>
          The thread now preserves manual outbound messages, generated outbound sequence
          drafts, inbound prospect replies, reply analyses, and draft reply versions so
          future inbox sync can attach to a clean server-side timeline. That includes what the system proposed and what a human later edited or approved when the workflow captures it. In practical terms, this is where prospect-level operational memory is already real in the product today.
        </p>
      </Card>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Prospect workflow</p>
        <h1>{prospect.companyName ?? prospect.contactName ?? "Prospect detail"}</h1>
        <p className="lede">
          Run the full prospect workflow in order: grounded research, reviewed sequence drafts, thread-based reply handling, and outcome-aware iteration inside one workspace-scoped record.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href={`/app/campaigns/${resolvedParams.campaignId}?workspace=${workspace.workspaceId}`}>
            Back to campaign
          </Link>
        </Button>
      </div>

      <WorkflowStageStrip
        label="Workflow moat"
        title="Keep this account inside one end-to-end workflow"
        description="This screen is where the product should feel most productized: the same prospect record carries research, draft generation, human review, reply handling, and the structured signals that make later guidance more informed over time."
        stages={workflowStages}
        nextActionLabel={workflowNextAction ? "Current focus" : undefined}
        nextActionTitle={workflowNextAction?.label}
        nextActionNote={workflowNextAction?.note}
      />

      <Card className="p-5">
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
      </Card>

      <ProspectDetailTabs
        defaultTab={defaultTab}
        tabs={[
          { id: "research", label: "Research", content: researchTabContent },
          { id: "sequence", label: "Sequence", content: sequenceTabContent },
          { id: "replies", label: "Replies", content: repliesTabContent },
          { id: "settings", label: "Settings", content: settingsTabContent },
        ]}
      />
    </main>
  );
}
