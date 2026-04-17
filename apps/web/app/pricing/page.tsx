import type { Metadata } from "next";
import Link from "next/link";

import { getDefaultWorkspaceMembership } from "@ceg/auth";

import { FeedbackBanner } from "../../components/feedback-banner";
import { MarketingFooter } from "../../components/marketing-footer";
import { MarketingSectionHeader } from "../../components/marketing-section-header";
import { PricingPlanCard } from "../../components/pricing-plan-card";
import { PublicCtaBand } from "../../components/public-cta-band";
import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { getWorkspaceBillingState } from "../../lib/server/billing";
import { pricingFeatureRows, pricingPlans } from "../../lib/pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare OutFlow plans for agency-grade cold email workflow operations.",
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
    <main className="publicSiteShell publicPricingShell">
      <PublicLandingNav isAuthenticated={auth.user !== null} />

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="publicSection publicPricingPlansSection">
        <div className="publicPanel">
          <MarketingSectionHeader
            eyebrow="Plans"
            title="Choose the plan that matches how your team operates."
            description={
              <p>
                Compare Starter, Growth, and Enterprise quickly. The workflow model
                stays consistent as delivery volume grows.
              </p>
            }
          />
          <div className="publicPricingCardGrid">
            {pricingPlans.map((plan) => {
              const active =
                billing?.hasActiveSubscription === true && billing.planCode === plan.code;
              const badge = active ? "Current plan" : plan.featured ? "Recommended" : undefined;

              let actions;
              if (defaultWorkspace) {
                actions = active ? (
                  <Link
                    href={`/app/billing?workspace=${defaultWorkspace.workspaceId}`}
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
                      {plan.code === "free"
                        ? "Choose Starter"
                        : plan.code === "pro"
                          ? "Choose Growth"
                          : "Choose Enterprise"}
                    </SubmitButton>
                  </form>
                );
              } else {
                actions = (
                  <Link
                    href="/create-account"
                    className={plan.featured ? "marketingPrimaryCta" : "marketingTertiaryCta"}
                  >
                    Create account
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

      <section className="publicSection">
        <div className="publicPanel publicPricingMatrixPanel">
          <MarketingSectionHeader
            eyebrow="Comparison"
            title="See where each tier opens more room in the workflow."
            description={
              <p>
                Focus on practical differences for context depth, usage capacity,
                and day-to-day operating headroom.
              </p>
            }
          />
          <div className="publicPricingMatrix">
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

      <PublicCtaBand
        eyebrow="Ready to start"
        title="Create an account, then activate the plan your team needs."
        description="OutFlow separates account creation from billing so plan selection is explicit before product workflows unlock."
        primaryLabel={auth.user ? "Choose plan" : "Create account"}
        primaryHref={auth.user ? "/app/billing" : "/create-account"}
        secondaryLabel={auth.user ? "Sign in to another account" : "Back to homepage"}
        secondaryHref={auth.user ? "/sign-in" : "/"}
      />
      <MarketingFooter />
    </main>
  );
}
