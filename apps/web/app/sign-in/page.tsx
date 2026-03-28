import Link from "next/link";

import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";
import { decodeUserFacingMessage } from "../../lib/server/user-facing-errors";

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
          Use a Supabase-backed magic link to sign in. Authentication stays on
          the server and the protected app area resolves workspace access after
          login.
        </p>
      </section>

      <section className="panel authPanel" aria-labelledby="sign-in-title">
        <div>
          <h2 id="sign-in-title">Continue with email</h2>
          <p>
            This is a minimal placeholder flow for the authenticated app shell.
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
