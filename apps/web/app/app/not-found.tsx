export default function AppNotFound() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Not found</p>
        <h1>That workspace record could not be found</h1>
        <p className="lede">It may have been removed, or it may not belong to the current workspace.</p>
      </section>
      <section className="panel">
        <a href="/app" className="buttonSecondary">Back to dashboard</a>
      </section>
    </main>
  );
}
