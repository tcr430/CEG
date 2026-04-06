import type { Metadata } from "next";
import Link from "next/link";

import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { decodeUserFacingMessage } from "../../lib/server/user-facing-errors";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Access your Outbound Copilot workspace with a secure magic-link flow.",
};

type SignInPageProps = {
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
    return "Magic link sent. Check your inbox to continue.";
  }

  return (
    decodeUserFacingMessage(params.success) ??
    decodeUserFacingMessage(params.notice) ??
    decodeUserFacingMessage(params.error)
  );
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [context, params] = await Promise.all([
    getServerAuthContext(),
    searchParams ?? Promise.resolve({}),
  ]);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sign In</p>
        <h1>Access your workspace</h1>
        <p className="lede">
          Use a secure magic link to open the protected workspace area. Once signed in,
          the app resolves workspace scope on the server before loading product data.
        </p>
      </section>

      <section className="panel authPanel" aria-labelledby="sign-in-title">
        <div>
          <h2 id="sign-in-title">Continue with email</h2>
          <p>
            Keep this simple for launch: enter your work email and continue straight into the app.
          </p>
        </div>

        <form action="/auth/sign-in" method="post" className="stack">
          <label className="field">
            <span>Work email</span>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              required
            />
          </label>
          <SubmitButton className="buttonPrimary" pendingLabel="Sending magic link...">
            Send magic link
          </SubmitButton>
        </form>

        {getMessage(params) !== null ? (
          <p className="statusMessage">{getMessage(params)}</p>
        ) : null}

        {context.user !== null ? (
          <div className="inlineActions">
            <Link href="/app" className="buttonSecondary">
              Go to dashboard
            </Link>
            <form action="/auth/sign-out" method="post">
              <SubmitButton className="buttonGhost" pendingLabel="Signing out...">
                Sign out
              </SubmitButton>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
