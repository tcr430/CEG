import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { HomeAuthFragmentBridge } from "../components/home-auth-fragment-bridge";
import { MarketingFooter } from "../components/marketing-footer";
import { MarketingSectionHeader } from "../components/marketing-section-header";
import { PublicCtaBand } from "../components/public-cta-band";
import { PublicLandingNav } from "../components/public-landing-nav";
import { getServerAuthContext } from "../lib/server/auth";

const operatingSignals = [
  "Agency-first workflow system",
  "Human-reviewed output",
  "Workspace-scoped history",
  "Gmail draft handoff",
];

const valuePillars = [
  {
    title: "Workflow ownership",
    description:
      "Move from brief to research to reviewed outreach in one operating surface instead of a stack of disconnected tools and documents.",
  },
  {
    title: "Evidence-first personalization",
    description:
      "Prospect research stays attached to public-source evidence, confidence cues, and usable personalization hooks your team can inspect.",
  },
  {
    title: "Operational memory",
    description:
      "Sender context, campaign briefs, thread history, edits, and selected drafts remain available as reusable workspace context.",
  },
  {
    title: "Controlled execution",
    description:
      "The product can draft and classify, but operators still review, edit, approve, and decide what should move into inbox drafts or client work.",
  },
];

const workflowStages = [
  {
    label: "Set context",
    note: "Capture sender voice, offer, ICP, and campaign framing once so later work starts from structure instead of blank prompts.",
  },
  {
    label: "Research accounts",
    note: "Ground outreach in public website evidence and preserve the reasoning behind each personalization direction.",
  },
  {
    label: "Draft sequences",
    note: "Generate sequence and reply options from stored context instead of one-off generation with no campaign memory.",
  },
  {
    label: "Review and refine",
    note: "Keep operators in control with visible drafts, quality checks, and explicit approval before use.",
  },
  {
    label: "Handle replies",
    note: "Store thread history, classify inbound replies, and create response options inside the same workflow.",
  },
  {
    label: "Learn from outcomes",
    note: "Carry forward campaign history, edits, selections, and reply outcomes so future guidance is more informed.",
  },
];

