# Repository Evidence Appendix

This appendix lists primary evidence used to derive the business report.  
Each item includes the file path and what it demonstrates about current product reality.

## Core Doctrine and Product Framing
- `README.md`
  - Confirms current product framing, intended workflow orientation, and setup/development posture.
- `ARCHITECTURE.md`
  - Confirms service-style boundaries, workflow architecture principles, provider abstraction, and queue-ready posture.
- `DATA_STRATEGY.md`
  - Confirms operational memory, learning/data export posture, and conservative claims around optimization.
- `DEPLOYMENT.md`
  - Confirms practical deployment dependencies (Supabase, Stripe, Vercel, auth redirects, migration flow).

## Public Acquisition Surfaces
- `apps/web/app/page.tsx`
  - Confirms live homepage messaging and CTA flow.
- `apps/web/app/pricing/page.tsx`
  - Confirms pricing narrative, plan presentation, and conversion routes.
- `apps/web/lib/pricing-content.ts`
  - Confirms public plan labels, feature bullets, and comparison row values used by pricing UI.
- `apps/web/components/public-landing-nav.tsx`
  - Confirms primary nav IA and route entry points.
- `apps/web/components/marketing-footer.tsx`
  - Confirms footer IA and public link structure.
- `apps/web/components/public-cta-band.tsx`
  - Confirms pre-footer CTA structure and intent.
- `apps/web/app/about/page.tsx`
- `apps/web/app/contact/page.tsx`
- `apps/web/app/privacy/page.tsx`
- `apps/web/app/terms/page.tsx`
  - Confirm public trust/legal/contact surface implementation.

## Authentication and Account Lifecycle
- `apps/web/app/create-account/page.tsx`
  - Confirms password-based sign-up UX (email + password + confirm password), no magic-link creation path.
- `apps/web/app/sign-in/page.tsx`
  - Confirms password and magic-link sign-in options for existing users.
- `apps/web/app/auth/sign-up/route.ts`
  - Confirms Supabase `signUp` flow and confirmation-email initiation.
- `apps/web/app/auth/sign-in/route.ts`
  - Confirms sign-in modes and magic link with `shouldCreateUser: false`.
- `apps/web/app/auth/callback/route.ts`
  - Confirms callback code exchange, email-confirmation checks, and account bootstrap/redirect behavior.
- `apps/web/lib/server/user-sync.ts`
  - Confirms app-side user/workspace/membership synchronization patterns.

## Billing, Entitlements, and App Gating
- `apps/web/lib/server/billing.ts`
  - Confirms canonical billing context, Stripe price mapping, subscription checks, and app gating behavior.
- `apps/web/app/app/layout.tsx`
  - Confirms authenticated app shell with subscription-aware gating integration.
- `apps/web/app/app/page.tsx`
  - Confirms dashboard requires active workspace billing context.
- `apps/web/app/app/billing/page.tsx`
  - Confirms no-plan user path and plan selection UX.
- `apps/web/app/api/billing/checkout/route.ts`
  - Confirms checkout session start route.
- `apps/web/app/api/billing/portal/route.ts`
  - Confirms portal route for existing billing management.
- `apps/web/app/api/stripe/webhook/route.ts`
  - Confirms webhook sync path for subscription state.
- `packages/billing/src/plans.ts`
  - Confirms internal plan codes (`free`, `pro`, `agency`) and entitlement model.
- `packages/billing/src/entitlements.ts`
  - Confirms feature and limit checks used by the app.

## Core App Workflow (Onboarding to Operations)
- `apps/web/app/app/onboarding/page.tsx`
  - Confirms guided onboarding steps (mode, sender profile, first campaign, first prospect).
- `apps/web/app/app/settings/page.tsx`
  - Confirms billing operations, inbox connect status, export/deletion, and feedback surfaces.
- `apps/web/app/app/campaigns/actions.ts`
  - Confirms server-side campaign action patterns.
