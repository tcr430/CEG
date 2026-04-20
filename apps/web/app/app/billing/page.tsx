import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackBanner } from "../../../components/feedback-banner";
import { PricingPlanCard } from "../../../components/pricing-plan-card";
import { SubmitButton } from "../../../components/submit-button";
import {
  isWorkspaceSubscriptionLocked,
  requireWorkspaceBillingContext,
} from "../../../lib/server/billing";
import {
  getPricingPlanPresentation,
  pricingFeatureRows,
  pricingPlans,
} from "../../../lib/pricing-content";

export const metadata: Metadata = {
  title: "Activate workspace",
  description:
    "Choose Starter, Growth, or Enterprise to activate prospect research, sequence generation, and reply workflows.",
};

type BillingPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    billing?: string;
    error?: string;
    notice?: string;
  }>;
};

function formatPeriodEnd(value: Date | null | undefined) {
  if (!value) {
    return "No active billing period yet.";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = (await searchParams) ?? {};
  const context = await requireWorkspaceBillingContext(params.workspace);
  const workspace = context.workspace;
  const billing = context.billing;
  const currentPlan = getPricingPlanPresentation(billing.planCode);
  const subscriptionLocked = isWorkspaceSubscriptionLocked(billing);
  const currentSubscriptionStatus = billing.currentSubscription?.status?.replaceAll("_", " ");
  const recommendedPlan = pricingPlans.find((plan) => plan.featured) ?? pricingPlans[0]!;
  const workspaceName = workspace.workspaceName ?? workspace.workspaceId;

  return (
    <main className="shell billingDecisionShell">
      <section className="hero billingDecisionHero">
        <p className="eyebrow">Activate workspace</p>
        <h1>
          {subscriptionLocked
            ? "Choose the plan that fits your outbound volume."
            : "Your outbound workflow is active. Adjust your plan any time."}
        </h1>
        <p className="lede">
          Activate the workflow your team needs now: faster prospect research, stronger sequence
          generation, cleaner reply handling, and review-ready draft creation for {workspaceName}.
        </p>
        <div className="pillRow">
          <span className="pill">Recommended for most teams: {recommendedPlan.label}</span>
          <span className="pill">Switch plans later as volume grows</span>
        </div>
      </section>

      <div className="inlineActions profileHeaderActions billingDecisionTopActions">
        <Link href="/pricing" className="buttonGhost">
          See full public pricing
        </Link>
      </div>

      <FeedbackBanner
        error={params.error}
        notice={params.notice}
        success={
          params.billing === "success"
            ? encodeURIComponent(
                "Checkout completed. Your plan is activating now and full workflow access will follow automatically.",
              )
            : undefined
        }
      />

      <section className="dashboardCard billingDecisionGuide">
        <p className="cardLabel">Choose your plan</p>
        <h2>Select the tier that matches your current outbound stage</h2>
        <p>
          All plans follow the same core workflow. If you are running active outbound now, Growth
          is the safest default for speed and capacity.
        </p>
        <div className="pillRow">
          <span className="pill">1. Choose plan</span>
          <span className="pill">2. Complete secure Stripe checkout</span>
          <span className="pill">3. Start running workflows after activation</span>
        </div>
        <p className="statusMessage">
          You can change plans later from Stripe billing without creating a new workspace.
        </p>
      </section>

      <section id="billing-plans" className="pricingSettingsStack billingDecisionPlans">
        {pricingPlans.map((plan) => {
          const active = billing.hasActiveSubscription && billing.planCode === plan.code;
          const actions = active ? (
            billing.currentSubscription?.providerCustomerId ? (
                <form action="/api/billing/portal" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Opening billing...">
                    Manage plan
                  </SubmitButton>
                </form>
              ) : (
              <p className="statusMessage">
                Your plan is being activated. Billing management appears shortly.
              </p>
            )
          ) : (
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <input type="hidden" name="planCode" value={plan.code} />
              <SubmitButton
                className={plan.featured ? "buttonPrimary" : "buttonSecondary"}
                pendingLabel="Starting checkout..."
              >
                {plan.code === "free"
                  ? "Start on Starter"
                  : plan.code === "pro"
                    ? "Choose Growth (Recommended)"
                    : "Choose Enterprise"}
              </SubmitButton>
            </form>
          );

          return (
            <PricingPlanCard
              key={plan.code}
              plan={plan}
              active={active}
              badge={
                active
                  ? "Current plan"
                  : plan.featured
                    ? "Recommended default"
                    : undefined
              }
              actions={actions}
              footnote={
                active
                  ? `Current allowance includes ${
                      billing.limits.sequenceGeneration.remaining ?? "unlimited"
                    } sequence runs remaining this month.`
                  : plan.code === "agency"
                    ? "Enterprise checkout is available directly on this page."
                  : undefined
              }
            />
          );
        })}
      </section>

      <section className="dashboardCard billingComparisonCard">
        <p className="cardLabel">Plan comparison</p>
        <h2>Quick tier differences</h2>
        <p>
          Same workflow across all plans. Main differences are context depth and monthly volume.
        </p>
        <div className="pricingComparisonHeader">
          <span>Decision factor</span>
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
      </section>

      <section className="dashboardCard billingAccountCard">
        <p className="cardLabel">Account and billing details</p>
        <h2>{billing.planLabel}</h2>
        <p>{currentPlan.summary}</p>
        <div className="pillRow">
          <span className="pill">{workspaceName}</span>
          <span className="pill">
            {billing.hasActiveSubscription ? "Plan active" : "Activation pending"}
          </span>
          {currentSubscriptionStatus ? <span className="pill">{currentSubscriptionStatus}</span> : null}
        </div>
        <p>
          {billing.currentSubscription
            ? `Status: ${currentSubscriptionStatus}. Billing period end: ${formatPeriodEnd(
                billing.currentSubscription.currentPeriodEnd,
              )}`
            : "Next step: choose a plan above and complete Stripe checkout to activate campaign, research, and reply workflows."}
        </p>
        {subscriptionLocked ? (
          <p className="statusMessage">
            Full workflow access starts automatically once plan activation completes.
          </p>
        ) : null}
        <div className="inlineActions">
          {billing.currentSubscription?.providerCustomerId ? (
            <form action="/api/billing/portal" method="post">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <SubmitButton className="buttonSecondary" pendingLabel="Opening billing...">
                Open Stripe billing
              </SubmitButton>
            </form>
          ) : null}
          <form action="/auth/sign-out" method="post">
            <SubmitButton className="buttonGhost" pendingLabel="Signing out...">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
