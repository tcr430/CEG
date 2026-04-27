import type { Metadata } from "next";
import Link from "next/link";

import { PricingPlanCard } from "../../../components/pricing-plan-card";
import { SubmitButton } from "../../../components/submit-button";
import {
  isWorkspaceSubscriptionLocked,
  requireWorkspaceBillingContext,
} from "../../../lib/server/billing";
import { pricingFeatureRows, pricingPlans } from "../../../lib/pricing-content";

export const metadata: Metadata = {
  title: "Activate outbound workflow",
  description:
    "Activate Starter, Growth, or Enterprise to run prospect research, sequence generation, reply handling, and draft responses.",
};

type BillingPageProps = {
  searchParams?: Promise<{
    workspace?: string;
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
  const subscriptionLocked = isWorkspaceSubscriptionLocked(billing);
  const currentSubscriptionStatus = billing.currentSubscription?.status?.replaceAll("_", " ");
  const hasPortalAccess = Boolean(billing.currentSubscription?.providerCustomerId);
  const workspaceName = workspace.workspaceName ?? workspace.workspaceId;

  return (
    <main className="shell billingDecisionShell">
      <section className="hero billingDecisionHero">
        <p className="eyebrow">Choose operating level</p>
        <h1>
          {subscriptionLocked
            ? "Choose the plan for serious outbound delivery."
            : "Your workflow is active. Adjust plan capacity as delivery grows."}
        </h1>
        <p className="lede">
          Run prospect research, generate sequences, handle replies, and prepare draft responses
          in one human-controlled workflow for {workspaceName}.
        </p>
        <p className="billingHeroHint">
          Growth is the default for agencies running active weekly delivery across client accounts.
        </p>
      </section>

      <section id="billing-plans" className="pricingSettingsStack billingDecisionPlans">
        {pricingPlans.map((plan) => {
          const active = billing.hasActiveSubscription && billing.planCode === plan.code;
          const checkoutButtonClass =
            plan.code === "pro"
              ? "buttonPrimary"
              : plan.code === "free"
                ? "buttonGhost"
                : "buttonSecondary";
          const actions = active ? (
            hasPortalAccess ? (
              <form action="/api/billing/portal" method="post">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton className="buttonSecondary" pendingLabel="Opening billing...">
                  Manage plan
                </SubmitButton>
              </form>
            ) : (
              <p className="statusMessage">Plan confirmed. Billing management will appear shortly.</p>
            )
          ) : (
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <input type="hidden" name="planCode" value={plan.code} />
              <SubmitButton className={checkoutButtonClass} pendingLabel="Starting checkout...">
                {plan.code === "free"
                  ? "Start on Starter"
                  : plan.code === "pro"
                    ? "Activate Growth"
                    : "Activate Enterprise"}
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
                    ? "Default for active delivery"
                    : plan.code === "free"
                      ? "Entry capacity"
                    : plan.code === "agency"
                        ? "Scale + control tier"
                        : undefined
              }
              actions={actions}
              footnote={
                active
                  ? `Current allowance includes ${
                      billing.limits.sequenceGeneration.remaining ?? "unlimited"
                    } sequence runs remaining this month.`
                  : plan.code === "free"
                    ? "Starter is intentionally tighter for teams validating a repeatable outbound rhythm."
                    : plan.code === "agency"
                      ? "Enterprise is for larger operations where capped volume becomes delivery friction."
                      : undefined
              }
            />
          );
        })}
      </section>

      <section className="dashboardCard billingComparisonCard">
        <p className="cardLabel">Plan comparison</p>
        <h2>Compare the differences that actually change your plan decision</h2>
        <p>
          Same workflow across all plans. Differences are context depth and monthly run capacity.
        </p>
        <div className="pricingComparisonHeader">
          <span>Key difference</span>
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

      <section className="dashboardCard billingSupportStrip">
        <div className="billingSupportMeta">
          <p className="cardLabel">Account + billing</p>
          <p>
            <strong>{workspaceName}</strong>
            {" \u00B7 "}
            {billing.hasActiveSubscription ? "Plan active" : "Plan not active yet"}
            {currentSubscriptionStatus ? ` \u00B7 ${currentSubscriptionStatus}` : ""}
            {billing.currentSubscription
              ? ` \u00B7 Period end ${formatPeriodEnd(billing.currentSubscription.currentPeriodEnd)}`
              : ""}
          </p>
        </div>
        <div className="inlineActions">
          {hasPortalAccess ? (
            <form action="/api/billing/portal" method="post">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <SubmitButton className="buttonSecondary" pendingLabel="Opening billing...">
                Manage billing
              </SubmitButton>
            </form>
          ) : null}
          <Link href="/pricing" className="buttonGhost">
            View full plan details
          </Link>
          {!hasPortalAccess ? (
            <Link href="/contact" className="buttonGhost">
              Contact sales
            </Link>
          ) : null}
          <form action="/auth/sign-out" method="post">
            <SubmitButton className="buttonGhost" pendingLabel="Signing out...">
              Sign out
            </SubmitButton>
          </form>
        </div>
        {subscriptionLocked ? (
          <p className="billingSupportHint">
            Selecting a plan opens secure Stripe checkout and returns you here. As soon as payment
            is confirmed, this workspace can run full outbound workflows.
          </p>
        ) : null}
        {!hasPortalAccess ? (
          <p className="billingSupportHint">
            Enterprise also starts through checkout. Need invoicing or procurement steps? Contact
            sales before purchase.
          </p>
        ) : null}
      </section>
    </main>
  );
}
