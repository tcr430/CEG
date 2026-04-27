"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

      <Card>
        <CardContent className="p-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Try again, switch workspaces, or return to the dashboard and retry the action from there.
          </p>
          <div className="inlineActions">
            <Button type="button" onClick={() => reset()}>
              Retry view
            </Button>
            <Button asChild variant="secondary">
              <a href="/app">Back to dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