- `apps/web/app/app/campaigns/[campaignId]/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
  - Confirm campaign/prospect detail workflows and execution surfaces.

## AI Orchestration and Validation
- `apps/web/lib/server/model-providers.ts`
  - Confirms provider abstraction entry point.
- `apps/web/lib/server/ai-provider-config.ts`
  - Confirms provider selection/config resolution.
- `apps/web/lib/server/openai-sequence-provider.ts`
- `apps/web/lib/server/openai-reply-provider.ts`
- `apps/web/lib/server/openai-research-provider.ts`
- `apps/web/lib/server/anthropic-sequence-provider.ts`
- `apps/web/lib/server/anthropic-reply-provider.ts`
- `apps/web/lib/server/anthropic-research-provider.ts`
  - Confirm dual-provider adapter structure and provider-specific implementation split.
- `packages/research-engine/src/service.ts`
- `packages/sequence-engine/src/service.ts`
- `packages/reply-engine/src/service.ts`
  - Confirm schema-driven AI service interfaces and validation-first flow.
- `packages/research-engine/src/contracts.ts`
- `packages/sequence-engine/src/contracts.ts`
- `packages/reply-engine/src/contracts.ts`
  - Confirm Zod-based contracts for model inputs/outputs.
- `apps/web/lib/server/prospect-research.ts`
- `apps/web/lib/server/sequences.ts`
- `apps/web/lib/server/replies.ts`
  - Confirm app-level orchestration and persistence behavior around research, generation, and reply intelligence.

## Inbox Integration and Reply Ingestion
- `apps/web/lib/server/inbox/service.ts`
  - Confirms inbox account management, manual import, ingestion mapping, auto-analysis attempts, and draft handoff.
- `apps/web/lib/server/inbox/gmail-provider.ts`
  - Confirms Gmail OAuth/token and API operations (threads/messages/drafts).
- `apps/web/app/api/inbox/gmail/connect/route.ts`
- `apps/web/app/api/inbox/gmail/callback/route.ts`
  - Confirm Gmail connect callback path and server-only OAuth handling.
- `packages/inbox/src/contracts.ts`
  - Confirms provider-agnostic contract layer for inbox entities/actions.

## Data, Exports, and Signals
- `apps/web/lib/server/dataset-exports.ts`
  - Confirms dataset export pipeline and filtering controls for internal use.
- `apps/web/app/api/internal/dataset-export/route.ts`
  - Confirms internal-admin-guarded dataset export endpoint.
- `apps/web/app/api/workspace/export/route.ts`
  - Confirms workspace-level export endpoint.
- `apps/web/lib/server/training-signals.ts`
- `apps/web/app/api/training-signals/route.ts`
  - Confirm structured signal capture path.
- `apps/web/lib/server/product-analytics.ts`
  - Confirms product event tracking service.
- `apps/web/lib/server/feedback.ts`
  - Confirms lightweight in-product feedback capture.

## Security, Isolation, and Multitenancy
- `packages/database/migrations/0003_workspace_rls.sql`
  - Confirms row-level security enablement and policy definitions across key tables.
- `packages/database/migrations/0004_workspace_integrity.sql`
  - Confirms workspace-integrity constraints and same-workspace foreign-key hardening.
- `packages/database/migrations/0005_inbox_integration_foundation.sql`
  - Confirms inbox accounts/sync/thread/message reference schema additions.
- `packages/database/migrations/0006_inbox_reply_ingestion.sql`
  - Confirms reply-ingestion schema refinements/indexes.
- `packages/database/src/schema.ts`
  - Confirms database table catalog and schema registration.
- `packages/testing/src/rls-contracts.ts`
- `packages/testing/tests/rls-contracts.ts`
  - Confirm RLS contract test harness presence.

## Testing and Evaluation Foundations
- `apps/web/tests/run-tests.mjs`
  - Confirms app-level test runner entry point.
- `packages/jobs/tests/run-tests.ts`
  - Confirms jobs package test coverage entry point.
- `packages/testing/src/evals/workflow-harness.ts`
- `packages/testing/tests/run-evals.ts`
  - Confirm eval harness and regression test structure for model-backed workflows.

## Configuration and Environment Evidence
- `package.json`
  - Confirms monorepo scripts and workspace operations.
- `apps/web/package.json`
  - Confirms web app dependencies (including analytics package).
- `.env.example`
- `.env.examples`
  - Confirm environment contract and deployment assumptions.
- `apps/web/app/layout.tsx`
  - Confirms web analytics mount (`VercelAnalytics`) in app shell.

