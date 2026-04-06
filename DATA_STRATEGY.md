# Data Strategy

## Purpose

The system collects structured product data to:
- improve output quality
- support evaluation
- preserve training signals for future fine-tuning

## Core Principle

We are not only storing generated text.

We are storing structured signals around:
- context
- evidence
- decisions
- outcomes
- user feedback

## Data Families

The product will eventually track:
- sender context
- campaign context
- prospect context
- inbox account and sync context
- research evidence
- generation inputs
- validated outputs
- user edits and selections
- reply classifications
- lightweight campaign performance snapshots
- operational metadata

## Training Readiness

The system should be able to reconstruct training examples from structured records that include:
- input context
- output artifact
- prompt or template version
- provider and model metadata
- user preference signal
- quality or acceptance outcome

## Data Quality Rules

- structured JSON contracts for AI-facing payloads
- prompt and template versioning
- evidence attached to personalization claims
- validated outputs separated from raw generation artifacts
- deletion support and data minimization
- structured workspace export for review, handoff, and responsible customer data access
- explicit deletion-request capture before any destructive data lifecycle action

## Compliance Direction

Phase 1 should keep room for:
- workspace-scoped ownership
- deletion workflows
- least-privilege access
- careful handling of public website research data

## Phase 1 Implication

Even before advanced product features exist, the foundation should preserve:
- clean schema boundaries
- versionable contracts
- auditability
- future evaluation and fine-tuning readiness

## Normalized Training Signals

The product now records provider-agnostic training signals into `usage_events` metadata when users generate, regenerate, edit, select, copy, or export sequence and reply artifacts.

Those records should preserve:
- workspace, campaign, prospect, and research context snapshots
- sender profile context snapshots when available
- provider, model, and prompt/template version metadata when available
- structured artifact ids and user action types
- before/after text for edits and regenerations
- outcome-aware linkage from sent outbound messages to the replies they generated, including reply classification and positive or negative outcome labels when analysis is available
- lightweight deterministic performance hints that summarize historically preferred tone and better-performing patterns for future generation runs without introducing opaque ML behavior

This keeps future evaluation and dataset export focused on one normalized supervision stream instead of reverse-engineering behavior from scattered feature tables.

## Evaluation Groundwork

The repo now also keeps a lightweight evaluation-ready layer in `@ceg/testing` for:
- golden examples
- expected output property checks
- regression cases
- representative fixtures for sender modes, prospect summaries, and inbound replies

The intent is to make future provider comparisons and dataset export easier without coupling tests to any one model's exact phrasing.

That groundwork now includes a lightweight workflow evaluation harness that can run representative research, sequence, reply-analysis, and reply-drafting cases through schema checks and stable regression rules without depending on exact wording matches.

## Soft-Launch Analytics And Feedback

The product now reuses `usage_events`, `audit_events`, and structured server logs for early launch instrumentation instead of adding a separate analytics platform.

That lightweight layer should capture:
- major product milestones like onboarding completion and core workflow creation events
- high-signal workflow actions like research, sequence generation, reply analysis, and upgrade intent
- concise user feedback with category, page, and workspace context while avoiding unnecessary extra data collection

For future inbox integrations, imported provider thread/message references should remain separate from normalized local conversation records so we can preserve provider provenance, sync state, and auditability without coupling downstream product logic to Gmail- or Microsoft-specific identifiers. Imported inbound replies should also preserve both raw capture and normalized text/html so later reply analysis, evaluation exports, and ingestion debugging can distinguish provider payload from cleaned application content.


## Dataset Export Foundation

The application now has an internal dataset export pipeline that produces provider-agnostic JSON bundles for:
- research profile extraction examples
- supervised generation examples
- preference-learning signals
- regression and evaluation cases

Those exports are filtered server-side by workspace, date range, artifact type, and acceptance/edit signals. They stay restricted to trusted internal admin flows and intentionally avoid exposing full raw operational data to normal users.


## Outcome Signals

The application now records export-ready outcome signals when a reply can be attributed to a sent outbound message. Those signals preserve:
- the outbound message that led to the reply
- the inbound reply and reply-analysis ids
- reply intent, classification, and recommended action
- a positive or negative outcome label for future evaluation and training workflows


- Shareable performance summaries are derived from structured campaign/workspace performance snapshots and intentionally exclude prospect names, thread content, and raw internal ids so the same summary shape can support future export/share flows safely.
