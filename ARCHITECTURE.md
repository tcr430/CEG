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

## Async-Ready, Not Queue-Heavy

Research and generation flows should be designed so they can move to queues later, but Phase 1 does not introduce queue infrastructure or microservices yet.

## Observability and Security

Phase 1 should keep room for:
- request correlation
- workspace-aware authorization
- auditability
- usage tracking
- sanitized external data handling

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
