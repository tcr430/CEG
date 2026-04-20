# Business/Product Report

## 1. Executive Summary
OutFlow is currently a workspace-scoped B2B SaaS product for outbound agencies running personalized cold email workflows. The implemented product is not just a text generator: it supports campaign setup, prospect intake, research snapshots, sequence generation, reply analysis/drafting, Gmail inbox import, and draft handoff inside one app flow (`apps/web/app/app/page.tsx`, `apps/web/lib/server/inbox/service.ts`, `apps/web/lib/server/sequences.ts`, `apps/web/lib/server/replies.ts`).

The repo shows a clear commercial model: authenticated users create accounts, then must hold an active paid subscription to use core app routes; non-subscribed users are gated to billing (`apps/web/lib/server/billing.ts`, `apps/web/app/app/layout.tsx`, `apps/web/app/app/billing/page.tsx`).

The system has meaningful production-readiness foundations: workspace isolation controls, RLS policy migrations, provider abstraction for AI, Stripe checkout/webhook sync, and operational logging/audit records (`packages/database/migrations/0003_workspace_rls.sql`, `packages/database/migrations/0004_workspace_integrity.sql`, `apps/web/lib/server/model-providers.ts`, `apps/web/app/api/stripe/webhook/route.ts`).

Current maturity is best described as an **advanced MVP**: the core workflow is implemented end to end, but some areas are intentionally partial (multi-provider inbox parity, full queue infrastructure, enterprise controls depth, and richer proof/reporting surfaces).

## 2. What the Business Is Today
Confirmed from repo:
- **Product type:** Multi-tenant SaaS workflow application for outbound agencies (`README.md`, `ARCHITECTURE.md`, `apps/web/app/page.tsx`).
- **Core use case:** Help agency teams run outbound workflow stages (context -> research -> drafting -> review -> reply handling) with human control and workspace scoping (`apps/web/app/app/page.tsx`, `apps/web/app/app/onboarding/page.tsx`).
- **Business model signal:** Subscription billing with plan-gated product access and Stripe-based checkout/portal/webhooks (`apps/web/lib/server/billing.ts`, `apps/web/app/api/billing/checkout/route.ts`, `apps/web/app/api/billing/portal/route.ts`, `apps/web/app/api/stripe/webhook/route.ts`).

Inferred from code/configuration (explicitly inferred):
- **Likely buyer profile:** Small-to-mid outbound agencies serving B2B clients (inferred from public messaging and in-app language) (`apps/web/app/page.tsx`, `apps/web/app/pricing/page.tsx`, `README.md`).
- **Commercial packaging layer:** Public plan names Starter/Growth/Enterprise mapped onto internal codes free/pro/agency for compatibility (`packages/billing/src/plans.ts`, `apps/web/lib/pricing-content.ts`).

## 3. Problem It Solves
The product addresses operational fragmentation in outbound execution:
- Context is often spread across docs/prompts/inboxes and hard to reuse.
- Research and drafting quality are hard to review consistently.
- Reply handling gets detached from original campaign context.
- Teams need controlled draft handoff rather than autonomous sending.

These problems are reflected directly in UX flows and server modules for campaign context, prospect research, sequence generation, reply intelligence, inbox ingestion, and draft-in-inbox handoff (`apps/web/app/app/page.tsx`, `apps/web/app/app/onboarding/page.tsx`, `apps/web/lib/server/prospect-research.ts`, `apps/web/lib/server/sequences.ts`, `apps/web/lib/server/replies.ts`, `apps/web/lib/server/inbox/service.ts`).

