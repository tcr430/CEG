# Architecture

## Overview

This repository uses a monorepo with service-style boundaries.

Current goal:
- optimize for solo-founder speed
- preserve clean internal boundaries
- stay migration-ready for future service extraction

## Foundation Structure

Phase 1 starts with:
- `apps/web` for the Next.js application and server entrypoints
- root workspace tooling for build, lint, and typecheck
- shared packages added behind stable contracts in later milestones

The intended flow remains:

```text
UI -> API -> service -> domain -> repository
```

Forbidden:
- UI -> database
- UI -> model provider
- business logic in React components

## Service-Style Boundaries

The monorepo is organized to support future extraction without introducing early distributed-system complexity.

Planned shared packages:
- `core`
- `validation`
- `database`
- `auth`
- `observability`
- `security`
- `research-engine`
- `sequence-engine`
- `reply-engine`
- `template-engine`
- `billing`
- `jobs`
- `testing`

`@ceg/testing` now carries lightweight evaluation scaffolding as well:
- reusable fixtures for sender modes, prospect website summaries, and inbound replies
- golden examples expressed as expected output properties instead of provider-specific exact text
- regression cases for unsupported claims, generic fluff, and hard-no pushiness

Why this shape:
- shared contracts live outside the app
- future provider integrations are isolated behind internal interfaces
- data and validation rules can evolve independently of UI code
- later extraction into workers or services stays practical

## Next.js App Boundary

`apps/web` is responsible for:
- UI shell
- route handlers
- server entrypoints
- composition of shared packages

`apps/web` is not responsible for:
- direct provider integrations
- persistence logic
- core domain rules

## Provider Abstraction

All model access must eventually go through an internal provider abstraction.

The app should depend on internal contracts, not directly on provider SDKs. This keeps the system ready for:
- multi-provider evaluation
- provider swaps
- open-weight model adoption

For research specifically:
- public-website fetching, cleaning, extraction, summarization, and scoring should stay behind `@ceg/research-engine` interfaces
- safe URL policy enforcement belongs in `@ceg/security`
- model-backed company-profile summarization can be injected later through a research model adapter instead of being hard-coded into the web app

For sequence generation specifically:
- sequence composition and output validation should stay behind `@ceg/sequence-engine`
- provider-specific model calls must be implemented behind the sequence model adapter interface
- the app layer may compose the active provider, but components should only trigger server actions and render stored sequence records

For reply intelligence specifically:
- inbound reply analysis, strategy recommendation, and draft generation should stay behind `@ceg/reply-engine`
- classification should remain separate from drafting so the system can audit intent, objections, and recommended actions independently
- provider-specific reply analysis or drafting calls must stay behind the reply model adapter interface
- deterministic quality scoring for generated sequences and draft replies should run server-side, remain auditable, and persist into `sequences.quality_checks_json` and `draft_replies.quality_checks_json` for UI review and future evaluation workflows
- partial regenerations and manual edits should create new artifact versions rather than mutating stored generation records in place, and edit metadata should be captured server-side for later training-data reconstruction

## Async-Ready, Not Queue-Heavy

Research and generation flows should be designed so they can move to queues later, but Phase 1 does not introduce queue infrastructure or microservices yet.

## Observability and Security

Phase 1 should keep room for:
- request correlation
- workspace-aware authorization
- auditability
- usage tracking
- sanitized external data handling

Billing and usage gating should stay server-side:
- centralized plan definitions and entitlement checks live in `@ceg/billing`
- costly workflows enforce feature access and monthly usage limits before execution
- `usage_events` remains the first aggregation spine for outcome-based pricing and cost controls
- workspace auth metadata can carry the active plan for now, with room to swap to the `subscriptions` table later without changing UI components
- first-run onboarding state is persisted server-side in `workspace.settings.onboarding`, while actual setup progress is reconciled from sender profiles, campaigns, and prospects
- Stripe checkout, billing portal, and webhook normalization should stay behind the billing boundary
- local `subscriptions` records become the workspace billing source of truth once synced from Stripe
- internal admin and support views must stay allowlisted and restricted to trusted workspace admins; they should show operational summaries, not secrets or raw captures
- development-only demo seed loading stays behind the internal admin route and must remain explicitly opt-in through `DEMO_SEED_ENABLED`

## Auth Boundary

Authentication should stay server-side and modular:
- Supabase-backed session handling happens in server entrypoints only
- workspace membership and role guards live in `@ceg/auth`
- protected routes resolve workspace context before rendering app surfaces
- UI components consume already-resolved auth and workspace state instead of talking to auth providers directly

## Migration Strategy

Architecture choices in Phase 1 should keep these future paths open:
- extract AI-heavy workflows into workers
- split web and backend deployment surfaces
- move to broader provider orchestration
- support fine-tuned open-weight models

## Schema Notes

The initial relational schema makes a few intentional choices for the first production-ready cut:
- `campaigns.sender_profile_id` is nullable so basic mode works without sender-aware personalization.
- Campaign-specific targeting, tone, and framework preferences are carried in structured `settings` JSONB today so the app can evolve the campaign brief without early schema churn.
- `prompt_templates` is the first prompt-versioning table; template versioning is captured through `name` plus `version` instead of a separate prompt-version entity for now.
- `prospects` includes an optional `campaign_id` for a practical Phase 1 workflow, with room to move to a dedicated many-to-many mapping later if campaign reuse becomes a stronger requirement.
- `research_snapshots`, `sequences`, `reply_analyses`, `draft_replies`, `usage_events`, and `audit_events` all keep JSONB payload space for auditability, evaluation, and future training-data capture.