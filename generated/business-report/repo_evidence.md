# Repository Evidence Appendix

This appendix lists the main repository files used to derive the business/product report. The goal is to show what each file demonstrates and where the report’s conclusions come from.

## Core Product and Positioning

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/README.md` | Names the product “Outbound Copilot,” describes it as an institutional-grade outbound copilot, identifies SDRs / SaaS founders / agencies as target users, and explains the monorepo/service-boundary intent. |
| `D:/Project/CEG/ARCHITECTURE.md` | Explains the intended architecture, provider abstraction, inbox boundary, async posture, access-control posture, and acknowledged current limitations. |
| `D:/Project/CEG/DATA_STRATEGY.md` | Shows that the product stores structured signals for evaluation, training readiness, exports, and outcome capture rather than only generated text. |
| `D:/Project/CEG/DEPLOYMENT.md` | Confirms intended production stack: Vercel, Supabase, Stripe, OpenAI, and Gmail integration. |

## Public-Facing Product Surface

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/apps/web/app/page.tsx` | The marketing homepage positions the product around sender-aware personalization, prospect research, sequences, replies, quality, and role-specific use cases for SDRs, founders, and agencies. |
| `D:/Project/CEG/apps/web/app/pricing/page.tsx` | The product has a real pricing surface with Free / Pro / Agency and outcome-oriented plan language. |
| `D:/Project/CEG/apps/web/app/sign-in/page.tsx` | The app has an explicit sign-in experience. |

## Protected App Workflow

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/apps/web/app/app/page.tsx` | The dashboard includes onboarding state, campaign performance, portfolio visibility, and shareable performance summaries. |
| `D:/Project/CEG/apps/web/app/app/onboarding/page.tsx` | First-run onboarding exists and walks the user through workspace confirmation, user type, sender profile/basic mode, first campaign, and first prospect. |
| `D:/Project/CEG/apps/web/app/app/sender-profiles/page.tsx` | Sender profiles are a real user-facing concept, including sender-aware and basic-mode handling. |
| `D:/Project/CEG/apps/web/app/app/campaigns/page.tsx` | Campaign listing and multi-campaign visibility are implemented. |
| `D:/Project/CEG/apps/web/app/app/campaigns/[campaignId]/page.tsx` | Campaign detail exists, including performance and prospect management. |
| `D:/Project/CEG/apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx` | The main operational workspace exists: research, sequence generation, threads/messages, reply classification, reply drafts, Gmail draft actions, quality, async state, and plan guardrails. |
| `D:/Project/CEG/apps/web/app/app/settings/page.tsx` | Workspace settings include team management, billing, Gmail connection/import, institutional controls, data export/deletion, and feedback capture. |
| `D:/Project/CEG/apps/web/app/app/settings/debug/page.tsx` | There is an internal/admin-style operational view and demo workflow, not just a customer-facing app. |

## Authentication, Billing, and Core Server Flows

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/apps/web/lib/server/auth.ts` | Authentication, workspace membership resolution, and database-first workspace access logic are server-side. |
| `D:/Project/CEG/apps/web/lib/server/billing.ts` | Billing is real and server-enforced: plan resolution, feature gating, usage gating, Stripe checkout, portal, and webhook sync. |
| `D:/Project/CEG/apps/web/app/api/stripe/webhook/route.ts` | Stripe webhook verification and sync exist as a live route. |
| `D:/Project/CEG/packages/billing/src/plans.ts` | Free / Pro / Agency plan definitions, features, and monthly limits are codified. |
| `D:/Project/CEG/packages/billing/src/entitlements.ts` | Feature and usage entitlements are enforced explicitly, supporting the business-model inference. |

## Research, Sequence, and Reply Intelligence

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/apps/web/lib/server/prospect-research.ts` | Research runs are stored, validated, logged, and tied to workspace/prospect context. |
| `D:/Project/CEG/packages/research-engine/src/contracts.ts` | Research has a formal contract for website input, fetched/cleaned/extracted content, company profile output, evidence, quality, and training record. |
| `D:/Project/CEG/apps/web/lib/server/openai-research-provider.ts` | Research summarization uses provider-backed structured output and explicitly forbids invented claims. |
| `D:/Project/CEG/apps/web/lib/server/sequences.ts` | Sequence generation, regeneration, editing, quality, and training-signal capture are server-side flows. |
| `D:/Project/CEG/packages/sequence-engine/src/contracts.ts` | Sequence generation is structured into subject lines, openers, initial email, follow-ups, constraints, and regeneration. |
| `D:/Project/CEG/apps/web/lib/server/openai-sequence-provider.ts` | Sequence prompt instructions explicitly emphasize evidence, no unsupported claims, no fluff, CTAs, and optional historical performance hints. |
| `D:/Project/CEG/apps/web/lib/server/replies.ts` | Reply analysis/drafting is stored and linked to messages/threads/prospects, including attribution and outcome signals. |
| `D:/Project/CEG/packages/reply-engine/src/contracts.ts` | Reply intelligence has separate contracts for analysis, strategy recommendation, draft generation, and regeneration, with explicit safety constraints. |
| `D:/Project/CEG/apps/web/lib/server/openai-reply-provider.ts` | Reply prompt instructions explicitly forbid invented facts and pushing after hard no, and require structured JSON outputs. |

## Provider Abstraction and Multi-Provider Readiness

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/apps/web/lib/server/model-providers.ts` | The app routes research, sequence, and reply calls through internal adapters and can switch between OpenAI and Anthropic at the server configuration layer. |
| `D:/Project/CEG/.env.example` | Provider selection and second-provider support are real configuration concepts, not just theoretical notes. |

