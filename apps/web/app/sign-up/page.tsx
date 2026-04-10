import type { Metadata } from "next";
import Link from "next/link";

import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { normalizeSignupPlanCode } from "../../lib/auth-redirects";
import {
  getPricingPlanPresentation,
  pricingPlans,
} from "../../lib/pricing-content";
import { getServerAuthContext } from "../../lib/server/auth";
import { decodeUserFacingMessage } from "../../lib/server/user-facing-errors";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an OutFlow workspace with a secure magic-link flow.",
};

type SignUpPageProps = {
  searchParams?: Promise<{
    plan?: string;
    error?: string;
    notice?: string;
    success?: string;
    "check-email"?: string;
  }>;
};

type SignUpSearchParams = NonNullable<Awaited<SignUpPageProps["searchParams"]>>;

function getMessage(params: {
  error?: string;
  notice?: string;
  success?: string;
  "check-email"?: string;
}) {
  if (params["check-email"] === "1") {
    return "Magic link sent. Check your inbox to create your workspace.";
  }

  return (
    decodeUserFacingMessage(params.success) ??
    decodeUserFacingMessage(params.notice) ??
    decodeUserFacingMessage(params.error)
  );
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const [params, context] = await Promise.all([
    searchParams ?? Promise.resolve({} as SignUpSearchParams),
    getServerAuthContext(),
  ]);
  const selectedPlanCode = normalizeSignupPlanCode(params.plan ?? null) ?? "free";
  const selectedPlan = getPricingPlanPresentation(selectedPlanCode);

  return (
    <main className="shell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="hero">
        <p className="eyebrow">Create Account</p>
        <h1>Start an OutFlow workspace</h1>
        <p className="lede">
          Create a workspace for agency-grade outbound execution. We will send a
          secure magic link, prepare your first workspace, and keep the selected
          plan intent attached so you can continue into setup or checkout after
          confirming your email.
        </p>
      </section>

      <section className="panel authPanel" aria-labelledby="sign-up-title">
        <div>
          <h2 id="sign-up-title">Create your workspace with email</h2>
          <p>
            Selected plan: <strong>{selectedPlan.label}</strong>. You can review
            billing before any paid checkout starts.
          </p>
        </div>

        <form action="/auth/sign-in" method="post" className="stack">
          <input type="hidden" name="mode" value="sign-up" />
          <input type="hidden" name="planCode" value={selectedPlanCode} />
          <label className="field">
            <span>Work email</span>
            <input
              type="email"
              name="email"
              placeholder="you@agency.com"
              required
            />
          </label>
          <SubmitButton className="buttonPrimary" pendingLabel="Sending magic link...">
            Create account
          </SubmitButton>
        </form>

        {getMessage(params) !== null ? (
          <p className="statusMessage">{getMessage(params)}</p>
        ) : null}

        <div className="inlineActions">
          <Link href="/sign-in" className="buttonGhost">
            Already have an account?
          </Link>
          <Link href="/pricing" className="buttonSecondary">
            Compare plans
          </Link>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Plan Snapshot</p>
        <h2>{selectedPlan.headline}</h2>
        <p>{selectedPlan.summary}</p>
        <ul className="researchList compactResearchList">
          {selectedPlan.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <div className="pillRow">
          {pricingPlans.map((plan) => (
            <Link
              key={plan.code}
              href={`/sign-up?plan=${plan.code}`}
              className={plan.code === selectedPlanCode ? "pill activePill" : "pill"}
            >
              {plan.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
