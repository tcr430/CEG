import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PublicLandingNav } from "../../components/public-landing-nav";
import { SubmitButton } from "../../components/submit-button";
import { getServerAuthContext } from "../../lib/server/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to an existing OutFlow agency workspace account with password or magic link.",
};

export default async function SignInPage() {
  const context = await getServerAuthContext();

  return (
    <main className="shell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="hero authEntryHero">
        <p className="eyebrow">Sign In</p>
        <h1>Sign in to your OutFlow workspace</h1>
        <p className="lede">
          Use email and password, or request a magic link for an existing confirmed
          account. If your plan is not active, you will be directed to billing before
          product workflows unlock.
        </p>
      </section>

      <Card className="p-6 authPanel" aria-labelledby="sign-in-title">
        <div>
          <h2 id="sign-in-title">Continue with email</h2>
          <p>
            Sign-in is only for confirmed accounts. Account creation and plan
            selection are separate steps in the onboarding flow.
          </p>
        </div>

        <form action="/auth/sign-in" method="post" className="grid gap-4">
          <input type="hidden" name="mode" value="password-sign-in" />
          <div className="grid gap-2">
            <Label htmlFor="sign-in-email">Work email</Label>
            <Input
              id="sign-in-email"
              type="email"
              name="email"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sign-in-password">Password</Label>
            <Input
              id="sign-in-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton variant="default" pendingLabel="Signing in...">
            Sign in
          </SubmitButton>
        </form>

        <form action="/auth/sign-in" method="post" className="grid gap-4">
          <input type="hidden" name="mode" value="magic-link" />
          <div className="grid gap-2">
            <Label htmlFor="magic-link-email">Or send a magic link</Label>
            <Input
              id="magic-link-email"
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>
          <SubmitButton variant="secondary" pendingLabel="Sending magic link...">
            Send magic link
          </SubmitButton>
        </form>

        {context.user !== null ? (
          <div className="inlineActions">
            <Button asChild variant="secondary">
              <Link href="/app/billing">Open billing</Link>
            </Button>
            <form action="/auth/sign-out" method="post">
              <SubmitButton variant="ghost" pendingLabel="Signing out...">
                Sign out
              </SubmitButton>
            </form>
          </div>
        ) : null}

        <div className="inlineActions">
          <Button asChild variant="secondary">
            <Link href="/create-account">Start your agency workspace</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/pricing">Compare plans</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
