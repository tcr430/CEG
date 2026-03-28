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
- research evidence
- generation inputs
- validated outputs
- user edits and selections
- reply classifications
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

This keeps future evaluation and dataset export focused on one normalized supervision stream instead of reverse-engineering behavior from scattered feature tables.

## Evaluation Groundwork

The repo now also keeps a lightweight evaluation-ready layer in `@ceg/testing` for:
- golden examples
- expected output property checks
- regression cases
- representative fixtures for sender modes, prospect summaries, and inbound replies

The intent is to make future provider comparisons and dataset export easier without coupling tests to any one model's exact phrasing.
