import type { Metadata } from "next";
import Link from "next/link";

import { getDefaultWorkspaceMembership } from "@ceg/auth";

import { FeedbackBanner } from "../../components/feedback-banner";
import { MarketingSectionHeader } from "../../components/marketing-section-header";
import { PricingPlanCard } from "../../components/pricing-plan-card";
import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { getWorkspaceBillingState } from "../../lib/server/billing";
import { pricingFeatureRows, pricingPlans } from "../../lib/pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare workflow plans for OutFlow's agency-grade cold email system.",
};

const planPrinciples = [
  "Every plan keeps the same product model: context, research, draft, review, replies, and history.",
  "Plans differ by workflow depth, sender-aware support, and operating headroom rather than token math.",
  "Teams can start lean, then add collaboration room and scale as client delivery grows.",
];

const includedAcrossPlans = [
  "Shared workflow structure across campaigns, prospects, research, sequences, and replies",
  "Human-reviewed operating model with drafts and reply intelligence kept inside a controlled workflow",
  "Workspace-scoped context and campaign history rather than isolated one-off generation sessions",
];

type PricingPageProps = {
  searchParams?: Promise<{
    notice?: string;
    error?: string;
  }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const [params, auth] = await Promise.all([
    searchParams ?? Promise.resolve({} as { notice?: string; error?: string }),
    getServerAuthContext(),
  ]);

  const defaultWorkspace = auth.user
    ? getDefaultWorkspaceMembership(auth.user.memberships)
    : null;
  const billing = defaultWorkspace
    ? await getWorkspaceBillingState({
        workspaceId: defaultWorkspace.workspaceId,
        workspacePlanCode: defaultWorkspace.billingPlanCode,
      })
    : null;

  return (
    <main className="marketingSite pricingSite">
      <PublicLandingNav isAuthenticated={auth.user !== null} />

      <section className="marketingHero pricingHeroPanel" aria-labelledby="pricing-title">
        <div className="marketingHeroCopy">
          <p className="marketingEyebrow">Pricing</p>
          <h1 id="pricing-title">
            Choose the workflow depth that matches how your agency actually operates.
          </h1>
          <p className="marketingLead">
            OutFlow keeps the same core product model across plans: sender and
            campaign context, prospect research, sequence work, reply handling,
            and human review. Higher plans add more headroom for active client
            delivery and team coordination.
          </p>
          <div className="marketingHeroActions">
            <Link
              href={auth.user ? "/app/settings" : "/sign-up"}
              className="marketingPrimaryCta"
            >
              {auth.user ? "Open billing settings" : "Create account"}
            </Link>
            <Link href="/" className="marketingSecondaryCta">
              Back to homepage
            </Link>
          </div>
        </div>

        <div className="pricingHeroAside">
          <div className="pricingHeroCard">
            <p className="marketingSurfaceEyebrow">Plan design</p>
            <h2>Three plans, one operating model.</h2>
            <ul className="pricingPrincipleList">
              {planPrinciples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="pricingHeroCard pricingHeroCardMuted">
            <p className="marketingSurfaceEyebrow">Included across all plans</p>
            <ul className="pricingPrincipleList">
              {includedAcrossPlans.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="marketingSection">
        <div className="marketingSectionPanel">
          <MarketingSectionHeader
            eyebrow="Plans"
            title="Pick the operating shape that fits the team today."
            description={
              <p>
                Each plan is framed around how much workflow room the workspace
                needs. The structure stays familiar; the headroom expands.
              </p>
            }
          />
          <div className="pricingCardGrid">
            {pricingPlans.map((plan) => {
              const active = billing?.planCode === plan.code;
              const badge = active ? "Current plan" : plan.featured ? "Recommended" : undefined;

              let actions;
              if (plan.code === "free") {
                actions = auth.user ? (
                  <Link href="/app" className="marketingTertiaryCta">
                    Open workspace
                  </Link>
                ) : (
                  <Link href="/sign-up?plan=free" className="marketingTertiaryCta">
                    Start with Starter
                  </Link>
                );
              } else if (defaultWorkspace) {
                actions = active ? (
                  <Link
                    href={`/app/settings?workspace=${defaultWorkspace.workspaceId}`}
                    className="marketingTertiaryCta"
                  >
                    Manage current plan
                  </Link>
                ) : (
                  <form action="/api/billing/checkout" method="post">
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={defaultWorkspace.workspaceId}
                    />
                    <input type="hidden" name="planCode" value={plan.code} />
                    <SubmitButton
                      className={plan.featured ? "marketingPrimaryCta" : "marketingTertiaryCta"}
                      pendingLabel="Starting checkout..."
                    >
                      {plan.code === "pro" ? "Upgrade to Growth" : "Upgrade to Enterprise"}
                    </SubmitButton>
                  </form>
                );
              } else {
                actions = (
                  <Link
                    href={`/sign-up?plan=${plan.code}`}
                    className={plan.featured ? "marketingPrimaryCta" : "marketingTertiaryCta"}
                  >
                    {plan.code === "pro"
                      ? "Create account for Growth"
                      : "Create account for Enterprise"}
                  </Link>
                );
              }

              return (
                <PricingPlanCard
                  key={plan.code}
                  plan={plan}
                  active={active}
                  badge={badge}
                  actions={actions}
                  footnote={
                    active && billing
                      ? `Current workspace allowance includes ${billing.limits.sequenceGeneration.remaining ?? "unlimited"} sequence runs remaining this month.`
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="marketingSection">
        <div className="marketingSectionPanel pricingMatrixPanel">
          <MarketingSectionHeader
            eyebrow="Comparison"
            title="See where each plan opens up the workflow."
            description={
              <p>
                The comparison below is designed for scanability: what changes as
                the workspace moves from initial use to heavier client delivery.
              </p>
            }
          />
          <div className="pricingMatrix">
            <div className="pricingMatrixHeader">
              <span>Capability</span>
              <span>Starter</span>
              <span>Growth</span>
              <span>Enterprise</span>
            </div>
            {pricingFeatureRows.map((row) => (
              <div key={row.feature} className="pricingMatrixRow">
                <strong>{row.feature}</strong>
                <span data-plan="Starter">{row.free}</span>
                <span data-plan="Growth">{row.pro}</span>
                <span data-plan="Enterprise">{row.agency}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketingSection marketingFinalSection">
        <div className="marketingFinalPanel">
          <MarketingSectionHeader
            eyebrow="Next step"
            title="Choose the plan that fits current delivery load, then add headroom later."
            description={
              <p>
                Start with the leanest plan that still matches how the team works
                today. Add more room as campaign complexity, collaboration, and
                client volume expand.
              </p>
            }
            centered
          />
          <div className="marketingHeroActions marketingHeroActionsCentered">
            <Link
              href={auth.user ? "/app/settings" : "/sign-up"}
              className="marketingPrimaryCta"
            >
              {auth.user ? "Open billing settings" : "Create your workspace"}
            </Link>
            <Link href="/" className="marketingSecondaryCta">
              Back to homepage
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
