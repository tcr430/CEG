import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RootNotFound() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Not found</p>
        <h1>That page could not be found</h1>
        <p className="lede">The link may be outdated, or the record may no longer be available.</p>
      </section>
      <Card className="p-6">
        <Button asChild variant="secondary">
          <a href="/">Go home</a>
        </Button>
      </Card>
    </main>
  );
}
