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
  description:
    "Compare Starter, Growth, and Enterprise plans for outbound agencies serving B2B clients.",
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
            title="Pick the plan that matches how your agency operates."
            description={
              <p>
                Compare Starter, Growth, and Enterprise in one view. Each plan keeps
                the same workflow model while opening more operational headroom.
              </p>
            }
          />
          <div className="publicPricingCardGrid">
            {pricingPlans.map((plan) => {
              const active =
                billing?.hasActiveSubscription === true && billing.planCode === plan.code;
              const badge = active
                ? "Current plan"
                : plan.featured
                  ? "Best fit for active teams"
                  : undefined;

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
                        ? "Start with Starter"
                        : plan.code === "pro"
                          ? "Run on Growth (Best fit)"
                          : "Scale with Enterprise"}
                    </SubmitButton>
                  </form>
                );
              } else {
                actions = (
                  <Link
                    href="/create-account"
                    className={plan.featured ? "marketingPrimaryCta" : "marketingTertiaryCta"}
                  >
                    Start your agency workspace
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
            title="Compare capabilities by delivery scale."
            description={
              <p>
                Focus on practical differences across context depth, usage capacity,
                and operational throughput for agency delivery.
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
        title="Create your account, then activate the right plan for your agency."
        description="OutFlow separates account creation from billing so plan selection is explicit before workflow features unlock."
        primaryLabel={auth.user ? "Choose plan" : "Start your agency workspace"}
        primaryHref={auth.user ? "/app/billing" : "/create-account"}
        secondaryLabel={auth.user ? "Sign in to another account" : "See the workflow"}
        secondaryHref={auth.user ? "/sign-in" : "/#how-it-works"}
      />
      <MarketingFooter />
    </main>
  );
}
