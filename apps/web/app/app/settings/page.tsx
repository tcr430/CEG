import Link from "next/link";
import { redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../../lib/server/auth";
import { getWorkspaceBillingState } from "../../../lib/server/billing";

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

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const billing = await getWorkspaceBillingState({
    workspaceId: context.workspace.workspaceId,
    workspacePlanCode: context.workspace.billingPlanCode,
  });

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Settings</p>
        <h1>Billing and plan settings</h1>
        <p className="lede">
          Review the current workspace plan, start an upgrade, or manage billing through Stripe.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Link href="/app" className="buttonSecondary">
          Back to dashboard
        </Link>
        <Link href={`/app/settings/debug?workspace=${context.workspace.workspaceId}`} className="buttonSecondary">Debug activity</Link>
      </div>

      {params.billing === "success" ? (
        <div className="dashboardCard statusCard successCard">
          <p className="cardLabel">Billing updated</p>
          <p>Stripe checkout completed. Subscription state will sync automatically through the webhook.</p>
        </div>
      ) : null}

      {params.billingError ? (
        <div className="dashboardCard statusCard warningCard">
          <p className="cardLabel">Billing notice</p>
          <p>{decodeURIComponent(params.billingError)}</p>
        </div>
      ) : null}

      <section className="profileDetailGrid settingsGrid">
        <div className="dashboardCard">
          <p className="cardLabel">Current plan</p>
          <h2>{billing.planLabel}</h2>
          <p>
            {billing.currentSubscription
              ? `Subscription status: ${billing.currentSubscription.status.replaceAll("_", " ")}.`
              : "No paid subscription is synced yet. Workspace falls back to the current default plan."}
          </p>
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
            Billing period end: {formatPeriodEnd(billing.currentSubscription?.currentPeriodEnd ?? null)}
          </p>
          <p>
            Website research remaining: {billing.limits.websiteResearch.remaining ?? "unlimited"}
          </p>
          <p>
            Sequence runs remaining: {billing.limits.sequenceGeneration.remaining ?? "unlimited"}
          </p>
        </div>

        <div className="dashboardCard pricingGrid">
          <article className="pricingCard">
            <p className="cardLabel">Free</p>
            <h2>Basic mode</h2>
            <p>Good for validating the workflow with guarded monthly limits.</p>
          </article>

          <article className="pricingCard featuredPricingCard">
            <p className="cardLabel">Pro</p>
            <h2>Sender-aware outbound</h2>
            <p>Unlock sender-aware profiles and higher monthly research, sequence, and reply capacity.</p>
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="workspaceId" value={context.workspace.workspaceId} />
              <input type="hidden" name="planCode" value="pro" />
              <button type="submit" className="buttonPrimary">Upgrade to Pro</button>
            </form>
          </article>

          <article className="pricingCard">
            <p className="cardLabel">Agency</p>
            <h2>High-throughput workspace</h2>
            <p>Higher-capacity plan for agency-style outbound operations across more prospects and iterations.</p>
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="workspaceId" value={context.workspace.workspaceId} />
              <input type="hidden" name="planCode" value="agency" />
              <button type="submit" className="buttonSecondary">Upgrade to Agency</button>
            </form>
          </article>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Manage billing</p>
          <h2>Stripe customer settings</h2>
          <p>
            Use the Stripe billing portal to update payment details or manage a synced subscription.
          </p>
          {billing.currentSubscription?.providerCustomerId ? (
            <form action="/api/billing/portal" method="post">
              <input type="hidden" name="workspaceId" value={context.workspace.workspaceId} />
              <button type="submit" className="buttonSecondary">Manage billing</button>
            </form>
          ) : (
            <p className="statusMessage">
              Billing portal becomes available after the first Stripe checkout completes and syncs.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