## 4. Current Feature Set
| Area | Feature | What it does | Status | Evidence |
|------|---------|--------------|--------|----------|
| Authentication | Email/password sign-up with confirmation | Creates auth identity and requires confirmed email before full product account bootstrap | Implemented | `apps/web/app/auth/sign-up/route.ts`, `apps/web/app/auth/callback/route.ts` |
| Authentication | Sign-in via password or magic link | Supports password sign-in and magic-link sign-in for existing users | Implemented | `apps/web/app/auth/sign-in/route.ts`, `apps/web/app/sign-in/page.tsx` |
| Account bootstrap | Product user/workspace sync | Syncs app-side user/workspace/membership records after auth callback | Implemented | `apps/web/lib/server/user-sync.ts`, `apps/web/app/auth/callback/route.ts` |
| Billing | Plan-gated access | Blocks app usage without active subscription and routes to billing | Implemented | `apps/web/lib/server/billing.ts`, `apps/web/app/app/layout.tsx`, `apps/web/app/app/billing/page.tsx` |
| Billing | Stripe checkout + portal + webhook | Creates checkout sessions, opens portal, syncs subscription state | Implemented | `apps/web/app/api/billing/checkout/route.ts`, `apps/web/app/api/billing/portal/route.ts`, `apps/web/app/api/stripe/webhook/route.ts` |
| Onboarding | Guided setup flow | Walks users through workspace mode, sender profile, campaign, and first prospect | Implemented | `apps/web/app/app/onboarding/page.tsx` |
| Sender context | Sender profile management | Stores reusable sender context and proof points | Implemented | `apps/web/app/app/onboarding/page.tsx`, `packages/database/src/schema.ts` |
| Campaign management | Campaign create/list/detail/edit | Persists campaign brief and workflow settings | Implemented | `apps/web/app/app/campaigns/actions.ts`, `apps/web/app/app/campaigns/[campaignId]/page.tsx` |
| Prospect management | Prospect add/detail | Stores target company/contact data and links to campaign | Implemented | `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`, `packages/database/src/schema.ts` |
| Research workflow | Website research snapshots | Runs structured prospect/company research and stores evidence snapshots | Implemented | `apps/web/lib/server/prospect-research.ts`, `packages/research-engine/src/service.ts` |
| Sequence workflow | Sequence generation + regeneration + edits | Produces and updates subject/openers/emails/follow-ups with schema validation | Implemented | `apps/web/lib/server/sequences.ts`, `packages/sequence-engine/src/service.ts` |
| Reply intelligence | Reply analysis + strategy + drafts | Classifies replies and generates draft responses with validation | Implemented | `apps/web/lib/server/replies.ts`, `packages/reply-engine/src/service.ts` |
| Inbox integration | Gmail OAuth + import + mapping | Connects Gmail, imports threads/messages, maps to prospects/threads | Implemented | `apps/web/lib/server/inbox/service.ts`, `apps/web/lib/server/inbox/gmail-provider.ts`, `apps/web/app/api/inbox/gmail/*` |
| Inbox integration | Provider-agnostic inbox schema | Contracts/tables include Gmail + Microsoft365 provider values | Partially implemented | `packages/inbox/src/contracts.ts`, `packages/database/migrations/0005_inbox_integration_foundation.sql` |
| Draft handoff | Create Gmail draft from generated artifacts | Pushes selected draft into inbox as reviewable draft | Implemented | `apps/web/lib/server/inbox/service.ts` (`createDraftInInbox`), `apps/web/lib/server/inbox/gmail-provider.ts` |
| Async readiness | Job state tracking | Tracks operation states in metadata; queue extraction readiness pattern | Partially implemented | `apps/web/lib/server/prospect-job-runs.ts`, `packages/jobs/src/index.ts`, `ARCHITECTURE.md` |
| Analytics/events | Product usage and feedback events | Captures event/audit records and feedback submissions | Implemented | `apps/web/lib/server/product-analytics.ts`, `apps/web/lib/server/feedback.ts`, `apps/web/app/api/training-signals/route.ts` |
| Data governance | Workspace export | Exports structured workspace records | Implemented | `apps/web/app/api/workspace/export/route.ts` |
| Data governance | Internal dataset export pipeline | Supports filtered export for eval/training use by internal admin | Implemented | `apps/web/lib/server/dataset-exports.ts`, `apps/web/app/api/internal/dataset-export/route.ts` |
| Access control | Workspace RLS and role policy foundation | Enables RLS + role-aware table policies and stricter same-workspace FKs | Implemented | `packages/database/migrations/0003_workspace_rls.sql`, `packages/database/migrations/0004_workspace_integrity.sql` |
| Team management | Role-based membership model | Owner/admin/member roles represented in policies and UI flows | Implemented | `packages/database/migrations/0003_workspace_rls.sql`, `apps/web/app/app/settings/page.tsx` |
| Public marketing | Homepage/pricing/legal/contact pages | Public acquisition funnel with pricing and account-entry routes | Implemented | `apps/web/app/page.tsx`, `apps/web/app/pricing/page.tsx`, `apps/web/app/about/page.tsx`, `apps/web/app/contact/page.tsx`, `apps/web/app/privacy/page.tsx`, `apps/web/app/terms/page.tsx` |
| Testing/evals | Contract and eval harness foundations | Includes test runners for jobs, RLS contract checks, and AI eval harness scaffolding | Partially implemented | `packages/testing/tests/rls-contracts.ts`, `packages/testing/src/evals/workflow-harness.ts`, `apps/web/tests/run-tests.mjs` |

## 5. How the Product Works
Practical flow from action to output:
1. User authenticates via create-account or sign-in routes.
2. Auth callback exchanges code/session and syncs product user/workspace records.
3. Billing context is checked server-side; non-subscribed users are routed to billing.
4. Inside `/app`, user sets sender/campaign/prospect context.
5. Server modules run research and generation workflows through provider abstractions.
6. AI outputs are schema-validated before storage.
7. Generated artifacts are editable/regenerable and linked to threads/messages.
8. Gmail integration can import live thread/message context and create reviewable drafts.
9. Usage, audit, and signal events are recorded for reporting and future dataset/eval use.

End-to-end mechanics are distributed across app routes, server-only services, and database repositories (`apps/web/app/app/*`, `apps/web/lib/server/*`, `packages/database/src/repositories/*`).

Text workflow diagram:
```text
Public site -> create account/sign in -> auth callback -> user/workspace sync
        -> billing gate check -> onboarding/core app
        -> sender/campaign/prospect context
        -> research -> sequence generation -> review/edit/regenerate
        -> reply ingestion/analysis/drafts -> Gmail draft handoff
        -> usage/audit/training signals + export/eval pipelines
```

