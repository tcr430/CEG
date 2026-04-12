import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter } from "../../components/marketing-footer";
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
  description: "Create an OutFlow workspace with a secure email confirmation flow.",
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
    return "Confirmation email sent. Check your inbox to finish creating your workspace.";
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
  const signupSteps = [
    "Create the account with work email and password",
    "Confirm the email to activate the workspace",
    "Enter the app, then review billing before any paid workflow starts",
  ];

  return (
    <main className="publicSiteShell publicSignupShell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="publicSignupIntro">
        <div className="publicSignupIntroCopy">
          <p className="marketingEyebrow">Create account</p>
          <h1>Start an OutFlow workspace</h1>
          <p className="publicSignupLead">
            Create the account first, confirm the email once, and enter the
            workspace with your selected plan context already attached. Billing
            can be reviewed separately before any paid workflow begins.
          </p>
          <div className="publicSignupStepRow">
            {signupSteps.map((step, index) => (
              <div key={step} className="publicSignupStep">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="publicSignupGrid">
        <section className="publicSignupFormCard" aria-labelledby="sign-up-title">
          <div className="publicSignupFormHeader">
            <div>
              <p className="marketingSurfaceEyebrow">Workspace setup</p>
              <h2 id="sign-up-title">Create your workspace with email</h2>
              <p>
                Selected plan: <strong>{selectedPlan.label}</strong>. You can review
                billing before any paid checkout starts.
              </p>
            </div>
            <span className="publicSignupPlanBadge">{selectedPlan.label}</span>
          </div>

          <form action="/auth/sign-up" method="post" className="publicSignupForm">
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
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                name="passwordConfirmation"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <SubmitButton className="buttonPrimary" pendingLabel="Sending confirmation...">
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

        <aside className="publicSignupSidebar">
          <section className="publicSignupPlanCard">
            <p className="marketingSurfaceEyebrow">Plan snapshot</p>
            <h2>{selectedPlan.headline}</h2>
            <p>{selectedPlan.summary}</p>
            <ul className="researchList compactResearchList">
              {selectedPlan.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>

          <section className="publicSignupInfoCard">
            <p className="marketingSurfaceEyebrow">What happens next</p>
            <ul className="publicSignupChecklist">
              <li>Your email confirmation activates the product account.</li>
              <li>You can enter the app before subscribing.</li>
              <li>Paid workflow execution stays blocked until checkout is complete.</li>
            </ul>
          </section>

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
        </aside>
      </section>
      <MarketingFooter />
    </main>
  );
}
