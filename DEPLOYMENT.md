# Deployment Guide

## Purpose

This guide covers the practical path to running the product in production on Vercel with:
- Supabase for auth and Postgres
- Stripe for subscriptions
- OpenAI for generation
- Google OAuth for Gmail inbox imports and draft creation when inbox sync is enabled

It is written for a solo founder or agency operator who needs a reliable checklist, not a platform playbook. The deployment posture reflects the current product as an agency-grade workflow system with human-reviewed AI outputs, not an autonomous outbound engine.

## Local Prerequisites

Before deploying, make sure local development is working:
- Node.js 22+
- `pnpm` 10+
- Supabase project created
- Stripe account and products created if billing is enabled
- OpenAI API key if sequence/reply features are enabled
- Google Cloud project if Gmail inbox import or draft creation is enabled

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
- self-service sign-up uses email and password, sends a confirmation email, and only provisions local `users`, `workspaces`, and `workspace_members` records after the confirmation callback succeeds
- sign-in is only for already confirmed product accounts; password sign-in starts a session immediately, while magic-link sign-in uses Supabase OTP with user creation disabled
- workspace membership is now resolved from local `workspace_members` records first; auth metadata is only a legacy/bootstrap fallback where explicitly allowed
- `DATABASE_URL` is required in production for product account creation and workspace membership lookup; Supabase auth variables alone are not sufficient
- `SUPABASE_SERVICE_ROLE_KEY` is reserved for future admin/server flows and is not required for the current sign-in path

## Stripe Setup

Stripe is only required if paid billing is enabled.

Required:
- create products/prices for the user-facing plans `Starter`, `Growth`, and `Enterprise` and map paid billing to the stable internal codes `pro` and `agency`
- configure a webhook endpoint for the deployed app
- capture the webhook signing secret

Current implementation note:
- user-facing plan labels are `Starter`, `Growth`, and `Enterprise`, while internal billing codes remain `free`, `pro`, and `agency`
- map Stripe price ids to those stable internal codes when wiring billing, support, or operational tooling

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

## Gmail Inbox Setup

Gmail is only required if inbox connection and thread import are enabled.

Required:
- create a Google Cloud project
- enable the Gmail API
- configure an OAuth client for the deployed app origin
- add the callback URL for the app
- generate a base64-encoded 32-byte encryption key for inbox OAuth credentials

Environment variables:
- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`
- `GOOGLE_GMAIL_REDIRECT_URI` (optional if `NEXT_PUBLIC_APP_URL` is already correct)
- `INBOX_CREDENTIALS_ENCRYPTION_KEY`

Current Gmail scopes:
- read-only Gmail thread and message import
- Gmail draft creation for selected sequence steps and generated reply drafts

## AI Provider Setup

OpenAI is the default provider today, and Anthropic can be enabled internally for evaluation or selective routing.

Environment variables for the default OpenAI path:
- `OPENAI_API_KEY`
- `OPENAI_RESEARCH_MODEL`
- `OPENAI_SEQUENCE_MODEL`
- `OPENAI_REPLY_MODEL`

Optional internal multi-provider variables:
- `AI_DEFAULT_PROVIDER`
- `AI_RESEARCH_PROVIDER`
- `AI_SEQUENCE_PROVIDER`
- `AI_REPLY_PROVIDER`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_RESEARCH_MODEL`
- `ANTHROPIC_SEQUENCE_MODEL`
- `ANTHROPIC_REPLY_MODEL`

Current implementation notes:
- provider calls stay server-side
- outputs are schema-validated before persistence
- cost/token metadata is logged where available
- provider selection is internal and capability-specific, so research, sequence, and reply flows can be routed independently without changing user-facing behavior

## Vercel Environment Variables

Set these in Vercel for production:

Required for auth:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for database operations:
- `DATABASE_URL`

Production behavior note:
- missing `DATABASE_URL` now fails clearly in production instead of silently falling back to development in-memory repositories

Required only if Gmail inbox import is enabled:
- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`
- `INBOX_CREDENTIALS_ENCRYPTION_KEY`
- `GOOGLE_GMAIL_REDIRECT_URI` (optional when `NEXT_PUBLIC_APP_URL` is correct)

Required only if AI features are enabled:
- `OPENAI_API_KEY`
- `OPENAI_RESEARCH_MODEL`
- `OPENAI_SEQUENCE_MODEL`
- `OPENAI_REPLY_MODEL`

Optional if you want internal multi-provider routing:
- `AI_DEFAULT_PROVIDER`
- `AI_RESEARCH_PROVIDER`
- `AI_SEQUENCE_PROVIDER`
- `AI_REPLY_PROVIDER`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_RESEARCH_MODEL`
- `ANTHROPIC_SEQUENCE_MODEL`
- `ANTHROPIC_REPLY_MODEL`

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