## 6. User Workflow
Primary subscribed workflow:
1. User lands on public site (`/`) and goes to create account or sign in.
2. User creates account (email/password) and confirms via email.
3. System syncs product account/workspace and redirects to billing if no active subscription.
4. User selects plan/checkout and returns to app.
5. User completes onboarding: choose mode, create sender profile (or basic), create first campaign, add first prospect.
6. User runs prospect research.
7. User generates sequence drafts, reviews/edits/regenerates.
8. User handles replies with analysis and suggested response drafts.
9. User can connect Gmail to import recent threads and push drafts into inbox.
10. User monitors settings, usage limits, and optional export/feedback controls.

Secondary workflows:
- No-plan signed-in users: limited to billing management routes until subscription activates.
- Internal/admin dataset export: internal endpoint guarded by admin access checks.

Evidence: `apps/web/app/create-account/page.tsx`, `apps/web/app/sign-in/page.tsx`, `apps/web/app/auth/callback/route.ts`, `apps/web/app/app/billing/page.tsx`, `apps/web/app/app/onboarding/page.tsx`, `apps/web/app/app/settings/page.tsx`, `apps/web/app/api/internal/dataset-export/route.ts`.

## 7. Technical/Operational Workflow
- **Frontend structure:** Next.js App Router in `apps/web/app`; separate public and authenticated route groups.
- **Backend/API structure:** Server actions + route handlers in `apps/web/app/api/*` and server modules in `apps/web/lib/server/*`.
- **Database/storage:** Postgres schema and migrations under `packages/database`; workspace-scoped entities and inbox tables present.
- **AI/model calls:** Central provider abstraction (`model-providers`) with OpenAI and Anthropic adapters; engine packages enforce request/output contracts.
- **Job processing:** Async-ready state tracking and job package abstractions; not yet externalized to full queue infrastructure.
- **External services:** Supabase Auth, Stripe Billing, Gmail API integration, optional Vercel Analytics.
- **State/security boundaries:** Workspace-scoped checks in services + RLS policy foundation in SQL migrations; server-only handling for tokens and keys.
- **Deployment clues:** Vercel deployment and environment guidance documented, with Supabase and Stripe setup dependencies.

Evidence: `ARCHITECTURE.md`, `DEPLOYMENT.md`, `apps/web/lib/server/model-providers.ts`, `apps/web/lib/server/billing.ts`, `apps/web/lib/server/inbox/gmail-provider.ts`, `packages/database/migrations/*.sql`.

## 8. Current Strengths
- Clear workflow orientation beyond one-off generation.
- Strong server-side gating around subscription unlock.
- Provider abstraction and schema validation are explicit and reused.
- Workspace scoping has both app-layer checks and database policy foundations.
- Inbox integration is practical (OAuth, import, mapping, draft handoff).
- Data/export/eval foundations exist for future model quality loops.
- Public + app experiences are coherent around “AI suggests, human approves.”

## 9. Current Gaps / Limitations
- **Inbox provider breadth:** Microsoft365 appears schema-ready but no equivalent production integration path is visible (partial provider parity).
- **Queue maturity:** Async state exists, but no full durable queue worker stack is visible as the default runtime path.
- **Testing depth:** Foundations exist, but complete end-to-end coverage across all critical flows is not clearly demonstrated from repo structure alone.
- **Enterprise controls depth:** Settings and institutional controls exist, but some controls are visibility/foundation level rather than full compliance workflows.
- **Plan-code naming mismatch:** Internal billing IDs remain free/pro/agency while public packaging uses Starter/Growth/Enterprise (managed intentionally, but operationally sensitive).
- **Potential messaging drift in app copy:** Some in-app text still references broader personas (e.g., SDR/founder in onboarding) despite agency-first positioning target.

Evidence: `apps/web/lib/server/inbox/service.ts`, `packages/database/migrations/0005_inbox_integration_foundation.sql`, `packages/jobs/src/index.ts`, `packages/testing/*`, `apps/web/app/app/onboarding/page.tsx`, `packages/billing/src/plans.ts`.

## 10. Product Maturity Assessment
**Assessment: Advanced MVP**

Why:
- Core workflow from account creation to billing-gated app use to research/generation/reply operations is implemented.
- Real integrations (Supabase, Stripe, Gmail) are present.
- Security and multitenancy foundations are significantly beyond prototype stage (RLS + workspace integrity migrations).
- Still, some areas are intentionally pre-enterprise or partially implemented (provider parity, queue depth, broader test completeness, full institutional-operational depth).

## 11. Suggested “As-Is” Business Description
OutFlow is a subscription SaaS workflow system for outbound agencies running personalized B2B cold email. It combines client/campaign context, prospect research, reviewed sequence drafting, reply handling, and Gmail draft handoff inside one workspace-scoped product. AI is used to assist research and writing, while operators retain approval control before anything is used.

## 12. Appendix: Evidence from Repository
See `generated/business-report/repo_evidence.md` for file-by-file evidence notes and what each source supports.

