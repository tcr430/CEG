import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppNotFound() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Not found</p>
        <h1>That workspace record could not be found</h1>
        <p className="lede">It may have been removed, or it may not belong to the current workspace.</p>
      </section>
      <Card>
        <CardContent className="p-6">
          <Button asChild variant="secondary">
            <a href="/app">Back to dashboard</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
