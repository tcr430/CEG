import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { getServerAuthContext } from "../lib/server/auth";

const audienceCards = [
  {
    label: "For SDR teams",
    title: "Standardize outreach quality across reps.",
    description:
      "Keep sender context, campaign brief, prospect research, and reply handling in one system so every rep works from the same standard.",
    example: "Turn one ICP and one sender profile into prospect-specific sequences that stay credible under review.",
  },
  {
    label: "For SaaS founders",
    title: "Keep founder-led outbound sharp and personal.",
    description:
      "Capture product positioning, proof points, and founder tone once, then apply that context to research-backed outreach without sounding templated.",
    example: "Move from a target account list to usable first-touch copy and reply drafts without losing the founder voice.",
  },
  {
    label: "For lead gen agencies",
    title: "Run client outbound with tighter controls.",
    description:
      "Separate workspace, sender, campaign, prospect, and thread context so teams can review quality, track changes, and preserve a clean audit trail.",
    example: "Manage multiple motions without mixing client positioning, reply handling, or research evidence across accounts.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Set the sender context",
    description:
      "Use a sender profile for SDR, founder, or agency motions, or stay in basic mode when the workflow needs to start fast.",
  },
  {
    step: "02",
    title: "Ground every prospect in public research",
    description:
      "Run a safe website pass to build a structured company profile with evidence, confidence signals, and usable personalization hooks.",
  },
  {
    step: "03",
    title: "Generate sequences and handle replies",
    description:
      "Create outreach sequences, classify inbound replies, and draft response options with stored quality checks and version history.",
  },
];

const capabilities = [
  {
    title: "Sender-aware personalization",
    description:
      "Tie messaging back to the actual company, offer, positioning, proof points, and tone behind the sender.",
  },
  {
    title: "Prospect research that stays grounded",
    description:
      "Use public website evidence and confidence-aware summaries instead of vague AI assumptions.",
  },
  {
    title: "Sequences and reply intelligence together",
    description:
      "Manage first touch through response drafting inside the same workspace-scoped system.",
  },
  {
    title: "Quality checks before output gets trusted",
    description:
      "Review personalization, CTA quality, tone fit, fluff risk, and unsupported-claim risk on stored artifacts.",
  },
];

const differentiators = [
  "Built for teams that need sender context, prospect context, and thread history to stay connected.",
  "Structured records for campaigns, research, sequences, analyses, and drafts make review easier and cleaner.",
  "Quality, auditability, and version history are first-class product concerns rather than afterthoughts.",
];

const pricingTeaser = [
  {
    tier: "Free",
    summary: "Start in basic mode and prove the workflow on live prospects.",
  },
  {
    tier: "Pro",
    summary: "Unlock sender-aware workflows, research depth, and higher sequence volume.",
  },
  {
    tier: "Agency",
    summary: "Expand usage, controls, and operational headroom for multi-client outbound.",
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
          <p className="eyebrow">AI Outbound Copilot</p>
          <h1>Institutional-grade outbound for teams that cannot afford generic messaging.</h1>
          <p className="landingLead">
            Outbound Copilot helps SDRs, SaaS founders, and lead generation agencies
            run sender-aware outreach, grounded prospect research, and high-quality
            sequence plus reply workflows from one controlled system.
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
            <span className="pill">Sender-aware personalization</span>
            <span className="pill">Prospect research</span>
            <span className="pill">Sequences and replies</span>
            <span className="pill">Quality controls</span>
          </div>
        </div>

        <div className="landingHeroPanel">
          <div className="landingSignalCard">
            <p className="cardLabel">What teams get</p>
            <h2>One operating surface for outbound quality.</h2>
            <ul className="landingSignalList">
              <li>Structured sender context for SDR, founder, agency, or basic mode workflows.</li>
              <li>Confidence-aware research snapshots built from public websites.</li>
              <li>Versioned sequences, reply analysis, and draft responses with visible checks.</li>
            </ul>
          </div>
          <div className="landingMetricGrid">
            <div className="dashboardCard landingMetricCard">
              <p className="cardLabel">Research</p>
              <h2>Evidence-first</h2>
              <p>Public website context preserved for personalization and review.</p>
            </div>
            <div className="dashboardCard landingMetricCard">
              <p className="cardLabel">Replies</p>
              <h2>Intent-aware</h2>
              <p>Inbound replies are analyzed before draft responses are proposed.</p>
            </div>
          </div>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="landingSection" id="who-it-is-for" aria-labelledby="who-it-is-for-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Who It Is For</p>
          <h2 id="who-it-is-for-title">Built for different outbound operating models, not one generic persona.</h2>
          <p>
            The system adapts to the way SDR teams, founder-led sales motions, and lead gen agencies actually work.
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
          <h2 id="how-it-works-title">A compact workflow from context to outreach to reply handling.</h2>
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
          <h2 id="capabilities-title">Everything needed to move from a target account to an informed response.</h2>
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
          <h2 id="differentiation-title">Designed for credible outbound, not just fast text generation.</h2>
          <p>
            The product is structured around sender context, prospect evidence, version history, and visible quality review.
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
          <h2 id="pricing-title">Start lean, then unlock more control as the workflow expands.</h2>
          <p>
            Plans are designed around workflow access and operational headroom rather than noisy credit mechanics.
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
            <h2 id="cta-title">Bring sender context, prospect research, and reply handling into one system.</h2>
            <p>
              Start with a workspace, create the first sender profile or campaign, and move directly into research-backed outbound.
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

