# Architecture

## Overview

This repository uses a monorepo with service style boundaries.

Current goal:
  optimize for solo founder speed
  preserve clean internal boundaries
  stay migration ready for future service extraction

Product framing:
  primary ICP is small to mid outbound agencies serving B2B clients
  the product is a workflow system for agency grade hyperpersonalized cold email
  AI assists with research, drafting, and classification, but human review remains the approval point
  trust model: AI proposes, human approves

## Foundation Structure

Phase 1 starts with:
  `apps/web` for the Next.js application and server entrypoints
  root workspace tooling for build, lint, and typecheck
  shared packages added behind stable contracts in later milestones

The intended flow remains:

```text
UI  > API  > service  > domain  > repository
```

Forbidden:
  UI  > database
  UI  > model provider
  business logic in React components

## Service Style Boundaries

The monorepo is organized to support future extraction without introducing early distributed system complexity.

Planned shared packages:
  `core`
  `validation`
  `database`
  `inbox`
  `auth`
  `observability`
  `security`
  `research engine`
  `sequence engine`
  `reply engine`
  `template engine`
  `billing`
  `jobs`
  `testing`

`@ceg/testing` now carries lightweight evaluation scaffolding as well:
  reusable fixtures for sender modes, prospect website summaries, and inbound replies
  golden examples expressed as expected output properties instead of provider specific exact text
  regression cases for unsupported claims, generic fluff, and hard no pushiness
  a workflow eval harness that can run provider agnostic research, sequence, reply analysis, and reply drafting cases from scripts or test commands

Why this shape:
  shared contracts live outside the app
  future provider integrations are isolated behind internal interfaces
  data and validation rules can evolve independently of UI code
  later extraction into workers or services stays practical
  workflow state, operational memory, and campaign learning can accumulate without pushing business logic into UI code
  human in the loop control stays enforceable because generation, storage, quality checks, and review steps are separated

## Next.js App Boundary

`apps/web` is responsible for:
  UI shell
  route handlers
  server entrypoints
  composition of shared packages

`apps/web` is not responsible for:
  direct provider integrations
  persistence logic
  core domain rules

## Provider Abstraction

All model access must eventually go through an internal provider abstraction.

The app should depend on internal contracts, not directly on provider SDKs. This keeps the system ready for:
  multi provider evaluation
  provider swaps
  open weight model adoption

This abstraction also supports the product posture that AI is a proposing system inside a broader workflow. Model backed steps generate suggestions, classifications, and structured outputs, while the surrounding application remains responsible for persistence, quality checks, review, and approval.

Current provider posture:
  OpenAI remains the default production path today
  a second provider scaffold exists behind the same internal adapter layer for research, sequence, and reply operations
  provider choice is controlled by server side configuration rather than user facing UI

For research specifically:
  public website fetching, cleaning, extraction, summarization, and scoring should stay behind `@ceg/research engine` interfaces
  safe URL policy enforcement belongs in `@ceg/security`
  model backed company profile summarization should flow through the research model adapter rather than being hard coded into the web app
  research summarization, sequence generation, and reply intelligence should all emit the same provider metadata shape: provider, model, prompt version, latency, token usage, and cost when available
  provider routing is now configurable at an internal capability level so research, sequence, and reply operations can target different providers without changing UI or stored artifact contracts

For sequence generation specifically:
  sequence composition and output validation should stay behind `@ceg/sequence engine`
  provider specific model calls must be implemented behind the sequence model adapter interface
  the app layer may compose the active provider, but components should only trigger server actions and render stored sequence records

For reply intelligence specifically:
  inbound reply analysis, strategy recommendation, and draft generation should stay behind `@ceg/reply engine`
  classification should remain separate from drafting so the system can audit intent, objections, and recommended actions independently
  provider specific reply analysis or drafting calls must stay behind the reply model adapter interface
  deterministic quality scoring for generated sequences and draft replies should run server side, remain auditable, and persist into `sequences.quality_checks_json` and `draft_replies.quality_checks_json` for UI review and future evaluation workflows
  sequence and reply generation now accept a small schema backed performance hint envelope derived from historical selections and outcome linked signals; those hints stay deterministic, optional, and subordinate to current sender/prospect evidence
  partial regenerations and manual edits should create new artifact versions rather than mutating stored generation records in place, and edit metadata should be captured server side for later training data reconstruction

For inbox integrations specifically:
  provider facing email sync should stay behind `@ceg/inbox`
  `inbox_accounts` holds the connected account contract, not provider SDK state
  imported provider threads and messages should map back into existing `conversation_threads` and `messages` through reference tables instead of replacing the current thread architecture
  draft in provider and send via provider operations should stay as explicit provider agnostic actions so later Gmail and Microsoft 365 adapters can implement them behind one stable interface
  OAuth, webhook ingestion, and provider specific sync cursors can evolve later without leaking those details into UI code
  the first Gmail adapter stores encrypted OAuth credentials server side, keeps imported provider refs separate from normalized local threads, projects matched messages into the product thread timeline, and can save selected generated artifacts back into Gmail as drafts without exposing provider tokens to the client, auto links inbound replies to prospects where possible, preserves raw plus normalized body content in imported refs, and triggers reply analysis after idempotent ingestion. Manually stored inbound replies reuse the same reply analysis path so thread classification stays consistent across pasted and imported messages.

## Async Ready, Not Queue Heavy

