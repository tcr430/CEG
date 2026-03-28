"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">App error</p>
        <h1>We could not load this workspace view</h1>
        <p className="lede">
          The underlying error stays in the operation logs, but this screen avoids exposing raw internals.
        </p>
      </section>

      <section className="panel">
        <p className="statusMessage">
          Try again, switch workspaces, or return to the dashboard and retry the action from there.
        </p>
        <div className="inlineActions">
          <button type="button" className="buttonPrimary" onClick={() => reset()}>
            Retry view
          </button>
          <a href="/app" className="buttonSecondary">
            Back to dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
