# Deployment Guide

## Purpose

This guide covers the practical path to running the product in production on Vercel with:
- Supabase for auth and Postgres
- Stripe for subscriptions
- OpenAI for generation

It is written for a solo founder who needs a reliable checklist, not a platform playbook.

## Local Prerequisites

Before deploying, make sure local development is working:
- Node.js 22+
- `pnpm` 10+
- Supabase project created
- Stripe account and products created if billing is enabled
- OpenAI API key if sequence/reply features are enabled

Recommended local checks:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Supabase Setup

Required:
- create a Supabase project
- copy the project URL
- copy the anon public key
- set a database password and capture the Postgres connection string

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

Auth setup notes:
- the current app uses Supabase server-side session handling
- workspace membership is resolved from auth metadata, so production users need valid workspace metadata in Supabase
- `SUPABASE_SERVICE_ROLE_KEY` is reserved for future admin/server flows and is not required for the current sign-in path

## Stripe Setup

Stripe is only required if paid billing is enabled.

Required:
- create products/prices for `pro` and `agency`
- configure a webhook endpoint for the deployed app
- capture the webhook signing secret

Environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_AGENCY_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Current billing scope:
- checkout session creation
- billing portal session creation
- webhook verification
- syncing Stripe subscription state into local `subscriptions`

## OpenAI Provider Setup

OpenAI is only required if research-backed sequence generation or reply intelligence is enabled.

Environment variables:
- `OPENAI_API_KEY`
- `OPENAI_SEQUENCE_MODEL`
- `OPENAI_REPLY_MODEL`

Current implementation notes:
- provider calls stay server-side
- outputs are schema-validated before persistence
- cost/token metadata is logged where available

## Vercel Environment Variables

Set these in Vercel for production:

Required for auth:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for database operations:
- `DATABASE_URL`

Required only if AI features are enabled:
- `OPENAI_API_KEY`
- `OPENAI_SEQUENCE_MODEL`
- `OPENAI_REPLY_MODEL`

Required only if Stripe billing is enabled:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_AGENCY_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Optional operational variables:
- `LOG_LEVEL`
- `SENTRY_DSN`
- `INTERNAL_ADMIN_EMAILS`

Do not enable in production:
- `DEMO_SEED_ENABLED`

Vercel system variables:
- `VERCEL_URL`
- `VERCEL_TARGET_ENV`
- `VERCEL_PROJECT_PRODUCTION_URL`

The app can use Vercel system variables as fallbacks, but production should still set `NEXT_PUBLIC_APP_URL` explicitly to the canonical public origin.

## Migration Flow

The source-of-truth SQL currently exists in:
- [0001_initial_schema.sql](D:/Project/CEG/packages/database/migrations/0001_initial_schema.sql)

Supabase CLI-compatible copies live in:
- [supabase/migrations](D:/Project/CEG/supabase/migrations)

Recommended flow:
1. apply the existing migration set to the target Supabase database
2. verify tables in Supabase
3. only then deploy the app

If using Supabase CLI:

```bash
npx supabase db push
```

If applying SQL manually, use the tracked migration files and do not hand-edit the schema in production.

## Auth Redirect URL Setup

Production auth depends on the public app origin resolving correctly.

Set:
- `NEXT_PUBLIC_APP_URL=https://your-domain.com`

Also configure the same domain in Supabase auth redirect settings for:
- `https://your-domain.com/auth/callback`

If you use Vercel preview deployments, preview sign-in can fall back to the deployment URL, but production should always use the canonical domain.

## Production Deployment Checklist

Before first deploy:
- database migrations applied
- Supabase redirect URL configured
- production env vars set in Vercel
- Stripe webhook endpoint created if billing is enabled
- Stripe price ids mapped correctly
- OpenAI key added if AI features are enabled
- internal admin allowlist set only for trusted emails
- `DEMO_SEED_ENABLED` left unset or `false`

After deploy:
- open the landing page
- verify sign-in page loads
- verify authenticated app route protection works
- verify one workspace resolves correctly
- verify one sender profile, campaign, and prospect can load

## Operations Checklist

### Verify Migrations

- confirm core tables exist in Supabase:
  - `workspaces`
  - `workspace_members`
  - `sender_profiles`
  - `campaigns`
  - `prospects`
  - `research_snapshots`
  - `sequences`
  - `conversation_threads`
  - `messages`
  - `reply_analyses`
  - `draft_replies`
  - `subscriptions`
- confirm the deployed app can read/write expected records

### Verify Auth

- request a magic link from `/sign-in`
- confirm redirect lands on `/auth/callback`
- confirm authenticated user reaches `/app`
- confirm unauthorized access still redirects to `/sign-in`
- confirm workspace selection/default workspace behavior is correct

### Verify Billing And Webhooks

- start a Stripe checkout from pricing/settings
- confirm redirect back to the app succeeds
- confirm webhook deliveries succeed in Stripe
- confirm local `subscriptions` record updates
- confirm billing portal opens for a synced customer

### Verify Provider Configuration

- trigger one sequence generation
- trigger one reply analysis or draft generation
- confirm no missing-env errors occur
- confirm logs and usage events record provider/model metadata

## Notes

- Keep secret-bearing integrations in server modules only.
- Do not import Stripe or OpenAI secret-handling code into client components.
- Keep `NEXT_PUBLIC_*` variables limited to values that are safe to expose to the browser.
