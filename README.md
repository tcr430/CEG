# OutFlow

Agency-first operating system for hyperpersonalized cold email.

The current product is designed primarily for small-to-mid outbound agencies serving B2B clients with multi-client campaign execution and manual-heavy personalization workflows. It is built to help teams create better, more personalized cold email faster while keeping human control, reviewability, and campaign learning inside the workflow.

Today the system supports:
- sender-aware context when available
- prospect-aware research from public websites
- structured sequence and reply workflows
- a basic fallback mode when sender-aware personalization is not available

The product should be understood as a workflow system, not just a generation utility. AI assists with research, drafting, and classification, but the operating model remains human-reviewed: AI proposes, human approves.

This repository is being built as a migration-ready monorepo with service-style boundaries, strict validation, and a long-term data strategy that supports evaluation, operational memory, and future model improvement.

Inbox-provider integrations are prepared behind a provider-agnostic contract so Gmail and Microsoft 365 support can evolve without reshaping the core thread model. Gmail is the first concrete provider path in the repo today.

Supported secondary modes remain in the product today for SDR, founder-led, and basic fallback workflows, but they should be understood as supported scope rather than the primary business positioning.

## Phase 1 Scope

Foundation Phase 1 is intentionally narrow:
- `pnpm` workspace monorepo scaffold
- Next.js app shell
- root TypeScript, lint, and task-runner setup
- shared package boundaries to be added incrementally
- initial database foundation in later milestones
- root docs and environment sanity

Out of scope for this milestone:
- product UI beyond a placeholder shell
- direct database access from UI
- direct model-provider access from UI
- business logic in React components

## Repository Structure

```text
apps/
  web/              Next.js app shell and server entrypoints

packages/
  auth/
  billing/
  core/
  database/
  inbox/
  jobs/
  observability/
  reply-engine/
  research-engine/
  security/
  sequence-engine/
  template-engine/
  testing/
  validation/

infrastructure/
```

## Engineering Principles

- TypeScript everywhere
- `pnpm` workspaces
- service-style boundaries inside the monorepo
- UI -> API -> service -> domain -> repository flow
- Zod validation for application contracts
- schema validation before persistence for AI outputs
- provider abstraction for future model portability
- internal capability-level routing for multi-provider evaluation readiness
- architecture choices that can later be extracted into services
- workflow ownership over one-shot generation
- operational memory and campaign learning grounded in structured product data
- human review as the default control surface for AI-assisted work

## Local Development

```bash
pnpm install
pnpm dev
```

For local demos, trusted internal admins can opt into development-only sample data by setting `DEMO_SEED_ENABLED=true` in [`.env.local`](D:/Project/CEG/.env.local) and then loading demo data from [page.tsx](D:/Project/CEG/apps/web/app/app/settings/debug/page.tsx). The seeded workspace now includes realistic research, sent-message tracking, reply threads, and campaign performance scenarios. The loader stays disabled in production.

## Vercel Deployment Notes

The app is designed to stay portable, but it is ready for Vercel deployment with a few explicit expectations:
- set `NEXT_PUBLIC_APP_URL` to the canonical public app origin in production
- set Supabase, Stripe, and OpenAI variables only for the features you actually enable
- keep server-only secrets in server modules; secret-bearing integrations live under [server](D:/Project/CEG/apps/web/lib/server)
- Vercel preview deployments can fall back to `VERCEL_URL` when `NEXT_PUBLIC_APP_URL` is omitted, but production should use an explicit canonical origin

User-facing packaging now uses `Starter`, `Growth`, and `Enterprise`. Internal billing codes remain `free`, `pro`, and `agency` for compatibility, so expect those identifiers in code, Stripe mappings, and operational docs.

## Validation Commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter @ceg/testing eval
pnpm --filter web dev
```

## Environment

Use [`.env.local`](D:/Project/CEG/.env.local) for actual local runtime values.

Use [`.env.example`](D:/Project/CEG/.env.example) as the committed template.

For compatibility with repository guidance in `AGENTS.md`, the same template values are mirrored in [`.env.examples`](D:/Project/CEG/.env.examples).

## Documentation

- [DEPLOYMENT.md](D:/Project/CEG/DEPLOYMENT.md)
- [ARCHITECTURE.md](D:/Project/CEG/ARCHITECTURE.md)
- [DATA_STRATEGY.md](D:/Project/CEG/DATA_STRATEGY.md)
- [AGENTS.md](D:/Project/CEG/AGENTS.md)
