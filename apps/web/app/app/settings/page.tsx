import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../../components/feedback-banner";
import { PricingPlanCard } from "../../../components/pricing-plan-card";
import { SubmitButton } from "../../../components/submit-button";
import { getWorkspaceAppContext } from "../../../lib/server/auth";
import {
  canAccessInternalAdminView,
  getInternalAdminAllowedEmails,
  isInternalAdminEnabled,
} from "../../../lib/internal-admin-access";
import { getWorkspaceBillingState } from "../../../lib/server/billing";
import {
  getPricingPlanPresentation,
  pricingFeatureRows,
  pricingPlans,
} from "../../../lib/pricing-content";

type SettingsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    billing?: string;
    billingError?: string;
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

function formatAllowance(value: number | null, label: string) {
  return value === null ? `Unlimited ${label}` : `${value} ${label} remaining this month`;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);
  const workspace = context.workspace;

  if (workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const showInternalAdminLink =
    isInternalAdminEnabled() &&
    canAccessInternalAdminView({
      email: context.user.email,
      membership: workspace,
      allowedEmails: getInternalAdminAllowedEmails(),
    });
  const billing = await getWorkspaceBillingState({
    workspaceId: workspace.workspaceId,
    workspacePlanCode: workspace.billingPlanCode,
  });
  const currentPlan = getPricingPlanPresentation(billing.planCode);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Settings</p>
        <h1>Billing and plan settings</h1>
        <p className="lede">
          Review the current workspace plan, compare upgrade paths, and manage Stripe billing from one place.
        </p>
      </section>

      <FeedbackBanner
        success={params.billing === "success" ? encodeURIComponent("Stripe checkout completed. Subscription state will sync automatically through the webhook.") : undefined}
        error={params.billingError}
      />

      <div className="inlineActions profileHeaderActions">
        <Link href="/app" className="buttonSecondary">
          Back to dashboard
        </Link>
        <Link href="/pricing" className="buttonSecondary">
          Public pricing page
        </Link>
        <Link href={`/app/onboarding?workspace=${workspace.workspaceId}`} className="buttonSecondary">
          Onboarding
        </Link>
        {showInternalAdminLink ? (
          <Link href={`/app/settings/debug?workspace=${workspace.workspaceId}`} className="buttonSecondary">
            Internal admin
          </Link>
        ) : null}
      </div>

      <section className="profileDetailGrid settingsGrid">
        <div className="stack">
          <div className="dashboardCard">
            <p className="cardLabel">Current plan</p>
            <h2>{billing.planLabel}</h2>
            <p>{currentPlan.summary}</p>
            <div className="pillRow">
              <span className="pill">{billing.planLabel} plan</span>
              {billing.currentSubscription ? (
                <span className="pill">{billing.currentSubscription.status}</span>
              ) : null}
              {billing.currentSubscription?.cancelAtPeriodEnd ? (
                <span className="pill">Cancels at period end</span>
              ) : null}
            </div>
            <p>
              {billing.currentSubscription
                ? `Subscription status: ${billing.currentSubscription.status.replaceAll("_", " ")}.`
                : "No paid subscription is synced yet. This workspace is using the default free plan."}
            </p>
            <p>Billing period end: {formatPeriodEnd(billing.currentSubscription?.currentPeriodEnd ?? null)}</p>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Current workspace allowances</p>
            <h2>What this plan supports right now</h2>
            <ul className="researchList compactResearchList">
              <li>
                <strong>Sender-aware profiles</strong>
                <p>{billing.features.senderAwareProfiles.allowed ? "Included on this workspace." : "Basic mode only on this workspace."}</p>
              </li>
              <li>
                <strong>Research capacity</strong>
                <p>{formatAllowance(billing.limits.websiteResearch.remaining, "research runs")}</p>
              </li>
              <li>
                <strong>Sequence generation</strong>
                <p>{formatAllowance(billing.limits.sequenceGeneration.remaining, "sequence runs")}</p>
              </li>
              <li>
                <strong>Reply intelligence</strong>
                <p>
                  {formatAllowance(billing.limits.replyAnalysis.remaining, "reply analyses")} and {" "}
                  {formatAllowance(billing.limits.replyDraftGeneration.remaining, "draft sets")}
                </p>
              </li>
              <li>
                <strong>Regeneration support</strong>
                <p>{formatAllowance(billing.limits.regenerations.remaining, "regenerations")}</p>
              </li>
            </ul>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Manage billing</p>
            <h2>Stripe customer settings</h2>
            <p>
              Use the Stripe billing portal to update payment details or manage a synced subscription.
            </p>
            {billing.currentSubscription?.providerCustomerId ? (
              <form action="/api/billing/portal" method="post">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton className="buttonSecondary" pendingLabel="Opening portal...">Manage billing</SubmitButton>
              </form>
            ) : (
              <p className="statusMessage">
                Billing portal becomes available after the first Stripe checkout completes and syncs.
              </p>
            )}
          </div>
        </div>

        <div className="stack pricingSettingsStack">
          {pricingPlans.map((plan) => {
            const active = billing.planCode === plan.code;
            let actions;

            if (plan.code === "free") {
              actions = active ? null : (
                <p className="statusMessage">This workspace falls back to Free automatically when no paid subscription is active.</p>
              );
            } else if (active) {
              actions = billing.currentSubscription?.providerCustomerId ? (
                <form action="/api/billing/portal" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Opening portal...">Manage current plan</SubmitButton>
                </form>
              ) : (
                <p className="statusMessage">Stripe sync is still catching up. Billing management will appear here once the subscription record is available.</p>
              );
            } else {
              actions = (
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="planCode" value={plan.code} />
                  <SubmitButton
                    className={plan.featured ? "buttonPrimary" : "buttonSecondary"}
                    pendingLabel="Starting checkout..."
                  >
                    {plan.code === "pro" ? "Upgrade to Pro" : "Upgrade to Agency"}
                  </SubmitButton>
                </form>
              );
            }

            return (
              <PricingPlanCard
                key={plan.code}
                plan={plan}
                active={active}
                badge={active ? "Current plan" : plan.featured ? "Recommended" : undefined}
                actions={actions}
              />
            );
          })}
        </div>
      </section>

      <section className="panel pricingComparisonPanel" aria-labelledby="settings-plan-comparison-title">
        <div>
          <p className="eyebrow">Comparison</p>
          <h2 id="settings-plan-comparison-title">Plan differences at a glance</h2>
          <p>
            Use the same operating model across all tiers, with more sender context and more workflow headroom as the plan expands.
          </p>
        </div>
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
      </section>
    </main>
  );
}