Research and generation flows should be designed so they can move to queues later, but Phase 1 does not introduce queue infrastructure or microservices yet.

That posture is intentional for an agency workflow product: slow operations need clear state transitions and retry safety, but the repo does not yet imply autonomous background execution of outbound work.

Current implementation notes:
  prospect research, sequence generation, reply analysis, and reply drafting now persist prospect scoped async run state through the `@ceg/jobs` contract layer
  slow operations explicitly transition through `idle  > running  > succeeded/failed` and carry request ids, idempotency keys, attempt counts, timestamps, and concise result summaries
  duplicate triggers are blocked while a fresh run is already marked `running`, while stale runs can be retried safely later
  the UI still supports synchronous completion today, but the persisted run state model is ready for future queue workers to pick up without changing the product boundary

## Observability and Security

Phase 1 should keep room for:
  request correlation
  workspace aware authorization
  auditability
  usage tracking
  sanitized external data handling

The practical product reason for this is not only technical hygiene. The system is meant to preserve operational memory across campaigns, prospects, threads, edits, and outcomes so agencies can review work, understand what happened, and learn from campaign history without treating model output as self justifying.

Billing and usage gating should stay server side:
  centralized plan definitions and entitlement checks live in `@ceg/billing`
  costly workflows enforce feature access and monthly usage limits before execution
  `usage_events` remains the first aggregation spine for outcome based pricing and cost controls
  campaign level outbound performance is intentionally lightweight and stored as a structured snapshot on campaign settings, recalculated from workspace scoped messages and reply classifications when activity changes; outbound counts now advance from normalized message send state so Gmail drafts can be linked first and only counted once marked sent
  workspace auth metadata can carry the active plan for now, with room to swap to the `subscriptions` table later without changing UI components
  first run onboarding state is persisted server side in `workspace.settings.onboarding`, while actual setup progress is reconciled from sender profiles, campaigns, and prospects
  Stripe checkout, billing portal, and webhook normalization should stay behind the billing boundary
  local `subscriptions` records become the workspace billing source of truth once synced from Stripe
  internal admin and support views must stay allowlisted and restricted to trusted workspace admins; they should show operational summaries, not secrets or raw captures
  development only demo seed loading stays behind the internal admin route and must remain explicitly opt in through `DEMO_SEED_ENABLED`
  workspace data export is exposed as a server generated structured bundle for owner/admin review and handoff, not as direct table access from the client
  internal dataset export for training and evaluation stays restricted to trusted admin routes and derives normalized records from training signals, reply analyses, and research snapshots rather than exposing raw operational tables
  outcome aware training signals now link generated artifacts and sent outbound messages to the inbound replies they produced, including reply classification and positive or negative outcome labels once reply analysis completes
  workspace deletion is currently an explicit owner only request flow that records intent and audit history without silently purging data
  user-facing packaging now uses `Starter`, `Growth`, and `Enterprise`, while internal billing identifiers remain `free`, `pro`, and `agency` for compatibility across billing flows and stored plan codes

## Auth Boundary

Authentication should stay server side and modular:
  Supabase backed session handling happens in server entrypoints only
  workspace membership and role guards live in `@ceg/auth`
  protected routes resolve workspace context before rendering app surfaces
  UI components consume already resolved auth and workspace state instead of talking to auth providers directly

## Migration Strategy

Architecture choices in Phase 1 should keep these future paths open:
  extract AI heavy workflows into workers
  split web and backend deployment surfaces
  move to broader provider orchestration
  support fine tuned open weight models

## Schema Notes

The initial relational schema makes a few intentional choices for the first production ready cut:
  `campaigns.sender_profile_id` is nullable so basic mode works without sender aware personalization.
  Campaign specific targeting, tone, and framework preferences are carried in structured `settings` JSONB today so the app can evolve the campaign brief without early schema churn.
  `prompt_templates` is the first prompt versioning table; template versioning is captured through `name` plus `version` instead of a separate prompt version entity for now.
  `prospects` includes an optional `campaign_id` for a practical Phase 1 workflow, with room to move to a dedicated many to many mapping later if campaign reuse becomes a stronger requirement.
  `research_snapshots`, `sequences`, `reply_analyses`, `draft_replies`, `usage_events`, and `audit_events` all keep JSONB payload space for auditability, evaluation, and future training data capture.

## Database Access Control

The application currently enforces workspace access in server side auth and service layers first, and the database now has an initial Supabase/Postgres RLS backstop as well.

Policy intent:
  workspace members can read and work with normal product records inside their own workspace only
  owner/admin roles can read more sensitive workspace operational records like `usage_events`, `audit_events`, and `subscriptions`
  server only flows remain responsible for privileged writes to billing and operational tables
  `SUPABASE_SERVICE_ROLE_KEY` stays reserved for trusted server execution only and must never cross a client boundary

This keeps the first policy layer understandable while preserving room for stricter role separation later.

Current state:
  authenticated users are synced into local `users` and `workspace_members` records so workspace access resolves from database truth first, with auth metadata only as a bootstrap fallback
  the migration set now includes additive workspace integrity constraints so key optional relationships must stay inside the same workspace
  repository access for thread history, reply artifacts, research snapshots, imported thread refs, and destructive campaign/prospect deletes is now explicitly workspace scoped instead of relying on bare ids alone

Remaining limitation:
  not every repository path is Postgres backed yet, so some lower priority operational views still rely on in memory adapters until those slices are migrated
