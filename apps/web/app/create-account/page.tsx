import type { Metadata } from "next";
import Link from "next/link";

import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { decodeUserFacingMessage } from "../../lib/server/user-facing-errors";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an OutFlow account with email and password, then choose a plan.",
};

type CreateAccountPageProps = {
  searchParams?: Promise<{
    error?: string;
    notice?: string;
    success?: string;
    "check-email"?: string;
  }>;
};

function getMessage(params: {
  error?: string;
  notice?: string;
  success?: string;
  "check-email"?: string;
}) {
  if (params["check-email"] === "1") {
    return "Confirmation email sent. Check your inbox to finish creating the account.";
  }

  return (
    decodeUserFacingMessage(params.success) ??
    decodeUserFacingMessage(params.notice) ??
    decodeUserFacingMessage(params.error)
  );
}

export default async function CreateAccountPage({
  searchParams,
}: CreateAccountPageProps) {
  const [context, params] = await Promise.all([
    getServerAuthContext(),
    searchParams ?? Promise.resolve({}),
  ]);

  return (
    <main className="shell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="hero authEntryHero">
        <p className="eyebrow">Create account</p>
        <h1>Create your account</h1>
        <p className="lede">
          Start with a secure email and password for the admin user. After
          confirmation, choose your plan and then add team members.
        </p>
      </section>

      <section className="panel authPanel" aria-labelledby="create-account-title">
        <div>
          <h2 id="create-account-title">Create your account with email</h2>
          <p>
            Use a work email, choose a password, and confirm it once. Magic links
            are available later for sign-in, but account creation is password-only.
          </p>
        </div>

        <form action="/auth/sign-up" method="post" className="stack">
          <label className="field">
            <span>Work email</span>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
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

        {context.user !== null ? (
          <div className="inlineActions">
            <Link href="/app/billing" className="buttonSecondary">
              Open billing
            </Link>
            <form action="/auth/sign-out" method="post">
              <SubmitButton className="buttonGhost" pendingLabel="Signing out...">
                Sign out
              </SubmitButton>
            </form>
          </div>
        ) : null}

        <div className="inlineActions">
          <Link href="/sign-in" className="buttonSecondary">
            Already have an account?
          </Link>
          <Link href="/pricing" className="buttonGhost">
            Compare plans
          </Link>
        </div>
      </section>
    </main>
  );
}
