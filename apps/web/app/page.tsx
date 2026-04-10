import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { getServerAuthContext } from "../lib/server/auth";

const workflowStages = [
  {
    label: "Context",
    description: "Capture sender voice, client positioning, offer, ICP, and review preferences.",
  },
  {
    label: "Research",
    description: "Ground each target account in public website evidence and confidence-aware summaries.",
  },
  {
    label: "Draft",
    description: "Generate sequence and reply options from stored campaign and prospect context.",
  },
  {
    label: "Review",
    description: "Edit, approve, and decide what should move into inbox drafts or live workflow.",
  },
  {
    label: "Replies",
    description: "Classify inbound replies, preserve thread history, and draft response options.",
  },
  {
    label: "Learning",
    description: "Use campaign history, edits, selections, and outcomes to inform future guidance.",
  },
];

const valuePillars = [
  {
    title: "Workflow ownership",
    description:
      "Move client work from brief to prospect research to reviewed outreach without splitting context across disconnected tools.",
  },
  {
    title: "Evidence-first personalization",
    description:
      "Research snapshots keep personalization tied to public website evidence, confidence signals, and reviewable claims.",
  },
  {
    title: "Operational memory",
    description:
      "Sender profiles, campaign briefs, threads, edits, and approved artifacts remain attached to the workspace over time.",
  },
  {
    title: "Human-reviewed execution",
    description:
      "AI proposes research, classifications, and drafts. Your team reviews, edits, approves, and decides what gets used.",
  },
];

const surfaceRows = [
  {
    label: "Client brief",
    title: "Pipeline efficiency launch",
    detail: "Offer, ICP, tone, framework, and sender context stay reusable across target accounts.",
  },
  {
    label: "Research snapshot",
    title: "Evidence attached",
    detail: "Public website observations, confidence flags, and personalization hooks are stored for review.",
  },
  {
    label: "Reply handling",
    title: "Intent: needs more info",
    detail: "Inbound replies can be classified and turned into response draft options for human review.",
  },
];

const trustChecks = [
  "No autonomous sending in the current workflow",
  "Drafts and replies stay reviewable before use",
  "Quality checks flag unsupported claims and tone risk",
  "Workspace-scoped records preserve client separation",
];