Also configure these redirect URLs:
- Supabase email confirmation and magic-link callback: `https://your-domain.com/auth/callback`
- Google OAuth callback for Gmail import: `https://your-domain.com/api/inbox/gmail/callback`

If you use Vercel preview deployments, preview sign-in can fall back to the deployment URL, but production should always use the canonical domain.

## Production Deployment Checklist

Before first deploy:
- database migrations applied
- Supabase redirect URL configured
- Google OAuth callback URL configured if Gmail import is enabled
- production env vars set in Vercel
- Stripe webhook endpoint created if billing is enabled
- Stripe price ids mapped correctly
- OpenAI key added if AI features are enabled
- internal admin allowlist set only for trusted emails
- `DEMO_SEED_ENABLED` left unset or `false`

Commercial naming note:
- user-facing plan labels are `Starter`, `Growth`, and `Enterprise`
- internal billing codes remain `free`, `pro`, and `agency` in code and Stripe mappings
- keep that distinction explicit when wiring products, prices, and support/debug tooling

After deploy:
- open the landing page
- verify sign-up and sign-in pages load
- create a test account from `/sign-up`, confirm the email, and verify a local product user, workspace, and owner membership are created
- verify authenticated app route protection works
- verify one workspace resolves correctly
- verify unsubscribed accounts can open `/app/settings` and plan checkout but cannot create sender profiles, campaigns, prospects, research, sequences, inbox imports, or reply intelligence
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
  - `inbox_accounts`
  - `inbox_sync_runs`
  - `imported_thread_refs`
  - `imported_message_refs`
- confirm the deployed app can read/write expected records

### Verify Auth

- create an account from `/sign-up` with email, password, and repeated password
- confirm the Supabase email link lands on `/auth/callback`
- confirm local `users`, `workspaces`, and `workspace_members` rows exist after confirmation
- sign out, then sign in with email and password from `/sign-in`
- request a magic link from `/sign-in` for the confirmed account
- confirm the magic-link redirect lands on `/auth/callback` and reaches `/app`
- confirm magic-link sign-in does not create accounts for unconfirmed or unknown emails
- confirm unauthorized access still redirects to `/sign-in`
- confirm workspace selection/default workspace behavior is correct

### Verify Billing And Webhooks

- start a Stripe checkout from pricing/settings
- confirm redirect back to the app succeeds
- confirm webhook deliveries succeed in Stripe
- confirm local `subscriptions` record updates
- confirm billing portal opens for a synced customer

### Verify Inbox Import

- connect Gmail from `/app/settings`
- confirm callback returns to `/app/settings`
- import recent threads
- confirm matched prospect threads receive imported messages
- create one draft in Gmail from a generated sequence step or reply draft
- confirm inbox sync failures are visible in settings and logs

### Verify Provider Configuration

- trigger one sequence generation
- trigger one reply analysis or draft generation
- confirm no missing-env errors occur
- confirm logs and usage events record provider/model metadata

## Notes

- Keep secret-bearing integrations in server modules only.
- Do not import Stripe, Gmail, or OpenAI secret-handling code into client components.
- Keep `NEXT_PUBLIC_*` variables limited to values that are safe to expose to the browser.

## Access Control Notes

- Workspace membership now resolves from local `workspace_members` records first, with auth metadata only used as a bootstrap fallback when needed.
- Product account creation is deliberately separated from sign-in: sign-up confirmation provisions the account; sign-in only authenticates existing confirmed accounts.
- The migration set now includes a workspace-scoped Supabase/Postgres RLS foundation in [0003_workspace_rls.sql](D:/Project/CEG/packages/database/migrations/0003_workspace_rls.sql).
- `SUPABASE_SERVICE_ROLE_KEY` is reserved for trusted server/admin flows only and must never be exposed through `NEXT_PUBLIC_*` variables or client imports.

### Verify RLS / Access Control

- confirm `0003_workspace_rls.sql` and `0004_workspace_integrity.sql` have been applied
- verify an authenticated user can only read data for their own workspace
- verify a non-member cannot read another workspace's records
- verify owner/admin access is required for sensitive workspace-operational tables like `subscriptions`, `usage_events`, and `audit_events`
- verify service-role operations remain server-only
