import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackBanner } from "../../../components/feedback-banner";
import { PricingPlanCard } from "../../../components/pricing-plan-card";
import { SubmitButton } from "../../../components/submit-button";
import {
  createWorkspaceBillingPath,
  isWorkspaceSubscriptionLocked,
  requireWorkspaceBillingContext,
} from "../../../lib/server/billing";
import {
  getPricingPlanPresentation,
  pricingFeatureRows,
  pricingPlans,
} from "../../../lib/pricing-content";

export const metadata: Metadata = {
  title: "Billing",
  description: "Choose a plan or manage billing before using the workspace workflow.",
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

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Billing</p>
        <h1>
          {subscriptionLocked
            ? "Choose a plan to unlock the workspace"
            : "Manage your workspace billing"}
        </h1>
        <p className="lede">
          Account creation comes first. Plan selection happens here, after the workspace exists,
          so billing stays explicit before campaigns, research, drafts, replies, and inbox
          workflows become available.
        </p>
      </section>

      <FeedbackBanner
        error={params.error}
        notice={params.notice}
        success={
          params.billing === "success"
            ? encodeURIComponent(
                "Checkout completed. Subscription state will sync automatically through the webhook.",
              )
            : undefined
        }
      />

      <div className="inlineActions profileHeaderActions">
        <Link href="/pricing" className="buttonSecondary">
          View public pricing
        </Link>
        <form action="/auth/sign-out" method="post">
          <SubmitButton className="buttonGhost" pendingLabel="Signing out...">
            Sign out
          </SubmitButton>
        </form>
      </div>

      <section className="profileDetailGrid settingsGrid">
        <div className="stack">
          <div className="dashboardCard">
            <p className="cardLabel">Workspace billing state</p>
            <h2>{billing.planLabel}</h2>
            <p>{currentPlan.summary}</p>
            <div className="pillRow">
              <span className="pill">{workspace.workspaceName ?? workspace.workspaceId}</span>
              <span className="pill">
                {billing.hasActiveSubscription ? "Subscription active" : "Subscription required"}
              </span>
              {currentSubscriptionStatus ? <span className="pill">{currentSubscriptionStatus}</span> : null}
            </div>
            <p>
              {billing.currentSubscription
                ? `Current status: ${currentSubscriptionStatus}. Billing period end: ${formatPeriodEnd(
                    billing.currentSubscription.currentPeriodEnd,
                  )}`
                : "No synced subscription yet. The account and workspace exist, but product access stays locked until a plan is active."}
            </p>
            {subscriptionLocked ? (
              <p className="statusMessage">
                Until checkout completes and the subscription is active, the workspace is limited
                to account and billing management only.
              </p>
            ) : null}
            {billing.currentSubscription?.providerCustomerId ? (
              <form action="/api/billing/portal" method="post" className="inlineActions">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton className="buttonSecondary" pendingLabel="Opening billing...">
                  Manage billing in Stripe
                </SubmitButton>
              </form>
            ) : (
              <p className="statusMessage">
                Billing management in Stripe appears after the first checkout sync completes.
              </p>
            )}
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Plan comparison</p>
            <h2>See where each plan opens more operating room</h2>
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
        </div>

        <div id="billing-plans" className="stack pricingSettingsStack">
          {pricingPlans.map((plan) => {
            const active = billing.hasActiveSubscription && billing.planCode === plan.code;
            const actions = active ? (
              billing.currentSubscription?.providerCustomerId ? (
                <form action="/api/billing/portal" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Opening billing...">
                    Manage current plan
                  </SubmitButton>
                </form>
              ) : (
                <p className="statusMessage">
                  Stripe sync is still catching up. Billing management will appear here once the
                  subscription record is available.
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
                    ? "Start with Starter"
                    : plan.code === "pro"
                      ? "Upgrade to Growth"
                      : "Upgrade to Enterprise"}
                </SubmitButton>
              </form>
            );

            return (
              <PricingPlanCard
                key={plan.code}
                plan={plan}
                active={active}
                badge={active ? "Current plan" : plan.featured ? "Recommended" : undefined}
                actions={actions}
                footnote={
                  active
                    ? `Current workspace allowance includes ${
                        billing.limits.sequenceGeneration.remaining ?? "unlimited"
                      } sequence runs remaining this month.`
                    : undefined
                }
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
