import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { HomeAuthFragmentBridge } from "../components/home-auth-fragment-bridge";
import {
  MarketingIcon,
  type MarketingIconName,
} from "../components/marketing-icon";
import { MarketingFooter } from "../components/marketing-footer";
import { MarketingSectionHeader } from "../components/marketing-section-header";
import { PublicCtaBand } from "../components/public-cta-band";
import { PublicLandingNav } from "../components/public-landing-nav";
import { getServerAuthContext } from "../lib/server/auth";

const buyerProblems = [
  {
    title: "Client context gets rebuilt too often",
    body: "Briefs, ICP notes, and tone decisions get recreated in docs and prompts instead of staying in one workflow record.",
  },
  {
    title: "Personalization quality drifts",
    body: "When research and drafting are disconnected, quality depends on operator memory instead of a repeatable system.",
  },
  {
    title: "Reply handling breaks continuity",
    body: "Once replies arrive, teams lose visibility into intent, decisions, and what draft should happen next.",
  },
];

const solutionPoints = [
  "Keep sender, campaign, and prospect context in one workspace record",
  "Attach visible public-source research before it influences messaging",
  "Review drafts and reply handling in the same workflow before use",
];

const workflowStages = [
  {
    key: "set-context",
    label: "Set the client context",
    note: "Capture offer, ICP, tone, and campaign framing once so the team can reuse it across accounts.",
  },
  {
    key: "research-accounts",
    label: "Research target accounts",
    note: "Turn public website signals into evidence the team can inspect before using it in outreach.",
  },
  {
    key: "draft-review",
    label: "Draft and review outreach",
    note: "Generate from stored context, then edit and approve before anything reaches an inbox draft.",
  },
  {
    key: "handle-replies",
    label: "Handle replies in the same system",
    note: "Classify inbound replies, preserve thread history, and prepare the next draft in the same system.",
  },
];

type MarketingCardWithIcon = {
  icon: MarketingIconName;
  title: string;
  body: string;
};

const trustSignals: MarketingCardWithIcon[] = [
  {
    icon: "target",
    title: "No autonomous sending in this workflow",
    body: "OutFlow supports reviewable drafting and handoff. Teams decide what gets used before anything is sent.",
  },
  {
    icon: "check",
    title: "Gmail support is draft handoff",
    body: "The current provider path creates drafts for review. It does not auto-deliver outbound messages.",
  },
  {
    icon: "spark",
    title: "Workspace scope keeps separation clear",
    body: "Records are workspace-scoped so context, campaigns, and reply history stay separated between client environments.",
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
  const primaryHref = context.user === null ? "/create-account" : "/app/billing";
  const primaryLabel = context.user === null ? "Create account" : "Choose plan";
  const secondaryLabel = "Compare plans";

  return (
    <main className="publicSiteShell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="publicHeroSection" aria-labelledby="landing-title">
        <div className="publicHeroGrid publicHeroGridWide">
          <div className="publicHeroCopy">
            <p className="marketingEyebrow">For outbound agencies serving B2B clients</p>
            <h1 id="landing-title">Run agency outbound in one controlled workflow.</h1>
            <p className="publicHeroLead">
              OutFlow helps small-to-mid outbound agencies keep context, research,
              drafting, and reply handling in one system so teams can ship
              personalized client work faster without losing human control.
            </p>
            <div className="publicTrustLine" aria-label="Trust principle">
              <span>AI Proposes</span>
              <span aria-hidden="true">-&gt;</span>
              <span>Humans Review</span>
              <span aria-hidden="true">-&gt;</span>
              <span>Teams Approve</span>
            </div>
            <div className="publicActionRow publicHeroActionRow">
              <Link href={primaryHref} className="marketingPrimaryCta">
                {primaryLabel}
              </Link>
              <Link href="/pricing" className="marketingSecondaryCta">
                {secondaryLabel}
              </Link>
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
                    <article className="publicSurfaceCard publicSurfaceCardWide publicSurfaceCardTight">
                      <p className="marketingSurfaceEyebrow">Campaign brief</p>
                      <h3>Reusable client context</h3>
                      <p>
                        Offer, ICP, tone, framework, and sender context stay
                        structured so the next prospect or campaign does not start
                        from scratch.
                      </p>
                    </article>
                    <article className="publicSurfaceCard publicSurfaceCardTight">
                      <p className="marketingSurfaceEyebrow">Research snapshot</p>
                      <h3>Evidence attached</h3>
                      <p>
                        Public website observations and confidence flags stay visible
                        for review before they influence outreach.
                      </p>
                    </article>
                    <article className="publicSurfaceCard publicSurfaceCardTight">
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
        <div className="publicSectionIntro publicSectionIntroCompact publicProblemIntro">
          <p className="marketingEyebrow">Why agencies outgrow ad hoc tools</p>
          <h2>Outbound quality usually breaks where the workflow breaks.</h2>
          <p>
            Better cold email depends on how well context, research, review, and
            replies stay connected as delivery volume grows.
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
          <div className="publicPanel publicSolutionPanel">
            <MarketingSectionHeader
              eyebrow="How OutFlow works"
              title="Give the team one system for context, research, drafts, and replies."
              description={
                <p>
                  Instead of scattering work across prompts, docs, and inbox cleanup,
                  OutFlow keeps execution in one structured and reviewable workflow.
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
            <h2>AI proposes, human approves.</h2>
            <p>
              OutFlow can suggest research, classify replies, and draft messaging.
              Operators review, edit, and approve what gets used.
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
        <div className="publicPanel publicWorkflowPanel">
          <MarketingSectionHeader
            eyebrow="Workflow"
            title="From setup to reply handling, the workflow stays connected."
            description={
              <p>
                This flow is built to reduce context loss between stages, not just
                generate copy in isolation.
              </p>
            }
          />
          <div className="publicWorkflowGrid publicWorkflowGridWide">
            {workflowStages.map((stage, index) => (
              <article key={stage.key} className="publicWorkflowCard">
                <div className="publicWorkflowCardHeader">
                  <span className="publicWorkflowIndex">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{stage.label}</h3>
                </div>
                <p>{stage.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="publicSection" id="memory">
        <div className="publicSectionIntro publicSectionIntroCompact publicMemoryIntro">
          <p className="marketingEyebrow">Proof-ready trust signals</p>
          <h2>Built for controlled outbound, not black-box automation.</h2>
          <p>
            These claims are grounded in current product behavior and easy to verify
            during a pilot.
          </p>
        </div>
        <div className="publicProofGrid">
          {trustSignals.map((pillar) => (
            <article key={pillar.title} className="publicProofCard">
              <div className="publicCardTitleRow">
                <span className="publicCardIcon" aria-hidden="true">
                  <MarketingIcon name={pillar.icon} />
                </span>
                <h3>{pillar.title}</h3>
              </div>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicCtaBand
        eyebrow="Bring it together"
        title="Bring context, research, drafts, and replies into one operating workflow."
        description="Start with account setup, pick the right plan, and run client outbound in a system built for review and control."
        primaryLabel={primaryLabel}
        primaryHref={primaryHref}
        secondaryLabel={secondaryLabel}
        secondaryHref="/pricing"
      />
      <MarketingFooter />
    </main>
  );
}
