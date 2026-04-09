import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { getServerAuthContext } from "../lib/server/auth";

const audienceCards = [
  {
    label: "For outbound agencies",
    title: "Run multi-client outbound with tighter workflow control.",
    description:
      "Keep client context, sender positioning, prospect research, thread history, and reply handling in one workspace-scoped system so operators can move faster without losing reviewability.",
    example:
      "Move from client brief to prospect-specific outreach and reply handling without mixing positioning, evidence, or thread context across accounts.",
  },
  {
    label: "Also supports SDR teams",
    title: "Standardize outreach quality across reps.",
    description:
      "Keep sender context, campaign brief, prospect research, and reply handling in one system so every rep works from the same operating standard.",
    example:
      "Turn a campaign brief and sender profile into prospect-specific sequences that still hold up under manager review.",
  },
  {
    label: "Also supports founder-led outbound",
    title: "Keep founder voice intact without losing workflow discipline.",
    description:
      "Capture offer, proof points, and tone once, then keep research, sequence drafting, and reply handling inside a human-reviewed operating flow.",
    example:
      "Move from a target account list to usable outreach and reply drafts without reducing the workflow to generic AI writing.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Set client, sender, and campaign context",
    description:
      "Anchor the workflow in the active sender profile and campaign brief, or use basic mode when the team needs to start lean.",
  },
  {
    step: "02",
    title: "Ground each prospect in public research",
    description:
      "Run a safe website pass to build a structured company profile with evidence, confidence signals, and usable personalization hooks.",
  },
  {
    step: "03",
    title: "Generate, review, and handle replies",
    description:
      "Create outreach sequences, classify inbound replies, and draft response options with stored quality checks, version history, and human control over the next action.",
  },
];

const capabilities = [
  {
    title: "Workflow-aware personalization",
    description:
      "Tie messaging back to the actual client, sender, offer, positioning, proof points, and tone behind the campaign.",
  },
  {
    title: "Prospect research that stays grounded",
    description:
      "Use public website evidence and confidence-aware summaries instead of vague AI assumptions.",
  },
  {
    title: "Sequences and reply intelligence in one operating flow",
    description:
      "Manage first touch through response drafting inside the same workspace-scoped system rather than splitting work across disconnected tools.",
  },
  {
    title: "Operational memory and quality checks",
    description:
      "Review personalization, CTA quality, tone fit, fluff risk, and unsupported-claim risk on stored artifacts with campaign history and outcome-aware signals preserved for later learning and more informed recommendations.",
  },
];

const differentiators = [
  "Built for agency workflows where sender context, prospect context, thread history, and client separation all need to stay connected.",
  "Structured records for campaigns, research, sequences, analyses, edits, and drafts make review easier and operational memory more useful.",
  "Quality, auditability, and version history are first-class product concerns rather than afterthoughts.",
];

