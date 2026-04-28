import { Card } from "@/components/ui/card";

export default function RootLoading() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Loading</p>
        <h1>Preparing the app</h1>
        <p className="lede">Loading the next screen and resolving the current request context.</p>
      </section>
      <Card className="p-6 loadingPanel">
        <div className="loadingSkeleton loadingSkeletonWide" />
        <div className="loadingSkeleton" />
        <div className="loadingSkeleton" />
      </Card>
    </main>
  );
}
