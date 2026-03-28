export default function AppLoading() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Workspace</p>
        <h1>Loading workspace data</h1>
        <p className="lede">Resolving membership, current records, and the latest stored state.</p>
      </section>
      <section className="panel loadingPanel">
        <div className="loadingSkeleton loadingSkeletonWide" />
        <div className="loadingSkeleton" />
        <div className="loadingSkeleton" />
      </section>
    </main>
  );
}
