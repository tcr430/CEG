"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

      <Card className="p-6 grid gap-6">
        <p className="text-sm text-muted-foreground">
          Try the action again. If it keeps failing, refresh the page or return to the previous screen.
        </p>
        <div className="inlineActions">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild variant="secondary">
            <a href="/">Go home</a>
          </Button>
        </div>
      </Card>
    </main>
  );
}