## Inbox / Gmail

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/packages/inbox/src/contracts.ts` | Inbox support is provider-agnostic at the contract layer and includes sync, import, draft creation, and send-via-provider abstractions. |
| `D:/Project/CEG/apps/web/lib/server/inbox/service.ts` | Gmail connection, sync, mapping to prospects/threads/messages, draft creation, audit/usage logging, and automatic reply analysis are implemented. |
| `D:/Project/CEG/apps/web/lib/server/inbox/gmail-provider.ts` | The concrete Gmail provider exists for OAuth token exchange, profile fetching, recent-thread import, message normalization, and draft creation. |

## Database, Access Control, and Persistence Model

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/packages/database/migrations/0001_initial_schema.sql` | The core data model includes users, workspaces, memberships, sender profiles, campaigns, prospects, research snapshots, sequences, threads/messages, reply analyses, draft replies, usage events, audit events, and subscriptions. |
| `D:/Project/CEG/supabase/migrations/20260328133000_quality_checks_json.sql` | Quality-report persistence for sequences and draft replies is part of the schema. |
| `D:/Project/CEG/supabase/migrations/20260404121500_workspace_rls.sql` | Workspace-scoped RLS is implemented as a database backstop with differentiated access for normal vs operational tables. |
| `D:/Project/CEG/supabase/migrations/20260404200000_inbox_integration_foundation.sql` | Inbox accounts, sync runs, imported thread refs, and imported message refs are part of the schema. |
| `D:/Project/CEG/supabase/migrations/20260405091500_inbox_oauth_credentials.sql` | Inbox account OAuth credential storage exists. |
| `D:/Project/CEG/supabase/migrations/20260406131500_inbox_reply_ingestion.sql` | Imported message refs store reply roles plus raw/normalized body content. |
| `D:/Project/CEG/packages/validation/src/entities.ts` | The application uses a shared schema layer for entities, inbox objects, reply outputs, dataset export records, analytics events, and operational state. |

## Async / Operational Readiness

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/packages/jobs/src/index.ts` | Slow operations already persist job/run states with idempotency keys and explicit state transitions, even though queue extraction is still future-facing. |
| `D:/Project/CEG/apps/web/package.json` | The app is a Next.js 15 / React 19 workspace package and builds like a real deployed application. |
| `D:/Project/CEG/apps/web/next.config.ts` | The web app consumes compiled workspace packages via aliases, showing a deliberate monorepo deployment shape. |

## Demo, Evaluation, and Internal Feedback

| File | What it proves |
|------|----------------|
| `D:/Project/CEG/infrastructure/demo-data/fixtures.ts` | Demo seed data is realistic and includes sender profiles, campaigns, prospects, research, sequences, sent-message plans, reply threads, classifications, and draft replies. |
| `D:/Project/CEG/packages/testing/tests/run-evals.ts` | There is a workflow evaluation harness for research, sequence generation, reply analysis, and reply drafting using schema/property-based checks instead of exact wording. |
| `D:/Project/CEG/apps/web/lib/server/feedback.ts` | An in-app feedback flow exists and is recorded through audit/usage/analytics paths. |

## Notable Snippets and Practical Implications

### 1. The product is explicitly framed as a serious outbound application
Source: `D:/Project/CEG/README.md`

> “Institutional-grade outbound copilot for SDRs, SaaS founders, and lead generation agencies.”

Practical implication: the intended market is not generic consumer AI; it is B2B outbound operations.

### 2. Sequence generation is constrained to avoid generic or unsafe copy
Source: `D:/Project/CEG/apps/web/lib/server/openai-sequence-provider.ts`

Summary:
- “Never invent metrics, customers, proof points, or outcomes.”
- “Avoid generic fluff...”
- “Every email must include a concrete CTA.”

Practical implication: quality and credibility are part of the product promise, not just internal engineering style.

### 3. Reply handling explicitly protects against unsafe follow-up after hard negatives
Source: `D:/Project/CEG/apps/web/lib/server/openai-reply-provider.ts`

Summary:
- “Do not push after a hard no.”
- “Do not invent facts...”
- “When confidence is low, use softer language...”

Practical implication: reply intelligence is meant to operate with business-safe guardrails.

### 4. Billing is already tied to product value and usage
Source: `D:/Project/CEG/packages/billing/src/plans.ts`

Summary:
- `free`, `pro`, `agency`
- limits on research runs, sequence generations, reply analyses, reply drafts, regenerations

Practical implication: the repo implies a real monetization strategy, not just a placeholder paywall.

### 5. Gmail is real, but sending is not
Sources:
- `D:/Project/CEG/apps/web/lib/server/inbox/service.ts`
- `D:/Project/CEG/packages/inbox/src/contracts.ts`

Summary:
- Gmail connect/import and draft creation are implemented.
- A send-via-provider contract exists, but the product still routes users toward drafts rather than sending.

Practical implication: the product bridges toward real inbox execution, but does not yet own sending.

## Evidence Notes and Ambiguities
- The repository strongly supports the conclusion that the app is an advanced outbound workflow product.
- The exact production completeness of every repository implementation path is not fully provable from docs/UI alone; `ARCHITECTURE.md` explicitly acknowledges that not every repository path is Postgres-backed yet.
- Microsoft 365 support is only implied by contracts and schema, not by a concrete provider implementation inspected here.
- Some platform-readiness claims are inferred from deployment/configuration files and not from a live environment.