const operatingNotes = [
  {
    title: "Stored memory",
    body: "Sender profiles, campaign briefs, approved messaging patterns, and thread history remain available to the workspace over time.",
  },
  {
    title: "Performance-aware, not autonomous",
    body: "Campaign history and outcome signals support more informed guidance later, but the system does not claim self-optimizing outbound.",
  },
  {
    title: "Review before use",
    body: "Drafts can move into Gmail as drafts, not sent messages. Human approval remains the control point throughout the workflow.",
  },
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
  const primaryHref = context.user === null ? "/sign-up" : "/app";
  const primaryLabel = context.user === null ? "Create workspace" : "Open workspace";

  return (
    <main className="publicSiteShell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="publicHeroSection" aria-labelledby="landing-title">
        <div className="publicHeroGrid">
          <div className="publicHeroCopy">
            <p className="marketingEyebrow">Agency-grade outbound workflow</p>
            <h1 id="landing-title">
              The operating system for hyperpersonalized cold email.
            </h1>
            <p className="publicHeroLead">
              OutFlow helps outbound agencies run a more disciplined client workflow:
              establish context, research target accounts, draft outreach, review with
              human control, handle replies, and carry campaign learning forward over
              time.
            </p>
            <div className="publicActionRow">
              <Link href={primaryHref} className="marketingPrimaryCta">
                {primaryLabel}
              </Link>
              <Link href="/pricing" className="marketingSecondaryCta">
                View plans
              </Link>
            </div>
            <div className="publicTrustLine" aria-label="Trust principle">
              <span>AI proposes</span>
              <span aria-hidden="true">/</span>
              <span>humans review</span>
              <span aria-hidden="true">/</span>
              <span>teams approve</span>
            </div>
            <div className="publicSignalRow">
              {operatingSignals.map((signal) => (
                <span key={signal} className="publicSignalPill">
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div className="publicHeroVisual" aria-label="OutFlow workflow preview">
            <div className="publicWorkspaceWindow">
              <div className="publicWorkspaceTopbar">
                <span />
                <span />
                <span />
                <strong>Client campaign workspace</strong>
              </div>
              <div className="publicWorkspaceBody">
                <aside className="publicWorkspaceSidebar">
                  <p className="marketingSurfaceEyebrow">Workflow</p>
                  <ul className="publicWorkspaceNav">
                    <li className="publicWorkspaceNavItem is-active">Campaign brief</li>
                    <li className="publicWorkspaceNavItem">Prospect research</li>
                    <li className="publicWorkspaceNavItem">Sequence review</li>
                    <li className="publicWorkspaceNavItem">Reply handling</li>
                  </ul>
                </aside>
                <div className="publicWorkspaceMain">
                  <div className="publicWorkspaceHeader">
                    <div>
                      <p className="marketingSurfaceEyebrow">Agency client launch</p>
                      <h2>Pipeline efficiency campaign</h2>
                    </div>
                    <span className="publicStatusBadge">Human review required</span>
                  </div>
                  <div className="publicWorkspaceGrid">
                    <article className="publicSurfaceCard publicSurfaceCardWide">
                      <p className="marketingSurfaceEyebrow">Campaign brief</p>
                      <h3>Reusable client context</h3>
                      <p>
                        Offer, ICP, tone, framework, and sender context stay structured
                        so the next prospect or campaign does not start from scratch.
                      </p>
                    </article>
                    <article className="publicSurfaceCard">
                      <p className="marketingSurfaceEyebrow">Research snapshot</p>
                      <h3>Evidence attached</h3>
                      <p>
                        Public website observations and confidence flags stay visible
                        for review before they influence outreach.
                      </p>
                    </article>
                    <article className="publicSurfaceCard">
                      <p className="marketingSurfaceEyebrow">Reply handling</p>
                      <h3>Intent stays inspectable</h3>
                      <p>
                        Inbound replies can be classified and turned into response
                        drafts without pretending the system should auto-send.
                      </p>
                    </article>
                  </div>
                  <div className="publicRecommendationCard">
                    <div>
                      <p className="marketingSurfaceEyebrow">Next recommended step</p>
                      <h3>Review the draft before it reaches the inbox</h3>
                    </div>
                    <span>Draft only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />
      <HomeAuthFragmentBridge />

      <section className="publicSection">
        <div className="publicPanel">
          <MarketingSectionHeader
            eyebrow="Why it feels different"
            title="Designed for agency operators, not one-off prompt work."
            description={
              <p>
                The product is focused on the work between a client brief and a
                reviewed outbound action. That means stronger workflow continuity,
                clearer control points, and more reusable context as campaigns
                accumulate history.
              </p>
            }
          />
          <div className="publicPillarGrid">
            {valuePillars.map((pillar) => (
              <article key={pillar.title} className="publicFeatureCard">
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="publicSection" id="workflow">
        <div className="publicPanel">
          <MarketingSectionHeader
            eyebrow="Workflow moat"
            title="One coherent operating path from setup to reply handling."
            description={
              <p>
                OutFlow should feel like a real workflow system. Each stage pushes
                the next one forward with better structure, better reuse, and less
                context loss.
              </p>
            }
            centered
          />
          <div className="publicWorkflowGrid">
            {workflowStages.map((stage, index) => (
              <article key={stage.label} className="publicWorkflowCard">
                <span className="publicWorkflowIndex">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{stage.label}</h3>
                <p>{stage.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="publicSection" id="memory">
        <div className="publicSplitGrid">
          <div className="publicPanel">
            <MarketingSectionHeader
              eyebrow="Memory and trust"
              title="Campaign context becomes an asset, not disposable prompt input."
              description={
                <p>
                  Sender profiles, campaign briefs, reply history, selections, and
                  outcome signals make the workspace more useful over time without
                  pretending the product should run outreach autonomously.
                </p>
              }
            />
            <div className="publicNoteStack">
              {operatingNotes.map((note) => (
                <article key={note.title} className="publicNoteCard">
                  <h3>{note.title}</h3>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="publicTrustPanel" id="trust">
            <p className="marketingEyebrow">Trust model</p>
            <h2>Controlled, reviewable, and suited to serious client work.</h2>
            <p>
              The product can suggest research, classify replies, and draft messaging.
              Operators still review, edit, approve, and decide what gets used.
            </p>
            <ul className="publicTrustChecklist">
              <li>No autonomous sending in the current workflow</li>
              <li>Drafts remain reviewable before use</li>
              <li>Quality checks help flag unsupported claims and tone risk</li>
              <li>Workspace-scoped records preserve client separation</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="publicSection" id="product-surface">
        <div className="publicPanel">
          <MarketingSectionHeader
            eyebrow="Operating surface"
            title="Research, drafts, replies, and performance live in the same review loop."
            description={
              <p>
                The current product already includes sender profiles, campaigns,
                prospects, research snapshots, generated sequences, reply analysis,
                Gmail draft creation, and lightweight performance summaries.
              </p>
            }
          />
          <div className="publicSurfaceShowcase">
            <article className="publicSurfaceShowcasePrimary">
              <p className="marketingSurfaceEyebrow">Prospect workflow</p>
              <h3>Research -&gt; draft -&gt; review -&gt; thread handling</h3>
              <p>
                Keep context attached as the workflow moves from evidence gathering
                into sequence work, reply analysis, and human-reviewed draft output.
              </p>
              <div className="marketingStageRail" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>
            <div className="publicSurfaceShowcaseSide">
              <article className="publicSurfaceShowcaseSecondary">
                <p className="marketingSurfaceEyebrow">Inbox draft handoff</p>
                <h3>Create draft in Gmail</h3>
                <p>
                  Selected generated artifacts can move into Gmail as drafts. Sending
                  remains an explicit human action.
                </p>
              </article>
              <article className="publicSurfaceShowcaseSecondary">
                <p className="marketingSurfaceEyebrow">Performance snapshot</p>
                <h3>Reply and positive-reply visibility</h3>
                <p>
                  Structured campaign summaries keep response patterns visible
                  without exposing private thread content on shareable surfaces.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <PublicCtaBand
        eyebrow="Bring it together"
        title="Bring context, research, drafts, replies, and learning into one operating workflow."
        description="Keep review visible, move with more structure, and give the team a cleaner operating surface for serious outbound work."
        primaryLabel={primaryLabel}
        primaryHref={primaryHref}
        secondaryLabel="Compare Starter, Growth, and Enterprise"
        secondaryHref="/pricing"
      />
      <MarketingFooter />
    </main>
  );
}
