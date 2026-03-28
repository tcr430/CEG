export default function RootNotFound() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Not found</p>
        <h1>That page could not be found</h1>
        <p className="lede">The link may be outdated, or the record may no longer be available.</p>
      </section>
      <section className="panel">
        <a href="/" className="buttonSecondary">Go home</a>
      </section>
    </main>
  );
}