type HomePageProps = {
  searchParams?: Promise<{
    notice?: string;
    error?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [context, params] = await Promise.all([
    getServerAuthContext(),
    searchParams ?? Promise.resolve({} as { notice?: string; error?: string }),
  ]);
  const primaryHref = context.user === null ? "/sign-in" : "/app";
  const primaryLabel = context.user === null ? "Start workspace" : "Open workspace";

  return (
    <main className="landingV2Shell">
      <nav className="landingV2Nav" aria-label="Public navigation">
        <Link href="/" className="landingV2Brand" aria-label="OutFlow home">
          <span className="landingV2BrandMark">OF</span>
          <span>OutFlow</span>
        </Link>
        <div className="landingV2NavLinks">
          <Link href="#workflow">Workflow</Link>
          <Link href="#memory">Memory</Link>
          <Link href="#trust">Trust</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <Link href={primaryHref} className="landingV2NavCta">
          {context.user === null ? "Sign in" : "Dashboard"}
        </Link>
      </nav>

      <section className="landingV2Hero" aria-labelledby="landing-title">
        <div className="landingV2HeroCopy">
          <p className="landingV2Eyebrow">Agency-grade outbound workflow</p>
          <h1 id="landing-title">The operating system for hyperpersonalized cold email.</h1>
          <p className="landingV2Lead">
            OutFlow helps outbound agencies build better client campaign workflows: set context,
            research target accounts, draft outreach, review with human control, handle replies,
            and learn from campaign history over time.
          </p>
          <div className="landingV2Actions">
            <Link href={primaryHref} className="landingV2ButtonPrimary">
              {primaryLabel}
            </Link>
            <Link href="#product-surface" className="landingV2ButtonSecondary">
              View product flow
            </Link>
          </div>
          <div className="landingV2TrustCue" aria-label="Trust principle">
            <span>AI proposes</span>
            <span aria-hidden="true">→</span>
            <span>humans review</span>
            <span aria-hidden="true">→</span>
            <span>teams approve</span>
          </div>
        </div>

        <div className="landingV2HeroVisual" aria-label="Product workflow preview">
          <div className="landingV2Window">
            <div className="landingV2WindowTop">
              <span />
              <span />
              <span />
              <strong>Client campaign workflow</strong>
            </div>
            <div className="landingV2WorkspaceMock">
              <aside className="landingV2MockSidebar">
                <span className="landingV2MockLogo">OutFlow</span>
                <span className="landingV2MockActive">Campaign brief</span>
                <span>Prospect research</span>
                <span>Sequence review</span>
                <span>Reply handling</span>
              </aside>
              <div className="landingV2MockMain">
                <div className="landingV2MockHeader">
                  <div>
                    <p>Agency client launch</p>
                    <h2>Pipeline efficiency campaign</h2>
                  </div>
                  <span>Human review required</span>
                </div>
                <div className="landingV2MockGrid">
                  {surfaceRows.map((row) => (
                    <article key={row.label} className="landingV2MockCard">
                      <p>{row.label}</p>
                      <h3>{row.title}</h3>
                      <span>{row.detail}</span>
                    </article>
                  ))}
                </div>
                <div className="landingV2DraftPanel">
                  <div>
                    <p>Next recommended step</p>
                    <h3>Review sequence draft before use</h3>
                  </div>
                  <span>Draft only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="landingV2Section landingV2TightSection" aria-labelledby="operator-title">
        <div className="landingV2SectionIntro">
          <p className="landingV2Eyebrow">Built for agency operators</p>
          <h2 id="operator-title">For teams managing client outbound where personalization is still manual-heavy.</h2>
          <p>
            OutFlow is focused on the work between a client brief and a reviewed outbound action:
            preserving context, reducing rework, and keeping approvals visible.
          </p>
        </div>
        <div className="landingV2PillarGrid">
          {valuePillars.map((pillar) => (
            <article key={pillar.title} className="landingV2PillarCard">
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingV2Section" id="workflow" aria-labelledby="workflow-title">
        <div className="landingV2SectionIntro landingV2CenteredIntro">
          <p className="landingV2Eyebrow">Workflow moat</p>
          <h2 id="workflow-title">One visible path from setup to replies and iteration.</h2>
          <p>
            The product is structured as a workflow system, not a one-shot generator. Every stage
            keeps the next handoff easier to inspect, reuse, and improve.
          </p>
        </div>
        <div className="landingV2WorkflowRail">
          {workflowStages.map((stage, index) => (
            <article key={stage.label} className="landingV2WorkflowStage">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{stage.label}</h3>
              <p>{stage.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingV2Section landingV2Split" id="memory" aria-labelledby="memory-title">
        <div className="landingV2SectionIntro">
          <p className="landingV2Eyebrow">Memory and learning</p>
          <h2 id="memory-title">Campaign context becomes more useful as the workspace history grows.</h2>
          <p>
            OutFlow stores operational context across sender profiles, campaign briefs, research
            snapshots, sequences, replies, edits, and outcome-aware signals. The current system uses
            that history conservatively to support more informed guidance, not autonomous optimization.
          </p>
        </div>
        <div className="landingV2MemoryPanel">
          <div className="landingV2MemoryRow">
            <strong>Reusable context</strong>
            <span>Sender voice, offer, ICP, proof points, tone, and campaign preferences.</span>
          </div>
          <div className="landingV2MemoryRow">
            <strong>Stored evidence</strong>
            <span>Research snapshots with source evidence, confidence signals, and personalization hooks.</span>
          </div>
          <div className="landingV2MemoryRow">
            <strong>Outcome-aware history</strong>
            <span>Sent-message tracking, replies, classifications, edits, selections, and usage events.</span>
          </div>
        </div>
      </section>

      <section className="landingV2Section landingV2SurfaceSection" id="product-surface" aria-labelledby="surface-title">
        <div className="landingV2SectionIntro landingV2CenteredIntro">
          <p className="landingV2Eyebrow">Operating surface</p>
          <h2 id="surface-title">Research, drafts, replies, and performance belong in the same review loop.</h2>
          <p>
            The implemented product includes sender profiles, campaigns, prospects, research
            snapshots, generated sequences, reply analysis, draft replies, Gmail draft creation, and
            lightweight performance summaries.
          </p>
        </div>
        <div className="landingV2SurfaceGrid">
          <article className="landingV2SurfaceCard landingV2SurfaceCardWide">
            <p>Prospect workflow</p>
            <h3>Research → sequence draft → review → thread handling</h3>
            <div className="landingV2ProgressLine" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <small>Designed to keep context attached through the full outbound workflow.</small>
          </article>
          <article className="landingV2SurfaceCard">
            <p>Inbox draft</p>
            <h3>Create draft in Gmail</h3>
            <small>Selected generated artifacts can be pushed as drafts. Sending remains a human decision.</small>
          </article>
          <article className="landingV2SurfaceCard">
            <p>Performance summary</p>
            <h3>Reply and positive-reply rates</h3>
            <small>Aggregate campaign snapshots are visible without exposing prospect names or thread content.</small>
          </article>
        </div>
      </section>

      <section className="landingV2Section landingV2TrustSection" id="trust" aria-labelledby="trust-title">
        <div className="landingV2TrustPanel">
          <div>
            <p className="landingV2Eyebrow">Trust model</p>
            <h2 id="trust-title">AI proposes. Human teams approve.</h2>
            <p>
              OutFlow is designed for controlled agency work. The system can suggest research,
              classify replies, and draft messaging, but operators remain responsible for review,
              edits, approvals, and final use.
            </p>
          </div>
          <ul className="landingV2CheckList">
            {trustChecks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landingV2FinalCta" aria-labelledby="final-cta-title">
        <p className="landingV2Eyebrow">Start with the workflow</p>
        <h2 id="final-cta-title">Bring context, research, review, replies, and learning into one operating system.</h2>
        <p>
          Start lean with a workspace, then build from sender context to client campaign execution
          as your agency workflow matures.
        </p>
        <div className="landingV2Actions landingV2FinalActions">
          <Link href={primaryHref} className="landingV2ButtonPrimary">
            {primaryLabel}
          </Link>
          <Link href="/pricing" className="landingV2ButtonSecondary">
            View Starter, Growth, and Enterprise
          </Link>
        </div>
      </section>
    </main>
  );
}
