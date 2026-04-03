import Link from "next/link";

import { getDefaultWorkspaceMembership } from "@ceg/auth";

import { FeedbackBanner } from "../../components/feedback-banner";
import { PricingPlanCard } from "../../components/pricing-plan-card";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { getWorkspaceBillingState } from "../../lib/server/billing";
import {
  pricingFeatureRows,
  pricingPlans,
} from "../../lib/pricing-content";

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
    <main className="landingShell pricingPageShell">
      <section className="landingHero pricingHero">
        <div className="landingHeroCopy">
          <p className="eyebrow">Pricing</p>
          <h1>Choose the plan that matches the outbound motion you are actually running.</h1>
          <p className="landingLead">
            Start lean in basic mode, move into sender-aware workflows when the team is ready,
            and scale research, sequence generation, and reply handling without changing the operating model.
          </p>
          <div className="landingHeroActions">
            <Link href={auth.user ? "/app/settings" : "/sign-in"} className="buttonPrimary">
              {auth.user ? "Open billing settings" : "Sign in to get started"}
            </Link>
            <Link href="/" className="buttonSecondary">
              Back to homepage
            </Link>
          </div>
        </div>

        <div className="landingHeroPanel">
          <div className="landingSignalCard">
            <p className="cardLabel">Plan design</p>
            <h2>Pricing is framed around workflow access and team headroom.</h2>
            <ul className="landingSignalList">
              <li>Basic mode gives a credible place to start without blocking live use.</li>
              <li>Sender-aware personalization becomes available when the workflow is ready for it.</li>
              <li>Higher plans expand research, generation, and regeneration capacity rather than exposing token math.</li>
            </ul>
          </div>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="landingSection" aria-labelledby="pricing-plans-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Plans</p>
          <h2 id="pricing-plans-title">Three plans, one product model.</h2>
          <p>
            Every plan uses the same sender, campaign, prospect, research, sequence, and reply structure.
            The difference is how much context and operating headroom the workspace gets.
          </p>
        </div>
        <div className="pricingGrid pricingPlanGrid">
          {pricingPlans.map((plan) => {
            const active = billing?.planCode === plan.code;
            const badge = active ? "Current plan" : plan.featured ? "Most popular" : undefined;

            let actions;
            if (plan.code === "free") {
              actions = auth.user ? (
                <Link href="/app" className="buttonSecondary">
                  Open workspace
                </Link>
              ) : (
                <Link href="/sign-in" className="buttonSecondary">
                  Start free
                </Link>
              );
            } else if (defaultWorkspace) {
              actions = active ? (
                <Link href={`/app/settings?workspace=${defaultWorkspace.workspaceId}`} className="buttonSecondary">
                  Manage current plan
                </Link>
              ) : (
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="workspaceId" value={defaultWorkspace.workspaceId} />
                  <input type="hidden" name="planCode" value={plan.code} />
                  <SubmitButton
                    className={plan.featured ? "buttonPrimary" : "buttonSecondary"}
                    pendingLabel="Starting checkout..."
                  >
                    {plan.code === "pro" ? "Upgrade to Pro" : "Upgrade to Agency"}
                  </SubmitButton>
                </form>
              );
            } else {
              actions = (
                <Link href="/sign-in" className={plan.featured ? "buttonPrimary" : "buttonSecondary"}>
                  Sign in to upgrade
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
      </section>

      <section className="landingSection" aria-labelledby="plan-comparison-title">
        <div className="landingSectionIntro">
          <p className="eyebrow">Plan Comparison</p>
          <h2 id="plan-comparison-title">See where each plan opens up the workflow.</h2>
        </div>
        <div className="panel pricingComparisonPanel">
          <div className="pricingComparisonHeader">
            <span>Capability</span>
            <span>Free</span>
            <span>Pro</span>
            <span>Agency</span>
          </div>
          {pricingFeatureRows.map((row) => (
            <div key={row.feature} className="pricingComparisonRow">
              <strong>{row.feature}</strong>
              <span>{row.free}</span>
              <span>{row.pro}</span>
              <span>{row.agency}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landingSection landingCtaSection" aria-labelledby="pricing-cta-title">
        <div className="panel landingCtaPanel">
          <div>
            <p className="eyebrow">Next Step</p>
            <h2 id="pricing-cta-title">Pick the plan that matches your current outbound maturity.</h2>
            <p>
              Start in free when the team is still validating the motion, move to Pro for sender-aware execution,
              and use Agency when the work needs more throughput and fewer ceilings.
            </p>
          </div>
          <div className="landingHeroActions">
            <Link href={auth.user ? "/app/settings" : "/sign-in"} className="buttonPrimary">
              {auth.user ? "Open billing settings" : "Start with your workspace"}
            </Link>
            <Link href="/" className="buttonSecondary">
              Back to homepage
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
