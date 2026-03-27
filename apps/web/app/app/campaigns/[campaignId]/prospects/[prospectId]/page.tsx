import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { EvidenceFlag, EvidenceSnippet } from "@ceg/validation";

import { getWorkspaceAppContext } from "../../../../../../lib/server/auth";
import { getProspectForCampaign } from "../../../../../../lib/server/campaigns";
import { getLatestResearchSnapshotForProspect } from "../../../../../../lib/server/prospect-research";
import { getLatestSequenceForProspect } from "../../../../../../lib/server/sequences";
import {
  generateProspectSequenceAction,
  runProspectResearchAction,
} from "../../../actions";

type ProspectDetailPageProps = {
  params: Promise<{
    campaignId: string;
    prospectId: string;
  }>;
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

function renderConfidenceLabel(score: number, label: string) {
  return `${label} confidence (${Math.round(score * 100)}%)`;
}

function softLead(label: "low" | "medium" | "high") {
  return label === "low" ? "Likely" : label === "medium" ? "Inferred" : "Observed";
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
  const prospect = await getProspectForCampaign(
    workspace.workspaceId,
    resolvedParams.campaignId,
    resolvedParams.prospectId,
  );

  if (prospect === null) {
    notFound();
  }

  const [latestSnapshot, latestSequence] = await Promise.all([
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
  ]);

  const companyProfile = latestSnapshot?.structuredData.companyProfile;
  const quality = latestSnapshot?.structuredData.quality;
  const confidenceLabel = quality?.overall.label ?? "low";
  const evidence = (latestSnapshot?.evidence ?? []) as EvidenceSnippet[];
  const qualityFlags = (quality?.flags ?? []) as EvidenceFlag[];
  const painPoints = companyProfile?.likelyPainPoints ?? [];
  const hooks = companyProfile?.personalizationHooks ?? [];
  const allSequenceQualityChecks = latestSequence
    ? [
        ...latestSequence.subjectLineSet.qualityChecks,
        ...latestSequence.openerSet.qualityChecks,
        ...latestSequence.initialEmail.qualityChecks,
        ...latestSequence.followUpSequence.qualityChecks,
      ]
    : [];

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Prospect Research</p>
        <h1>{prospect.companyName ?? prospect.contactName ?? "Prospect detail"}</h1>
        <p className="lede">
          Trigger a safe public-website research pass, preserve evidence, and
          generate sender-aware sequence drafts that stay grounded in the latest
          supported context.
        </p>
      </section>

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
            </div>
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
              </div>
              <div className="researchSection">
                <h3>Initial email</h3>
                <p><strong>{latestSequence.initialEmail.email.subject}</strong></p>
                <p>{latestSequence.initialEmail.email.opener}</p>
                <p>{latestSequence.initialEmail.email.body}</p>
                <p><strong>CTA:</strong> {latestSequence.initialEmail.email.cta}</p>
                <p><strong>Rationale:</strong> {latestSequence.initialEmail.rationale}</p>
              </div>
              <div className="researchSection">
                <h3>Follow-ups</h3>
                <ul className="researchList">
                  {latestSequence.followUpSequence.sequenceSteps.map((step) => (
                    <li key={step.stepNumber}>
                      <strong>Step {step.stepNumber} | Wait {step.waitDays} day(s)</strong>
                      <p><strong>{step.subject}</strong></p>
                      <p>{step.opener}</p>
                      <p>{step.body}</p>
                      <p><strong>CTA:</strong> {step.cta}</p>
                      <p><strong>Rationale:</strong> {step.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="researchSection">
                <h3>Quality checks</h3>
                <ul className="researchList">
                  {allSequenceQualityChecks.map((check, index) => (
                    <li key={`${check.name}-${index}`}>
                      <strong>{check.name}</strong>
                      <p>{check.passed ? "Passed" : "Needs review"}: {check.details}</p>
                    </li>
                  ))}
                </ul>
              </div>
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
            Each generation stores a versioned sequence bundle, rationale, quality checks,
            and provider metadata so the workflow stays audit-friendly and ready for future
            iteration or evaluation.
          </p>
        </div>
      </section>
    </main>
  );
}
