import type { Metadata } from "next";
import Link from "next/link";

import { getDefaultWorkspaceMembership } from "@ceg/auth";

import { FeedbackBanner } from "../../components/feedback-banner";
import { PricingPlanCard } from "../../components/pricing-plan-card";
import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { getWorkspaceBillingState } from "../../lib/server/billing";
import {
  pricingFeatureRows,
  pricingPlans,
} from "../../lib/pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare workflow plans for OutFlow's agency-grade cold email system.",
};

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
      <PublicLandingNav isAuthenticated={auth.user !== null} />

      <section className="landingHero pricingHero">
        <div className="landingHeroCopy">
          <p className="eyebrow">Pricing</p>
          <h1>Choose the plan that matches the way your outbound workflow actually operates.</h1>
          <p className="landingLead">
            The product keeps the same core workflow across plans: sender and campaign context,
            prospect research, sequence work, reply handling, and human review. Higher plans add
            more operational headroom for agencies running heavier client delivery.
          </p>
          <div className="landingHeroActions">
            <Link href={auth.user ? "/app/settings" : "/sign-up"} className="buttonPrimary">
              {auth.user ? "Open billing settings" : "Create account"}
            </Link>
            <Link href="/" className="buttonSecondary">
              Back to homepage
            </Link>
          </div>
        </div>

        <div className="landingHeroPanel">
          <div className="landingSignalCard">
            <p className="cardLabel">Plan design</p>
            <h2>Pricing is framed around workflow depth and team headroom.</h2>
            <ul className="landingSignalList">
              <li>Basic mode gives agencies and solo operators a credible place to start without blocking live use.</li>
              <li>Sender-aware personalization becomes available when the workflow is ready for it.</li>
              <li>Higher plans expand research, generation, regeneration, and operating room rather than exposing token math.</li>
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
            The difference is how much workflow depth and operating headroom the workspace gets.
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
                <Link href="/sign-up?plan=free" className="buttonSecondary">
                  Start with Starter
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
                    {plan.code === "pro" ? "Upgrade to Growth" : "Upgrade to Enterprise"}
                  </SubmitButton>
                </form>
              );
            } else {
              actions = (
                <Link href={`/sign-up?plan=${plan.code}`} className={plan.featured ? "buttonPrimary" : "buttonSecondary"}>
                  {plan.code === "pro" ? "Create account for Growth" : "Create account for Enterprise"}
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
            <span>Starter</span>
            <span>Growth</span>
            <span>Enterprise</span>
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
            <h2 id="pricing-cta-title">Pick the plan that matches your current operating shape.</h2>
            <p>
              Start with the leanest plan that still fits the way the team works today, then add headroom as client load, collaboration, and workflow demands expand.
            </p>
          </div>
          <div className="landingHeroActions">
            <Link href={auth.user ? "/app/settings" : "/sign-up"} className="buttonPrimary">
              {auth.user ? "Open billing settings" : "Create your workspace"}
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
