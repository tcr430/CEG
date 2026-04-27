import Link from "next/link";

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
    title: "Client context is scattered across tools",
    body: "Campaign briefs, ICP notes, and tone decisions end up split between docs, prompts, and inbox threads.",
  },
  {
    title: "Research and drafting break continuity",
    body: "When evidence is separated from copy, personalization quality drifts and reviews become slower to run.",
  },
  {
    title: "Reply work loses operational control",
    body: "As conversations grow, intent, draft decisions, and next actions are harder to track across client accounts.",
  },
];

const solutionPoints = [
  "Store campaign context once so every operator starts from the same client brief",
  "Attach visible research before any claim is used in outbound copy",
  "Review and approve drafts before inbox handoff",
];

const workflowStages = [
  {
    key: "set-context",
    label: "Set the client context",
    note: "Capture offer, ICP, tone, and campaign framing once so the agency team can reuse it across accounts.",
  },
  {
    key: "research-accounts",
    label: "Research target accounts",
    note: "Turn public website signals into evidence the agency team can inspect before using it in outreach.",
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
    title: "Campaign setup and client context",
    body: "Capture offer, ICP, tone, and approval standards once so every campaign starts from a shared operating brief.",
  },
  {
    icon: "check",
    title: "Prospect research and draft review",
    body: "Research snapshots stay attached to drafts, so reviewers can inspect reasoning before a message is approved.",
  },
  {
    icon: "spark",
    title: "Reply handling in the same workflow",
    body: "Inbound replies can be classified, reviewed, and turned into next drafts without leaving the client workflow.",
  },
];

export default async function HomePage() {
  const context = await getServerAuthContext();
  const primaryHref = context.user === null ? "/create-account" : "/app/billing";
  const primaryLabel =
    context.user === null ? "Start your agency workspace" : "Open billing";
  const secondaryLabel = "See the workflow";

  return (
    <main className="publicSiteShell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="publicHeroSection" aria-labelledby="landing-title">
        <div className="publicHeroGrid publicHeroGridWide">
          <div className="publicHeroCopy">
            <p className="marketingEyebrow">For outbound agencies serving B2B clients</p>
            <h1 id="landing-title">
              The outbound workflow platform for agencies running personalized cold
              email.
            </h1>
            <p className="publicHeroLead">
              Keep client context, prospect research, draft review, and reply handling
              in one place so your agency launches faster, reviews cleaner, and keeps
              control before anything reaches the inbox.
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
              <Link href="/#how-it-works" className="marketingSecondaryCta">
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

      <HomeAuthFragmentBridge />

      <section className="publicSection publicProblemSection" id="product">
        <div className="publicSectionIntro publicSectionIntroCompact publicProblemIntro">
          <p className="marketingEyebrow">Where agency operations break down</p>
          <h2>Most outbound problems start with workflow fragmentation.</h2>
          <p>
            Agencies lose quality when context, research, drafting, review, and replies
            are handled across disconnected tools.
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

      <section className="publicSection" id="how-it-works">
        <div className="publicSplitGrid publicSolutionSplit">
          <div className="publicPanel publicSolutionPanel">
            <MarketingSectionHeader
              eyebrow="How it works"
              title="One workflow from campaign setup to reply handling."
              description={
                <p>
                  OutFlow is built for agency operations: set context, research target
                  accounts, draft and review outbound, then handle replies in the same
                  place.
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
            <p className="marketingEyebrow">Trust and control</p>
            <h2>AI drafts the work. People review every decision.</h2>
            <p>
              OutFlow can suggest research, classify replies, and draft messaging.
              Agency teams review, edit, and approve what moves forward.
            </p>
            <ul className="publicTrustChecklist">
              <li>No autonomous sending in the current product flow</li>
              <li>Research and drafts remain visible and editable before approval</li>
              <li>Gmail integration is draft handoff, not auto-delivery</li>
              <li>Workspace-scoped records preserve client separation</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="publicSection">
        <div className="publicPanel publicWorkflowPanel">
          <MarketingSectionHeader
            eyebrow="Workflow steps"
            title="Run the same four-step flow across every client campaign."
            description={
              <p>
                Keep workflow continuity from setup through reply handling so quality
                does not depend on scattered operator memory.
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

      <section className="publicSection" id="product-detail">
        <div className="publicSectionIntro publicSectionIntroCompact publicMemoryIntro">
          <p className="marketingEyebrow">What you can do in OutFlow today</p>
          <h2>Concrete workflow coverage for day-to-day agency delivery.</h2>
          <p>
            OutFlow focuses on the operational surfaces agencies use every day instead
            of acting like a one-shot email generator.
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
        eyebrow="Ready to move client delivery into one workflow"
        title="Start your agency workspace and run outbound with clearer control."
        description="Create your account, choose the right plan, and keep context, research, drafts, and replies connected from day one."
        primaryLabel={primaryLabel}
        primaryHref={primaryHref}
        secondaryLabel="Compare plans"
        secondaryHref="/pricing"
      />
      <MarketingFooter />
    </main>
  );
}
