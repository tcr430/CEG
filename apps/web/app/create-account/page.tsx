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
  title: "Create account",
  description:
    "Create your OutFlow account with email and password, then choose a plan for your agency workspace.",
};

export default async function CreateAccountPage() {
  const context = await getServerAuthContext();

  return (
    <main className="shell">
      <PublicLandingNav isAuthenticated={context.user !== null} />

      <section className="hero authEntryHero">
        <p className="eyebrow">Create account</p>
        <h1>Create your account</h1>
        <p className="lede">
          Start with a secure email and password for your agency admin. After
          confirmation, choose a plan and then add agency members.
        </p>
      </section>

      <Card className="p-6 authPanel" aria-labelledby="create-account-title">
        <div>
          <h2 id="create-account-title">Create your account with email</h2>
          <p>
            Use a work email, set a password, and confirm it once. Magic links are
            available later for sign-in, but account creation is password-only.
          </p>
        </div>

        <form action="/auth/sign-up" method="post" className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="create-email">Work email</Label>
            <Input
              id="create-email"
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-password">Password</Label>
            <Input
              id="create-password"
              type="password"
              name="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-password-confirm">Confirm password</Label>
            <Input
              id="create-password-confirm"
              type="password"
              name="passwordConfirmation"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <SubmitButton variant="default" pendingLabel="Sending confirmation...">
            Create account
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
            <Link href="/sign-in">Already have an account?</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/pricing">Compare plans</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