const pricingTeaser = [
  {
    tier: "Starter",
    summary: "Start in basic mode and prove the workflow on live client or prospect work.",
  },
  {
    tier: "Growth",
    summary: "Expand sender-aware workflow depth, research headroom, and collaborative operating room.",
  },
  {
    tier: "Enterprise",
    summary: "Increase controls and headroom for multi-client campaign execution.",
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
  const primaryHref = context.user === null ? "/sign-in" : "/app";
  const primaryLabel = context.user === null ? "Start with your workspace" : "Open dashboard";

  return (
    <main className="landingShell">
      <section className="landingHero">
        <div className="landingHeroCopy">
          <p className="eyebrow">Agency-grade cold email workflow</p>
          <h1>The operating system for agency-grade hyperpersonalized cold email.</h1>
          <p className="landingLead">
            OutFlow helps outbound agencies create better, more personalized cold email
            faster by keeping sender context, prospect research, sequence workflow, and reply
            handling inside one human-reviewed operating system. AI proposes research-backed
            outreach and reply options; operators review, edit, and approve what gets used.
          </p>
          <div className="landingHeroActions">
            <Link href={primaryHref} className="buttonPrimary">
              {primaryLabel}
            </Link>
            <Link href="#how-it-works" className="buttonSecondary">
              See how it works
            </Link>
          </div>
          <div className="landingProofRow" aria-label="Product strengths">
            <span className="pill">AI proposes, human approves</span>
            <span className="pill">Prospect research</span>
            <span className="pill">Operational memory</span>
            <span className="pill">Campaign learning</span>
          </div>
        </div>

        <div className="landingHeroPanel">
          <div className="landingSignalCard">
            <p className="cardLabel">What teams get</p>
            <h2>One operating surface for controlled outbound execution.</h2>
            <ul className="landingSignalList">
              <li>Structured sender and campaign context for agency, SDR, founder, or basic mode workflows.</li>
              <li>Confidence-aware research snapshots built from public websites.</li>
              <li>Versioned sequences, reply analysis, and draft responses with visible checks and human approval points.</li>
            </ul>
          </div>
          <div className="landingMetricGrid">
            <div className="dashboardCard landingMetricCard">
              <p className="cardLabel">Research</p>
              <h2>Evidence-first</h2>
              <p>Public website context is preserved for personalization, review, and later reuse.</p>
            </div>
            <div className="dashboardCard landingMetricCard">
              <p className="cardLabel">Workflow</p>
              <h2>Human-controlled</h2>
              <p>AI proposes research, sequence, and reply actions. Teams review, edit, and approve what actually moves into client work.</p>
            </div>
          </div>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="landingSection" id="who-it-is-for" aria-labelledby="who-it-is-for-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Who It Is For</p>
          <h2 id="who-it-is-for-title">Built for agency operators first, while still supporting adjacent outbound motions.</h2>
          <p>
            The primary fit is small-to-mid outbound agencies serving B2B clients with manual-heavy personalization workflows.
          </p>
        </div>
        <div className="landingGrid landingAudienceGrid">
          {audienceCards.map((card) => (
            <article key={card.label} className="dashboardCard landingAudienceCard">
              <p className="cardLabel">{card.label}</p>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <p className="landingExample">{card.example}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingSection" id="how-it-works" aria-labelledby="how-it-works-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">How It Works</p>
          <h2 id="how-it-works-title">A compact workflow from client context to outbound execution to reply handling.</h2>
        </div>
        <div className="landingGrid landingWorkflowGrid">
          {workflowSteps.map((item) => (
            <article key={item.step} className="panel landingWorkflowCard">
              <p className="cardLabel">Step {item.step}</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingSection" id="capabilities" aria-labelledby="capabilities-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Core Capabilities</p>
          <h2 id="capabilities-title">Everything needed to move from a target account to a reviewed outbound action.</h2>
        </div>
        <div className="landingGrid landingCapabilitiesGrid">
          {capabilities.map((capability) => (
            <article key={capability.title} className="dashboardCard landingCapabilityCard">
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingSection landingSplitSection" id="differentiation" aria-labelledby="differentiation-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Differentiation</p>
          <h2 id="differentiation-title">Designed for credible campaign workflow, not just fast text generation.</h2>
          <p>
            The product is structured around workflow ownership, operational memory, campaign learning informed by history, and visible quality review.
          </p>
        </div>
        <div className="panel landingDifferentiationPanel">
          <ul className="milestoneList landingDifferentiationList">
            {differentiators.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landingSection" id="pricing" aria-labelledby="pricing-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Pricing</p>
          <h2 id="pricing-title">Start lean, then add headroom as the workflow expands.</h2>
          <p>
            Plans are designed around workflow access and operational headroom rather than credit-style pricing language.
          </p>
        </div>
        <div className="pricingGrid">
          {pricingTeaser.map((plan, index) => (
            <article
              key={plan.tier}
              className={`pricingCard ${index === 1 ? "featuredPricingCard" : ""}`.trim()}
            >
              <p className="cardLabel">{plan.tier}</p>
              <h3>{plan.tier}</h3>
              <p>{plan.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingSection landingCtaSection" aria-labelledby="cta-title">
        <div className="panel landingCtaPanel">
          <div>
            <p className="eyebrow">Get Started</p>
            <h2 id="cta-title">Bring sender context, prospect research, and reply handling into one controlled system.</h2>
            <p>
              Start with a workspace, create the first sender profile or campaign, and move directly into research-backed outbound with review and approval built in.
            </p>
          </div>
          <div className="landingHeroActions">
            <Link href={primaryHref} className="buttonPrimary">
              {primaryLabel}
            </Link>
            <Link href="/pricing" className="buttonSecondary">
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
