import Link from "next/link";

import { FeedbackBanner } from "../components/feedback-banner";
import { getServerAuthContext } from "../lib/server/auth";

const milestones = [
  "Supabase-ready server auth plumbing",
  "Role-aware workspace access guards",
  "Protected dashboard shell with workspace context",
];

type HomePageProps = {
  searchParams?: Promise<{
    notice?: string;
    error?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [context, params] = await Promise.all([
    getServerAuthContext(),
    searchParams ?? Promise.resolve({} as { notice?: string; error?: string }),
  ]);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Outbound Copilot</p>
        <h1>Institutional outbound, grounded in workspace-aware access.</h1>
        <p className="lede">
          A structured outbound copilot for SDRs, SaaS founders, and lead gen
          agencies with a server-side auth foundation, protected workspace
          context, and migration-ready product boundaries.
        </p>

        <div className="inlineActions">
          {context.user === null ? (
            <Link href="/sign-in" className="buttonPrimary">
              Sign in
            </Link>
          ) : (
            <Link href="/app" className="buttonPrimary">
              Open dashboard
            </Link>
          )}
          <Link href="/sign-in" className="buttonSecondary">
            View auth flow
          </Link>
        </div>
      </section>

      <FeedbackBanner error={params.error} notice={params.notice} />

      <section className="panel" aria-labelledby="phase-summary-title">
        <div>
          <h2 id="phase-summary-title">Current foundation</h2>
          <p>
            The product shell now distinguishes between a public landing page and
            a protected application area without putting auth or workspace logic
            inside React business components.
          </p>
        </div>

        <ul className="milestoneList">
          {milestones.map((milestone) => (
            <li key={milestone}>{milestone}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="state-title">
        <div>
          <h2 id="state-title">Session state</h2>
          <p>
            {context.user === null
              ? "You are currently unauthenticated. Use the sign-in placeholder to start a Supabase magic-link flow."
              : `Signed in as ${context.user.email ?? "a workspace user"}. Continue into the protected dashboard shell.`}
          </p>
        </div>
      </section>
    </main>
  );
}
