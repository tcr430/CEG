import type { Metadata } from "next";
import Link from "next/link";

import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to an existing OutFlow agency workspace account with password or magic link.",
};

export default async function SignInPage() {
  const context = await getServerAuthContext();

  return (
    <main className="shell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="hero authEntryHero">
        <p className="eyebrow">Sign In</p>
        <h1>Sign in to your OutFlow workspace</h1>
        <p className="lede">
          Use email and password, or request a magic link for an existing confirmed
          account. If your plan is not active, you will be directed to billing before
          product workflows unlock.
        </p>
      </section>

      <section className="panel authPanel" aria-labelledby="sign-in-title">
        <div>
          <h2 id="sign-in-title">Continue with email</h2>
          <p>
            Sign-in is only for confirmed accounts. Account creation and plan
            selection are separate steps in the onboarding flow.
          </p>
        </div>

        <form action="/auth/sign-in" method="post" className="stack">
          <input type="hidden" name="mode" value="password-sign-in" />
          <label className="field">
            <span>Work email</span>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <SubmitButton className="buttonPrimary" pendingLabel="Signing in...">
            Sign in
          </SubmitButton>
        </form>

        <form action="/auth/sign-in" method="post" className="stack">
          <input type="hidden" name="mode" value="magic-link" />
          <label className="field">
            <span>Or send a magic link</span>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>
          <SubmitButton className="buttonSecondary" pendingLabel="Sending magic link...">
            Send magic link
          </SubmitButton>
        </form>

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
          <Link href="/create-account" className="buttonSecondary">
            Start your agency workspace
          </Link>
          <Link href="/pricing" className="buttonGhost">
            Compare plans
          </Link>
        </div>
      </section>
    </main>
  );
}
