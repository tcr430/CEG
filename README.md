# Outbound Copilot

Institutional-grade outbound copilot for SDRs, SaaS founders, and lead generation agencies.

The product generates structured outbound artifacts using:
- sender-aware context when available
- prospect-aware research from public websites
- a basic fallback mode when sender-aware personalization is not available

The system is being built as a migration-ready monorepo with service-style boundaries, strict validation, and a long-term data strategy that supports model evaluation and future fine-tuning of open-weight models.

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
- architecture choices that can later be extracted into services

## Local Development

```bash
pnpm install
pnpm dev
```

## Validation Commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter web dev
```

## Environment

Use [`.env.local`](D:/Project/CEG/.env.local) for actual local runtime values.

Use [`.env.example`](D:/Project/CEG/.env.example) as the committed template.

For compatibility with repository guidance in `AGENTS.md`, the same template values are mirrored in [`.env.examples`](D:/Project/CEG/.env.examples).

## Documentation

- [ARCHITECTURE.md](D:/Project/CEG/ARCHITECTURE.md)
- [DATA_STRATEGY.md](D:/Project/CEG/DATA_STRATEGY.md)
- [AGENTS.md](D:/Project/CEG/AGENTS.md)
