# Doctrine Consistency Audit

## Scope audited
- `README.md`
- `ARCHITECTURE.md`
- `DATA_STRATEGY.md`
- `DEPLOYMENT.md`
- `AGENTS.md` for process consistency only

## Overall conclusion
The four doctrine/source-of-truth docs are now broadly aligned around:
- primary ICP: small-to-mid outbound agencies serving B2B clients
- product positioning: workflow system / operating system for hyperpersonalized cold email
- trust model: AI proposes, human approves
- conservative automation claims
- workflow, memory, and learning language

`AGENTS.md` remains process guidance only and does not conflict with the strategy/docs update.

## Conflicts found

### 1. Strategic pricing names vs current implementation names
- Status: still present, but explicitly disclosed rather than hidden
- Files:
  - `README.md` -> `## Vercel Deployment Notes`
  - `ARCHITECTURE.md` -> `## Observability and Security`
  - `DEPLOYMENT.md` -> `## Stripe Setup` and `## Production Deployment Checklist`
- Detail:
  - doctrine docs now use `Starter`, `Growth`, and `Enterprise`
  - implementation still uses `Free`, `Pro`, and `Agency`
- Assessment:
  - this is not a doctrine-doc conflict anymore
  - it remains a product/implementation naming gap that should be resolved in app surfaces later

### 2. Terminology mix: "operating system" vs "workflow system"
- Status: acceptable, low-severity
- Files:
  - `README.md` -> opening description
  - `ARCHITECTURE.md` -> `## Overview`
  - `DEPLOYMENT.md` -> `## Purpose`
- Detail:
  - `README.md` uses "operating system"
  - `ARCHITECTURE.md` and `DEPLOYMENT.md` lean more on "workflow system"
- Assessment:
  - these terms are directionally aligned and not contradictory
  - they describe the same product posture rather than conflicting positions

### 3. Secondary user-type truth vs primary ICP focus
- Status: intentionally retained
- Files:
  - `README.md` -> paragraph beginning `Supported secondary modes remain in the product today`
- Detail:
  - the docs now clearly prioritize agencies
  - the README still acknowledges SDR/founder/basic support because the repo actually supports those modes today
- Assessment:
  - this is an intentional truth-preserving nuance, not a doctrine conflict

## Fixes applied

### Applied directly
1. Made the trust model explicit in `ARCHITECTURE.md`
- Location:
  - `ARCHITECTURE.md` under `## Overview`
- Fix:
  - added: `trust model: AI proposes, human approves`

2. Connected the trust model directly to data capture in `DATA_STRATEGY.md`
- Location:
  - `DATA_STRATEGY.md` under `## Core Principle`
- Fix:
  - added language that the data strategy must preserve both model suggestions and human review actions because the operating model is `AI proposes, human approves`

### Already resolved before this audit
- Agency-first ICP alignment across all four doctrine docs
- Workflow-first framing replacing broad generic copilot/generator language
- Conservative non-autonomous automation claims
- Explicit disclosure of pricing-name mismatch between doctrine and implementation

## Unresolved issues needing product decisions

### 1. Pricing rename rollout
- Decision needed:
  - when to rename implemented product surfaces from `Free / Pro / Agency` to `Starter / Growth / Enterprise`
- Why it matters:
  - doctrine docs are now ahead of the product UI and billing copy

### 2. Public terminology standard
- Decision needed:
  - whether the preferred canonical public term should be:
    - `operating system`
    - `workflow system`
    - or a stable pairing such as `operating system for campaign workflow`
- Why it matters:
  - the doctrine docs are aligned enough today, but public-facing implementation surfaces should eventually standardize one lead phrase

### 3. Secondary ICP handling in public product surfaces
- Decision needed:
  - how explicitly SDR/founder/basic support should remain visible after the agency-first repositioning
- Why it matters:
  - the repo truth still includes those modes, but the commercial narrative now leads with agencies

## Process consistency check for `AGENTS.md`
- `AGENTS.md` was reviewed only for repository/process consistency
- no changes were needed
- it remains compatible with the updated doctrine docs because it governs implementation process, not product positioning

## Final assessment
These doctrine docs are now aligned enough to guide future Codex work.

Remaining inconsistency is mostly between doctrine and implementation surfaces, not between the doctrine docs themselves.
