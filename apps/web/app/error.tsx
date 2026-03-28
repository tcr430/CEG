"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Unexpected issue</p>
        <h1>Something went wrong</h1>
        <p className="lede">
          We could not finish that request. The issue has been kept technical in the server logs,
          but this page stays user-safe.
        </p>
      </section>

      <section className="panel">
        <p className="statusMessage">
          Try the action again. If it keeps failing, refresh the page or return to the previous screen.
        </p>
        <div className="inlineActions">
          <button type="button" className="buttonPrimary" onClick={() => reset()}>
            Try again
          </button>
          <a href="/" className="buttonSecondary">
            Go home
          </a>
        </div>
      </section>
    </main>
  );
}
