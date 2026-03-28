import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type {
  DraftReplyQualityReport,
  EvidenceFlag,
  EvidenceSnippet,
  SequenceQualityReport,
} from "@ceg/validation";

import { FeedbackBanner } from "../../../../../../components/feedback-banner";
import { SubmitButton } from "../../../../../../components/submit-button";

import { getWorkspaceAppContext } from "../../../../../../lib/server/auth";
import { getWorkspaceBillingState } from "../../../../../../lib/server/billing";
import { getProspectForCampaign } from "../../../../../../lib/server/campaigns";
import { getLatestResearchSnapshotForProspect } from "../../../../../../lib/server/prospect-research";
import { getReplyThreadStateForProspect } from "../../../../../../lib/server/replies";
import { getLatestSequenceForProspect } from "../../../../../../lib/server/sequences";
import {
  analyzeReplyAction,
  appendGeneratedSequenceMessagesAction,
  createInboundReplyAction,
  createManualOutboundMessageAction,
  editReplyDraftAction,
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

function getFailedQualityChecks(report: SequenceQualityReport | DraftReplyQualityReport | null) {
  return report?.checks.filter((check) => !check.passed) ?? [];
}

export default async function ProspectDetailPage({
  params,
  searchParams,
}: ProspectDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(resolvedSearchParams.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;
  const billing = await getWorkspaceBillingState({
    workspaceId: workspace.workspaceId,
    workspacePlanCode: workspace.billingPlanCode,
  });
  const prospect = await getProspectForCampaign(
    workspace.workspaceId,
    resolvedParams.campaignId,
    resolvedParams.prospectId,
  );

  if (prospect === null) {
    notFound();
  }

  const [latestSnapshot, latestSequence, replyState] = await Promise.all([
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

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Prospect Research</p>
        <h1>{prospect.companyName ?? prospect.contactName ?? "Prospect detail"}</h1>
        <p className="lede">
          Run grounded prospect research, generate outreach sequences, and manage
          the full prospect thread without mixing server logic into the UI.
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
          <div className="dashboardCard">
            <p className="cardLabel">Prospect summary</p>
            <h2>{prospect.contactName ?? prospect.companyName ?? "Prospect"}</h2>
            <p>{prospect.companyWebsite ?? "Add a public website URL to run research."}</p>
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
            <p className="cardLabel">Plan guardrails</p>
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

          <form action={runProspectResearchAction} className="panel prospectResearchForm">
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
              builds a confidence-aware company profile, and stores a research snapshot.
            </p>

            <div className="inlineActions">
              <button type="submit" className="buttonPrimary">
                Run website research
              </button>
            </div>
          </form>

          <form action={generateProspectSequenceAction} className="panel prospectResearchForm">
            <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
            <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
            <input type="hidden" name="prospectId" value={prospect.id} />

            <p className="statusMessage">
              Sequence generation uses the campaign brief, sender profile when available,
              and the latest research snapshot. If research confidence is low, the copy is
              instructed to stay softer and avoid unsupported specifics.
            </p>

            <div className="inlineActions">
              <button type="submit" className="buttonPrimary">
                Generate email sequence
              </button>
            </div>
          </form>

          <div className="dashboardCard researchSnapshotCard">
            <p className="cardLabel">Conversation thread</p>
            <h2>Prospect thread timeline</h2>
            <p>
              Capture inbound replies, add manual outbound notes, and attach generated
              sequence drafts so the thread stays auditable and easy to scan.
            </p>

            <div className="threadComposerGrid">
              <form action={createInboundReplyAction} className="panel threadComposerCard">
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
                  <button type="submit" className="buttonPrimary">
                    Save inbound reply
                  </button>
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
                  <button type="submit" className="buttonSecondary">
                    Add manual outbound
                  </button>
                </div>
              </form>
            </div>

            <div className="inlineActions">
              {replyState.latestInboundMessage ? (
                <form action={analyzeReplyAction}>
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <SubmitButton className="buttonPrimary" pendingLabel="Analyzing reply...">Analyze latest reply</SubmitButton>
                </form>
              ) : null}

              {replyState.latestAnalysis ? (
                <form action={generateReplyDraftsAction}>
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Generating drafts...">Generate reply drafts</SubmitButton>
                </form>
              ) : null}

              {latestSequence ? (
                <form action={appendGeneratedSequenceMessagesAction}>
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="campaignId" value={resolvedParams.campaignId} />
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Adding to thread...">Add latest sequence to thread</SubmitButton>
                </form>
              ) : null}
            </div>

            {replyState.timeline.length > 0 ? (
              <div className="threadTimeline">
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
                            {entry.analysis.analysisOutput.analysis.intent === "hard_no" ? (
                              <p className="statusMessage">
                                This reply reads as a hard negative. Recommended action stays
                                courteous and non-pushy.
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {entry.draftBundles.length > 0 ? (
                          <div className="threadInsightCard">
                            <h4>Draft reply versions</h4>
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
                                                    Save edited draft
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
              <div className="researchSection">
                <h3>No thread activity yet</h3>
                <p>
                  Save an inbound reply, add a manual outbound message, or attach the latest
                  generated sequence to start building the thread timeline.
                </p>
              </div>
            )}
          </div>

          {latestSnapshot ? (
            <div className="dashboardCard researchSnapshotCard">
              <p className="cardLabel">Latest snapshot</p>
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
            <div className="dashboardCard">
              <p className="cardLabel">No research snapshot yet</p>
              <h2>Run the first website pass</h2>
              <p>
                Once research runs, the latest structured company profile, evidence,
                and confidence signals will show up here.
              </p>
            </div>
          )}

          {latestSequence ? (
            <div className="dashboardCard researchSnapshotCard">
              <p className="cardLabel">Latest sequence</p>
              <h2>Sequence version {latestSequence.sequenceVersion}</h2>
              <p>
                Generated for {latestSequence.generatedForMode.replaceAll("_", " ")} mode.
              </p>
              <div className="researchSection">
                <h3>Subject lines</h3>
                <ul className="researchList">
                  {latestSequence.subjectLineSet.subjectLines.map((item) => (
                    <li key={item.text}>
                      <strong>{item.text}</strong>
                      <p>{item.rationale}</p>
                    </li>
                  ))}
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
                  {latestSequence.openerSet.openerOptions.map((item) => (
                    <li key={item.text}>
                      <strong>{item.text}</strong>
                      <p>{item.rationale}</p>
                    </li>
                  ))}
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
                    <SubmitButton className="buttonSecondary" pendingLabel="Saving edit...">Save edited initial email</SubmitButton>
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
                          <SubmitButton className="buttonSecondary" pendingLabel="Saving edit...">Save edited step</SubmitButton>
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
            <div className="dashboardCard">
              <p className="cardLabel">No sequence yet</p>
              <h2>Generate the first sequence</h2>
              <p>
                The first run will create multiple subject lines, opener options,
                the initial email, two follow-ups, and a final soft-close email.
              </p>
            </div>
          )}
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Capture notes</p>
          <h2>What gets stored</h2>
          <p>
            The thread now preserves manual outbound messages, generated outbound sequence
            drafts, inbound prospect replies, reply analyses, and draft reply versions so
            future inbox sync can attach to a clean server-side timeline.
          </p>
        </div>
      </section>
    </main>
  );
}