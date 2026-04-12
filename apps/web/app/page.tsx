import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { HomeAuthFragmentBridge } from "../components/home-auth-fragment-bridge";
import { MarketingFooter } from "../components/marketing-footer";
import { MarketingSectionHeader } from "../components/marketing-section-header";
import { PublicCtaBand } from "../components/public-cta-band";
import { PublicLandingNav } from "../components/public-landing-nav";
import { getServerAuthContext } from "../lib/server/auth";

const operatingSignals = [
  "Built for outbound agencies",
  "Evidence-backed research",
  "Reviewable drafts",
  "Gmail draft handoff",
];

const buyerProblems = [
  {
    title: "Context gets lost between clients",
    body: "Teams rebuild ICPs, offers, tone, and prior decisions too often because the workflow lives across prompts, docs, and inboxes.",
  },
  {
    title: "Personalization quality becomes inconsistent",
    body: "Research is hard to inspect, draft quality drifts, and outreach starts depending more on operator memory than on a repeatable system.",
  },
  {
    title: "Reply handling breaks the workflow",
    body: "Once conversations start, context splinters again. Teams lose visibility into intent, draft quality, and what actually happened next.",
  },
];

const solutionPoints = [
  "Store sender, campaign, and prospect context in one place",
  "Ground research in visible public-source evidence before it informs outreach",
  "Keep drafts, replies, and handoff inside a human-reviewed operating workflow",
];

const workflowStages = [
  {
    label: "Set the client context",
    note: "Capture offer, ICP, tone, and campaign framing once so the team works from structure, not fresh prompts.",
  },
  {
    label: "Research target accounts",
    note: "Turn public website signals into usable evidence the team can inspect before using it in messaging.",
  },
  {
    label: "Draft and review outreach",
    note: "Generate drafts from stored context, then review and refine them before anything reaches the inbox.",
  },
  {
    label: "Handle replies in the same system",
    note: "Classify inbound replies, preserve thread history, and prepare next drafts without leaving the workflow.",
  },
];

const proofPillars = [
  {
    title: "Safer than disconnected prompting",
    body: "OutFlow keeps research, drafts, and reply handling connected to real records instead of letting context disappear across ad hoc prompt sessions.",
  },
  {
    title: "Built for controlled execution",
    body: "The current product supports Gmail draft handoff, not autonomous sending. Operators still review, edit, and approve what moves forward.",
  },
  {
    title: "More useful as history accumulates",
    body: "Sender profiles, campaign context, reply history, selections, and performance signals make future work more informed without pretending the system runs itself.",
  },
];

const businessOutcomes = [
  {
    title: "Faster campaign setup",
    body: "Start client work from reusable context instead of rebuilding every brief from scratch.",
  },
  {
    title: "Higher-confidence personalization",
    body: "Keep claims tied to visible research so the team can review the reasoning before it appears in outreach.",
  },
  {
    title: "Cleaner operational follow-through",
    body: "Move from research to drafts to replies inside one workflow instead of losing continuity as conversations progress.",
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
        <div className="publicHeroGrid publicHeroGridWide">
          <div className="publicHeroCopy">
            <p className="marketingEyebrow">For outbound agencies serving B2B clients</p>
            <h1 id="landing-title">
              Run better cold email without losing control of the workflow.
            </h1>
            <p className="publicHeroLead">
              OutFlow gives agency teams one structured system for client context,
              prospect research, reviewable drafts, reply handling, and visible
              human approval, so personalized outbound work is easier to run and
              easier to trust.
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
                        Offer, ICP, tone, framework, and sender context stay
                        structured so the next prospect or campaign does not start
                        from scratch.
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

      <section className="publicSection publicProblemSection">
        <div className="publicSectionIntro publicSectionIntroCompact">
          <p className="marketingEyebrow">Why agencies outgrow ad hoc tools</p>
          <h2>Outbound quality usually breaks down where the workflow breaks down.</h2>
          <p>
            Better cold email is not only about drafting better copy. It depends on
            how well the team keeps context, research, review, and replies connected
            as client work gets busier.
          </p>
        </div>
        <div className="publicProblemGrid">
          {buyerProblems.map((problem) => (
            <article key={problem.title} className="publicProblemCard">
              <h3>{problem.title}</h3>
              <p>{problem.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="publicSection" id="workflow">
        <div className="publicSplitGrid publicSolutionSplit">
          <div className="publicPanel">
            <MarketingSectionHeader
              eyebrow="What OutFlow does"
              title="Give the team one operating workflow for context, research, drafts, and replies."
              description={
                <p>
                  Instead of scattering the outbound process across prompts, docs,
                  and inbox cleanup, OutFlow keeps the work inside one structured,
                  reviewable system.
                </p>
              }
            />
            <ul className="publicValueChecklist">
              {solutionPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="publicTrustPanel" id="trust">
            <p className="marketingEyebrow">Trust model</p>
            <h2>Designed for serious client work, not autonomous outbound.</h2>
            <p>
              The product can suggest research, classify replies, and draft
              messaging. Operators still review, edit, approve, and decide what gets
              used.
            </p>
            <ul className="publicTrustChecklist">
              <li>No autonomous sending in the current workflow</li>
              <li>Drafts remain reviewable before use</li>
              <li>Gmail support is draft handoff, not auto-delivery</li>
              <li>Workspace-scoped records preserve client separation</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="publicSection">
        <div className="publicPanel">
          <MarketingSectionHeader
            eyebrow="How the workflow runs"
            title="A cleaner operating loop from setup to reply handling."
            description={
              <p>
                The product is meant to reduce context loss between stages, not just
                generate text in the middle of the process.
              </p>
            }
          />
          <div className="publicWorkflowGrid publicWorkflowGridWide">
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
        <div className="publicSectionIntro publicSectionIntroCompact">
          <p className="marketingEyebrow">Why it is more usable than disconnected prompting</p>
          <h2>Better outbound work needs structure, reviewability, and memory.</h2>
          <p>
            OutFlow is built so the team can reuse context, inspect research, keep
            human control visible, and carry campaign history forward as the account
            book grows.
          </p>
        </div>
        <div className="publicProofGrid">
          {proofPillars.map((pillar) => (
            <article key={pillar.title} className="publicProofCard">
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="publicSection" id="product-surface">
        <div className="publicPanel publicOutcomePanel">
          <MarketingSectionHeader
            eyebrow="What improves"
            title="More structured work, more consistent review, and less operational drag."
            description={
              <p>
                The product is designed to make agency outbound easier to run well,
                not to replace judgment or pretend every step should be automated.
              </p>
            }
            centered
          />
          <div className="publicOutcomeGrid">
            {businessOutcomes.map((item) => (
              <article key={item.title} className="publicOutcomeCard">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicCtaBand
        eyebrow="Bring it together"
        title="Bring context, research, drafts, replies, and learning into one operating workflow."
        description="Keep review visible, move with more structure, and give the team a cleaner system for serious outbound work."
        primaryLabel={primaryLabel}
        primaryHref={primaryHref}
        secondaryLabel="Compare Starter, Growth, and Enterprise"
        secondaryHref="/pricing"
      />
      <MarketingFooter />
    </main>
  );
}
